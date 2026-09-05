import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { fetchSource, fetchSources, mergeStories, updateNews } from '../scripts/update-news.mjs';

const silentLogger = { log() {}, warn() {} };
const source = (id, name = id) => ({ id, name, type: 'fictional test source', feed: `https://example.test/${id}` });

test('a request has a hard timeout even when the fetch implementation never settles', async () => {
  const result = await fetchSource(source('stalled'), {
    timeoutMs: 20,
    fetchImpl: () => new Promise(() => {}),
    logger: silentLogger
  });
  assert.equal(result.succeeded, false);
  assert.deepEqual(result.stories, []);
});

test('sources are fetched concurrently and one failure does not stop the others', async () => {
  let active = 0;
  let maximumActive = 0;
  const fetchImpl = async url => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise(resolve => setTimeout(resolve, 15));
    active -= 1;
    if (url.endsWith('/bad')) throw new Error('unreachable');
    return { ok: true, text: async () => '<rss />' };
  };
  const parser = { parseString: async () => ({ items: [] }) };
  const results = await fetchSources([source('good'), source('bad'), source('other')], {
    concurrency: 2, fetchImpl, parser, logger: silentLogger
  });
  assert.ok(maximumActive >= 2);
  assert.deepEqual(results.map(result => result.succeeded), [true, false, true]);
});

test('malformed relevant items are rejected without failing valid items in the same feed', async () => {
  const parser = { parseString: async () => ({ items: [
    { title: 'fictional election item', link: 'https://example.test/valid', pubDate: '2026-01-01T00:00:00Z' },
    { title: 'fictional election item', link: 'javascript:unsafe', pubDate: '2026-01-01T00:00:00Z' },
    { title: 'fictional election item', link: 'https://example.test/bad-date', pubDate: 'not-a-date' }
  ] }) };
  const options = { parser, fetchImpl: async () => ({ ok: true, text: async () => '<rss />' }), logger: silentLogger };
  const first = await fetchSource(source('fictional'), options);
  const second = await fetchSource(source('fictional'), options);
  assert.equal(first.succeeded, true);
  assert.equal(first.stories.length, 1);
  assert.match(first.stories[0].id, /^fictional-[A-Za-z0-9_-]{20}$/);
  assert.equal(first.stories[0].id, second.stories[0].id);
});

test('existing stories from a failed source are retained when the result is capped', () => {
  const retained = { url: 'https://original.test/story', source: 'Broken', publishedAt: '2020-01-01T00:00:00.000Z' };
  const fresh = { url: 'https://working.test/new', source: 'Working', publishedAt: '2026-01-01T00:00:00.000Z' };
  const results = [
    { source: source('broken', 'Broken'), succeeded: false, stories: [] },
    { source: source('working', 'Working'), succeeded: true, stories: [fresh] }
  ];
  assert.deepEqual(mergeStories(results, [retained], 1), [retained]);
});

test('all sources failing preserves existing data and rejects the update', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'elections-il-update-'));
  const publicDirectory = join(directory, 'public');
  const dataDirectory = join(publicDirectory, 'data');
  await mkdir(dataDirectory, { recursive: true });
  const newsPath = join(dataDirectory, 'news.json');
  const original = `${JSON.stringify({
    updatedAt: '2026-01-01T00:00:00.000Z',
    stories: [{ source: 'Broken', url: 'https://original.test/story' }]
  }, null, 2)}\n`;
  await writeFile(join(publicDirectory, 'sources.json'), `${JSON.stringify([
    { ...source('broken', 'Broken'), enabled: true }
  ])}\n`);
  await writeFile(newsPath, original);

  try {
    await assert.rejects(
      updateNews({
        root: pathToFileURL(`${directory}/`),
        fetchImpl: async () => { throw new Error('network unavailable'); },
        logger: silentLogger
      }),
      /none of the 1 enabled sources could be fetched/
    );
    assert.equal(await readFile(newsPath, 'utf8'), original);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('a successful update atomically replaces the news file without leaving a temporary file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'elections-il-update-'));
  const publicDirectory = join(directory, 'public');
  const dataDirectory = join(publicDirectory, 'data');
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(join(publicDirectory, 'sources.json'), `${JSON.stringify([
    { ...source('fictional', 'Fictional News'), enabled: true }
  ])}\n`);
  await writeFile(join(dataDirectory, 'news.json'), `${JSON.stringify({ updatedAt: null, stories: [] })}\n`);
  const feedItem = { title: 'Fictional election report', link: 'https://example.test/report', pubDate: '2026-01-01T00:00:00Z' };

  try {
    await updateNews({
      root: pathToFileURL(`${directory}/`),
      fetchImpl: async () => ({ ok: true, text: async () => '<rss />' }),
      logger: silentLogger,
      parser: { parseString: async () => ({ items: [feedItem] }) }
    });
    const saved = JSON.parse(await readFile(join(dataDirectory, 'news.json'), 'utf8'));
    assert.equal(saved.stories.length, 1);
    assert.deepEqual((await readdir(dataDirectory)).sort(), ['news.json']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
