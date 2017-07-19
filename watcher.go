package sync

import (
	"fmt"
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
	*common.WatchObject
}

func (w watcher) NextEvent() common.EventInfo {
	return w.WatchObject.NextEvent() // XXX : need to decide on event specification
}

func (w watcher) NextError() error {
	return w.WatchObject.NextError()
}

func (w *watcher) Serve() {
	var err error
	if w.WatchObject, err = w.Watch(normalize(w.path)); err != nil {
		panic(errors.Wrapf(err, "could not watch %s", normalize(w.path)))
	}

	<-w.Done()
}

func (w watcher) Stop() {
	w.Close()
}
