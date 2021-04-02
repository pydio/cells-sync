module github.com/pydio/cells-sync

go 1.15

replace (
	github.com/etcd-io/bbolt v1.3.6 => github.com/bsinou/bbolt v1.3.6
    github.com/mholt/caddy v1.0.5 =>  github.com/caddyserver/caddy v1.0.5 
    github.com/nats-io/nats v1.10.0 => github.com/nats-io/nats.go v1.10.0
    github.com/pydio/packr v1.30.1 => github.com/gobuffalo/packr v1.30.1
)
