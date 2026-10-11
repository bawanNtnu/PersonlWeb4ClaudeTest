// 建置輸出（dist/）的靜態驗收。用法：npm run build && node scripts/qa/static-checks.mjs [--dist dist] [--json out.json]
// 每一項檢查都會輸出 PASS / FAIL，任何 FAIL 讓程序以 exit code 1 結束。
// 預期值來自「網站自己的設定與原始內容」（site.config.json、src/content/articles/*.md），不是來自建置結果本身。
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {join,relative,dirname} from 'node:path';
import {gunzipSync} from 'node:zlib';

const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i>-1?process.argv[i+1]:fallback};
const root=arg('--root',process.cwd());
const dist=arg('--dist-abs')??join(root,arg('--dist','dist'));
const config=JSON.parse(readFileSync(join(root,'site.config.json'),'utf8'));
const results=[];
const check=(name,ok,detail='')=>{results.push({name,status:ok?'PASS':'FAIL',detail});};

// ── 預期值：從原始 Markdown frontmatter 判斷哪些是公開文章、哪些是草稿 ──
const articlesDir=join(root,'src/content/articles');
const sources=readdirSync(articlesDir).filter(f=>f.endsWith('.md')).map(f=>{
  const text=readFileSync(join(articlesDir,f),'utf8');
  const fm=text.match(/^---\n([\s\S]*?)\n---/)?.[1]??'';
  const get=k=>fm.match(new RegExp('^'+k+':\\s*(.+)$','m'))?.[1]?.trim().replace(/^["']|["']$/g,'');
  return {slug:f.replace(/\.md$/,''),title:get('title'),draft:get('draft')==='true',topic:get('topic')};
});
const published=sources.filter(a=>!a.draft),drafts=sources.filter(a=>a.draft);
const enabledNav=config.navigation.filter(x=>x.enabled);
const navPath=x=>'/'+(x.path??x.id+'/');

// ── 收集建置輸出 ──
const html=[];const walk=d=>{for(const e of readdirSync(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html'))html.push(p)}};
check('dist 存在',existsSync(dist),dist);
if(!existsSync(dist)){finish();}
walk(dist);
const routeOf=p=>'/'+relative(dist,p).replace(/index\.html$/,'').replace(/\\/g,'/');
const pages=new Map(html.map(p=>[routeOf(p),readFileSync(p,'utf8')]));
const read=p=>existsSync(join(dist,p))?readFileSync(join(dist,p),'utf8'):'';

// 1. 必要路由
const required=['/','/404.html',...enabledNav.map(navPath),...published.map(a=>`/articles/${a.slug}/`)];
for(const r of required)check(`路由存在 ${r}`,pages.has(r)||existsSync(join(dist,r)),'');
for(const f of ['rss.xml','sitemap.xml','robots.txt','favicon.svg','search/exact-zh.json','pagefind/pagefind.js'])check(`檔案存在 ${f}`,existsSync(join(dist,f)));

// 2. 草稿隔離：草稿不得出現在任何公開輸出
const rss=read('rss.xml'),sitemap=read('sitemap.xml'),exact=read('search/exact-zh.json');
const pagefindFragments=existsSync(join(dist,'pagefind'))?readdirSync(join(dist,'pagefind'),{recursive:true}).length:0;
for(const d of drafts){
  check(`草稿未產生頁面 ${d.slug}`,!pages.has(`/articles/${d.slug}/`));
  check(`草稿不在 RSS ${d.slug}`,!rss.includes(`/articles/${d.slug}/`)&&!rss.includes(d.title));
  check(`草稿不在 Sitemap ${d.slug}`,!sitemap.includes(`/articles/${d.slug}/`));
  check(`草稿不在搜尋索引 ${d.slug}`,!exact.includes(d.slug)&&!exact.includes(d.title));
  const leaks=[...pages].filter(([,body])=>body.includes(`/articles/${d.slug}/`)||body.includes(d.title)).map(([r])=>r);
  check(`草稿標題/連結不在任何 HTML ${d.slug}`,leaks.length===0,leaks.join(', '));
}
// 2b. Pagefind 索引片段（gzip）不得含草稿標題；同時以公開文章標題做正向對照，證明解壓比對方法有效
const fragDir=join(dist,'pagefind/fragment');
const fragments=existsSync(fragDir)?readdirSync(fragDir).map(f=>{const raw=readFileSync(join(fragDir,f));try{return gunzipSync(raw).toString('utf8')}catch{return raw.toString('utf8')}}):[];
if(published.length)check('Pagefind 片段可解讀（正向對照：含公開文章標題）',fragments.some(t=>t.includes(published[0].title)),published[0].title);
for(const d of drafts)check(`草稿不在 Pagefind 索引 ${d.slug}`,!fragments.some(t=>t.includes(d.title)));
// 3. 公開文章必須出現在列表、RSS、Sitemap、搜尋索引
const listHtml=pages.get('/articles/')??'';
for(const a of published){
  check(`公開文章在列表 ${a.slug}`,listHtml.includes(`/articles/${a.slug}/`));
  check(`公開文章在 RSS ${a.slug}`,rss.includes(`/articles/${a.slug}/`));
  check(`公開文章在 Sitemap ${a.slug}`,sitemap.includes(`/articles/${a.slug}/`));
  check(`公開文章在搜尋索引 ${a.slug}`,exact.includes(`/articles/${a.slug}/`));
}
check('RSS 文章數 = 公開文章數',(rss.match(/<item>/g)??[]).length===published.length,`${(rss.match(/<item>/g)??[]).length} vs ${published.length}`);

// 4. Sitemap ⇄ 實際頁面雙向一致（404 不應在 sitemap）
const sitemapPaths=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const missing=sitemapPaths.filter(p=>!pages.has(p));
check('Sitemap 每個網址都有頁面',missing.length===0,missing.join(', '));
const indexablePages=[...pages.keys()].filter(r=>r!=='/404.html');
const notInSitemap=indexablePages.filter(r=>!sitemapPaths.includes(r));
check('每個頁面都在 Sitemap（無孤兒頁）',notInSitemap.length===0,notInSitemap.join(', '));

// 5. 內部連結全部可達（含 BASE_URL 為 / 的情況）
const broken=[];
for(const [route,body] of pages){
  for(const m of body.matchAll(/(?:href|src)="([^"#?]*)(?:[?#][^"]*)?"/g)){
    const u=m[1];if(!u||/^(https?:|mailto:|tel:|data:|\/\/)/.test(u))continue;
    const abs=u.startsWith('/')?u:new URL(u,'http://x'+route).pathname;
    const target=abs.endsWith('/')?join(dist,abs,'index.html'):join(dist,abs);
    if(!existsSync(target))broken.push(`${route} → ${u}`);
  }
}
check('所有內部連結與資源可達',broken.length===0,[...new Set(broken)].slice(0,20).join('\n'));

// 6. Head metadata 與索引政策
const indexable=Boolean(process.env.SITE_URL)&&process.env.SITE_INDEXABLE==='true';
for(const [route,body] of pages){
  const head=body.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1]??'';
  const titles=head.match(/<title>[^<]+<\/title>/g)??[];
  const ok=titles.length===1&&/name="description" content="[^"]{10,}"/.test(head)&&/rel="canonical" href="https?:\/\//.test(head)&&/property="og:title"/.test(head);
  check(`metadata ${route}`,ok);
  const robotsMeta=head.match(/name="robots" content="([^"]+)"/)?.[1];
  check(`robots meta 符合索引政策 ${route}`,robotsMeta===(indexable&&route!=='/404.html'?'index,follow':'noindex,nofollow'),String(robotsMeta));
}
const titleSet=new Map();for(const [r,b] of pages){const t=b.match(/<title>([^<]+)<\/title>/)?.[1];titleSet.set(t,[...(titleSet.get(t)??[]),r])}
const dupTitles=[...titleSet].filter(([,rs])=>rs.length>1);
check('每頁 <title> 不重複',dupTitles.length===0,dupTitles.map(([t,rs])=>t+': '+rs.join(',')).join('; '));
const robotsTxt=read('robots.txt');
check('robots.txt 符合索引政策',indexable?/^Allow: \//m.test(robotsTxt):/^Disallow: \/$/m.test(robotsTxt),robotsTxt.replace(/\n/g,' | '));
check('robots.txt 指向 sitemap',/^Sitemap: https?:\/\/\S+sitemap\.xml$/m.test(robotsTxt));

// 7. 主導覽一致：每一頁的桌機主導覽（.fn-nav）與手機選單（MobileMenu）連結集合 = 設定檔
const expectNav=enabledNav.map(navPath).sort();
for(const [route,body] of pages){
  const desk=body.match(/<nav class="fn-nav"[\s\S]*?<\/nav>/)?.[0]??'';
  const mobile=body.match(/<nav aria-label="手機主要導覽"[^>]*>[\s\S]*?<\/nav>/)?.[0]??'';
  const links=s=>[...new Set([...s.matchAll(/href="([^"]+)"/g)].map(m=>m[1]))].sort();
  check(`桌機導覽一致 ${route}`,JSON.stringify(links(desk))===JSON.stringify(expectNav),links(desk).join(','));
  check(`手機導覽一致 ${route}`,JSON.stringify(links(mobile))===JSON.stringify(expectNav),links(mobile).join(','));
}

// 8. 模擬內容聲明：每頁都必須有
for(const [route,body] of pages)check(`模擬網站聲明 ${route}`,body.includes('模擬網站'));

finish();
function finish(){
  const fail=results.filter(r=>r.status==='FAIL');
  for(const r of results)if(r.status==='FAIL'||process.argv.includes('--verbose'))console.log(`${r.status}  ${r.name}${r.detail?'\n      '+r.detail.replace(/\n/g,'\n      '):''}`);
  console.log(`\n靜態檢查：${results.length-fail.length} PASS / ${fail.length} FAIL（公開文章 ${published?.length??0}、草稿 ${drafts?.length??0}、HTML ${html?.length??0}）`);
  const out=arg('--json');if(out)writeFileSync(out,JSON.stringify({summary:{pass:results.length-fail.length,fail:fail.length},results},null,2));
  process.exit(fail.length?1:0);
}
