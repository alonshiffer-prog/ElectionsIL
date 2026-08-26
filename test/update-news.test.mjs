import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchSource, fetchSources, mergeStories } from '../scripts/update-news.mjs';

const silentLogger = { log() {}, warn() {} };
const source = (id, name = id) => ({ id, name, feed: `https://example.test/${id}` });

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

test('existing stories from a failed source are retained when the result is capped', () => {
  const retained = { url: 'https://original.test/story', source: 'Broken', publishedAt: '2020-01-01T00:00:00.000Z' };
  const fresh = { url: 'https://working.test/new', source: 'Working', publishedAt: '2026-01-01T00:00:00.000Z' };
  const results = [
    { source: source('broken', 'Broken'), succeeded: false, stories: [] },
    { source: source('working', 'Working'), succeeded: true, stories: [fresh] }
  ];
  assert.deepEqual(mergeStories(results, [retained], 1), [retained]);
});
