/*
 * Copyright (c) 2019. Abstrium SAS <team (at) pydio.com>
 * This file is part of Pydio Cells.
 *
 * Pydio Cells is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Pydio Cells is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Pydio Cells.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The latest code can be found at <https://pydio.com>.
 */

package tests

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"testing"
	"time"

	. "github.com/smartystreets/goconvey/convey"

	"github.com/pydio/cells-sync/endpoint"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/sync/endpoints/filesystem"
	"github.com/pydio/cells/common/sync/endpoints/index"
	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/cells/common/sync/task"
)

func TestMergeWithBigDataStructure(t *testing.T) {

	Convey("Test basic sync between a fs and an index", t, func() {

		dir, _ := os.Getwd()
		source, _ := filesystem.NewFSClient(dir, model.EndpointOptions{})

		nodes := make(map[string]tree.Node)

		target := index.NewClient("test", &tree.NodeProviderMock{nodes}, &tree.NodeReceiverMock{nodes}, &tree.SessionIndexerMock{})
		target.CreateNode(context.Background(), &tree.Node{
			Uuid: "ROOT",
			Path: "/",
			Type: tree.NodeType_COLLECTION,
		}, false)

		// Creating and running a sync
		mainSync := task.NewSync(source, target, model.DirectionRight)
		err := run(mainSync)
		So(err, ShouldBeNil)

		Convey("Test creating snapshot", func() {
			// Load a snapshot of the target for diffing later
			tmp, _ := ioutil.TempDir("", "test-sync")
			defer os.RemoveAll(tmp)
			snapshotFactory := endpoint.NewSnapshotFactory(tmp, source, target)

			snap, err := snapshotFactory.Load(target)
			So(err, ShouldBeNil)

			snap.Capture(context.Background(), target)
			capture, ok := snap.(model.PathSyncSource)
			So(ok, ShouldBeTrue)

			diffNoErrors := merger.NewTreeDiff(context.Background(), target, capture)
			Convey("Test computing diff with no errors and no changes", func() {
				// Diffing between the target and its catpure shouldn't give anything
				e := diffNoErrors.Compute("/", nil)
				So(e, ShouldBeNil)
			})

			diffErrors := merger.NewTreeDiff(context.Background(), target, capture)
			Convey("Test computing diff with no changes but errors", func() {
				tree.PredefineError(func(objType, fnType string, params ...interface{}) error {
					switch o := objType + "." + fnType; o {
					case "*tree.StreamerMock.Recv":
						node, ok := params[0].(*tree.Node)
						if ok && node != nil {
							return fmt.Errorf("This is a random error")
						}
					}
					return nil
				})

				e := diffErrors.Compute("/", nil)
				So(e, ShouldNotBeNil)
			})

			// Checking patches
			leftPatch := merger.NewPatch(source, capture.(model.PathSyncTarget), merger.PatchOptions{MoveDetection: true})
			rightPatch := merger.NewPatch(target, capture.(model.PathSyncTarget), merger.PatchOptions{MoveDetection: true})

			// Having error as basis
			diffNoErrors.ToUnidirectionalPatch(model.DirectionRight, leftPatch)
			diffErrors.ToUnidirectionalPatch(model.DirectionRight, rightPatch)

			b, e := merger.ComputeBidirectionalPatch(context.Background(), leftPatch, rightPatch)
			So(e, ShouldBeNil)
			So(b.Stats()["Pending"], ShouldBeNil)
		})
	})
}

func run(s *task.Sync) error {
	var err error

	statusChan := make(chan model.Status)
	doneChan := make(chan interface{})
	waitChan := make(chan bool, 1)

	s.SetupEventsChan(statusChan, doneChan, nil)

	go func() {
		defer func() {
			close(waitChan)
		}()

		for {
			select {
			case status := <-statusChan:
				fmt.Println("Task Status Received: ", status)
			case p := <-doneChan:
				if patch, ok := p.(merger.Patch); ok {
					fmt.Println("Patch Processing Finished")
					fmt.Println(patch.Stats())
				} else {
					err = fmt.Errorf("doneChan did not send a patch")
				}

				return
			case <-time.After(10 * time.Second):
				err = fmt.Errorf("breaking test after 10s, this is not normal")

				return
			}
		}
	}()

	s.Start(context.Background(), true)
	s.Run(context.Background(), false, true)
	<-waitChan
	s.Shutdown()

	return err
}

// type MockEndpoint struct {
// 	*filesystem.FSClient
// 	nodeShortage int
// 	randomError  error
// }

// func NewMockEndpoint(rootPath string) *MockEndpoint {
// 	fs, _ := filesystem.NewFSClient(rootPath, model.EndpointOptions{})
// 	return &MockEndpoint{
// 		FSClient: fs,
// 	}
// }

// func (e *MockEndpoint) ComputeChecksum(node *tree.Node) error {
// 	node.Etag = uuid.New().String()
// 	return nil
// }

// func (e *MockEndpoint) WithoutRandomNodesShortage() {
// 	e.nodeShortage = 0
// }

// func (e *MockEndpoint) WithRandomNodesShortage() {
// 	e.nodeShortage = 2 + rand.Intn(3)
// }

// func (e *MockEndpoint) Walk(walkFunc model.WalkNodesFunc, root string, recursive bool) (err error) {

// 	var count = 0

// 	wrappingFunc := func(path string, info os.FileInfo, err error) error {

// 		count++

// 		if err != nil {
// 			walkFunc("", nil, err)
// 			return nil
// 		}
// 		if len(path) == 0 || path == "/" || e.normalize(path) == strings.TrimLeft(root, "/") || strings.HasPrefix(filepath.Base(path), ".tmp.write.") {
// 			return nil
// 		}

// 		path = e.normalize(path)
// 		if node, err := e.LoadNode(context.Background(), path); err != nil {
// 			walkFunc("", nil, err)
// 		} else {

// 			if e.nodeShortage > 0 {
// 				// If we've reached the node shortage - returning to simulate a problem on the server side
// 				if count >= e.nodeShortage {
// 					return nil
// 				}

// 				if node.GetType() == tree.NodeType_LEAF {
// 					node.Etag = uuid.New().String()
// 				}
// 			}

// 			walkFunc(path, node, nil)
// 		}

// 		return nil
// 	}
// 	if !recursive {
// 		infos, er := afero.ReadDir(e.FSClient.FS, root)
// 		if er != nil {
// 			return er
// 		}
// 		for _, i := range infos {
// 			wrappingFunc(path.Join(root, i.Name()), i, nil)
// 		}
// 		return nil
// 	} else {
// 		return afero.Walk(e.FSClient.FS, root, wrappingFunc)
// 	}
// }

// func (e *MockEndpoint) normalize(path string) string {
// 	path = strings.TrimLeft(path, string(os.PathSeparator))
// 	if runtime.GOOS == "darwin" {
// 		return string(norm.NFC.Bytes([]byte(path)))
// 	} else if runtime.GOOS == "windows" {
// 		return strings.Replace(path, string(os.PathSeparator), model.InternalPathSeparator, -1)
// 	}
// 	return path
// }

// func createNodes(n int) []*tree.Node {
// 	var nodes []*tree.Node

// 	// Creating root node
// 	nodes = append(nodes, &tree.Node{
// 		Uuid: "ROOT",
// 		Path: "/",
// 		Type: tree.NodeType_COLLECTION,
// 	})

// 	for {
// 		size := rand.Intn(190) + 10
// 		rnd := []byte(randString(size))

// 		depth := rand.Intn(9) + 1
// 		gap := int(len(rnd) / depth)

// 		var path []byte

// 		for i := 0; i <= len(rnd)-1; i = i + 2 {
// 			path = append(path, rnd[i:i+1]...)
// 			if (i+2)%gap == 0 {
// 				path = append(path, []byte("/")...)
// 			}
// 		}

// 		dirs := strings.Split(strings.Trim(string(path), "/"), "/")

// 		for i := range dirs {
// 			nodes = append(nodes, &tree.Node{
// 				Uuid: uuid.New().String(),
// 				Path: strings.Join(dirs[0:i+1], "/"),
// 				Type: tree.NodeType_COLLECTION,
// 				Etag: strings.Join(dirs[0:i+1], "/"),
// 			})

// 			if len(nodes) >= n {
// 				break
// 			}
// 		}

// 		if len(nodes) >= n {
// 			break
// 		}
// 	}

// 	return nodes
// }

// const letterBytes = "abcdefghijklmnopqrstuvwxyz"
// const (
// 	letterIdxBits = 6                    // 6 bits to represent a letter index
// 	letterIdxMask = 1<<letterIdxBits - 1 // All 1-bits, as many as letterIdxBits
// 	letterIdxMax  = 63 / letterIdxBits   // # of letter indices fitting in 63 bits
// )

// var src = rand.NewSource(time.Now().UnixNano())

// func randString(n int) string {
// 	b := make([]byte, n)
// 	// A src.Int63() generates 63 random bits, enough for letterIdxMax characters!
// 	for i, cache, remain := n-1, src.Int63(), letterIdxMax; i >= 0; {
// 		if remain == 0 {
// 			cache, remain = src.Int63(), letterIdxMax
// 		}
// 		if idx := int(cache & letterIdxMask); idx < len(letterBytes) {
// 			b[i] = letterBytes[idx]
// 			i--
// 		}
// 		cache >>= letterIdxBits
// 		remain--
// 	}

// 	return *(*string)(unsafe.Pointer(&b))
// }
