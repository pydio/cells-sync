package i18n

import (
	"encoding/json"
	"strings"

	"github.com/cloudfoundry/jibber_jabber"
	"github.com/gobuffalo/packr"
)

var (
	ss       map[string]string
	jsonLang string
)

func init() {
	ss = make(map[string]string)
	box := packr.NewBox("../app/ux/src/i18n")
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
	if box.Has(ietf + ".json") {
		bb = box.Bytes(ietf + ".json")
	} else if box.Has(lang + ".json") {
		bb = box.Bytes(lang + ".json")
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
