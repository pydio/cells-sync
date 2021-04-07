ENV=env
DEV_VERSION=0.9.3-dev
TODAY:=$(shell date -u +%Y-%m-%dT%H:%M:%S)
TIMESTAMP:=$(shell date -u +%Y%m%d%H%M%S)
GITREV:=$(shell git rev-parse HEAD)
CELLS_VERSION?="${DEV_VERSION}.${TIMESTAMP}"

XGO_IMAGE?=pydio/xgo:1.15.5
XGO_14_IMG?=techknowlogick/xgo:go-1.14.x

all: clean pack cli

dep:
	go get github.com/akavel/rsrc
	go get github.com/gobuffalo/packr/packr

dev:
	go build \
	-ldflags "-X github.com/pydio/cells-sync/common.version=${DEV_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=2021-01-01T00:00:00 \
	-X github.com/pydio/cells-sync/common.BuildRevision=dev" \
	-o cells-sync main.go

cli:
	go build \
	-ldflags "-X github.com/pydio/cells-sync/common.version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	-o cells-sync main.go

win:
	go build \
	-ldflags "-H=windowsgui -X github.com/pydio/cells-sync/common.version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	-o cells-sync.exe

pack:
	${GOPATH}/bin/packr

rsrc:
	${GOPATH}/bin/rsrc -arch amd64 -ico app/resources/icon.ico


# To limit build to a given minimal version of MacOS, rather use:
# --targets darwin-10.11/amd64 \

xgo:
	${GOPATH}/bin/xgo -go 1.15 \
	-out "cells-sync" \
	--image ${XGO_IMAGE} \
	--targets darwin/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/cells-sync

	${GOPATH}/bin/xgo -go 1.14 \
	-out "cells-sync" \
	--image ${XGO_14_IMG} \
	--targets windows/amd64 \
	-ldflags "-H=windowsgui \
	-X github.com/pydio/cells-sync/common.version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/cells-sync

	${GOPATH}/bin/xgo -go 1.14 \
	-out "cells-sync-noui" \
	--image ${XGO_14_IMG} \
	--targets windows/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/cells-sync

clean:
	rm -f cells-sync*
	rm -f rsrc.syso
	${GOPATH}/bin/packr clean
	