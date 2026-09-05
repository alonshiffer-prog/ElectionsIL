import assert from 'node:assert/strict';
import test from 'node:test';
import { assertValidPublicationData, validateNews, validatePolls, validateSources } from '../scripts/data-validation.mjs';

const sources = [{ id: 'fictional', name: 'Fictional News', type: 'test', feed: 'https://news.example/feed', enabled: true }];
const story = {
  id: 'fictional-stable-id', title: 'Fictional election test story', source: 'Fictional News', author: '',
  publishedAt: '2026-01-01T00:00:00.000Z', url: 'https://news.example/story', category: 'מפלגות',
  parties: [], people: [], excerpt: 'Fixture excerpt', excerptLabel: 'קטע מתיאור ה־RSS של המקור', cluster: null
};

test('accepts a complete, internally consistent empty-poll publication set', () => {
  assert.doesNotThrow(() => assertValidPublicationData({
    sources,
    news: { updatedAt: '2026-01-01T00:00:00.000Z', stories: [story] },
    polls: { updatedAt: null, parties: ['מפלגת דוגמה א׳'], polls: [] }
  }));
});

test('source validation rejects duplicate identifiers and unsafe feed URLs', () => {
  const errors = validateSources([
    ...sources,
    { ...sources[0], name: 'Another Fictional Source', feed: 'file:///private/feed' }
  ]);
  assert.ok(errors.some(error => error.includes('HTTP(S)')));
  assert.ok(errors.some(error => error.includes('ids must be unique')));
});

test('news validation rejects duplicate ids, unknown sources, unsafe URLs, and incorrect provenance labels', () => {
  const errors = validateNews({
    updatedAt: '2026-01-01T00:00:00.000Z',
    stories: [story, { ...story, source: 'Unknown', url: 'javascript:alert(1)', excerptLabel: 'summary' }]
  }, sources);
  assert.ok(errors.some(error => error.includes('ids must be unique')));
  assert.ok(errors.some(error => error.includes('source registry')));
  assert.ok(errors.some(error => error.includes('HTTP(S)')));
  assert.ok(errors.some(error => error.includes('source-provided RSS excerpt')));
});

test('poll validation requires source provenance and a coherent seat vector', () => {
  const errors = validatePolls({
    updatedAt: '2026-01-01T00:00:00.000Z', parties: ['מפלגת דוגמה א׳', 'מפלגת דוגמה ב׳'],
    polls: [{ id: 'fictional-poll', publisher: 'Fictional Publisher', pollster: 'Fictional Pollster', published: 'bad-date', url: '', seats: [121] }]
  });
  assert.ok(errors.some(error => error.includes('.published')));
  assert.ok(errors.some(error => error.includes('.url')));
  assert.ok(errors.some(error => error.includes('one non-negative integer per party')));
  assert.ok(errors.some(error => error.includes('cannot exceed 120')));
});
