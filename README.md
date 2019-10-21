![Cells Sync](https://github.com/pydio/cells-sync/blob/master/logo.png?raw=true)

[Homepage](https://pydio.com/) | [Dev Guide](https://pydio.com/en/docs/developer-guide) | [GitHub-Repository](https://github.com/pydio/cells-sync) |
[Issue-Tracker](https://github.com/pydio/cells-sync/issues)

[![License Badge](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![GoDoc](https://godoc.org/github.com/pydio/cells?status.svg)](https://godoc.org/github.com/pydio/cells-sync)
[![Build Status](https://travis-ci.org/pydio/cells-sync.svg?branch=master)](https://travis-ci.org/pydio/cells-sync)
[![Go Report Card](https://goreportcard.com/badge/github.com/pydio/cells-sync?rand=2)](https://goreportcard.com/report/github.com/pydio/cells-sync)

Cells Sync is a desktop synchronization client for Pydio Cells server.  

## Features

- 100% GO
- Windows, MacOSX, Linux
- Realtime propagation of changes _(when your local machine can connect to your server)_
- Configurable sync direction (bi-directional / unidirectional)
- Selective Folders synchronization
- Supports various types of end points for syncing (any source/target can be combined):
  - Cells Server (over HTTP/HTTPS)
  - Local Folder
  - Local Cells server (accessed directly if deployed inside the microservices mesh)
  - S3-compatible storage service (tested with AWS S3)
  - BoltDB storage (used for storing tree snapshots)
  - Cells GRPC indexation services (implementing NodeProvider/NodeReceiver grpc endpoints).

## Getting Started

### Compiling from sources

#### Pre-requisites

In order to compile and run the Cells-Sync client, you must fulfill the following requirements:

- GOLANG developement toolchain properly installed (tested with 1.12 and higher)
- NodeJS/NPM environment in order to compile the frontend, you need an up-to-date version of NPM (tested with node version 12.X)

#### Compilation instructions

- Get the code: `go get -u github.com/pydio/cells-sync`
- To compile the frontend, enter the `app/ux/` folder and run `npm run build`
- To pack the frontend inside the binary (not mandatory if you are running on the same machine where $GOPATH is available), install github.com/gobuffalo/packr/packr tool and run `make clean pack` at the root of the repository.
- Compile binary by running `make cli`

The resulting `cells-sync` binary should be good to go.

### Using pre-compiled binaries

Coming soon: list and links to the pre-compiled binaries download server

### Running cells-sync

Once you have downloaded or compiled cells-sync for your platform, simply run:

```sh
./cells-sync start
```

This both starts the system tray icon and the synchronization agent in background. To run the agent without any UX, use `cells-sync start --headless`.

### Other available commands

Use help to display the available commands:

```sh
$ ./cells-sync --help
Usage:
  ./cells-sync [flags]
  ./cells-sync [command]

Available Commands:
  add         Add a new task via command line
  autotest    Basic unidirectional sync between two local folders (under your temporary directory)
  bgstart     Start sync tasks from within service
  capture     Capture snapshots inside JSON file - do not perform any actual tasks
  delete      Delete existing sync via command line
  edit        Exit existing sync via command line
  help        Help about any command
  service     Manage service: install,uninstall,stop,start,restart
  start       Start sync tasks
  systray     Launch Systray
  version     Display version
  webview     Launch WebView

Flags:
  -h, --help   help for ./cells-sync

Use "./cells-sync [command] --help" for more information about a command.
```

## Contributing

Please read [CONTRIBUTING.md](https://github.com/pydio/cells/blob/master/CONTRIBUTING.md) in the Pydio Cells project for details on our code of conduct, and the process for submitting pull requests to us. You can find a comprehensive [Developer Guide](https://pydio.com/en/docs/developer-guide) on our web site. Our online docs are open source as well, feel free to improve them by contributing!

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/pydio/cells-sync/tags).

## Authors

See the list of [contributors](https://github.com/pydio/cells-sync/graphs/contributors) who participated in this project.

## License

This project is licensed under the GPLv3 License - see the [LICENSE](LICENSE) file for details.
