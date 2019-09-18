package config

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

func init() {
	monitors = make(map[string]chan bool)
	monitorsLock = &sync.Mutex{}
}

var (
	monitors     map[string]chan bool
	monitorsLock *sync.Mutex
)

type Authority struct {
	URI          string `json:"uri"`
	IdToken      string `json:"id_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int    `json:"expires_at"`
}

type AuthChange struct {
	Type      string
	Authority *Authority
}

func (a *Authority) RefreshRequired() (in time.Duration, now bool) {
	expTime := time.Unix(int64(a.ExpiresAt), 0)
	in = expTime.Sub(time.Now().Add(30 * time.Second))
	if in <= 0 {
		in = 0
		now = true
		fmt.Println("Token expired, should refresh now")
	} else {
		fmt.Println("Will refresh in", in)
	}
	return
}

func (a *Authority) Refresh() error {

	fmt.Println("Refreshing token for ", a.URI)
	data := url.Values{}
	data.Add("grant_type", "refresh_token")
	data.Add("client_id", "cells-sync")
	data.Add("refresh_token", a.RefreshToken)
	data.Add("scope", "openid email profile pydio offline")
	httpReq, err := http.NewRequest("POST", a.URI+"/oidc/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return err
	}
	httpReq.Header.Add("Content-Type", "application/x-www-form-urlencoded")
	httpReq.Header.Add("Cache-Control", "no-cache")

	client := http.DefaultClient
	res, err := client.Do(httpReq)
	if err != nil {
		return err
	} else if res.StatusCode != 200 {
		bb, _ := ioutil.ReadAll(res.Body)
		return fmt.Errorf("received status code %d - %s", res.StatusCode, string(bb))
	}
	defer res.Body.Close()
	var respMap struct {
		Id      string `json:"id_token"`
		Refresh string `json:"refresh_token"`
		Exp     int    `json:"expires_in"`
	}
	err = json.NewDecoder(res.Body).Decode(&respMap)
	if err != nil {
		return fmt.Errorf("could not unmarshall response with status %d: %s\nerror cause: %s", res.StatusCode, res.Status, err.Error())
	}
	a.IdToken = respMap.Id
	a.RefreshToken = respMap.Refresh
	a.ExpiresAt = int(time.Now().Unix()) + respMap.Exp
	fmt.Println("Got new token, will expire in ", respMap.Exp, " thus expiresAt ", a.ExpiresAt)

	Default().UpdateAuthority(a)

	return nil
}

func monitorToken(a *Authority) {

	var done chan bool
	monitorsLock.Lock()
	if d, ok := monitors[a.URI]; ok {
		done = d
	} else {
		done = make(chan bool, 1)
		monitors[a.URI] = done
	}
	monitorsLock.Unlock()
	d, _ := a.RefreshRequired()
	for {
		select {
		case <-time.After(d):
			if e := a.Refresh(); e != nil {
				fmt.Println(e)
				stopMonitoringToken(a.URI)
			} else {
				monitorToken(a)
			}
			return
		case <-done:
			fmt.Println("Stopping monitor on " + a.URI)
			return
		}
	}
}

func stopMonitoringToken(uri string) {
	monitorsLock.Lock()
	if done, ok := monitors[uri]; ok {
		close(done)
		delete(monitors, uri)
	}
	monitorsLock.Unlock()
}

func (g *Global) PublicAuthorities() []*Authority {
	var p []*Authority
	for _, a := range g.Authorities {
		p = append(p, &Authority{
			URI:       a.URI,
			ExpiresAt: a.ExpiresAt,
		})
	}
	return p
}

func (g *Global) CreateAuthority(a *Authority) error {
	for _, auth := range g.Authorities {
		if auth.URI == a.URI {
			return g.UpdateAuthority(a)
		}
	}
	g.Authorities = append(g.Authorities, a)
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &AuthChange{Type: "create", Authority: a}
			}
		}()
		go monitorToken(a)
	}
	return e
}

func (g *Global) RemoveAuthority(a *Authority) error {
	var newAuths []*Authority
	for _, auth := range g.Authorities {
		if auth.URI != a.URI {
			newAuths = append(newAuths, auth)
		}
	}
	g.Authorities = newAuths
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &AuthChange{Type: "remove", Authority: a}
			}
		}()
		stopMonitoringToken(a.URI)
	}
	return e
}

func (g *Global) UpdateAuthority(a *Authority) error {
	var newAuths []*Authority
	for _, auth := range g.Authorities {
		if auth.URI == a.URI {
			newAuths = append(newAuths, a)
		} else {
			newAuths = append(newAuths, auth)
		}
	}
	g.Authorities = newAuths
	e := Save()
	if e == nil {
		go func() {
			for _, c := range g.changes {
				c <- &AuthChange{Type: "update", Authority: a}
			}
		}()
	}
	return e
}
