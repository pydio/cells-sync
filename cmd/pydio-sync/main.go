package main

import (
	"log"
	"net/url"
	"os"

	"github.com/pkg/errors"
	"github.com/pydio/sync"
	"github.com/pydio/sync/merge/twoway"
	"github.com/thejerf/suture"
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

	targ := make([]sync.Target, len(urls))
	// for i, u := range urls {
	// 	panic("NOT IMPLEMENTED")
	// }

	app := suture.NewSimple("pydio-sync")
	app.Add(sync.Merger{
		MergeStrategy: twoway.New(),
		T:             targ,
	})
}
