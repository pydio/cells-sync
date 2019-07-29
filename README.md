![Cells Sync](https://github.com/pydio/sync/blob/master/logo.png?raw=true)

# Cells Sync

Cells Sync is a desktop synchronization client for keeping files offline with Pydio Cells server. 

 - 100% GO - Tested on Linux, MacOSX and Windows.
 - Realtime propagation of changes
 - Configurable sync direction (bi-directional / unidirectional)


## Specification

Must be able to sync various data sources providing one or many of the following capabilities : ReadOnly, WriteOnly, ReadWrite, IndexOnly (no actual object data), ObjectStore, Watchable + Versioning? 

## Endpoint examples

 - FS : ReadWrite, ObjectStore, Watchable
 - S3 : ReadWrite, ObjectStore, Watchable
 - Other endpoints implementing any of these interfaces via RPC
 - Composed clients, like Minio = S3 + Watching underlying FS
 - etc...
 
## Path Encoding : 
We make sure that all 'endpoints' will take as input / output only UTF8 - NFC pathes with "/" as path separator. It's the endpoint job to eventually adapt that to the real storage (e.g. windows = \, or mac = NFD)
