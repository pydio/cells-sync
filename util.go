package sync

import (
	"net/url"

	"github.com/pkg/errors"

	"github.com/pydio/sync/endpoint/fs"
)

// TargetFromURL parses a URL and returns the corresponding Target
func TargetFromURL(u *url.URL) (t Target, err error) {
	var end Endpoint
	switch u.Scheme {
	case "fs":
		end = fs.New(u)
	case "db":
		panic("DB ENDPOINT NOT IMPLEMENTED")
		// end = db.New(u)
		// case "s3", "s3mac":
	case "s3":
		panic("S3 ENDPOINT NOT IMPLEMENTED")
		// NOTE : needs to handle s3 & s3mac
		// end.New(u)
	default:
		err = errors.Errorf("no endpoint for scheme `%s`", u.Scheme)
	}

	if err == nil {
		t = NewTarget(end, u.Path)
	}

	return
}
