import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { prompts, users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

function generatePromptId(): string {
  return randomBytes(5).toString('hex');
}

interface ParsedPrompt {
  name: string;
  promptContent: string;
  category?: string;
  tags?: string[];
  promptType?: string;
  promptStyle?: string;
  intendedGenerator?: string;
  sourceUrl?: string;
  author?: string;
  notes?: string;
  negativePrompt?: string;
  additionalMetadata?: Record<string, any>;
}

const PROMPTS_DIR = path.join(process.cwd(), 'attached_assets', 'prompts');

const AGGREGATE_JSON_FILES = ['all_prompts.json', 'chatgpt_prompts.json'];
const EXCLUDED_FILES = [
  'all_prompts copy.md',
  'all_prompts.md',
  'chatgpt_prompts.md',
];

function normalizeTags(tags: any): string[] | undefined {
  if (!tags) return undefined;
  if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean);
  if (Array.isArray(tags)) return tags.map(t => String(t).trim()).filter(Boolean);
  return undefined;
}

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

function parseSingleJsonObject(raw: any, fileName: string): ParsedPrompt | null {
  const promptText = raw.promptText || raw.extractedPrompt || raw.prompt || raw.content || '';
  if (!promptText.trim()) return null;

  return {
    name: raw.title || raw.name || fileName.replace(/_/g, ' ').replace(/\.json$/, ''),
    promptContent: promptText,
    category: raw.category || undefined,
    tags: normalizeTags(raw.tags),
    promptType: raw.promptType || undefined,
    promptStyle: raw.promptStyle || undefined,
    intendedGenerator: raw.intendedModel || raw.intendedGenerator || undefined,
    sourceUrl: raw.sourceUrl || undefined,
    author: raw.author || undefined,
    additionalMetadata: {
      originalId: raw.id,
      platform: raw.platform,
      engagementMetrics: raw.engagementMetrics,
      importSource: fileName,
    },
  };
}

// ── Parser 1: Individual JSON files (handles both single objects and arrays) ──
function parseIndividualJson(filePath: string): ParsedPrompt[] {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fileName = path.basename(filePath);

    if (Array.isArray(raw)) {
      const results: ParsedPrompt[] = [];
      for (const item of raw) {
        const parsed = parseSingleJsonObject(item, fileName);
        if (parsed) results.push(parsed);
      }
      if (results.length > 0) {
        console.log(`    ${fileName}: array with ${results.length} prompts`);
      }
      return results;
    }

    const parsed = parseSingleJsonObject(raw, fileName);
    return parsed ? [parsed] : [];
  } catch (e) {
    console.error(`  Error parsing ${filePath}:`, (e as Error).message);
    return [];
  }
}

// ── Parser 2: Aggregate JSON files (all_prompts.json, chatgpt_prompts.json) ──
function parseAggregateJson(filePath: string): ParsedPrompt[] {
  try {
    const data: any[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const fileName = path.basename(filePath);
    const results: ParsedPrompt[] = [];

    for (const entry of data) {
      const content = entry.content || '';
      if (!content.trim()) continue;

      const tags: string[] = [];
      if (entry.category) tags.push(entry.category);
      if (entry.subcategory) tags.push(entry.subcategory);

      results.push({
        name: entry.name || 'Unnamed Prompt',
        promptContent: content,
        category: entry.category || 'Uncategorized',
        tags: tags.length > 0 ? tags : undefined,
        promptType: fileName === 'chatgpt_prompts.json' ? 'System Prompt' : 'Dev Programming',
        additionalMetadata: {
          filePath: entry.file_path,
          importSource: fileName,
        },
      });
    }
    return results;
  } catch (e) {
    console.error(`  Error parsing ${filePath}:`, (e as Error).message);
    return [];
  }
}

// ── Parser 3: BANANA PROMTS.md ──
function parseBananaPrompts(filePath: string): ParsedPrompt[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const results: ParsedPrompt[] = [];

  const caseSections = content.split(/### Case \d+:/);
  for (let i = 1; i < caseSections.length; i++) {
    const section = caseSections[i];
    const titleMatch = section.match(/^\s*\[?([^\]\n(]+)/);
    const caseTitle = titleMatch ? titleMatch[1].trim().replace(/\[|\]/g, '') : `Banana Case ${i}`;

    const authorMatch = section.match(/by\s+[@]?([\w_]+)/i);
    const author = authorMatch ? `@${authorMatch[1]}` : undefined;

    const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
    let match;
    let promptIndex = 0;

    while ((match = codeBlockRegex.exec(section)) !== null) {
      const promptText = match[1].trim();
      if (!promptText || promptText.length < 10) continue;
      if (promptText.startsWith('import ') || promptText.startsWith('pip install') || promptText.startsWith('npm ')) continue;

      promptIndex++;
      const name = promptIndex > 1
        ? `${caseTitle} - Prompt ${promptIndex}`
        : caseTitle;

      results.push({
        name,
        promptContent: promptText,
        category: 'Image Generation',
        tags: ['Nano-Banana', 'Gemini', 'Image Generation'],
        promptType: 'Image Generation',
        author,
        additionalMetadata: {
          importSource: 'BANANA PROMTS.md',
          caseNumber: i,
        },
      });
    }
  }

  return results;
}

// ── Parser 4: Astrological dragon prompts ──
function parseAstrologicalDragons(filePath: string): ParsedPrompt[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const results: ParsedPrompt[] = [];

  const promptSections = content.split(/### \*\*Prompt \d+:/);
  for (let i = 1; i < promptSections.length; i++) {
    const section = promptSections[i];
    const titleMatch = section.match(/^\s*"([^"]+)"/);
    const title = titleMatch ? titleMatch[1] : `Astrological Dragon Prompt ${i}`;

    const idMatch = section.match(/\*\*ID:\s*(\d+)\*\*/);
    const promptId = idMatch ? idMatch[1] : undefined;

    const codeMatch = section.match(/```\n([\s\S]*?)```/);
    if (!codeMatch) continue;

    results.push({
      name: title,
      promptContent: codeMatch[1].trim(),
      category: 'Image Generation',
      tags: ['Astrological', 'Dragon', 'Fantasy', 'WW Pipeline'],
      promptType: 'Image Generation',
      promptStyle: 'Descriptive',
      additionalMetadata: {
        originalId: promptId,
        importSource: 'ChatGPT - Astrological dragon prompts.md',
      },
    });
  }

  return results;
}

// ── Parser 5: Twitter markdown files (PROMPT-Twitter-*.md) ──
function parseTwitterMarkdown(filePath: string): ParsedPrompt[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const results: ParsedPrompt[] = [];

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let tags: string[] = [];
  if (frontmatterMatch) {
    const tagsMatch = frontmatterMatch[1].match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      tags = tagsMatch[1].split(',').map(t => t.trim());
    }
  }

  const titleMatch = content.match(/^#\s+🤖\s+(.+)$/m) || content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(filePath, '.md').replace(/PROMPT-Twitter-\s*/, '');

  const authorMatch = content.match(/\*\*Author:\*\*\s+([^\|]+)/);
  const author = authorMatch ? authorMatch[1].trim() : undefined;

  const modelMatch = content.match(/\*\*Model:\*\*\s+([^\|]+)/);
  const model = modelMatch ? modelMatch[1].trim() : undefined;

  const sourceMatch = content.match(/source:\s+(https?:\/\/\S+)/);
  const sourceUrl = sourceMatch ? sourceMatch[1] : undefined;

  const codeBlockRegex = /```(?:text|json)?\n([\s\S]*?)```/g;
  let match;
  let promptIndex = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const promptText = match[1].trim();
    if (!promptText || promptText.length < 20) continue;

    promptIndex++;
    const name = promptIndex > 1 ? `${title} - Variant ${promptIndex}` : title;

    results.push({
      name,
      promptContent: promptText,
      category: 'Image Generation',
      tags: tags.length > 0 ? tags : ['Twitter', 'Image Generation'],
      promptType: 'Image Generation',
      intendedGenerator: model,
      author,
      sourceUrl,
      additionalMetadata: {
        importSource: path.basename(filePath),
      },
    });
  }

  if (results.length === 0) {
    const promptMatch = content.match(/### 🧞 Extracted Prompt[\s\S]*?```(?:\w*\n)?([\s\S]*?)```/);
    if (promptMatch) {
      results.push({
        name: title,
        promptContent: promptMatch[1].trim(),
        category: 'Image Generation',
        tags: tags.length > 0 ? tags : ['Twitter', 'Image Generation'],
        promptType: 'Image Generation',
        intendedGenerator: model,
        author,
        sourceUrl,
        additionalMetadata: { importSource: path.basename(filePath) },
      });
    }
  }

  return results;
}

// ── Parser 6: REVERSE PROMPT GEN.md ──
function parseReversePromptGen(filePath: string): ParsedPrompt[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const codeMatch = content.match(/```(?:text)?\n([\s\S]*?)```/);
  if (!codeMatch) {
    const lines = content.split('\n').filter(l => !l.startsWith('---') && !l.startsWith('#') && l.trim());
    const text = lines.join('\n').trim();
    if (!text) return [];
    return [{
      name: 'Reverse Prompt Generator',
      promptContent: text,
      category: 'Utility',
      tags: ['Reverse Engineering', 'Prompt Generation', 'Tool'],
      promptType: 'System Prompt',
      additionalMetadata: { importSource: 'REVERSE PROMPT GEN.md' },
    }];
  }

  return [{
    name: 'Reverse Prompt Generator',
    promptContent: codeMatch[1].trim(),
    category: 'Utility',
    tags: ['Reverse Engineering', 'Prompt Generation', 'Tool'],
    promptType: 'System Prompt',
    additionalMetadata: { importSource: 'REVERSE PROMPT GEN.md' },
  }];
}

// ── Parser 7: exteractred prompts.txt ──
function parseExtractedPromptsTxt(filePath: string): ParsedPrompt[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const results: ParsedPrompt[] = [];

  const sections = content.split(/\n{3,}/);
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section || section.length < 20) continue;

    const lines = section.split('\n');
    const promptLines: string[] = [];
    const tags: string[] = [];
    let jsonBlock = '';
    let inJson = false;

    for (const line of lines) {
      if (line.trim().startsWith('{')) inJson = true;
      if (inJson) {
        jsonBlock += line + '\n';
        if (line.trim().startsWith('}')) inJson = false;
        continue;
      }
      if (line.startsWith('#')) {
        tags.push(line.replace(/^#+\s*/, '').trim());
      } else if (line.trim()) {
        promptLines.push(line);
      }
    }

    const promptText = jsonBlock.trim() || promptLines.join('\n').trim();
    if (!promptText) continue;

    const firstLine = promptLines[0] || tags[0] || `Extracted Prompt ${i + 1}`;
    const name = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;

    results.push({
      name: name || `Extracted Prompt ${i + 1}`,
      promptContent: promptText,
      category: 'Image Generation',
      tags: tags.length > 0 ? tags : undefined,
      additionalMetadata: { importSource: 'exteractred prompts.txt' },
    });
  }

  return results;
}

// ── Main import runner ──
async function main() {
  console.log('=== Comprehensive Prompt Import ===\n');

  let systemUserId: string;
  const [existingAdmin] = await db.select().from(users).where(eq(users.role, 'global_admin')).limit(1);
  if (existingAdmin) {
    systemUserId = existingAdmin.id;
    console.log(`Using existing admin user: ${existingAdmin.username || existingAdmin.email || existingAdmin.id}`);
  } else {
    const [anyUser] = await db.select().from(users).limit(1);
    if (anyUser) {
      systemUserId = anyUser.id;
      console.log(`Using existing user: ${anyUser.username || anyUser.email || anyUser.id}`);
    } else {
      console.error('No users found in database. Please create a user first.');
      process.exit(1);
    }
  }

  const allParsed: ParsedPrompt[] = [];
  const files = fs.readdirSync(PROMPTS_DIR).filter(f => !EXCLUDED_FILES.includes(f));

  // 1. Individual JSON files
  console.log('\n── Parsing Individual JSON Files ──');
  const individualJsonFiles = files.filter(f => f.endsWith('.json') && !AGGREGATE_JSON_FILES.includes(f));
  for (const file of individualJsonFiles) {
    const parsed = parseIndividualJson(path.join(PROMPTS_DIR, file));
    allParsed.push(...parsed);
  }
  console.log(`  Found ${individualJsonFiles.length} files → ${allParsed.length} prompts`);

  // 2. Aggregate JSON files
  console.log('\n── Parsing Aggregate JSON Files ──');
  let aggCount = 0;
  for (const file of AGGREGATE_JSON_FILES) {
    const filePath = path.join(PROMPTS_DIR, file);
    if (!fs.existsSync(filePath)) continue;
    const parsed = parseAggregateJson(filePath);
    allParsed.push(...parsed);
    aggCount += parsed.length;
    console.log(`  ${file}: ${parsed.length} prompts`);
  }
  console.log(`  Aggregate total: ${aggCount} prompts`);

  // 3. BANANA PROMTS.md
  console.log('\n── Parsing BANANA PROMTS.md ──');
  const bananaPath = path.join(PROMPTS_DIR, 'BANANA PROMTS.md');
  if (fs.existsSync(bananaPath)) {
    const parsed = parseBananaPrompts(bananaPath);
    allParsed.push(...parsed);
    console.log(`  Found ${parsed.length} prompts`);
  }

  // 4. Astrological dragon prompts
  console.log('\n── Parsing Astrological Dragon Prompts ──');
  const astroPath = path.join(PROMPTS_DIR, 'ChatGPT - Astrological dragon prompts.md');
  if (fs.existsSync(astroPath)) {
    const parsed = parseAstrologicalDragons(astroPath);
    allParsed.push(...parsed);
    console.log(`  Found ${parsed.length} prompts`);
  }

  // 5. Twitter markdown files
  console.log('\n── Parsing Twitter Markdown Files ──');
  const twitterFiles = files.filter(f => f.startsWith('PROMPT-Twitter-'));
  let twitterCount = 0;
  for (const file of twitterFiles) {
    const parsed = parseTwitterMarkdown(path.join(PROMPTS_DIR, file));
    allParsed.push(...parsed);
    twitterCount += parsed.length;
  }
  console.log(`  Found ${twitterFiles.length} files → ${twitterCount} prompts`);

  // 6. REVERSE PROMPT GEN.md
  console.log('\n── Parsing REVERSE PROMPT GEN.md ──');
  const reversePath = path.join(PROMPTS_DIR, 'REVERSE PROMPT GEN.md');
  if (fs.existsSync(reversePath)) {
    const parsed = parseReversePromptGen(reversePath);
    allParsed.push(...parsed);
    console.log(`  Found ${parsed.length} prompts`);
  }

  // 7. exteractred prompts.txt
  console.log('\n── Parsing exteractred prompts.txt ──');
  const extractedPath = path.join(PROMPTS_DIR, 'exteractred prompts.txt');
  if (fs.existsSync(extractedPath)) {
    const parsed = parseExtractedPromptsTxt(extractedPath);
    allParsed.push(...parsed);
    console.log(`  Found ${parsed.length} prompts`);
  }

  console.log(`\n════════════════════════════════`);
  console.log(`Total parsed prompts: ${allParsed.length}`);
  console.log(`════════════════════════════════\n`);

  // Deduplicate by full content hash
  const seen = new Set<string>();
  const deduplicated: ParsedPrompt[] = [];
  for (const p of allParsed) {
    const normalized = normalizeContent(p.promptContent);
    const contentHash = createHash('md5').update(normalized).digest('hex');
    if (seen.has(contentHash)) continue;
    seen.add(contentHash);
    deduplicated.push(p);
  }
  console.log(`After deduplication: ${deduplicated.length} unique prompts (${allParsed.length - deduplicated.length} duplicates removed)\n`);

  // Batch insert
  const BATCH_SIZE = 50;
  let successCount = 0;
  let errorCount = 0;
  const totalBatches = Math.ceil(deduplicated.length / BATCH_SIZE);

  for (let i = 0; i < deduplicated.length; i += BATCH_SIZE) {
    const batch = deduplicated.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;

    const values = batch.map(p => ({
      id: generatePromptId(),
      name: (p.name || 'Unnamed Prompt').substring(0, 255),
      promptContent: p.promptContent,
      category: p.category || 'Uncategorized',
      tags: normalizeTags(p.tags) || [],
      tagsNormalized: (normalizeTags(p.tags) || []).map(t => t.toLowerCase()),
      promptType: p.promptType || null,
      promptStyle: p.promptStyle || null,
      intendedGenerator: p.intendedGenerator || null,
      sourceUrl: p.sourceUrl || null,
      author: p.author || null,
      notes: p.notes || null,
      negativePrompt: p.negativePrompt || null,
      additionalMetadata: p.additionalMetadata || {},
      userId: systemUserId,
      isPublic: true,
      isFeatured: false,
      isHidden: false,
      isNsfw: false,
      status: 'published' as const,
    }));

    try {
      await db.insert(prompts).values(values);
      successCount += batch.length;
      process.stdout.write(`\r  Batch ${batchNum}/${totalBatches} — ${successCount} inserted`);
    } catch (e) {
      console.error(`\n  Batch ${batchNum} failed, falling back to individual inserts...`);
      for (const val of values) {
        try {
          await db.insert(prompts).values(val);
          successCount++;
        } catch (innerErr) {
          errorCount++;
          console.error(`    Failed: "${val.name}" — ${(innerErr as Error).message.substring(0, 100)}`);
        }
      }
    }
  }

  console.log(`\n\n════════════════════════════════`);
  console.log(`Import Complete!`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Errors:     ${errorCount}`);
  console.log(`  Skipped:    ${allParsed.length - deduplicated.length} (duplicates)`);
  console.log(`════════════════════════════════\n`);

  // Verify
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(prompts);
  console.log(`Total prompts in database: ${count}`);

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
