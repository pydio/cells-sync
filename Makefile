ENV=env
TODAY=`date -u +%Y-%m-%dT%H:%M:%S`
GITREV=`git rev-parse HEAD`

all: clean pack ui cli

ui:
	go build \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-o sync-ui github.com/pydio/sync/app/systray

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
	--targets darwin/amd64 \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/sync/app/systray

	${GOPATH}/bin/xgo -go 1.12 \
	--targets windows/amd64 \
	-ldflags "-H=windowsgui \
	-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	${GOPATH}/src/github.com/pydio/sync/app/systray


clean:
	rm -f sync-*
	rm -f systray-*
	${GOPATH}/bin/packr clean