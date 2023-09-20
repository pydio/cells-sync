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
	nurl "net/url"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/manifoldco/promptui"
	"github.com/pborman/uuid"
	"github.com/spf13/cobra"

	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/v4/common/log"
)

func exit(err error) {
	if err != nil && err.Error() != "" {
		log.Logger(context.Background()).Error(err.Error())
		os.Exit(1)
	}
	os.Exit(0)
}

var CfgCmd = &cobra.Command{
	Use:   "config",
	Short: "Manage configurations manually",
	Run: func(cmd *cobra.Command, args []string) {
		cmd.Help()
	},
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

var AccountCmd = &cobra.Command{
	Use:   "account",
	Short: "Manage Accounts",
	Long: `
Create or edit an existing account by manually setting a user token instead of going through OAuth Flow.
`,
	Run: func(cmd *cobra.Command, args []string) {
		aa := config.Default().Authorities
		var auth *config.Authority
		var items []string
		for _, a := range aa {
			items = append(items, a.URI)
		}
		items = append(items, "Create a new one")
		tS := promptui.Select{Label: "Select an account to edit or create a new one", Items: items}
		i, _, e := tS.Run()
		if e != nil {
			log.Fatal(e.Error())
		}
		if i <= len(aa)-1 {
			auth = aa[i]
		} else {
			auth = &config.Authority{}
		}
		if auth != nil && auth.Id == "" {
			// Prompt for account data
			if ur, e := (&promptui.Prompt{Label: "Server URL (including https://)", Validate: func(s string) error {
				if s == "" {
					return nil
				}
				_, er := nurl.Parse(s)
				return er
			}}).Run(); e == nil {
				auth.URI = ur
				if strings.HasPrefix(ur, "https") {
					if i, _, _ := (&promptui.Select{Label: "Skip SSL certificate verification (not recommended)?", Items: []string{"No", "Yes"}}).Run(); i == 1 {
						auth.InsecureSkipVerify = true
					}
				}
			} else {
				log.Fatal(e.Error())
			}
			if uname, e := (&promptui.Prompt{Label: "Username"}).Run(); e == nil {
				auth.Username = uname
			} else {
				log.Fatal(e.Error())
			}
			nu, _ := nurl.Parse(auth.URI)
			nu.User = nurl.User(auth.Username)
			auth.Id = nu.String()
		}
		if token, e := (&promptui.Prompt{Label: "Personal Access Token"}).Run(); e == nil {
			auth.AccessToken = token
			auth.RefreshToken = token
			if exp, er := (&promptui.Prompt{Label: "Token expires in... (number of days)"}).Run(); er == nil {
				d, _ := strconv.Atoi(exp)
				auth.ExpiresAt = int(time.Now().Add(time.Hour * 24 * time.Duration(d)).Unix())
			} else {
				log.Fatal(er.Error())
			}
		} else {
			log.Fatal(e.Error())
		}
		if er := config.Default().CreateAuthority(auth); er != nil {
			log.Fatal(er.Error())
		}

	},
}

func init() {
	RootCmd.AddCommand(CfgCmd)
	CfgCmd.AddCommand(AccountCmd, AddCmd, EditCmd, DeleteCmd)
}
