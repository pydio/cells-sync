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
	"html/template"
	"log"
	"os"
	"runtime"
	"time"

	"github.com/pydio/cells-sync/common"
	"github.com/spf13/cobra"
)

// CellsSyncVersion contains version information for the current running binary
type CellsSyncVersion struct {
	//Distribution string
	PackageLabel string
	Version      string
	BuildTime    string
	GitCommit    string
	OS           string
	Arch         string
	GoVersion    string
}

var cellsVersionTpl = `{{.PackageLabel}}
 Version: 	{{.Version}}
 Built: 	{{.BuildTime}}
 Git commit: 	{{.GitCommit}}
 OS/Arch: 	{{.OS}}/{{.Arch}}
 Go version: 	{{.GoVersion}}
`

var (
	format string
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print version information",
	Long: `
  Print version information.

  You can format the output with a go template using the --format flag.
  Typically, to only output a parsable version, call:

    $ ` + os.Args[0] + ` version -f '{{.Version}}'
 
  As reference, known attributes are:
   - PackageLabel
   - Version
   - BuildTime
   - GitCommit
   - OS
   - Arch
   - GoVersion
	`,
	Run: func(cmd *cobra.Command, args []string) {

		var t time.Time
		if common.BuildStamp != "" {
			t, _ = time.Parse("2006-01-02T15:04:05", common.BuildStamp)
		} else {
			t = time.Now()
		}

		cv := &CellsSyncVersion{
			PackageLabel: common.PackageLabel,
			Version:      common.Version().String(),
			BuildTime:    t.Format(time.RFC822),
			GitCommit:    common.BuildRevision,
			OS:           runtime.GOOS,
			Arch:         runtime.GOARCH,
			GoVersion:    runtime.Version(),
		}

		var runningTmpl string

		if format != "" {
			runningTmpl = format
		} else {
			// Default version template
			runningTmpl = cellsVersionTpl
		}

		tmpl, err := template.New("cells").Parse(runningTmpl)
		if err != nil {
			log.Fatalln("failed to parse template", err)
		}
		if err = tmpl.Execute(os.Stdout, cv); err != nil {
			log.Fatalln("could not execute template", err)
		}

	},
}

func init() {
	RootCmd.AddCommand(versionCmd)
	versionCmd.Flags().StringVarP(&format, "format", "f", "", "Format the output using the given Go template")
}
