package common

import (
	"fmt"
)

var (
	Version       = "0.0.0"
	BuildStamp    = ""
	BuildRevision = ""
)

func PrintVersion(appName string) {
	fmt.Println(appName, Version)
	fmt.Println(BuildRevision)
	fmt.Println(BuildStamp)
}
