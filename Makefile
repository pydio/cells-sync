DEV_VERSION=0.9.3-dev
ENV=env
TODAY:=$(shell date -u +%Y-%m-%dT%H:%M:%S)
TIMESTAMP:=$(shell date -u +%Y%m%d%H%M%S)
GITREV:=$(shell git rev-parse HEAD)
CELLS_VERSION?="${DEV_VERSION}.${TIMESTAMP}"

XGO_TARGETS?="linux/amd64,darwin/amd64,windows/amd64"
XGO_IMAGE?=techknowlogick/xgo:go-1.17.x
XGO_14_IMG?=techknowlogick/xgo:go-1.14.x
XGO_BIN?=${GOPATH}/bin/xgo

.PHONY: all dev win xgo

all: clean cli

dep:
	go install github.com/akavel/rsrc@latest
# Deprecated in go 17:
#   go get github.com/akavel/rsrc

dev:
	go build \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${DEV_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=2021-01-01T00:00:00 \
	-X github.com/pydio/cells-sync/common.BuildRevision=dev" \
	-o cells-sync main.go

dist:
	go build -a -trimpath \
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

rsrc:
	${GOPATH}/bin/rsrc -arch amd64 -ico app/resources/icon.ico

mod-local:
	go mod edit -replace github.com/pydio/cells/v4=/Users/charles/Sources/go/src/github.com/pydio/cells

mod-update:
	go mod edit -dropreplace github.com/pydio/cells/v4
	go get -d github.com/pydio/cells/v4@main
	GONOSUMDB=* go mod download github.com/pydio/cells/v4
	GONOSUMDB=* go mod tidy

libayatana:
	rm -f cells-sync*
	rm -f rsrc.syso
	go mod edit -replace github.com/getlantern/systray=github.com/nekr0z/systray@v1.1.1-0.20210610115307-891b38719d73
	go mod download github.com/getlantern/systray
	go build \
	 -ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	 -X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	 -X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	 -o cells-sync main.go
	go mod edit -dropreplace github.com/getlantern/systray

# To limit build to a given minimal version of MacOS, rather use:
# --targets darwin-10.11/amd64 \

xgodarwin:
	${XGO_BIN} -go 1.17 \
	-out "cells-sync" \
	--image ${XGO_IMAGE} \
	--targets darwin-11.1/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	.
xgowin:
	${XGO_BIN} -go 1.17 \
	-out "cells-sync" \
	--image ${XGO_IMAGE} \
	--targets windows/amd64 \
	-ldflags "-H=windowsgui \
	-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	.

xgowinnoui:
	${XGO_BIN} -go 1.17 \
	-out "cells-sync-noui" \
	--image ${XGO_IMAGE} \
	--targets windows/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION} \
	-X github.com/pydio/cells-sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/cells-sync/common.BuildRevision=${GITREV}" \
	.

clean:
	rm -f cells-sync*
	rm -f rsrc.syso
