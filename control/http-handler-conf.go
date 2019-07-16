package control

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/pydio/sync/config"
)

func loadConf(i *gin.Context) {
	conf := config.Default()
	i.JSON(200, conf)
}

func updateConf(i *gin.Context) {
	var glob *config.Global
	dec := json.NewDecoder(i.Request.Body)
	if e := dec.Decode(&glob); e != nil {
		i.JSON(500, map[string]interface{}{"error": e.Error()})
		return
	}

	if er := config.Default().UpdateGlobals(glob.Logs, glob.Updates); er != nil {
		i.JSON(500, map[string]interface{}{"error": er.Error()})
	} else {
		i.JSON(200, config.Default())
	}

}
