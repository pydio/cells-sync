package endpoint

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"runtime"
	"strings"

	"github.com/pydio/cells/common/sync/endpoints/s3"

	"github.com/pydio/cells/common/sync/endpoints/filesystem"

	"github.com/pydio/cells/common/sync/endpoints/cells"

	cells_sdk "github.com/pydio/cells-sdk-go"

	"github.com/pydio/cells/common/sync/model"
)

// EndpointFromURI parse an URI string to instantiate a proper Endpoint
func EndpointFromURI(uri string, otherUri string, browseOnly ...bool) (ep model.Endpoint, e error) {

	u, e := url.Parse(uri)
	if e != nil {
		return nil, e
	}
	otherU, _ := url.Parse(otherUri)
	opts := model.EndpointOptions{}
	if len(browseOnly) > 0 && browseOnly[0] {
		opts.BrowseOnly = true
	}

	switch u.Scheme {

	case "fs":
		path := u.Path
		if runtime.GOOS == "windows" {
			parts := strings.Split(path, "/")
			path = parts[1] + ":/" + strings.Join(parts[2:], "/")
		}
		return filesystem.NewFSClient(path, opts)

	case "db":
		return model.NewMemDB(), nil

	case "router":
		options := cells.Options{
			EndpointOptions:   opts,
			LocalInitRegistry: true,
		}
		if otherU != nil && otherU.Scheme == "router" {
			options.RenewFolderUuids = true
		}
		return cells.NewLocal(strings.TrimLeft(u.Path, "/"), options), nil

	case "http", "https":

		if u.User == nil {
			return nil, errors.New("please provide user credentials in URL")
		}
		values := u.Query()
		clientId := "cells-front"
		clientSecret := ""
		if values.Get("clientSecret") == "" {
			return nil, errors.New("please provide at least the client secret using a ?clientSecret parameter")
		} else {
			clientSecret = values.Get("clientSecret")
		}
		if values.Get("clientId") != "" {
			clientId = values.Get("clientId")
		}
		pass, _ := u.User.Password()
		config := &cells_sdk.SdkConfig{
			Url:           fmt.Sprintf("%s://%s", u.Scheme, u.Host),
			User:          u.User.Username(),
			Password:      pass,
			ClientKey:     clientId,
			ClientSecret:  clientSecret,
			UseTokenCache: true,
		}
		options := cells.Options{
			EndpointOptions: opts,
		}
		return cells.NewRemote(config, strings.TrimLeft(u.Path, "/"), options), nil

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
		client, e := s3.NewClient(context.Background(), u.Host, u.User.Username(), password, bucket, rootPath, opts)
		if e != nil {
			return nil, e
		}
		if normalize {
			client.ServerRequiresNormalization = true
		}
		return client, nil

	default:
		return nil, fmt.Errorf("unsupported scheme " + u.Scheme)
	}

}
