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

package endpoint

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/boltdb/bolt"
	"github.com/golang/protobuf/jsonpb"

	"github.com/pydio/cells/common/config"
	"github.com/pydio/cells/common/proto/tree"
	"github.com/pydio/cells/common/sync/model"
)

var (
	bucketName = []byte("snapshot")
)

type Snaphsot struct {
	db    *bolt.DB
	name  string
	empty bool
}

func (s *Snaphsot) CreateNode(ctx context.Context, node *tree.Node, updateIfExists bool) (err error) {
	panic("implement me")
}

func (s *Snaphsot) UpdateNode(ctx context.Context, node *tree.Node) (err error) {
	panic("implement me")
}

func (s *Snaphsot) DeleteNode(ctx context.Context, path string) (err error) {
	panic("implement me")
}

func (s *Snaphsot) MoveNode(ctx context.Context, oldPath string, newPath string) (err error) {
	panic("implement me")
}

func NewSnapshot(name, syncUuid string) (*Snaphsot, error) {
	s := &Snaphsot{name: name}
	options := bolt.DefaultOptions
	options.Timeout = 5 * time.Second
	appDir := config.ApplicationDataDir()
	f := filepath.Join(appDir, "sync", syncUuid)
	os.MkdirAll(f, 0755)
	p := filepath.Join(f, "snapshot-"+name)
	if _, err := os.Stat(p); err != nil {
		s.empty = true
	}
	db, err := bolt.Open(p, 0644, options)
	if err != nil {
		return nil, err
	}
	s.db = db
	return s, nil
}

func (s *Snaphsot) IsEmpty() bool {
	return s.empty
}

func (s *Snaphsot) Capture(ctx context.Context, source model.PathSyncSource) error {
	if e := s.db.Update(func(tx *bolt.Tx) error {
		if b := tx.Bucket(bucketName); b != nil {
			return tx.DeleteBucket(bucketName)
		}
		return nil
	}); e != nil {
		return e
	}
	e := s.db.Update(func(tx *bolt.Tx) error {
		b, e := tx.CreateBucketIfNotExists(bucketName)
		if e != nil {
			return e
		}
		marshaller := jsonpb.Marshaler{
			EnumsAsInts: true,
		}
		return source.Walk(func(path string, node *tree.Node, err error) {
			k := []byte(path)
			value := bytes.NewBuffer(nil)
			marshaller.Marshal(value, node)
			b.Put(k, value.Bytes())
		})
	})
	if e == nil {
		s.empty = false
	}
	return e
}

func (s *Snaphsot) LoadNode(ctx context.Context, path string, leaf ...bool) (node *tree.Node, err error) {
	err = s.db.View(func(tx *bolt.Tx) error {
		if b := tx.Bucket(bucketName); b != nil {
			value := b.Get([]byte(path))
			if value != nil {
				return jsonpb.Unmarshal(bytes.NewBuffer(value), node)
			}
		}
		return nil
	})
	return
}

func (s *Snaphsot) GetEndpointInfo() model.EndpointInfo {
	return model.EndpointInfo{
		URI: "snapshot://" + s.name,
		RequiresNormalization: false,
		RequiresFoldersRescan: false,
	}
}

func (s *Snaphsot) Walk(walknFc model.WalkNodesFunc, pathes ...string) (err error) {
	err = s.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(bucketName)
		if b == nil {
			return nil
		}
		return b.ForEach(func(k, v []byte) error {
			path := string(k)
			var node tree.Node
			if e := jsonpb.Unmarshal(bytes.NewBuffer(v), &node); e == nil {
				walknFc(path, &node, nil)
			}
			return nil
		})
	})
	return err
}

func (s *Snaphsot) Watch(recursivePath string, connectionInfo chan model.WatchConnectionInfo) (*model.WatchObject, error) {
	return nil, fmt.Errorf("not.implemented")
}

func (s *Snaphsot) ComputeChecksum(node *tree.Node) error {
	return fmt.Errorf("not.implemented")
}
