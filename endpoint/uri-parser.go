package endpoint

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"runtime"
	"strings"

	"github.com/pydio/cells/common/sync/endpoints"
	"github.com/pydio/cells/common/sync/model"
)

// EndpointFromURI parse an URI string to instantiate a proper Endpoint
func EndpointFromURI(uri string, otherUri string) (ep model.Endpoint, e error) {

	u, e := url.Parse(uri)
	if e != nil {
		return nil, e
	}
	otherU, _ := url.Parse(otherUri)

	switch u.Scheme {

	case "fs":
		path := u.Path
		if runtime.GOOS == "windows" {
			parts := strings.Split(path, "/")
			path = parts[1] + ":/" + strings.Join(parts[2:], "/")
		}
		return endpoints.NewFSClient(path)

	case "db":
		return model.NewMemDB(), nil

	case "router":
		options := endpoints.Options{}
		if otherU != nil && otherU.Scheme == "router" {
			options.RenewFolderUuids = true
		}
		return endpoints.NewRouterEndpoint(strings.TrimLeft(u.Path, "/"), options), nil

	case "s3":
		fullPath := u.Path
		parts := strings.Split(fullPath, "/")
		bucket := parts[1]
		parts = parts[2:]
		rootPath := strings.Join(parts, "/")
		if u.User == nil {
			return nil, errors.New("please provide API keys and secret in URL")
		}
		password, _ := u.User.Password()
		values := u.Query()
		normalize := values.Get("normalize") == "true"
		if watch := values.Get("watch"); watch != "" {
			client, e := endpoints.NewS3ClientFSWatch(context.Background(), u.Host, u.User.Username(), password, bucket, rootPath, watch)
			if e != nil {
				return nil, e
			}
			if normalize {
				client.ServerRequiresNormalization = true
			}
			return client, nil
		} else {
			client, e := endpoints.NewS3ClientFSWatch(context.Background(), u.Host, u.User.Username(), password, bucket, rootPath, watch)
			if e != nil {
				return nil, e
			}
			if normalize {
				client.ServerRequiresNormalization = true
			}
			return client, nil
		}

	default:
		return nil, fmt.Errorf("unsupported scheme " + u.Scheme)
	}

}
