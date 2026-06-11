---
name: Dev image serving (local disk vs GCS)
description: Why dev-uploaded images didn't display and the constraints around the /api/objects/serve route in development.
---

# Dev image serving

In development, uploads land on local disk via `devStorage` (root `cwd/server/uploads`,
types `uploads` / `profile-pictures` / `prompt-images`), NOT Google Cloud Storage. The
active `/api/objects/serve/*servePath` route only reads GCS, so dev images silently
fail to display. The fix is a dev-only fallback inside the serve route's catch block,
gated on `process.env.NODE_ENV === 'development'`, that streams from `devStorage.getFile`.

**Why dev-only is safe:** the api-server `dev` script sets `NODE_ENV=development`; the
deploy config (`.replit-artifact/artifact.toml`) sets `NODE_ENV=production`. Any
`NODE_ENV==='development'`-gated branch is inert in production, so production serving is
provably unaffected — required because prod image upload/display has worked for months
and must not change on republish.

**Serve URL arrives in multiple shapes.** Different frontend components build the serve
URL differently, so the same image can be requested as any of:
`/objects/<type>/<id>`, `//objects/<type>/<id>` (an `encodeURIComponent('/objects/...')`
leading slash decodes to a DOUBLE slash and breaks `getObjectEntityFile`'s
`startsWith('/objects/')` check → it throws → reaches the catch), `/<type>/<id>`,
`<type>/<id>`. A dev fallback must normalize all of them: strip leading slashes, strip a
leading `objects/`, then split into `<type>/<objectId>`.

**`devStorage.getFile(type, objectId)` does NOT sanitize objectId** — it interpolates it
straight into a filesystem path via `path.join`. Any caller that derives objectId from a
request URL MUST reject path traversal (`objectId.includes('..')` / leading `/`).
**Why:** stored ids are UUIDs, so the guard never rejects a legitimate file, but without
it a crafted `uploads%2F..%2F..%2Fetc%2Fpasswd` URL could escape the storage dir.

**How to apply:** when touching object serving, keep prod behavior byte-identical and put
all dev-disk logic behind the NODE_ENV gate; verify with curl through `localhost:80` (the
shared proxy) across all URL shapes plus a traversal attempt, not just one form.
