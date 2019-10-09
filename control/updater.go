/*
 * Copyright 2019 Abstrium SAS
 *
 *  This file is part of Cells Sync.
 *
 *  Cells Sync is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Cells Sync is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Cells Sync.  If not, see <https://www.gnu.org/licenses/>.
 */

package control

import (
	"context"
	"crypto"
	"crypto/rsa"
	"encoding/asn1"
	"encoding/base64"
	"encoding/pem"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/golang/protobuf/jsonpb"
	"github.com/golang/protobuf/proto"
	"github.com/hashicorp/go-version"
	update2 "github.com/inconshreveable/go-update"

	"github.com/pydio/cells-sync/common"
	"github.com/pydio/cells-sync/config"
	"github.com/pydio/cells/common/log"
	"github.com/pydio/cells/common/proto/update"
	servicecontext "github.com/pydio/cells/common/service/context"
	"github.com/pydio/cells/common/utils/net"
)

// Updater is a supervisor service for checking for available updates
type Updater struct {
	ctx   context.Context
	done  chan bool
	debug bool
}

// NewUpdater creates a new Updater service
func NewUpdater() *Updater {
	ctx := servicecontext.WithServiceName(context.Background(), "update.service")
	ctx = servicecontext.WithServiceColor(ctx, servicecontext.ServiceColorRest)
	return &Updater{
		debug: false,
		ctx:   ctx,
		done:  make(chan bool, 1),
	}
}

func init() {
	// Strange thing here, this proto ENUM is not properly registered.
	proto.RegisterEnum("update.Package_PackageStatus", update.Package_PackageStatus_name, update.Package_PackageStatus_value)
}

// LoadUpdates will post a Json query to the update server to detect if there are any
// updates available
func (u *Updater) LoadUpdates(ctx context.Context, busTopic string) (packages []*update.Package, outErr error) {

	bus := GetBus()
	bus.Pub(&common.UpdateCheckStatus{CheckStatus: "checking"}, busTopic)
	defer func() {
		if outErr != nil {
			bus.Pub(&common.UpdateCheckStatus{
				CheckStatus: "error",
				Error:       outErr.Error(),
			}, busTopic)
		} else {
			var s = "up-to-date"
			if len(packages) > 0 {
				s = "available"
			}
			bus.Pub(&common.UpdateCheckStatus{
				CheckStatus: s,
				Binaries:    packages,
			}, busTopic)
		}
	}()

	conf := config.Default().Updates
	if conf.UpdateUrl == "" {
		outErr = fmt.Errorf("empty server url")
		return
	}
	parsed, outErr := url.Parse(conf.UpdateUrl)
	if outErr != nil {
		return
	}
	if strings.Trim(parsed.Path, "/") == "" {
		parsed.Path = "/a/update-server"
	}
	channel := conf.UpdateChannel
	if channel == "" {
		channel = "stable"
	}

	// Make sure Version is valid
	_, outErr = version.NewVersion(common.Version)
	if outErr != nil {
		return
	}

	request := &update.UpdateRequest{
		PackageName:    common.PackageType,
		Channel:        channel,
		CurrentVersion: common.Version,
		GOOS:           runtime.GOOS,
		GOARCH:         runtime.GOARCH,
	}

	if u.debug {
		log.Logger(ctx).Info("Posting Fake Request for update")
		// Create a fake response
		<-time.After(1 * time.Second)
		packages = append(packages, &update.Package{
			Version:     "1.0.0",
			Label:       "New Release",
			Description: "Bug fixes for 1.X branch",
			ReleaseDate: int32(time.Now().Unix()),
			Status:      update.Package_Released,
			BinaryOS:    runtime.GOOS,
			BinaryArch:  runtime.GOARCH,
			BinaryURL:   "https://fake-dl-url.com/package-name",
			BinarySize:  10 * 1024 * 1024,
			License:     "GPL",
			PackageName: common.PackageType,
		})
		return
	}

	log.Logger(ctx).Info("Posting Request for update")
	var updateResponse update.UpdateResponse
	marshaller := jsonpb.Marshaler{}
	jsonReq, _ := marshaller.MarshalToString(request)
	reader := strings.NewReader(jsonReq)
	response, outErr := http.Post(strings.TrimRight(parsed.String(), "/")+"/", "application/json", reader)
	if outErr != nil {
		return
	}
	if response.StatusCode != 200 {
		outErr = fmt.Errorf("could not connect to the update server, error code was %d", response.StatusCode)
		return
	}
	if outErr = jsonpb.Unmarshal(response.Body, &updateResponse); outErr != nil {
		return
	} else {
		packages = updateResponse.AvailableBinaries
	}

	return

}

// ApplyUpdate uses the info of an update.Package to download the binary and replace
// the current running binary. A restart is necessary afterward.
// The dryRun option will download the binary and just put it in the /tmp folder
func (u *Updater) ApplyUpdate(ctx context.Context, p *update.Package, dryRun bool, busTopic string) {

	var hasError bool
	bus := GetBus()
	pgChan := make(chan float64)
	pgDone := make(chan bool, 1)
	// Monitor progress
	go func() {
		var prevProg float64
		for {
			select {
			case pg := <-pgChan:
				if pg-prevProg > 0.01 {
					bus.Pub(&common.UpdateApplyStatus{
						ApplyStatus: "downloading",
						Package:     p,
						Progress:    float32(pg),
					}, busTopic)
					prevProg = pg
				}
			case <-pgDone:
				return
			}
		}
	}()
	// Handle end of process
	defer func() {
		close(pgDone)
		if hasError {
			return
		}
		bus.Pub(&common.UpdateApplyStatus{
			ApplyStatus: "done",
			Package:     p,
			Progress:    1,
		}, busTopic)
	}()
	// Publish errors to status
	publishError := func(e error) {
		hasError = true
		bus.Pub(&common.UpdateApplyStatus{
			ApplyStatus: "error",
			Package:     p,
			Error:       e.Error(),
			Progress:    0,
		}, busTopic)
	}

	pKey := config.Default().Updates.UpdatePublicKey
	if pKey == "" {
		publishError(fmt.Errorf("empty public key"))
		return
	}
	var pubKey rsa.PublicKey
	if block, _ := pem.Decode([]byte(pKey)); block == nil {
		publishError(fmt.Errorf("cannot decode public key as PEM format"))
		return
	} else if _, err := asn1.Unmarshal(block.Bytes, &pubKey); err != nil {
		publishError(err)
		return
	}

	if u.debug {
		// Make a fake download progress
		size := p.BinarySize
		var i int64
		for i = 0; i < size; i += 1024 {
			pgChan <- float64(i) / float64(size)
			<-time.After(1 * time.Millisecond)
		}
		return
	}

	if resp, err := http.Get(p.BinaryURL); err != nil {
		publishError(err)
		return
	} else {
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			plain, _ := ioutil.ReadAll(resp.Body)
			publishError(fmt.Errorf("error while downloading binary: %s (status %d)", string(plain), resp.StatusCode))
			return
		}

		targetPath := ""
		if dryRun {
			targetPath = filepath.Join(os.TempDir(), "pydio-update")
		}
		if p.BinaryChecksum == "" || p.BinarySignature == "" {
			publishError(fmt.Errorf("Missing checksum and signature infos"))
			return
		}
		checksum, e := base64.StdEncoding.DecodeString(p.BinaryChecksum)
		if e != nil {
			publishError(e)
			return
		}
		signature, e := base64.StdEncoding.DecodeString(p.BinarySignature)
		if e != nil {
			publishError(e)
			return
		}

		dataDir := config.SyncClientDataDir()
		oldPath := filepath.Join(dataDir, "backups", "revision-"+common.BuildStamp)
		err := os.MkdirAll(filepath.Join(dataDir, "backups"), 0755)
		if err != nil {
			oldPath = filepath.Join(dataDir, "revision-"+common.BuildStamp)
		}
		reader := net.BodyWithProgressMonitor(resp, pgChan, nil)

		er := update2.Apply(reader, update2.Options{
			Checksum:    checksum,
			Signature:   signature,
			TargetPath:  targetPath,
			OldSavePath: oldPath,
			Hash:        crypto.SHA256,
			PublicKey:   &pubKey,
			Verifier:    update2.NewRSAVerifier(),
		})
		if er != nil {
			publishError(er)
		}
		return
	}

}

func (u *Updater) dispatch(done chan bool) {
	ch := GetBus().Sub(TopicUpdate)
	defer func() {
		GetBus().Unsub(ch, TopicUpdate)
	}()
	for {
		select {
		case msg := <-ch:
			if _, ok := msg.(*common.UpdateCheckRequest); ok {
				go u.LoadUpdates(u.ctx, TopicUpdate)
			} else if apply, ok2 := msg.(*common.UpdateApplyRequest); ok2 {
				if apply.Package != nil {
					go u.ApplyUpdate(u.ctx, apply.Package, apply.DryRun, TopicUpdate)
				} else {
					log.Logger(u.ctx).Error("Apply request provided with empty package!")
				}
			}
		case <-done:
			return
		}
	}
}

// Serve implements supervisor interface.
func (u *Updater) Serve() {
	log.Logger(u.ctx).Info("Starting Updater Service")
	dispatchFinished := make(chan bool, 1)
	go u.dispatch(dispatchFinished)
	if config.Default().Updates.Frequency == "restart" {
		go func() {
			<-time.After(3 * time.Second)
			u.LoadUpdates(u.ctx, TopicUpdate)
		}()
	}
	<-u.done
	close(dispatchFinished)
}

// Stop implements supervisor interface.
func (u *Updater) Stop() {
	log.Logger(u.ctx).Info("Stopping Updater Service")
	u.done <- true
}
