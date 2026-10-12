// Package logsink adapts cells-sync custom log writers to the Cells v5 URL-based logger configuration.
// [v5-upgrade scratch] v4 log.RegisterWriteSyncer(zapcore.WriteSyncer) became RegisterWriteSyncer(LoggerConfig),
// where outputs are URLs resolved through log.DefaultURLMux(). We register one private scheme per writer.
package logsink

import (
	"context"
	"net/url"

	"go.uber.org/zap/zapcore"

	"github.com/pydio/cells/v5/common/telemetry/log"
	_ "github.com/pydio/cells/v5/common/telemetry/log/file"   // registers file://
	_ "github.com/pydio/cells/v5/common/telemetry/log/stdout" // registers stdout:// (otherwise NO output at all)
	"github.com/pydio/cells/v5/common/telemetry/otel"
)

type opener struct{ ws zapcore.WriteSyncer }

type nopCloser struct{ zapcore.WriteSyncer }

func (nopCloser) Close() error { return nil }

func (o *opener) OpenSync(_ context.Context, _ *url.URL) (log.WriteSyncerCloser, error) {
	return nopCloser{o.ws}, nil
}

// RegisterWriter plugs a zapcore.WriteSyncer as an additional log output (v4 parity).
func RegisterWriter(name string, ws zapcore.WriteSyncer) {
	scheme := "cellssync" + name
	log.DefaultURLMux().RegisterSync(scheme, &opener{ws: ws})
	log.RegisterWriteSyncer(log.LoggerConfig{Encoding: "console", Level: "info", Outputs: []string{scheme + ":///"}})
}

// Init replaces v4 log.Init(logDir): stdout console logger only (v4 LogToFile defaulted to false).
func Init(_ string) {
	log.Init(otel.Service{Name: "cells-sync"}, []log.LoggerConfig{log.DefaultStdoutLogger("info", false)})
}
