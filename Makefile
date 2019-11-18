ENV=env
TODAY:=$(shell date -u +%Y-%m-%dT%H:%M:%S)
GITREV:=$(shell git rev-parse HEAD)
CELLS_VERSION?=0.2.0
XGO_IMAGE?=pydio/xgo:latest

all: clean pack cli

dep:
	go get github.com/akavel/rsrc
	go get github.com/gobuffalo/packr/packr

cli:
	go build \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	-o cells-sync main.go

win:
	go build \
	-ldflags "-H=windowsgui -X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	-o cells-sync.exe

pack:
	${GOPATH}/bin/packr

rsrc:
	${GOPATH}/bin/rsrc -arch amd64 -ico app/resources/icon.ico

xgo:
	${GOPATH}/bin/xgo -go 1.12 \
	-out "cells-sync" \
	--image  ${XGO_IMAGE} \
	--targets darwin/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/cells-sync

	${GOPATH}/bin/xgo -go 1.12 \
	-out "cells-sync" \
	--image  ${XGO_IMAGE} \
	--targets windows/amd64 \
	-ldflags "-H=windowsgui \
	-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/cells-sync

	${GOPATH}/bin/xgo -go 1.12 \
	-out "cells-sync-noui" \
	--image  ${XGO_IMAGE} \
	--targets windows/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/cells-sync

clean:
	rm -f cells-sync*
	rm -f rsrc.syso
	${GOPATH}/bin/packr clean
	