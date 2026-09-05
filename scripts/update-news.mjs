import { createHash } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { validateNews, validateSources } from './data-validation.mjs';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_CONCURRENCY = 3;
const MAX_STORIES = 300;
const electionWords = /בחיר|מפלג|סקר|קואליצ|כנסת|מועמד|election|poll|coalition|knesset|party/i;
const categories = [
  ['סקרים', /סקר|poll/i], ['כלכלה', /כלכל|תקציב|יוקר|econom/i], ['ביטחון', /ביטחון|מלחמ|צבא|security|military/i],
  ['דת ומדינה', /דת ומדינה|שבת|גיור|religion/i], ['מפלגות ערביות', /רע״ם|חד״ש|תע״ל|בל״ד|arab part/i],
  ['מפלגות חרדיות', /ש״ס|יהדות התורה|חרדי|haredi/i], ['משפט וממשל', /משפט|בג״ץ|יועמ״ש|judicial|legal/i],
  ['תרחישי קואליציה', /קואליצ|ממשלה|coalition/i], ['בדיקת עובדות', /בדיקת עובדות|fact.?check/i], ['קמפיינים', /קמפיין|תעמול|campaign/i]
];

const strip = text => (text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const categoryFor = text => categories.find(([, re]) => re.test(text))?.[0] || 'מפלגות';
const errorMessage = error => error instanceof Error ? error.message : String(error);
const storyId = (sourceId, url) => `${sourceId}-${createHash('sha256').update(url).digest('base64url').slice(0, 20)}`;

async function writeJsonAtomically(path, data) {
  const temporaryPath = new URL(`${path.pathname}.tmp-${process.pid}`, path);
  try {
    await writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx' });
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

export async function fetchWithTimeout(url, { timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const response = await Promise.race([
      fetchImpl(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'ElectionsIL/1.0 (public election information aggregator)' }
      }),
      timeout
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    return await Promise.race([response.text(), timeout]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

export async function fetchSource(source, options = {}) {
  const { logger = console, parser, timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch } = options;
  const startedAt = Date.now();
  logger.log(`→ ${source.name}: starting ${source.feed}`);
  try {
    const xml = await fetchWithTimeout(source.feed, { timeoutMs, fetchImpl });
    const feedParser = parser || new (await import('rss-parser')).default();
    const feed = await feedParser.parseString(xml);
    if (!feed || !Array.isArray(feed.items)) throw new Error('feed did not contain an items array');
    const stories = [];
    let rejectedItems = 0;
    for (const item of feed.items.slice(0, 25)) {
      const text = `${item.title || ''} ${strip(item.contentSnippet || item.content || '')}`;
      if (!electionWords.test(text) || !item.link) continue;
      let itemUrl;
      try {
        itemUrl = new URL(item.link);
        if (!['http:', 'https:'].includes(itemUrl.protocol)) throw new Error('unsafe protocol');
      } catch {
        rejectedItems += 1;
        continue;
      }
      const excerpt = strip(item.contentSnippet || item.content || '').slice(0, 280);
      const dateValue = item.isoDate || item.pubDate;
      const publishedAt = new Date(dateValue || Date.now());
      if (dateValue && Number.isNaN(publishedAt.valueOf())) {
        rejectedItems += 1;
        continue;
      }
      stories.push({
        id: storyId(source.id, itemUrl.href),
        title: strip(item.title), source: source.name, author: strip(item.creator || item.author || ''),
        publishedAt: publishedAt.toISOString(), url: itemUrl.href, category: categoryFor(text), parties: [], people: [],
        excerpt: excerpt ? `${excerpt}${excerpt.length === 280 ? '…' : ''}` : '',
        excerptLabel: 'קטע מתיאור ה־RSS של המקור', cluster: null
      });
    }
    logger.log(`✓ ${source.name}: succeeded; ${stories.length} relevant stories, ${rejectedItems} malformed rejected (${Date.now() - startedAt}ms)`);
    return { source, stories, succeeded: true };
  } catch (error) {
    logger.warn(`⚠ ${source.name}: failed after ${Date.now() - startedAt}ms: ${errorMessage(error)}; keeping existing stories`);
    return { source, stories: [], succeeded: false };
  }
}

export async function fetchSources(sources, { concurrency = DEFAULT_CONCURRENCY, ...options } = {}) {
  const results = new Array(sources.length);
  let next = 0;
  async function worker() {
    while (next < sources.length) {
      const index = next++;
      results[index] = await fetchSource(sources[index], options);
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), sources.length) }, worker));
  return results;
}

export function mergeStories(results, existingStories, maxStories = MAX_STORIES) {
  const fetched = results.flatMap(result => result.stories);
  const failedNames = new Set(results.filter(result => !result.succeeded).map(result => result.source.name));
  const protectedStories = existingStories.filter(story => failedNames.has(story.source));
  const unique = stories => stories.filter((story, index, all) => index === all.findIndex(other => other.url === story.url));
  const protectedUrls = new Set(protectedStories.map(story => story.url));
  const otherStories = unique([...fetched, ...existingStories])
    .filter(story => !protectedUrls.has(story.url))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return unique([...protectedStories, ...otherStories.slice(0, Math.max(0, maxStories - protectedStories.length))])
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export async function updateNews({
  root = new URL('../', import.meta.url), logger = console,
  timeoutMs = Number(process.env.FEED_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
  concurrency = Number(process.env.FEED_CONCURRENCY) || DEFAULT_CONCURRENCY,
  fetchImpl = fetch,
  parser
} = {}) {
  const startedAt = Date.now();
  const allSources = JSON.parse(await readFile(new URL('public/sources.json', root), 'utf8'));
  const sourceErrors = validateSources(allSources);
  if (sourceErrors.length) throw new Error(`Invalid source registry:\n- ${sourceErrors.join('\n- ')}`);
  const sources = allSources.filter(source => source.enabled);
  if (sources.length === 0) throw new Error('Invalid source registry: at least one source must be enabled');
  const dataPath = new URL('public/data/news.json', root);
  const existing = JSON.parse(await readFile(dataPath, 'utf8'));
  logger.log(`Updating ${sources.length} enabled sources (concurrency ${concurrency}, timeout ${timeoutMs}ms)`);
  const results = await fetchSources(sources, { concurrency, timeoutMs, fetchImpl, logger, parser });
  const successful = results.filter(result => result.succeeded);
  if (successful.length === 0) {
    logger.warn('No source could be fetched; leaving the existing data file unchanged (no fallback news generated).');
    logger.log(`Update failed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s; 0/${sources.length} sources succeeded.`);
    throw new Error(`Election news update failed: none of the ${sources.length} enabled sources could be fetched`);
  } else {
    const merged = mergeStories(results, existing.stories);
    const fetchedCount = successful.reduce((total, result) => total + result.stories.length, 0);
    const nextData = { updatedAt: new Date().toISOString(), stories: merged };
    const newsErrors = validateNews(nextData, allSources);
    if (newsErrors.length) throw new Error(`Refusing to publish invalid news data:\n- ${newsErrors.join('\n- ')}`);
    await writeJsonAtomically(dataPath, nextData);
    logger.log(`Saved ${merged.length} stories (${fetchedCount} relevant stories fetched).`);
  }
  logger.log(`Update finished in ${((Date.now() - startedAt) / 1000).toFixed(1)}s; ${successful.length}/${sources.length} sources succeeded.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await updateNews();
}
