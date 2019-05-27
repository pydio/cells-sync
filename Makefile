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

clean:
	rm -f sync-*
	${GOPATH}/bin/packr clean
