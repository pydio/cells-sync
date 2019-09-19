package cmd

import (
	"fmt"
	"log"

	"github.com/kardianos/service"
	"github.com/spf13/cobra"
)

var ServiceCmd = &cobra.Command{
	Use:   "service",
	Short: "Manage service: install,uninstall,stop,start,restart",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			log.Fatal("please provide one of install,uninstall,stop,start,restart")
		}
		param := args[0]
		s, err := service.New(&program{}, svcConfig)
		if err != nil {
			log.Fatal(err)
		}
		err = service.Control(s, param)
		if err != nil {
			fmt.Printf("Valid actions: %q\n", service.ControlAction)
			log.Fatal(err)
		}
	},
}

func init() {
	RootCmd.AddCommand(ServiceCmd)
}
