# Freight baseline

`asset-manifest.csv` records one row for each underlying Freight object referenced by the published Home, Write, and Who bodycopies at capture time. Rows are deduplicated by Freight ID rather than rendition URL.

For each object, the capture records its original URL, Freight ID, filename, HTTP status, media type, byte size, ETag when supplied, cache headers, natural dimensions and codec where applicable, and a full SHA-256 digest. The digests were computed by streaming each public object through the hash function; the 101,965,061 bytes of payload were not retained in the repository.

`remote-asset-probes.csv` is the pre-dimension/pre-hash response inventory retained as capture provenance. `asset-manifest.csv` is the canonical Phase 1 Freight inventory.

The manifest describes assets referenced by the captured published bodycopies. It does not claim to enumerate unreferenced files in Cargo's library; that is a Phase 2 inventory task.
