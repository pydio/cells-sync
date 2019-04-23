package cmd

import (
	"github.com/manifoldco/promptui"
	"github.com/micro/go-log"
	"github.com/pborman/uuid"
	"github.com/pydio/sync/config"
	"github.com/spf13/cobra"
)

var AddCmd = &cobra.Command{
	Use: "add",
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
			log.Fatal(e)
		}
		t.RightURI, e = r.Run()
		if e != nil {
			log.Fatal(e)
		}
		_, t.Direction, e = s.Run()
		if e != nil {
			log.Fatal(e)
		}

		config.Default().Tasks = append(config.Default().Tasks, t)
		er := config.Save()
		if er != nil {
			log.Fatal(er)
		}

	},
}

var EditCmd = &cobra.Command{
	Use: "edit",
	Run: func(cmd *cobra.Command, args []string) {
		var items []string
		for _, t := range config.Default().Tasks {
			items = append(items, t.Uuid)
		}
		tS := promptui.Select{Label: "Select Sync to Edit", Items: items}
		i, _, e := tS.Run()
		if e != nil {
			log.Fatal(e)
		}

		task := config.Default().Tasks[i]
		l := &promptui.Prompt{Label: "Left endpoint URI", Default: task.LeftURI}
		r := &promptui.Prompt{Label: "Right endpoint URI", Default: task.RightURI}
		s := promptui.Select{Label: "Sync Direction", Items: []string{"Bi", "Left", "Right"}}
		task.LeftURI, e = l.Run()
		if e != nil {
			log.Fatal(e)
		}
		task.RightURI, e = r.Run()
		if e != nil {
			log.Fatal(e)
		}
		_, task.Direction, e = s.Run()
		if e != nil {
			log.Fatal(e)
		}
		er := config.Save()
		if er != nil {
			log.Fatal(er)
		}
	},
}

var DeleteCmd = &cobra.Command{
	Use: "delete",
	Run: func(cmd *cobra.Command, args []string) {
		var items []string
		for _, t := range config.Default().Tasks {
			items = append(items, t.Uuid)
		}
		tS := promptui.Select{Label: "Select Sync to Edit", Items: items}
		i, _, e := tS.Run()
		if e != nil {
			log.Fatal(e)
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
			log.Fatal(er)
		}

	},
}

func init() {
	RootCmd.AddCommand(AddCmd, EditCmd, DeleteCmd)
}
