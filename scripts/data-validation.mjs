const EXCERPT_LABEL = 'קטע מתיאור ה־RSS של המקור';
const MAX_EXCERPT_LENGTH = 281;
const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0;

function safeUrl(value) {
  if (!isNonEmptyString(value)) return false;
  try {
    return SAFE_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validDate(value, nullable = false) {
  return (nullable && value === null) || (isNonEmptyString(value) && !Number.isNaN(Date.parse(value)));
}

function unique(values) {
  return new Set(values).size === values.length;
}

function checkKeys(object, allowed, path, errors) {
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) errors.push(`${path}: unexpected field "${key}"`);
  }
}

export function validateSources(data) {
  const errors = [];
  if (!Array.isArray(data) || data.length === 0) return ['sources: expected a non-empty array'];
  data.forEach((source, index) => {
    const path = `sources[${index}]`;
    if (!isObject(source)) return errors.push(`${path}: expected an object`);
    checkKeys(source, ['id', 'name', 'type', 'feed', 'enabled'], path, errors);
    for (const field of ['id', 'name', 'type']) {
      if (!isNonEmptyString(source[field])) errors.push(`${path}.${field}: expected a non-empty string`);
    }
    if (!/^[a-z0-9-]+$/.test(source.id || '')) errors.push(`${path}.id: use lowercase letters, digits, and hyphens only`);
    if (!safeUrl(source.feed)) errors.push(`${path}.feed: expected an absolute HTTP(S) URL`);
    if (typeof source.enabled !== 'boolean') errors.push(`${path}.enabled: expected a boolean`);
  });
  if (!unique(data.map(source => source?.id))) errors.push('sources: ids must be unique');
  if (!unique(data.map(source => source?.name))) errors.push('sources: names must be unique');
  return errors;
}

export function validateNews(data, sources) {
  const errors = [];
  if (!isObject(data)) return ['news: expected an object'];
  checkKeys(data, ['updatedAt', 'stories'], 'news', errors);
  if (!validDate(data.updatedAt, true)) errors.push('news.updatedAt: expected an ISO-compatible date or null');
  if (!Array.isArray(data.stories)) return [...errors, 'news.stories: expected an array'];
  if (data.stories.length > 300) errors.push('news.stories: must contain at most 300 stories');
  const sourceNames = new Set(Array.isArray(sources) ? sources.map(source => source.name) : []);
  data.stories.forEach((story, index) => {
    const path = `news.stories[${index}]`;
    if (!isObject(story)) return errors.push(`${path}: expected an object`);
    checkKeys(story, ['id', 'title', 'source', 'author', 'publishedAt', 'url', 'category', 'parties', 'people', 'excerpt', 'excerptLabel', 'cluster'], path, errors);
    for (const field of ['id', 'title', 'source', 'category']) {
      if (!isNonEmptyString(story[field])) errors.push(`${path}.${field}: expected a non-empty string`);
    }
    if (!sourceNames.has(story.source)) errors.push(`${path}.source: does not match the source registry`);
    if (typeof story.author !== 'string') errors.push(`${path}.author: expected a string`);
    if (!validDate(story.publishedAt)) errors.push(`${path}.publishedAt: expected a valid date`);
    if (!safeUrl(story.url)) errors.push(`${path}.url: expected an absolute HTTP(S) URL`);
    for (const field of ['parties', 'people']) {
      if (!Array.isArray(story[field]) || !story[field].every(isNonEmptyString)) errors.push(`${path}.${field}: expected an array of non-empty strings`);
    }
    if (typeof story.excerpt !== 'string' || story.excerpt.length > MAX_EXCERPT_LENGTH) errors.push(`${path}.excerpt: expected a string of at most ${MAX_EXCERPT_LENGTH} characters`);
    if (story.excerptLabel !== EXCERPT_LABEL) errors.push(`${path}.excerptLabel: must identify the text as a source-provided RSS excerpt`);
    if (story.cluster !== null && !isNonEmptyString(story.cluster)) errors.push(`${path}.cluster: expected a non-empty string or null`);
  });
  const ids = data.stories.map(story => story?.id);
  const urls = data.stories.map(story => story?.url);
  if (!unique(ids)) errors.push('news.stories: ids must be unique');
  if (!unique(urls)) errors.push('news.stories: URLs must be unique');
  return errors;
}

export function validatePolls(data) {
  const errors = [];
  if (!isObject(data)) return ['polls: expected an object'];
  checkKeys(data, ['updatedAt', 'parties', 'polls'], 'polls', errors);
  if (!validDate(data.updatedAt, true)) errors.push('polls.updatedAt: expected an ISO-compatible date or null');
  if (!Array.isArray(data.parties) || !data.parties.every(isNonEmptyString) || !unique(data.parties)) errors.push('polls.parties: expected unique, non-empty strings');
  if (!Array.isArray(data.polls)) return [...errors, 'polls.polls: expected an array'];
  data.polls.forEach((poll, index) => {
    const path = `polls.polls[${index}]`;
    if (!isObject(poll)) return errors.push(`${path}: expected an object`);
    checkKeys(poll, ['id', 'publisher', 'pollster', 'published', 'url', 'seats', 'fieldwork', 'sample', 'margin', 'commissioner', 'mode', 'population', 'undecided', 'threshold', 'notes'], path, errors);
    for (const field of ['id', 'publisher', 'pollster']) {
      if (!isNonEmptyString(poll[field])) errors.push(`${path}.${field}: expected a non-empty string`);
    }
    if (!validDate(poll.published)) errors.push(`${path}.published: expected a valid date`);
    if (!safeUrl(poll.url)) errors.push(`${path}.url: expected a direct absolute HTTP(S) source URL`);
    for (const field of ['fieldwork', 'sample', 'margin', 'commissioner', 'mode', 'population', 'undecided', 'threshold', 'notes']) {
      if (poll[field] !== undefined && typeof poll[field] !== 'string') errors.push(`${path}.${field}: expected a string when supplied`);
    }
    if (!Array.isArray(poll.seats) || poll.seats.length !== data.parties?.length || !poll.seats.every(value => Number.isInteger(value) && value >= 0)) errors.push(`${path}.seats: expected one non-negative integer per party`);
    if (Array.isArray(poll.seats) && poll.seats.reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0) > 120) errors.push(`${path}.seats: total cannot exceed 120`);
  });
  if (!unique(data.polls.map(poll => poll?.id))) errors.push('polls.polls: ids must be unique');
  return errors;
}

export function assertValidPublicationData({ sources, news, polls }) {
  const errors = [...validateSources(sources), ...validateNews(news, sources), ...validatePolls(polls)];
  if (errors.length) throw new Error(`Publication data validation failed:\n- ${errors.join('\n- ')}`);
}
