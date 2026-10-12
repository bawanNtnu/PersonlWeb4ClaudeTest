// 獨立靜態輸出驗證（回歸測試用，非工作坊原生）。用法：node scripts/qa/static-checks.mjs [siteDir] [--json out.json]
// 檢查：路由、內部連結、草稿隔離（HTML/RSS/Sitemap/JSON/Pagefind 片段解壓）、metadata、Sitemap 雙向、RSS、導航一致、搜尋索引。
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
const root=path.resolve(process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:'.');
const jsonOut=process.argv.includes('--json')?process.argv[process.argv.indexOf('--json')+1]:null;
const dist=path.join(root,'dist'); const cfg=JSON.parse(fs.readFileSync(path.join(root,'site.config.json'),'utf8'));
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:!!ok,detail:ok?'':String(detail).slice(0,400)});
const walk=(d,acc=[])=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?walk(p,acc):acc.push(p)}return acc};
const files=walk(dist); const html=files.filter(f=>f.endsWith('.html'));
const rel=f=>'/'+path.relative(dist,f).split(path.sep).join('/');
const routeOf=f=>rel(f).replace(/index\.html$/,'');
const read=f=>fs.readFileSync(f,'utf8');
const hrefOf=x=>'/'+(x.path??x.id+'/');
// ---- 草稿來源（articles/ 中 draft:true 與 drafts/ 全部）
const drafts=[];
for(const dir of ['articles','drafts']){const d=path.join(root,'src/content',dir);if(!fs.existsSync(d))continue;
  for(const f of fs.readdirSync(d).filter(n=>/\.mdx?$/.test(n))){const s=read(path.join(d,f));const fm=s.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]||'';
    const isDraft=dir==='drafts'||/^draft:\s*true\s*$/m.test(fm); if(!isDraft)continue;
    const title=(fm.match(/^title:\s*(.+)$/m)?.[1]||'').trim().replace(/^['"]|['"]$/g,'');
    const markers=[...s.matchAll(/QA-DRAFT-MARKER-[A-Z-]+/g)].map(m=>m[0]);
    drafts.push({file:dir+'/'+f,slug:f.replace(/\.mdx?$/,''),title,markers});}}
const published=fs.readdirSync(path.join(root,'src/content/articles')).filter(n=>/\.mdx?$/.test(n)).filter(n=>!/^draft:\s*true\s*$/m.test(read(path.join(root,'src/content/articles',n)))).map(n=>n.replace(/\.mdx?$/,''));
// ---- 1 路由
const expected=['/',...cfg.navigation.map(hrefOf),...published.map(s=>'/articles/'+s+'/')];
for(const r of expected)check('route exists '+r,fs.existsSync(path.join(dist,r,'index.html')));
check('404.html exists',fs.existsSync(path.join(dist,'404.html')));
// ---- 2 內部連結
const exists=p=>{const q=decodeURIComponent(p.split(/[?#]/)[0]);const f=path.join(dist,q);return (fs.existsSync(f)&&fs.statSync(f).isFile())||fs.existsSync(path.join(f,'index.html'))};
const broken=[];
for(const f of html){const s=read(f);for(const m of s.matchAll(/<(?:a|link)\b[^>]*\bhref="([^"]+)"/g)){const h=m[1];if(/^(https?:|mailto:|tel:|#|data:)/.test(h))continue;const abs=new URL(h,'http://x'+routeOf(f)).pathname;if(!exists(abs))broken.push(routeOf(f)+' -> '+h)}}
check('no broken internal links',broken.length===0,broken.join('; '));
// ---- 3 草稿隔離：所有輸出（含 JSON 與解壓後 Pagefind 片段）
const surfaces=[];
for(const f of files){if(/\.(html|xml|txt|json|js|css)$/.test(f))surfaces.push({f:rel(f),body:read(f)});
  else if(/pagefind\/fragment\/.*\.pf_fragment$/.test(f)){try{surfaces.push({f:rel(f),body:zlib.gunzipSync(fs.readFileSync(f)).toString('utf8')})}catch{}}}
check('pagefind fragments decoded',surfaces.some(x=>x.f.includes('pf_fragment')),'no fragments decoded');
for(const d of drafts){
  check('draft route absent '+d.slug,!fs.existsSync(path.join(dist,'articles',d.slug)));
  const needles=[...d.markers,d.title,'/articles/'+d.slug+'/'].filter(Boolean);
  const hits=surfaces.filter(x=>needles.some(n=>x.body.includes(n))).map(x=>x.f);
  check('draft not leaked '+d.file,hits.length===0,hits.join(', '));}
// ---- 4 metadata
for(const f of html){const s=read(f),h=s.match(/<head>([\s\S]*?)<\/head>/)?.[1]||'';const r=routeOf(f);
  check('meta '+r,/<title>[^<]+<\/title>/.test(h)&&/name="description" content="[^"]+"/.test(h)&&/rel="canonical"/.test(h)&&/name="build-commit"/.test(h),'title/description/canonical/build-commit missing');
  check('noindex '+r,/name="robots" content="noindex/.test(h),'preview build must be noindex');
  check('single h1 '+r,(s.match(/<h1\b/g)||[]).length===1,(s.match(/<h1\b/g)||[]).length+' h1');
  check('lang zh-Hant '+r,/<html lang="zh-Hant"/.test(s));}
// ---- 5 sitemap 雙向、RSS
const sm=read(path.join(dist,'sitemap.xml'));const locs=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const pages=html.map(routeOf).filter(r=>r!=='/404.html');
check('sitemap ⊆ pages',locs.every(l=>pages.includes(l)),locs.filter(l=>!pages.includes(l)).join(','));
check('pages ⊆ sitemap',pages.every(p=>locs.includes(p)),pages.filter(p=>!locs.includes(p)).join(','));
const rss=read(path.join(dist,'rss.xml'));const items=[...rss.matchAll(/<item><title>/g)].length;
check('RSS item count = published',items===published.length,items+' vs '+published.length);
// ---- 6 導航一致（每頁桌機主導覽 HTML 相同、手機選單連結相同）
const navSig=s=>(s.match(/<nav class="student-navigation"[\s\S]*?<\/nav>/)?.[0]||'').replace(/ aria-current="page"/g,'').replace(/data-astro-cid-[a-z0-9]+(="")?/g,'');
const mobSig=s=>[...(s.match(/<nav aria-label="手機主要導覽"[^>]*>[\s\S]*?<\/nav>/)?.[0]||'').matchAll(/href="([^"]+)"/g)].map(m=>m[1]).join(',');
const sigs=new Set(html.map(f=>navSig(read(f))));const msigs=new Set(html.map(f=>mobSig(read(f))));
check('desktop nav identical on all pages',sigs.size===1&&[...sigs][0].length>0,sigs.size+' variants');
check('mobile nav identical on all pages',msigs.size===1&&[...msigs][0].length>0,msigs.size+' variants');
const navHrefs=[...[...sigs][0].matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
check('desktop and mobile nav same destinations',navHrefs.join(',')===[...msigs][0],navHrefs.join(',')+' | '+[...msigs][0]);
// ---- 7 搜尋索引
const ex=JSON.parse(read(path.join(dist,'search/exact-zh.json')));
check('exact-zh excludes 404',!ex.docs.some(d=>/404/.test(d.url)));
check('exact-zh covers every sitemap page',locs.every(l=>ex.docs.some(d=>d.url===l)),locs.filter(l=>!ex.docs.some(d=>d.url===l)).join(','));
check('pagefind entry exists',fs.existsSync(path.join(dist,'pagefind/pagefind.js')));
const fail=results.filter(r=>!r.ok);
console.log(`static-checks: ${results.length-fail.length} PASS / ${fail.length} FAIL`);for(const f of fail)console.log('  FAIL',f.name,'::',f.detail);
if(jsonOut)fs.writeFileSync(jsonOut,JSON.stringify({root,drafts,results},null,1));
process.exitCode=fail.length?1:0;
