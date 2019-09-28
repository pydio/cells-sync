package config

import (
	"fmt"
	"net"
	"sync"
)

var (
	httpAddress string
	noAvail     error
	httpOnce    = &sync.Once{}
)

func GetHttpProtocol() string {
	return "http"
}

func GetHttpAddress() (string, error) {
	httpOnce.Do(func() {
		// Todo : allowing outbound connection could be set up in configs - leave host empty in that case
		hostname := "localhost"
		port := 3636
		for ; port <= 3666; port++ {
			l, err := net.Listen("tcp", fmt.Sprintf("%s:%d", hostname, port))
			if err == nil {
				l.Close()
				break
			}
		}
		if port > 3666 {
			noAvail = fmt.Errorf("cannot get any available port between 3636 and 3666, this will be a problem for oidc callback registered in server")
		} else {
			httpAddress = fmt.Sprintf("%s:%d", hostname, port)
		}
	})
	return httpAddress, noAvail
}
