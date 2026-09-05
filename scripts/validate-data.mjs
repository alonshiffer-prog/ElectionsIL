import { readFile } from 'node:fs/promises';
import { assertValidPublicationData } from './data-validation.mjs';

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`${path}: ${error.message}`, { cause: error });
  }
}

const sources = await readJson('public/sources.json');
const news = await readJson('public/data/news.json');
const polls = await readJson('public/data/polls.json');
assertValidPublicationData({ sources, news, polls });
console.log(`✓ ${sources.length} sources valid`);
console.log(`✓ ${news.stories.length} stories valid`);
console.log(`✓ ${polls.polls.length} polls valid`);
