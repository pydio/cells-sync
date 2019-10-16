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
	"os"

	"github.com/spf13/cobra"
)

var shType string

// completionCmd represents the completion command
var completionCmd = &cobra.Command{
	Use:   "completion",
	Short: "Auto completion for Pydio Cells",
	Long: `Completion for Pydio Cells Client
	
	# Add to current session
	source <(cec completion bash)

	# Add to current zsh session
	source <(cec completion zsh)
	
	# Add bashcompletion file (might require sudo)
	cec completion bash > /etc/bash_completion.d/cec

	# Add zshcompletion file
	cec	completion zsh > ~/.zsh/completion/_cec
	`,
	Run: func(cmd *cobra.Command, args []string) {
		cmd.Help()
	},
	ValidArgs: []string{"zsh", "bash"},
}

var bashCompletionCmd = &cobra.Command{
	Use: "bash",
	Run: func(cmd *cobra.Command, args []string) {
		bashAutocomplete()
	},
}

var zshCompletionCmd = &cobra.Command{
	Use: "zsh",
	Run: func(cmd *cobra.Command, args []string) {
		zshAutocomplete()
	},
}

func init() {
	RootCmd.AddCommand(completionCmd)
	completionCmd.AddCommand(bashCompletionCmd)
	completionCmd.AddCommand(zshCompletionCmd)

}

// Reads the bash autocomplete file and prints it to stdout
func bashAutocomplete() {
	RootCmd.GenBashCompletion(os.Stdout)
}

func zshAutocomplete() {
	RootCmd.GenZshCompletion(os.Stdout)
}
