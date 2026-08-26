import Parser from 'rss-parser';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sources = JSON.parse(await readFile(new URL('public/sources.json', root), 'utf8'));
const dataPath = new URL('public/data/news.json', root);
const existing = JSON.parse(await readFile(dataPath, 'utf8'));
const parser = new Parser({ timeout: 15000, headers: { 'User-Agent': 'ElectionsIL/1.0 (public election information aggregator)' } });
const electionWords = /בחיר|מפלג|סקר|קואליצ|כנסת|מועמד|election|poll|coalition|knesset|party/i;
const categories = [
  ['סקרים',/סקר|poll/i],['כלכלה',/כלכל|תקציב|יוקר|econom/i],['ביטחון',/ביטחון|מלחמ|צבא|security|military/i],
  ['דת ומדינה',/דת ומדינה|שבת|גיור|religion/i],['מפלגות ערביות',/רע״ם|חד״ש|תע״ל|בל״ד|arab part/i],
  ['מפלגות חרדיות',/ש״ס|יהדות התורה|חרדי|haredi/i],['משפט וממשל',/משפט|בג״ץ|יועמ״ש|judicial|legal/i],
  ['תרחישי קואליציה',/קואליצ|ממשלה|coalition/i],['בדיקת עובדות',/בדיקת עובדות|fact.?check/i],['קמפיינים',/קמפיין|תעמול|campaign/i]
];
const strip = text => (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const categoryFor = text => categories.find(([,re])=>re.test(text))?.[0] || 'מפלגות';
const fetched = [];
let successfulSources = 0;
for (const source of sources.filter(s=>s.enabled)) {
  try {
    const feed = await parser.parseURL(source.feed);
    successfulSources += 1;
    for (const item of feed.items.slice(0, 25)) {
      const text = `${item.title || ''} ${strip(item.contentSnippet || item.content || '')}`;
      if (!electionWords.test(text) || !item.link) continue;
      const excerpt = strip(item.contentSnippet || item.content || '').slice(0, 280);
      fetched.push({ id: `${source.id}-${Buffer.from(item.guid || item.link).toString('base64url').slice(0,30)}`, title: strip(item.title), source: source.name,
        author: strip(item.creator || item.author || ''), publishedAt: new Date(item.isoDate || item.pubDate || Date.now()).toISOString(), url: item.link,
        category: categoryFor(text), parties: [], people: [], excerpt: excerpt ? `${excerpt}${excerpt.length === 280 ? '…' : ''}` : '', excerptLabel: 'קטע מתיאור ה־RSS של המקור', cluster: null });
    }
    console.log(`✓ ${source.name}: feed updated`);
  } catch (error) { console.warn(`⚠ ${source.name}: ${error.message}; keeping existing stories`); }
}
if (successfulSources === 0) {
  console.error('No source could be fetched; leaving the existing data file unchanged.');
  process.exit(1);
}
const merged = [...fetched, ...existing.stories].filter((story,index,all)=>index===all.findIndex(x=>x.url===story.url)).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,300);
await writeFile(dataPath, JSON.stringify({updatedAt:new Date().toISOString(),stories:merged},null,2)+'\n');
console.log(`Saved ${merged.length} stories (${fetched.length} newly fetched).`);
