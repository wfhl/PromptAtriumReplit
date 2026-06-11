/**
 * React Native compatible image metadata extractor.
 *
 * Works on a base64 payload (from expo-image-picker) — no DOM, File, Blob, or
 * DecompressionStream. It parses the AI-generation metadata that tools embed:
 *   - PNG: uncompressed tEXt and iTXt text chunks (the common A1111/ComfyUI case)
 *   - JPEG: APP1 EXIF UserComment and APP1 XMP dc:description, plus SOFn dims
 *
 * Compressed PNG chunks (zTXt / compressed iTXt) are intentionally NOT inflated
 * — bundling a DEFLATE implementation isn't worth it for a companion app — so we
 * surface a warning instead. WebP support is limited (most tools don't use it).
 */

export type AiGenerator =
  | "stable-diffusion"
  | "midjourney"
  | "comfyui"
  | "dall-e"
  | "unknown";

export interface ExtractedMetadata {
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  width?: number;
  height?: number;
  dimensionString?: string;
  aspectRatio?: string;
  isAIGenerated: boolean;
  aiGenerator: AiGenerator;
  prompt?: string;
  negativePrompt?: string;
  steps?: number;
  cfgScale?: number;
  sampler?: string;
  scheduler?: string;
  seed?: string;
  model?: string;
  mjVersion?: string;
  mjAspectRatio?: string;
  mjChaos?: number;
  mjJobId?: string;
  raw: Record<string, string>;
  warnings: string[];
}

// ---- Byte helpers (Hermes lacks TextDecoder/atob) ----

function base64ToBytes(input: string): Uint8Array {
  const b64 = (input.includes(",") ? input.slice(input.indexOf(",") + 1) : input).replace(
    /[^A-Za-z0-9+/]/g,
    "",
  );
  const lookup = new Int16Array(128).fill(-1);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const out = new Uint8Array(Math.floor((b64.length * 6) / 8));
  let buffer = 0;
  let bits = 0;
  let p = 0;
  for (let i = 0; i < b64.length; i++) {
    const v = lookup[b64.charCodeAt(i)];
    if (v < 0) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[p++] = (buffer >> bits) & 0xff;
    }
  }
  return p === out.length ? out : out.subarray(0, p);
}

function readU32BE(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
}

function readAscii(b: Uint8Array, o: number, len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    const c = b[o + i];
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function utf8Decode(bytes: Uint8Array): string {
  let s = "";
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    const c = bytes[i++];
    if (c < 0x80) {
      s += String.fromCharCode(c);
    } else if (c < 0xe0) {
      s += String.fromCharCode(((c & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (c < 0xf0) {
      s += String.fromCharCode(
        ((c & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f),
      );
    } else {
      const cp =
        ((c & 0x07) << 18) |
        ((bytes[i++] & 0x3f) << 12) |
        ((bytes[i++] & 0x3f) << 6) |
        (bytes[i++] & 0x3f);
      const u = cp - 0x10000;
      s += String.fromCharCode(0xd800 + (u >> 10), 0xdc00 + (u & 0x3ff));
    }
  }
  return s;
}

function latin1Decode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// ---- Parameter parsing (ported from the web extractor) ----

function applyStableDiffusion(params: string, meta: ExtractedMetadata) {
  const promptMatch = params.match(/^([\s\S]*?)(?:Negative prompt:|Steps:|$)/);
  if (promptMatch) {
    const p = promptMatch[1].trim();
    if (p && !p.includes("--v ") && !p.includes("Job ID:")) meta.prompt = p;
  }
  const neg = params.match(/Negative prompt:\s*([\s\S]*?)(?:Steps:|$)/);
  if (neg) meta.negativePrompt = neg[1].trim();
  const steps = params.match(/Steps:\s*(\d+)/i);
  if (steps) meta.steps = parseInt(steps[1], 10);
  const cfg = params.match(/CFG scale:\s*([\d.]+)/i);
  if (cfg) meta.cfgScale = parseFloat(cfg[1]);
  const seed = params.match(/Seed:\s*(\d+)/i);
  if (seed) meta.seed = seed[1];
  const sampler = params.match(/Sampler:\s*([^,\n]+)/i);
  if (sampler) meta.sampler = sampler[1].trim();
  const sched = params.match(/(?:Schedule type|Scheduler):\s*([^,\n]+)/i);
  if (sched) meta.scheduler = sched[1].trim();
  const model = params.match(/Model:\s*([^,\n]+)/i);
  if (model) meta.model = model[1].trim();
}

function applyMidjourney(desc: string, meta: ExtractedMetadata) {
  const promptMatch = desc.match(/^([\s\S]*?)(?:\s--|\sJob ID:|$)/);
  if (promptMatch && promptMatch[1].trim()) {
    const p = promptMatch[1].trim();
    if (!p.includes("Steps:") && !p.includes("CFG scale:")) meta.prompt = p;
  }
  const v = desc.match(/--v\s+(\d+(?:\.\d+)?)/);
  if (v) meta.mjVersion = v[1];
  const ar = desc.match(/--ar\s+(\d+:\d+)/);
  if (ar) meta.mjAspectRatio = ar[1];
  const chaos = desc.match(/--chaos\s+(\d+)/);
  if (chaos) meta.mjChaos = parseInt(chaos[1], 10);
  const job = desc.match(/Job ID:\s*([a-f0-9-]+)/i);
  if (job) meta.mjJobId = job[1];
}

function applyDalle(text: string, meta: ExtractedMetadata) {
  const cleaned = text
    .replace(/DALL[·\-]E\s*\d*/gi, "")
    .replace(/OpenAI/gi, "")
    .trim();
  if (cleaned && !meta.prompt) meta.prompt = cleaned;
}

/** Route a free-form parameter / description string into the right parser. */
function handleParameterText(text: string, key: string, meta: ExtractedMetadata) {
  if (!text) return;
  meta.raw[key] = text.length > 4000 ? text.slice(0, 4000) + "…" : text;

  if (text.includes("Steps:") || text.includes("CFG scale:") || text.includes("Sampler:")) {
    applyStableDiffusion(text, meta);
  }
  if (
    text.includes("--v ") ||
    text.includes("Job ID:") ||
    text.includes("--ar ") ||
    text.includes("--chaos ")
  ) {
    applyMidjourney(text, meta);
  }
  if (text.includes("DALL·E") || text.includes("DALL-E") || text.includes("OpenAI")) {
    applyDalle(text, meta);
  }
  if (!meta.prompt && text.trim()) meta.prompt = text.trim();
}

// ---- PNG ----

function parsePNG(bytes: Uint8Array, meta: ExtractedMetadata) {
  const text: Record<string, string> = {};
  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const len = readU32BE(bytes, pos);
    const type = readAscii(bytes, pos + 4, 4);
    const dataStart = pos + 8;
    if (dataStart + len > bytes.length) break;
    const chunk = bytes.subarray(dataStart, dataStart + len);

    if (type === "IHDR") {
      meta.width = readU32BE(bytes, dataStart);
      meta.height = readU32BE(bytes, dataStart + 4);
    } else if (type === "tEXt") {
      const nul = chunk.indexOf(0);
      if (nul !== -1) {
        text[readAscii(chunk, 0, nul)] = utf8Decode(chunk.subarray(nul + 1));
      }
    } else if (type === "iTXt") {
      const nul = chunk.indexOf(0);
      if (nul !== -1) {
        const keyword = readAscii(chunk, 0, nul);
        const compFlag = chunk[nul + 1];
        let q = nul + 3; // skip compression flag + method
        const langEnd = chunk.indexOf(0, q);
        if (langEnd !== -1) {
          q = langEnd + 1;
          const transEnd = chunk.indexOf(0, q);
          if (transEnd !== -1) {
            q = transEnd + 1;
            if (compFlag === 0) {
              text[keyword] = utf8Decode(chunk.subarray(q));
            } else {
              meta.warnings.push(
                `Compressed iTXt chunk "${keyword}" found but cannot be read in-app.`,
              );
            }
          }
        }
      }
    } else if (type === "zTXt") {
      const nul = chunk.indexOf(0);
      const keyword = nul !== -1 ? readAscii(chunk, 0, nul) : "text";
      meta.warnings.push(
        `Compressed zTXt chunk "${keyword}" found but cannot be read in-app.`,
      );
    }

    if (type === "IEND") break;
    pos = dataStart + len + 4; // + CRC
  }

  const params =
    text["parameters"] ||
    text["Parameters"] ||
    text["Description"] ||
    text["description"] ||
    text["prompt"] ||
    "";
  if (params) handleParameterText(params, "parameters", meta);

  if (text["workflow"]) {
    meta.raw["workflow"] = "ComfyUI workflow JSON (embedded)";
    meta.aiGenerator = "comfyui";
    meta.isAIGenerated = true;
  }
  if (text["prompt"] && !meta.prompt) meta.prompt = text["prompt"];
}

// ---- JPEG ----

function parseExifUserComment(seg: Uint8Array): string | null {
  // seg = "Exif\0\0" + TIFF. TIFF starts at offset 6.
  const tiff = 6;
  if (seg.length < tiff + 8) return null;
  const little = seg[tiff] === 0x49 && seg[tiff + 1] === 0x49;
  const u16 = (o: number) =>
    little ? seg[o] | (seg[o + 1] << 8) : (seg[o] << 8) | seg[o + 1];
  const u32 = (o: number) =>
    (little
      ? seg[o] | (seg[o + 1] << 8) | (seg[o + 2] << 16) | (seg[o + 3] << 24)
      : (seg[o] << 24) | (seg[o + 1] << 16) | (seg[o + 2] << 8) | seg[o + 3]) >>> 0;

  // IFD0
  const ifd0 = u32(tiff + 4);
  const base0 = tiff + ifd0;
  if (base0 + 2 > seg.length) return null;
  const count0 = u16(base0);
  let exifIFD = 0;
  for (let i = 0; i < count0; i++) {
    const entry = base0 + 2 + i * 12;
    if (entry + 12 > seg.length) break;
    if (u16(entry) === 0x8769) {
      exifIFD = u32(entry + 8);
      break;
    }
  }
  if (!exifIFD) return null;

  const baseE = tiff + exifIFD;
  if (baseE + 2 > seg.length) return null;
  const countE = u16(baseE);
  for (let i = 0; i < countE; i++) {
    const entry = baseE + 2 + i * 12;
    if (entry + 12 > seg.length) break;
    if (u16(entry) === 0x9286) {
      const valCount = u32(entry + 4);
      const valOffset = u32(entry + 8);
      const dataStart = tiff + valOffset;
      if (dataStart + valCount > seg.length || valCount <= 8) return null;
      const encoding = readAscii(seg, dataStart, 8);
      const body = seg.subarray(dataStart + 8, dataStart + valCount);
      if (encoding.startsWith("UNICODE")) {
        // UTF-16, endianness follows TIFF byte order
        let s = "";
        for (let j = 0; j + 1 < body.length; j += 2) {
          const code = little ? body[j] | (body[j + 1] << 8) : (body[j] << 8) | body[j + 1];
          if (code === 0) break;
          s += String.fromCharCode(code);
        }
        return s.trim() || null;
      }
      // ASCII / undefined
      return utf8Decode(body).replace(/\0+$/, "").trim() || null;
    }
  }
  return null;
}

function matchXmpDescription(xmp: string): string {
  const m = xmp.match(/<dc:description[\s\S]*?<rdf:li[^>]*>([\s\S]*?)<\/rdf:li>/);
  if (m) return decodeEntities(m[1].trim());
  const m2 = xmp.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/);
  if (m2) return decodeEntities(m2[1].trim());
  return "";
}

function parseJPEG(bytes: Uint8Array, meta: ExtractedMetadata) {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;
    if (marker === 0xffd9 || marker === 0xffda) break; // EOI / SOS
    if (offset + 2 > bytes.length) break;
    const segLen = (bytes[offset] << 8) | bytes[offset + 1];
    if (segLen < 2) break;
    const segStart = offset + 2;
    const seg = bytes.subarray(segStart, Math.min(segStart + segLen - 2, bytes.length));

    if (marker === 0xffe1) {
      const head = readAscii(seg, 0, 6);
      if (head.startsWith("Exif")) {
        const uc = parseExifUserComment(seg);
        if (uc) handleParameterText(uc, "UserComment", meta);
      } else {
        const xmp = latin1Decode(seg);
        if (xmp.includes("<x:xmpmeta") || xmp.includes("<rdf:RDF")) {
          const desc = matchXmpDescription(xmp);
          if (desc) handleParameterText(desc, "xmp", meta);
        }
      }
    } else if (
      marker >= 0xffc0 &&
      marker <= 0xffcf &&
      marker !== 0xffc4 &&
      marker !== 0xffc8 &&
      marker !== 0xffcc
    ) {
      // SOFn: precision(1) height(2) width(2)
      if (seg.length >= 5) {
        meta.height = (seg[1] << 8) | seg[2];
        meta.width = (seg[3] << 8) | seg[4];
      }
    }

    offset = segStart + segLen - 2;
  }
}

// ---- Generator detection ----

function detectGenerator(meta: ExtractedMetadata) {
  if (meta.aiGenerator !== "unknown") {
    meta.isAIGenerated = true;
    return;
  }
  if (meta.mjVersion || meta.mjJobId || meta.mjAspectRatio || meta.mjChaos !== undefined) {
    meta.aiGenerator = "midjourney";
    meta.isAIGenerated = true;
    return;
  }
  if (
    meta.steps !== undefined ||
    meta.cfgScale !== undefined ||
    meta.sampler ||
    meta.negativePrompt
  ) {
    meta.aiGenerator = "stable-diffusion";
    meta.isAIGenerated = true;
    return;
  }
  if (meta.prompt) {
    const p = meta.prompt.toLowerCase();
    if (p.includes("midjourney") || meta.prompt.includes("--v ")) {
      meta.aiGenerator = "midjourney";
      meta.isAIGenerated = true;
    } else if (p.includes("dall-e") || p.includes("dall·e") || p.includes("openai")) {
      meta.aiGenerator = "dall-e";
      meta.isAIGenerated = true;
    }
  }
}

export interface ExtractInput {
  base64: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  width?: number;
  height?: number;
}

export function extractMetadataFromBase64(input: ExtractInput): ExtractedMetadata {
  const meta: ExtractedMetadata = {
    fileName: input.fileName,
    fileSize: input.fileSize,
    fileType: input.mimeType,
    width: input.width,
    height: input.height,
    isAIGenerated: false,
    aiGenerator: "unknown",
    raw: {},
    warnings: [],
  };

  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(input.base64);
  } catch {
    meta.warnings.push("Could not decode the image data.");
    return finalize(meta);
  }

  const isPNG =
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const isJPEG = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8;
  const isWebP =
    bytes.length > 12 &&
    readAscii(bytes, 0, 4) === "RIFF" &&
    readAscii(bytes, 8, 4) === "WEBP";

  try {
    if (isPNG) {
      meta.fileType = meta.fileType || "image/png";
      parsePNG(bytes, meta);
    } else if (isJPEG) {
      meta.fileType = meta.fileType || "image/jpeg";
      parseJPEG(bytes, meta);
    } else if (isWebP) {
      meta.fileType = meta.fileType || "image/webp";
      meta.warnings.push("WebP metadata extraction is limited.");
    } else {
      meta.warnings.push("Unsupported image format for metadata extraction.");
    }
  } catch {
    meta.warnings.push("Failed while reading embedded metadata.");
  }

  detectGenerator(meta);
  return finalize(meta);
}

function finalize(meta: ExtractedMetadata): ExtractedMetadata {
  if (meta.width && meta.height) {
    meta.dimensionString = `${meta.width} × ${meta.height}`;
    const g = gcd(meta.width, meta.height) || 1;
    meta.aspectRatio = `${meta.width / g}:${meta.height / g}`;
  }
  if (!meta.isAIGenerated && Object.keys(meta.raw).length === 0) {
    meta.warnings.push(
      "No AI generation data found. Some apps and platforms strip embedded metadata when saving or sharing.",
    );
  }
  return meta;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
