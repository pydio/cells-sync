ENV=env
TODAY=`date -u +%Y-%m-%dT%H:%M:%S`
GITREV=`git rev-parse HEAD`

all: tray webview cli

tray:
	go build \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-o sync-tray github.com/pydio/sync/app/systray

webview:
	go build \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-o sync-webview github.com/pydio/sync/app/webview

cli:
	go build \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-o sync-cli main.go

pack:
	${GOPATH}/bin/packr

xgo:
	${GOPATH}/bin/xgo -go 1.12 \
	--targets windows/amd64,darwin/amd64 \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/sync

	${GOPATH}/bin/xgo -go 1.12 \
	--targets windows/amd64,darwin/amd64 \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/sync/app/webview

	${GOPATH}/bin/xgo -go 1.12 \
	--targets windows/amd64,darwin/amd64 \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/sync/app/systray


clean:
	rm -f sync-*
	rm -f systray-*
	rm -f webview-*
	${GOPATH}/bin/packr clean
