import { readFile } from 'node:fs/promises';
for (const file of ['public/sources.json','public/data/news.json','public/data/polls.json']) {
  const data=JSON.parse(await readFile(file,'utf8')); if(!data) throw new Error(`${file} is empty`); console.log(`✓ ${file}`);
}
const news=JSON.parse(await readFile('public/data/news.json','utf8'));
for(const story of news.stories){for(const field of ['title','source','publishedAt','url','category','summary'])if(!story[field])throw new Error(`${story.id}: missing ${field}`);new URL(story.url)}
console.log(`✓ ${news.stories.length} stories valid`);
