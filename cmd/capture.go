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

package cmd

import (
	"context"
	"fmt"
	"log"

	"github.com/spf13/cobra"

	"github.com/pydio/cells/common/service/context"
	"github.com/pydio/cells/common/sync/model"
	"github.com/pydio/cells/common/sync/task"
	"github.com/pydio/sync/config"
	"github.com/pydio/sync/endpoint"
)

var (
	captureTarget string
)

var CaptureCmd = &cobra.Command{
	Use:   "capture",
	Short: "Capture snapshots inside JSON file - do not perform any actual tasks",
	Run: func(cmd *cobra.Command, args []string) {

		if captureTarget == "" {
			log.Fatal("Please provide a target folder for storing JSON files")
		}

		ctx := servicecontext.WithServiceName(context.Background(), "supervisor")
		ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorRest)

		conf := config.Default()
		if len(conf.Tasks) > 0 {
			for _, t := range conf.Tasks {

				leftEndpoint, err := endpoint.EndpointFromURI(t.LeftURI, t.RightURI)
				if err != nil {
					log.Fatal(err.Error())
				}
				rightEndpoint, err := endpoint.EndpointFromURI(t.RightURI, t.LeftURI)
				if err != nil {
					log.Fatal(err.Error())
				}

				var dir model.DirectionType
				switch t.Direction {
				case "Bi":
					dir = model.DirectionBi
				case "Left":
					dir = model.DirectionLeft
				case "Right":
					dir = model.DirectionRight
				default:
					log.Fatal("unsupported direction type, please use one of Bi, Left, Right")
				}

				syncTask := task.NewSync(leftEndpoint, rightEndpoint, dir)
				syncTask.SetSnapshotFactory(endpoint.NewSnapshotFactory(t.Uuid, leftEndpoint, rightEndpoint))
				e := syncTask.Capture(ctx, captureTarget)
				if e != nil {
					log.Fatal(e)
				} else {
					fmt.Println("Captured snapshots inside " + captureTarget)
				}

			}
		}

	},
}

func init() {
	CaptureCmd.Flags().StringVarP(&captureTarget, "folder", "f", "", "Target folder to store JSON captures")
	RootCmd.AddCommand(CaptureCmd)
}
