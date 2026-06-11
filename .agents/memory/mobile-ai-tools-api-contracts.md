---
name: Mobile AI tools — public API contracts
description: Non-obvious request-shape contracts the mobile companion must honor when calling the public enhance-prompt and prompt-miner endpoints.
---

# prompt-miner `/analyze` binary path

The server's `/api/prompt-miner/analyze` binary branch requires `taskType: "file"`
(NOT "image") **and** `base64` as a full data URL (`data:<mime>;base64,...`).
It extracts bytes via `dataUrl.split(",")[1]`, which **silently yields `undefined`**
for bare base64 — no error, just an empty/broken provider call. Text/URL uses
`taskType: "text"` with `data`.

**Why:** the mobile UI models the mode as "image" and expo-image-picker returns
*bare* base64 (no prefix). Sending those verbatim returns 400 (wrong taskType) or
silently sends empty image data. This shipped broken once and was only caught in
review because image mode always 400'd.

**How to apply:** keep the translation in `lib/api.ts` `minerAnalyze` — map
"image" → "file" and wrap bare base64 as a data URL. Don't push "image"/raw base64
to the server.

# enhance-prompt POST `/` (public)

- `character` must be an **object** `{ name, description }`. The server checks
  `character.name`; a string is silently ignored (preset does nothing, no error).
- The endpoint is unauthenticated, so cap **every** free-text field that gets
  concatenated into the provider call (`prompt`, `customBasePrompt`, `subject`,
  `character.name/description`) at `MAX_PROMPT_CHARS` — not just `prompt`.
  `strictApiLimiter` bounds request *count*, not request *size*.

**Why:** uncapped `subject`/`character.*` let an anonymous caller amplify per-request
token spend ~1000× past the intended cap under the ~10MB body limit.
