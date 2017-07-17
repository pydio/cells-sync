# sync

Generic Sync Client
Must be able to sync various data sources providing one or many of the following capabilities : ReadOnly, WriteOnly, ReadWrite, IndexOnly (no actual object data), ObjectStore, Watchable + Versioning? 

E.g: 
 - FS : ReadWrite, ObjectStore, Watchable
 - S3 : ReadWrite, ObjectStore, Watchable
 - Other endpoints implementing any of these interfaces...
 - etc...
 
