[Homepage](https://pydio.com/) | [Dev Guide](https://pydio.com/en/docs/developer-guide) | [GitHub-Repository](https://github.com/pydio/sync) |
[Issue-Tracker](https://github.com/pydio/sync/issues)

[![License Badge](https://img.shields.io/badge/License-AGPL%203%2B-blue.svg)](LICENSE)
[![GoDoc](https://godoc.org/github.com/pydio/cells?status.svg)](https://godoc.org/github.com/pydio/sync)
[![Build Status](https://travis-ci.org/pydio/cells.svg?branch=master)](https://travis-ci.org/pydio/sync)
[![Go Report Card](https://goreportcard.com/badge/github.com/pydio/sync?rand=1)](https://goreportcard.com/report/github.com/pydio/sync)

Cells Sync is a desktop synchronization client for keeping files offline with Pydio Cells server. 

![Cells Sync](https://github.com/pydio/sync/blob/master/logo.png?raw=true)

## Features

 - 100% GO - Tested on Linux, MacOSX and Windows.
 - Realtime propagation of changes
 - Configurable sync direction (bi-directional / unidirectional)

## Getting Started

### Compiling from sources

#### Pre-requisites

In order to compile and run the Cells-Sync client, you must fulfill the following requirements : 

 - GOLANG developement toolchain properly installed (tested with 1.12 and higher)
 - NodeJS/NPM environment in order to compile the frontend, you need an up-to-date version of NPM (tested with node version 12.X)

#### Compilation instructions

- Get the code: `go get -u github.com/pydio/sync`
- To compile the frontend, enter the `app/` folder and run `npm run build`
- To pack the frontend inside the binary (not mandatory if you are running on the same machine where $GOPATH is available), install github.com/gobufallo/packr/packr tool and run `make clean pack` at the root of the repository.
- Compile binary by running `make ui`

The resulting cells-sync binary should be good to go.

### Using pre-compiled binaries

TODO: list and links to the pre-compiled binaries download server

### Running cells-sync

Once you have downloaded or compiled cells-sync for your platform, simply run `cells-sync`, it should start the system tray icon, and start the synchronization agent in background. If you want to simply run the agent without any UX, run `cells-sync start`

### Other available commands

Use help to display the available commands: 

```
$ ./cells-sync --help
Opens system tray by default

Usage:
  ./cells-sync [flags]
  ./cells-sync [command]

Available Commands:
  add         Add a new sync
  capture     Capture snapshots inside JSON file - do not perform any actual tasks
  delete      Delete existing sync
  edit        Exit existing sync
  help        Help about any command
  start       Start sync tasks
  systray     Launch Systray
  version     Display version
  webview     Launch WebView

Flags:
  -h, --help   help for ./cells-sync

Use "./cells-sync [command] --help" for more information about a command.

```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us. You ca find a comprehensive [Developer Guide](https://pydio.com/en/docs/developer-guide) on our web site. Our online docs are open source as well, feel free to improve them by contributing!

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/pydio/sync/tags).

## Authors

See the list of [contributors](https://github.com/pydio/sync/graphs/contributors) who participated in this project.

## License

This project is licensed under the GPLv3 License - see the [LICENSE](LICENSE) file for details.
