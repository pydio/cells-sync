package i18n

import (
	"encoding/json"
	"io"
	"strings"

	"github.com/cloudfoundry/jibber_jabber"
	"github.com/pydio/cells-sync/app"
)

var (
	ss       map[string]string
	jsonLang string
)

func init() {
	ss = make(map[string]string)
	box := app.I18nFS
	var e error
	var lang string
	ietf, e := jibber_jabber.DetectIETF()
	if e != nil {
		ietf = "en-us"
	}
	if strings.Contains(ietf, "-") {
		lang = strings.Split(ietf, "-")[0]
	} else {
		lang = ietf
	}
	ietf = strings.ToLower(ietf)
	lang = strings.ToLower(lang)
	var bb []byte
	if f0, e := box.Open(ietf + ".json"); e == nil {
		bb, _ = io.ReadAll(f0)
		_ = f0.Close()
	} else if f1, e1 := box.Open(lang + ".json"); e1 == nil {
		bb, _ = io.ReadAll(f1)
		_ = f1.Close()
	}
	if bb != nil {
		var data map[string]string
		if err := json.Unmarshal(bb, &data); err == nil {
			ss = data
		}
	}
	jsonLang = lang
}

func T(s string) string {
	if t, ok := ss[s]; ok {
		return t
	} else {
		return s
	}
}

func JsonLang() string {
	return jsonLang
}
