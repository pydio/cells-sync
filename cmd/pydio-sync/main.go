package main

import (
	"log"
	"net/url"
	"os"

	"github.com/SentimensRG/sigctx"
	"github.com/pkg/errors"
	"github.com/pydio/sync"
	"github.com/pydio/sync/merge/twoway"
)

func parseURL(args []string) ([]*url.URL, error) {
	var urls = make([]*url.URL, len(args))
	var err error

	for i, a := range args {
		if urls[i], err = url.Parse(a); err != nil {
			return nil, errors.Wrapf(err, "could not parse %s", a)
		}
	}

	return urls, nil
}

func targetsFromURLs(urls []*url.URL) ([]sync.Target, error) {
	var targ = make([]sync.Target, len(urls))
	var err error

	for i, u := range urls {
		if targ[i], err = buildTarget(u); err != nil {
			log.Fatalf("could not build target %s (%s)", u, err)
		}
	}

	return targ, nil
}

func buildTarget(u *url.URL) (t sync.Target, err error) {
	var end sync.Endpoint
	switch u.Scheme {
	case "fs":
		// end = fs.New(u)
	case "db":
		// end = db.New(u)
		// case "s3", "s3mac":
	case "s3":
		// NOTE : needs to handle s3 & s3mac
		// end.New(u)
	default:
		err = errors.Errorf("no endpoint for scheme `%s`", u.Scheme)
	}

	if err != nil {
		t = sync.NewTarget(end)
	}

	return
}

func main() {

	args := os.Args[1:]
	if len(args) != 2 {
		// Restrict to two targets until we implement K-way merging
		log.Fatalf("expected two sync targets, got %d", len(args))
	}

	urls, err := parseURL(args)
	if err != nil {
		log.Fatal(err)
	}

	targ, err := targetsFromURLs(urls)
	if err != nil {
		log.Fatal(err)
	}

	job := sync.New(twoway.New(), targ...)
	job.ServeBackground()
	defer job.Stop()

	<-sigctx.New().Done() // block until SIGINT
}
