import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import { prompts, promptLikes, promptFavorites, promptRatings } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle({ client: pool });

async function safeDelete(promptId: string) {
  await db.delete(promptLikes).where(eq(promptLikes.promptId, promptId)).catch(() => {});
  await db.delete(promptFavorites).where(eq(promptFavorites.promptId, promptId)).catch(() => {});
  await db.delete(promptRatings).where(eq(promptRatings.promptId, promptId)).catch(() => {});
  await db.delete(prompts).where(eq(prompts.id, promptId));
}

function isNotAPrompt(name: string, content: string): string | null {
  const lc = content.toLowerCase();
  const nameLc = name.toLowerCase();

  // 1. Tool namespace definitions (ChatGPT Canvas, DALL-E, Python tool specs)
  if (lc.includes('namespace canmore') || lc.includes('namespace dalle') ||
      lc.includes('type create_textdoc') || lc.includes('type update_textdoc') ||
      (lc.includes('namespace python') && lc.includes('type execute'))) {
    return 'tool_namespace_definition';
  }

  // 2. Platform system configs with tool definitions
  if (lc.includes('knowledge cutoff:') && lc.includes('# tools') && content.length > 3000) {
    return 'platform_system_config';
  }
  if (lc.includes('image input capabilities: enabled') && lc.includes('personality: v2')) {
    return 'platform_system_config';
  }

  // 3. README files and project documentation
  if (nameLc === 'readme' || nameLc.startsWith('readme_') || nameLc === 'releasenotes' || nameLc === 'interlude' || nameLc === 'interludes') {
    return 'readme_or_docs';
  }
  if (content.startsWith('<div align="center">') && (lc.includes('## introduction') || lc.includes('## features') || lc.includes('[!['))) {
    return 'readme_html';
  }
  if (lc.includes('## table of contents') && (lc.includes('## installation') || lc.includes('## license'))) {
    return 'project_documentation';
  }
  if (lc.includes('## getting started') && lc.includes('## features') && (lc.includes('npm install') || lc.includes('pip install'))) {
    return 'project_documentation';
  }

  // 4. Course/tutorial material (not a prompt someone would use)
  const isLargeCourseMaterial = content.length > 10000 && 
    (lc.includes('## module') || lc.includes('## lesson') || lc.includes('## chapter')) &&
    (content.match(/^#{1,3}\s/gm) || []).length > 15;
  if (isLargeCourseMaterial) {
    return 'course_material';
  }

  // 5. Security writeups / academy content
  if (lc.includes('#lfi #hacking') || (lc.includes('academy.hackthebox.com') && content.length > 2000)) {
    return 'security_writeup';
  }

  // 6. Very long docs (>50K chars) that are clearly reference documentation
  if (content.length > 50000) {
    const headerCount = (content.match(/^#{1,3}\s/gm) || []).length;
    if (headerCount > 30) return 'long_reference_docs';
  }

  // 7. Pure JSON schema definitions (not prompts)
  if ((lc.match(/"properties":/g) || []).length > 10 && content.length > 10000 && !lc.includes('you are') && !lc.includes('your role')) {
    return 'json_schema_definition';
  }

  // 8. Content that's clearly release notes or changelogs
  if ((content.match(/^## v?\d+\.\d+/gm) || []).length > 3 || 
      (lc.includes('## changelog') && (content.match(/### v/g) || []).length > 3)) {
    return 'changelog_release_notes';
  }

  // 9. URL-only or link-dump content
  const textWithoutUrls = content.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
  if (textWithoutUrls.length < 50 && content.length > 100) {
    return 'mostly_urls';
  }

  // 10. Git/code diffs
  if ((content.match(/^[+-]{3}\s/gm) || []).length > 5 || 
      (content.match(/^@@\s/gm) || []).length > 3) {
    return 'git_diff';
  }

  // 11. Raw HTML pages (not prompts)
  if (content.startsWith('<!DOCTYPE') || content.startsWith('<html')) {
    return 'raw_html_page';
  }

  // 12. Package.json / config files
  if (content.trim().startsWith('{') && (lc.includes('"dependencies"') || lc.includes('"devdependencies"') || lc.includes('"scripts"'))) {
    return 'package_config';
  }

  // 13. Super long content (>100K) that isn't a system prompt - likely documentation dumps
  if (content.length > 100000 && !lc.startsWith('you are') && !lc.startsWith('your role') && !lc.startsWith('#')) {
    return 'extremely_long_non_prompt';
  }

  return null;
}

async function main() {
  const all = await db.select({ 
    id: prompts.id, 
    name: prompts.name,
    content: prompts.promptContent,
  }).from(prompts);

  console.log('Total prompts to review:', all.length);

  const toRemove: {id: string, name: string, reason: string}[] = [];

  for (const p of all) {
    const reason = isNotAPrompt(p.name, p.content);
    if (reason) {
      toRemove.push({ id: p.id, name: p.name, reason });
    }
  }

  // Group by reason
  const byReason: Record<string, string[]> = {};
  for (const item of toRemove) {
    if (!byReason[item.reason]) byReason[item.reason] = [];
    byReason[item.reason].push(item.name);
  }

  console.log('\n=== Items to Remove ===');
  for (const [reason, names] of Object.entries(byReason).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n${reason}: ${names.length}`);
    for (const n of names.slice(0, 5)) {
      console.log(`  - ${n.substring(0, 70)}`);
    }
    if (names.length > 5) console.log(`  ... and ${names.length - 5} more`);
  }

  console.log(`\nTotal to remove: ${toRemove.length}`);

  // Perform deletion
  let deleted = 0;
  for (const item of toRemove) {
    try {
      await safeDelete(item.id);
      deleted++;
    } catch (e) {
      console.error(`Failed to delete ${item.name}: ${(e as Error).message.substring(0, 80)}`);
    }
  }

  console.log(`\nDeleted: ${deleted}`);
  
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(prompts);
  console.log(`Total prompts remaining: ${count}`);

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
