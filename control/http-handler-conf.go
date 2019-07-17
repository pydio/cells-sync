package control

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/pydio/sync/config"
)

func (h *HttpServer) loadConf(i *gin.Context) {
	conf := config.Default()
	i.JSON(http.StatusOK, conf)
}

func (h *HttpServer) updateConf(i *gin.Context) {
	var glob *config.Global
	dec := json.NewDecoder(i.Request.Body)
	if e := dec.Decode(&glob); e != nil {
		h.writeError(i, e)
		return
	}

	if er := config.Default().UpdateGlobals(glob.Logs, glob.Updates); er != nil {
		h.writeError(i, er)
	} else {
		i.JSON(http.StatusOK, config.Default())
	}

}
