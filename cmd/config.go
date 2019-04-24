package cmd

import (
	"context"
	"os"

	"github.com/manifoldco/promptui"
	"github.com/pborman/uuid"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/sync/config"
	"github.com/spf13/cobra"
)

func exit(err error) {
	if err != nil && err.Error() != "" {
		log.Logger(context.Background()).Error(err.Error())
		os.Exit(1)
	}
	os.Exit(0)
}

var AddCmd = &cobra.Command{
	Use:   "add",
	Short: "Add a new sync",
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

var EditCmd = &cobra.Command{
	Use:   "edit",
	Short: "Exit existing sync",
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

var DeleteCmd = &cobra.Command{
	Use:   "delete",
	Short: "Delete existing sync",
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
