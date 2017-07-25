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

const root string = ""

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

func (w watcher) wObject() *common.WatchObject { return <-w.chWo }

func (w watcher) Events() <-chan common.EventInfo {
	return w.wObject().Events()
}

func (w watcher) Errors() <-chan error {
	return w.wObject().Errors()
}

func (w *watcher) Serve() {
	w.chHalt = make(chan struct{})

	wo, err := w.Watch(root)
	if err != nil {
		panic(errors.Wrapf(err, "could not watch %s", normalize(w.path)))
	}
	defer wo.Close()

	go func() {
		defer close(w.chWo)
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

	w.chWo = make(chan *common.WatchObject)
}

func (w watcher) Stop() {
	log.Printf("[ WARN ] stopping watch on %s", w.path)
	close(w.chHalt)
}

func newWatcher(w watchable, p string) *watcher {
	return &watcher{watchable: w, path: p, chWo: make(chan *common.WatchObject)}
}
