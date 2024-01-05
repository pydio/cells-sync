DEV_VERSION=0.9.5-dev
ENV=env
TODAY:=$(shell date -u +%Y-%m-%dT%H:%M:%S)
TIMESTAMP:=$(shell date -u +%Y%m%d%H%M%S)
GITREV?=$(shell git rev-parse HEAD)
CELLS_VERSION?="${DEV_VERSION}.${TIMESTAMP}"

XGO_TARGETS?="linux/amd64,darwin/amd64,windows/amd64"
XGO_IMAGE?=techknowlogick/xgo:go-1.19.x
XGO_BIN?=${GOPATH}/bin/xgo

.PHONY: all dev win xgo

all: clean dev

dep:
	go install github.com/akavel/rsrc@latest

dev:
	go build \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${DEV_VERSION}" \
	-o cells-sync

dist:
	go build -a -trimpath \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	-o cells-sync

silicon:
	GOOS=darwin GOARCH=arm64 CGO_ENABLED=1 go build -a -trimpath \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	-o cells-sync-m1

pure:
	CGO_ENABLED=0 go build -a -trimpath --tags pure \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	-o cells-sync-noui

win:
	go build -a -trimpath \
	-ldflags "-H=windowsgui -X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	-o cells-sync.exe

win_pure:
	CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build -a -trimpath --tags pure  \
	-ldflags "-H=windowsgui -X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	-o cells-sync-noui.exe

rsrc:
	${GOPATH}/bin/rsrc -arch amd64 -ico app/resources/icon.ico

mod-local:
	go mod edit -replace github.com/pydio/cells/v4=${GOPATH}/src/github.com/pydio/cells

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
	 -ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	 -o cells-sync .
	go mod edit -dropreplace github.com/getlantern/systray

xgowin:
	${XGO_BIN} -go 1.19 \
	-out "cells-sync" \
	--image ${XGO_IMAGE} \
	--targets windows/amd64 \
	-ldflags "-H=windowsgui \
	-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	.

xgowinnoui:
	${XGO_BIN} -go 1.19 \
	-out "cells-sync-noui" \
	--image ${XGO_IMAGE} \
	--targets windows/amd64 \
	-ldflags "-X github.com/pydio/cells-sync/common.Version=${CELLS_VERSION}" \
	.

clean:
	rm -f cells-sync*
	rm -f rsrc.syso
