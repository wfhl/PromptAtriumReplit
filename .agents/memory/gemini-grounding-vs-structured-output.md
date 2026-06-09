---
name: Gemini grounding vs structured output
description: Gemini googleSearch tool cannot be combined with responseMimeType/responseSchema (JSON) — must parse JSON from text.
---

# Gemini: grounding tool and structured output are mutually exclusive

When calling `@google/genai` `generateContent` with `tools: [{ googleSearch: {} }]`,
you CANNOT also set `config.responseMimeType: "application/json"` or
`config.responseSchema`. Doing so returns HTTP 400 `INVALID_ARGUMENT`:
"Tool use with a response mime type: 'application/json' is unsupported".

**Why:** Gemini's structured-output / JSON-mode path and its grounding (search)
path are separate features that the API refuses to combine.

**How to apply:** For grounded calls that need JSON, instruct the model in the
prompt to return a raw JSON array and parse it defensively from `response.text`
(handle raw JSON, ```json fences, and a stray `[ ... ]` slice). This is what the
Prompt Scout feature (`server/services/scoutService.ts`) does.

Also note: model ids expire. `gemini-3-pro-preview` was retired (404 NOT_FOUND);
use a current GA model like `gemini-2.5-pro` for grounded search tasks.
