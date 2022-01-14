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
	"os"

	"github.com/manifoldco/promptui"
	"github.com/pborman/uuid"
	"github.com/spf13/cobra"

	"github.com/pydio/cells/v4/common/log"

	"github.com/pydio/cells-sync/config"
)

func exit(err error) {
	if err != nil && err.Error() != "" {
		log.Logger(context.Background()).Error(err.Error())
		os.Exit(1)
	}
	os.Exit(0)
}

// AddCmd adds a task to the config via the command line
var AddCmd = &cobra.Command{
	Use:   "add",
	Short: "Add a new task via command line",
	Long: `Define a new sync task using two URI and a direction.

Endpoint URI support the following schemes: 
 - router: Direct connexion to Cells server running on the same machine
 - fs:     Path to a local folder
 - s3:     S3 compliant
 - memdb:  In-memory DB for testing purposes

Direction can be:
 - Bi:     Bidirectionnal sync between two endpoints
 - Left:   Changes are only propagated from right to left
 - Right:  Changes are only propagated from left to right

Example
 - LeftUri : "router:///personal/admin/folder"
 - RightUri: "fs:///Users/name/Pydio/folder"
 - Direction: "Bi"

`,
	Run: func(cmd *cobra.Command, args []string) {

		t := &config.Task{
			Uuid: uuid.New(),
		}
		var e error
		l := &promptui.Prompt{Label: "Left endpoint URI"}
		r := &promptui.Prompt{Label: "Right endpoint URI"}
		s := promptui.Select{Label: "Sync Direction", Items: []string{"Bi", "Left", "Right"}}
		t.LeftURI, e = l.Run()
		if e != nil {
			exit(e)
		}
		t.RightURI, e = r.Run()
		if e != nil {
			exit(e)
		}
		_, t.Direction, e = s.Run()
		if e != nil {
			exit(e)
		}

		config.Default().Tasks = append(config.Default().Tasks, t)
		er := config.Save()
		if er != nil {
			exit(er)
		}

	},
}

// EditCmd edits a task via the command line
var EditCmd = &cobra.Command{
	Use:   "edit",
	Short: "Exit existing sync via command line",
	Run: func(cmd *cobra.Command, args []string) {
		tS := promptui.Select{Label: "Select Sync to Edit", Items: config.Default().Items()}
		i, _, e := tS.Run()
		if e != nil {
			exit(e)
		}

		task := config.Default().Tasks[i]
		l := &promptui.Prompt{Label: "Left endpoint URI", Default: task.LeftURI}
		r := &promptui.Prompt{Label: "Right endpoint URI", Default: task.RightURI}
		s := promptui.Select{Label: "Sync Direction", Items: []string{"Bi", "Left", "Right"}}
		task.LeftURI, e = l.Run()
		if e != nil {
			exit(e)
		}
		task.RightURI, e = r.Run()
		if e != nil {
			exit(e)
		}
		_, task.Direction, e = s.Run()
		if e != nil {
			exit(e)
		}
		er := config.Save()
		if er != nil {
			exit(er)
		}
	},
}

// DeleteCmd removes a task via the command line.
var DeleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Delete existing sync via command line",
	Run: func(cmd *cobra.Command, args []string) {
		tS := promptui.Select{Label: "Select Sync to Edit", Items: config.Default().Items()}
		i, _, e := tS.Run()
		if e != nil {
			exit(e)
		}
		tasks := config.Default().Tasks
		last := len(tasks) - 1
		lastTask := tasks[last]
		tasks[last] = tasks[i]
		tasks[i] = lastTask
		tasks = tasks[:last]
		config.Default().Tasks = tasks
		er := config.Save()
		if er != nil {
			exit(er)
		}

	},
}

func init() {
	RootCmd.AddCommand(AddCmd, EditCmd, DeleteCmd)
}
