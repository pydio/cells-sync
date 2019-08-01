/*
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */

package cmd

import (
	"context"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"time"

	"github.com/micro/go-log"
	"github.com/pborman/uuid"
	"github.com/spf13/cobra"

	"github.com/pydio/cells/common/sync/endpoints/filesystem"
	"github.com/pydio/cells/common/sync/merger"
	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/cells/common/sync/task"
)

var autoTestSkipClean bool

var AutoTestCmd = &cobra.Command{
	Use:  "autotest",
	Long: "Performs a simple test of a unidirectional sync between two local folders (created inside TmpDir)",
	Run: func(cmd *cobra.Command, args []string) {

		tmpDir := os.TempDir()
		syncId := uuid.New()
		leftDir := filepath.Join(tmpDir, syncId, "left")
		os.MkdirAll(leftDir, 0777)
		rightDir := filepath.Join(tmpDir, syncId, "right")
		os.MkdirAll(rightDir, 0777)

		if !autoTestSkipClean {
			defer func() {
				fmt.Println("Cleaning resources after test (" + filepath.Join(tmpDir, syncId) + ")")
				os.RemoveAll(filepath.Join(tmpDir, syncId))
			}()
		}

		left, e := filesystem.NewFSClient(leftDir, model.EndpointOptions{})
		if e != nil {
			log.Fatal("cannot init left dir " + leftDir)
		}

		// Create files inside left
		if e := ioutil.WriteFile(filepath.Join(leftDir, "basic-file.txt"), []byte("hello world"), 0755); e != nil {
			log.Fatal("cannot write a file for testing on left " + leftDir)
		}

		right, e := filesystem.NewFSClient(rightDir, model.EndpointOptions{})
		if e != nil {
			log.Fatal("cannot init right dir " + rightDir)
		}

		statusChan := make(chan model.Status)
		doneChan := make(chan interface{})
		waitChan := make(chan bool, 1)
		var err error

		syncTask := task.NewSync(left, right, model.DirectionRight)
		syncTask.SkipTargetChecks = true
		syncTask.Start(context.Background(), false)
		syncTask.SetupEventsChan(statusChan, doneChan, nil)

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
						// Additional checks
						if patch.Size() == 0 {
							err = fmt.Errorf("processed patch has size 0, this is not normal")
							return
						}
						if data, e := ioutil.ReadFile(filepath.Join(rightDir, "basic-file.txt")); e != nil {
							err = fmt.Errorf("cannot read right file %v", e)
						} else if string(data) != "hello world" {
							err = fmt.Errorf("right file does not have proper content: %v", string(data))
						}
					} else {
						err = fmt.Errorf("doneChan did not send a patch")
					}
					return
				case <-time.After(30 * time.Second):
					err = fmt.Errorf("breaking test after 30s, this is not normal")
					return
				}
			}
		}()
		syncTask.Run(context.Background(), false, true)
		<-waitChan
		syncTask.Shutdown()
		if err != nil {
			log.Fatal(err)
		}
	},
}

func init() {

	AutoTestCmd.PersistentFlags().BoolVarP(&autoTestSkipClean, "skip_clean", "s", false, "Do not clear resources created for testing")
	RootCmd.AddCommand(AutoTestCmd)

}
