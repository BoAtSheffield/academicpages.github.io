import { readFile, writeFile, rename } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { readSource, parseNewsArticle, mergePapers } from '../src/sources.js';

const state = JSON.parse(await readFile('data/profile.json', 'utf8'));
const now = new Date().toISOString();
const newsHosts = new Set(['iee.zjgsu.edu.cn', 'kyc.zjgsu.edu.cn', 'news.zjgsu.edu.cn', 'sky.zjgsu.edu.cn']);
const indexes = ['https://iee.zjgsu.edu.cn/', 'https://kyc.zjgsu.edu.cn/main.htm', 'https://news.zjgsu.edu.cn/'];
const headers = { 'User-Agent': 'MaBoAcademicProfile/1.0 (mailto:mabo@zjgsu.edu.cn)' };

async function htmlRead(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}`);
  const redirected = new URL(response.url);
  if (redirected.protocol !== 'https:' || !newsHosts.has(redirected.hostname)) throw new Error('Unexpected news redirect');
  const html = await response.text();
  if (html.length > 2500000) throw new Error('News page exceeds size limit');
  return html;
}

async function newsRead() {
  const known = state.news?.articles || [];
  const candidates = new Set(known.map(item => item.url));
  const results = await Promise.allSettled(indexes.map(async index => {
    const { document } = parseHTML(await htmlRead(index));
    let count = 0;
    for (const link of document.querySelectorAll('a[href]')) {
      const url = new URL(link.getAttribute('href'), index);
      if (!newsHosts.has(url.hostname) || !['http:', 'https:'].includes(url.protocol)) continue;
      url.protocol = 'https:';
      url.hash = '';
      if (!/news\/\d+\.html|\/\d{4}\/\d{4}\/c\d+a\d+\/page\.htm|\/\d+\/view_\d+\.html/.test(url.pathname)) continue;
      candidates.add(url.href);
      if (++count >= 10) break;
    }
  }));
  if (results.every(result => result.status === 'rejected')) throw new Error('All official news indexes unavailable');
  const articles = new Map(known.map(item => [item.url, item]));
  let readable = 0;
  const urls = [...candidates].slice(0, 40);
  for (let offset = 0; offset < urls.length; offset += 4) {
    await Promise.all(urls.slice(offset, offset + 4).map(async url => {
      try {
        const article = parseNewsArticle(await htmlRead(url), url);
        readable++;
        if (article) articles.set(url, article);
      } catch { /* Preserve existing article when this source fails. */ }
    }));
  }
  if (urls.length && !readable) throw new Error('No candidate news articles readable');
  return { articles: [...articles.values()].sort((a, b) => (b.date || '').localeCompare(a.date || '')) };
}

await Promise.all(['school', 'scholar', 'crossref', 'news'].map(async source => {
  const previous = state.sourceStatus[source] || {};
  try {
    const payload = source === 'news' ? await newsRead() : await readSource(source);
    if (source !== 'news' && !payload.papers?.length) throw new Error('No verified paper records; retaining previous snapshot');
    state[source] = payload;
    state.sourceStatus[source] = { updatedAt: now, checkedAt: now, error: null };
    console.log(JSON.stringify({ source, ok: true, count: payload.papers?.length ?? payload.articles?.length }));
  } catch (error) {
    state.sourceStatus[source] = { ...previous, checkedAt: now, error: String(error.message).slice(0, 180) };
    console.log(JSON.stringify({ source, ok: false, retainedPreviousSnapshot: true, error: String(error.message).slice(0, 180) }));
  }
}));
state.total = mergePapers(state.school, state.scholar, state.crossref).length;
state.storageAvailable = true;
state.initialSnapshot = false;
await writeFile('data/profile.json.tmp', JSON.stringify(state, null, 2) + '\n');
await rename('data/profile.json.tmp', 'data/profile.json');
console.log(`Saved ${state.total} papers; source failures preserve prior data.`);
