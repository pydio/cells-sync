package cmd

import (
	"fmt"
	"log"

	"github.com/pydio/cells-sync/config"

	"github.com/kardianos/service"
	"github.com/spf13/cobra"
)

var ServiceCmd = &cobra.Command{
	Use:   "service",
	Short: "Manage service: install,uninstall,stop,start,restart",
	Run: func(cmd *cobra.Command, args []string) {
		if len(args) == 0 {
			log.Fatal("please provide one of install,uninstall,stop,start,restart,status")
		}
		if args[0] == "status" {
			s, e := config.Status()
			if e != nil {
				log.Fatal("Cannot get service status: ", e)
			}
			fmt.Print("Service status : ")
			switch s {
			case service.StatusUnknown:
				fmt.Println("Unknown")
			case service.StatusRunning:
				fmt.Println("Running")
			case service.StatusStopped:
				fmt.Println("Stopped")
			}
			return
		}
		if !config.AllowedServiceCmd(args[0]) {
			log.Fatal(fmt.Errorf("Valid actions are: %q\n", service.ControlAction))
		}
		if err := config.ControlAppService(config.ServiceCmd(args[0])); err != nil {
			log.Fatal(err)
		}
	},
}

func init() {
	RootCmd.AddCommand(ServiceCmd)
}
