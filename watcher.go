package sync

import (
	"fmt"
	"log"
	"os"
	"runtime"
	"strings"

	"github.com/pkg/errors"
	"github.com/pydio/poc/sync/common"
	"golang.org/x/text/unicode/norm"
)

var normalize func(string) string

func init() {
	clean := func(p string) string {
		return fmt.Sprintf("/%v", strings.TrimLeft(p, common.InternalPathSeparator))
	}

	// OS-specific filepath normalization function
	switch runtime.GOOS {
	case "darwin":
		normalize = func(p string) string {
			return string(norm.NFD.Bytes([]byte(clean(p))))
		}
	case "windows":
		normalize = func(p string) string {
			return strings.Replace(
				clean(p),
				common.InternalPathSeparator,
				string(os.PathSeparator),
				-1,
			)
		}
	default:
		normalize = clean
	}
}

type watchable interface {
	Watch(string) (*common.WatchObject, error)
}

type watcher struct {
	path string
	watchable

	chHalt chan struct{}
	chWo   chan *common.WatchObject
}

func (w watcher) Events() <-chan common.EventInfo {
	return (<-w.chWo).Events()
}

func (w watcher) Errors() <-chan error {
	return (<-w.chWo).Errors()
}

func (w *watcher) init() {
	w.chHalt = make(chan struct{})
	w.chWo = make(chan *common.WatchObject)
}

func (w *watcher) Serve() {
	w.init()

	wo, err := w.Watch(normalize(w.path))
	if err != nil {
		panic(errors.Wrapf(err, "could not watch %s", normalize(w.path)))
	}
	defer wo.Close()

	go func() {
		for {
			select {
			case w.chWo <- wo:
			case <-w.chHalt:
				return
			}
		}
	}()

	log.Printf("[ DEBUG ] starting watch on %s", w.path)
	<-w.chHalt
}

func (w watcher) Stop() {
	log.Printf("[ WARN ] stopping watch on %s", w.path)
	close(w.chHalt)
}
