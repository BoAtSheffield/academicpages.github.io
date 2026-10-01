import { parseHTML } from 'linkedom';

export const SOURCES = {
  school: 'https://mypage.zjgsu.edu.cn/iee/mb2/main.htm',
  scholar: 'https://scholar.google.com/citations?user=Of3da04AAAAJ&hl=zh-CN',
  crossref: 'https://orcid.org/0000-0001-9522-5920',
  news: 'https://iee.zjgsu.edu.cn/',
};
export const CROSSREF_API='https://api.crossref.org/works?filter=orcid:0000-0001-9522-5920&rows=100';
export const clean = s => String(s || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
export const canonicalTitle = s => clean(s).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const text = el => clean(el?.textContent);
const paragraphs = el => [...(el?.querySelectorAll('p') || [])].map(text).filter(Boolean);

export function parseSchool(html) {
  const { document } = parseHTML(html);
  if (![...document.querySelectorAll('.news_title')].some(e => text(e) === '马博')) throw new Error('学校主页身份核验未通过');
  const sections = {};
  for (const box of document.querySelectorAll('.c6-wz')) {
    const heading = text(box.querySelector('h3'));
    const content = box.querySelector('.c6-con');
    if (heading && content) sections[heading] = { text: text(content), paragraphs: paragraphs(content) };
  }
  if (!sections['个人简介'] || !sections['发表论文']) throw new Error('学校主页结构发生变化');
  const intro = sections['个人简介'].paragraphs;
  const header = text(document.querySelector('.m2-right'));
  const schoolPapers = [];
  const pubBox = [...document.querySelectorAll('.c6-wz')].find(e => text(e.querySelector('h3')) === '发表论文');
  for (const p of pubBox?.querySelectorAll('.c6-con p') || []) {
    const line = text(p);
    if (!line || /Selected Publications|IEEE科研主页/.test(line)) continue;
    const em = p.querySelector('i, em');
    if (em && text(em)) {
      const journal = text(em);
      const before = line.slice(0, line.indexOf(journal)).replace(/\.$/, '').trim();
      let title = before;
      let authors = '';
      const split = before.match(/^(.+?(?:[A-Za-z]{2,}|[\p{Script=Han}]{2,})\*?[.。]\s*)(.+)$/u);
      if (split) { authors = split[1].replace(/[.。]\s*$/, ''); title = split[2]; }
      const year = (line.match(/\b(20\d{2})\b/g) || []).at(-1) || '';
      const validLinks = [...p.querySelectorAll('a')].map(a => a.getAttribute('href')).filter(u => /^https:\/\/(doi\.org|ieeexplore\.ieee\.org|www\.ejournal\.org\.cn|link\.springer\.com)/.test(u || ''));
      if (!/TRGE: A Backdoor Detection/i.test(line)) schoolPapers.push({ title: title.replace(/[.。]\s*$/, ''), authors, journal, year, citations: null, url: validLinks[0] || SOURCES.school, source: 'school', raw: line });
    }
  }
  // Chinese and conference entries sometimes use only styled spans rather than journal italics.
  for (const p of pubBox?.querySelectorAll('.c6-con p') || []) {
    const line = text(p);
    if (/云边端异构算力网络计算任务分割与路径优化方法研究/.test(line)) schoolPapers.push({title:'云边端异构算力网络计算任务分割与路径优化方法研究',authors:line.split('云边端')[0].replace(/[.*。\s]+$/, ''),journal:'电子学报',year:(line.match(/\b20\d{2}\b/) || [''])[0],url:SOURCES.school,source:'school',raw:line});
    if (/多模态网络分布式控制平面负载均衡研究/.test(line)) schoolPapers.push({title:'多模态网络分布式控制平面负载均衡研究',authors:line.split('多模态')[0].replace(/[.*。\s]+$/, ''),journal:'电子学报',year:(line.match(/\b20\d{2}\b/) || [''])[0],url:SOURCES.school,source:'school',raw:line});
    if (/TRGE: A Backdoor Detection After Quantization/i.test(line)) schoolPapers.push({title:'TRGE: A Backdoor Detection After Quantization',authors:'R. Xie, X. Fang, B. Ma, C. Li, X. Yuan',journal:'Information Security and Cryptology · Inscrypt 2023',year:'2023',url:SOURCES.school,source:'school',raw:line});
  }
  return {
    name: '马博', role: clean([...([...document.querySelectorAll('.news_title')].find(e=>text(e)==='马博')?.parentElement.querySelectorAll('.grzl .txt') || [])].map(text).join(' · ')) || '副教授 · 硕士生导师',
    intro, research: sections['研究方向'].text,
    email: (header.match(/mabo(?:@|@mail\.)zjgsu\.edu\.cn/) || ['mabo@zjgsu.edu.cn'])[0],
    teaching: intro.find(s => /主讲/.test(s)) || '',
    recruitment: intro.find(s => /欢迎对/.test(s)) || '',
    education: sections['教育经历']?.text || '',
    projects: sections['纵向科研']?.paragraphs || [],
    awards: sections['荣誉及奖励']?.paragraphs || [],
    service: sections['学术兼职']?.paragraphs || [],
    papers: [...new Map(schoolPapers.map(p=>[canonicalTitle(p.title),p])).values()],
    sourceUrl: SOURCES.school,
  };
}

export function parseScholar(html) {
  const { document } = parseHTML(html);
  const name = text(document.querySelector('#gsc_prf_in'));
  const homepage = [...document.querySelectorAll('#gsc_prf a')].some(a => a.getAttribute('href') === SOURCES.school);
  const affiliation = text(document.querySelector('#gsc_prf'));
  if (!/Bo Ma|马博/.test(name) || (!homepage && !/Zhejiang Gongshang|浙江工商/.test(affiliation))) throw new Error('Scholar 学者身份核验未通过');
  const papers = [...document.querySelectorAll('.gsc_a_tr')].map(row => {
    const a = row.querySelector('.gsc_a_at');
    const gray = [...row.querySelectorAll('.gs_gray')];
    const href = a?.getAttribute('href');
    return { title: text(a), authors: text(gray[0]), journal: text(gray[1]), year: text(row.querySelector('.gsc_a_y')), citations: Number(text(row.querySelector('.gsc_a_ac'))) || 0, url: href ? new URL(href, 'https://scholar.google.com').href : SOURCES.scholar, source:'scholar' };
  }).filter(p => p.title);
  if (!papers.length) throw new Error('Scholar 暂不可读取，保留上次记录');
  const metrics = [...document.querySelectorAll('#gsc_rsb_st tbody tr')].map(row => [...row.querySelectorAll('td')].map(text));
  const more = document.querySelector('#gsc_bpf_more');
  const hasMore = !!more && !more.hasAttribute('disabled');
  return { name, papers, metrics: { citations: Number(metrics[0]?.[1]) || 0, hIndex:Number(metrics[1]?.[1]) || 0, i10Index: Number(metrics[2]?.[1]) || 0 }, hasMore, sourceUrl:SOURCES.scholar };
}

export function mergePapers(school, scholar, crossref) {
  const byTitle = new Map();
  for (const p of scholar?.papers || []) byTitle.set(canonicalTitle(p.title), {...p, sources:['scholar']});
  for (const p of school?.papers || []) {
    const key = canonicalTitle(p.title);
    if (byTitle.has(key)) { const existing = byTitle.get(key); existing.sources = [...new Set([...existing.sources, 'school'])]; }
    else byTitle.set(key, {...p,sources:['school']});
  }
  for(const p of crossref?.papers || []) {
    const key=canonicalTitle(p.title);
    let matched=byTitle.get(key);
    if(!matched && key.length>60) {
      // Publisher metadata occasionally has a one-letter typo (AAV/UAV).
      const close=[...byTitle.entries()].filter(([k])=>k.length===key.length && [...key].filter((c,i)=>c!==k[i]).length===1);
      if(close.length===1)matched=close[0][1];
    }
    if(matched){matched.doi=p.doi;matched.sources=[...new Set([...matched.sources,'crossref'])];}
    else byTitle.set(key,{...p,sources:['crossref']});
  }
  return [...byTitle.values()].sort((a,b) => (Number(b.year)||0)-(Number(a.year)||0) || (b.citations||0)-(a.citations||0));
}

export function parseCrossref(data) {
  const message=data?.message;
  if(!Array.isArray(message?.items))throw new Error('出版社记录格式不可读取');
  const papers=message.items.filter(p=>p.author?.some(a=>a.ORCID?.replace(/^http:/,'https:')===SOURCES.crossref && /^(Bo|B\.?)$/i.test(a.given||'') && /^Ma$/i.test(a.family||''))).map(p=>{
    const title=clean(p.title?.[0]);
    const doi=String(p.DOI||'').toLowerCase();
    const year=(p['published-print']||p['published-online']||p.published)?.['date-parts']?.[0]?.[0] || '';
    return {title,authors:p.author.map(a=>clean(`${a.given||''} ${a.family||''}`)).join(', '),journal:clean(p['container-title']?.[0]),year:String(year),doi,citations:null,url:'https://doi.org/'+doi,source:'crossref'};
  }).filter(p=>p.title && /^10\.\d{4,9}\//.test(p.doi));
  return {papers,totalResults:message['total-results'],sourceUrl:SOURCES.crossref};
}

export function parseNewsArticle(html,url) {
  if(typeof html!=='string'||typeof url!=='string')throw new Error('Invalid article');
  const u=new URL(url);
  if(u.protocol!=='https:' || !['iee.zjgsu.edu.cn','news.zjgsu.edu.cn','kyc.zjgsu.edu.cn','sky.zjgsu.edu.cn'].includes(u.hostname))throw new Error('News source is not an allowed university host');
  const {document}=parseHTML(html);
  for(const el of document.querySelectorAll('script,style,nav,header,footer'))el.remove();
  const main=document.querySelector('.col-info, .news-content, .article_content, .Article_Content, #article_content, .wp_articlecontent, .v_news_content, .content-detail, .newscont, .content') || document.body;
  const body=text(main);
  if(!body.includes('马博'))return null;
  const title=text(document.querySelector('h1,h2,.news_title,.article-title,.title')) || text(document.querySelector('title'));
  if(!title || /安全验证|Access Denied|Just a moment|验证码/i.test(title))throw new Error('News source unavailable');
  const dateMatch=text(document.body).match(/(?:发布时间|发布日期|时间|日期)\s*[:：]?\s*(20\d{2})[-年/.](\d{1,2})[-月/.](\d{1,2})/);
  const fallback=text(document.body).match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  const match=dateMatch||fallback;
  const date=match?`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`:null;
  const at=body.indexOf('马博');
  const excerpt=body.slice(Math.max(0,at-75),Math.min(body.length,at+180));
  return {title,url:u.href,date,excerpt,source:u.hostname};
}

async function fetchHTML(url) {
  const r = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0 (compatible; AcademicProfileUpdater/1.0)','Accept':'text/html'},signal:AbortSignal.timeout(20000),redirect:'follow'});
  if (!r.ok) throw new Error(`来源暂不可用 (${r.status})`);
  const data = await r.text();
  if (data.length > 2500000) throw new Error('来源页面超出读取上限');
  return data;
}

export async function readSource(source) {
  if (source === 'school') return parseSchool(await fetchHTML(SOURCES.school));
  if (source === 'crossref') {
    const r=await fetch(CROSSREF_API,{headers:{'User-Agent':'MaBoAcademicProfile/1.0 (mailto:mabo@zjgsu.edu.cn)'},signal:AbortSignal.timeout(20000)});
    if(!r.ok)throw new Error(`出版社记录暂不可用 (${r.status})`);
    const raw=await r.json();
    if(raw.message?.['total-results']>100)throw new Error('出版社记录超出当前分页范围，保留上次记录');
    return parseCrossref(raw);
  }
  if (source !== 'scholar') throw new Error('不支持此来源');
  const first = parseScholar(await fetchHTML(SOURCES.scholar + '&cstart=0&pagesize=100'));
  let page = first;
  for (let start=100;page.hasMore && start<=900;start+=100) {
    page = parseScholar(await fetchHTML(SOURCES.scholar + `&cstart=${start}&pagesize=100`));
    first.papers.push(...page.papers);
  }
  if (page.hasMore) throw new Error('Scholar 分页未完成，保留上次完整记录');
  first.hasMore = false;
  first.papers = [...new Map(first.papers.map(p => [canonicalTitle(p.title),p])).values()];
  return first;
}
