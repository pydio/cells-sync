ENV=env
TODAY=`date -u +%Y-%m-%dT%H:%M:%S`
GITREV=`git rev-parse HEAD`

all: clean pack ui cli

ui:
	go build \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	--tags app -o cells-sync main.go

cli:
	go build \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-o cells-sync-cli main.go

pack:
	${GOPATH}/bin/packr

xgo:
	${GOPATH}/bin/xgo -go 1.12 -out "cells-sync" \
	--targets darwin/amd64 \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-tags "app" \
	${GOPATH}/src/github.com/pydio/sync

	${GOPATH}/bin/xgo -go 1.12 -out "cells-sync" \
	--targets windows/amd64 \
	-ldflags "-H=windowsgui \
	-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-tags "app" \
	${GOPATH}/src/github.com/pydio/sync

	${GOPATH}/bin/xgo -go 1.12 -out "cells-sync-noui" \
	--targets windows/amd64 \
	-ldflags "-X github.com/pydio/sync/common.Version=0.2.0 \
	-X github.com/pydio/sync/common.BuildStamp=${TODAY} \
	-X github.com/pydio/sync/common.BuildRevision=${GITREV}" \
	-tags "app" \
	${GOPATH}/src/github.com/pydio/sync


clean:
	rm -f cells-sync-*
	${GOPATH}/bin/packr clean