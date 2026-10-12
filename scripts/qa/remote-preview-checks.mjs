// 遠端 Preview 核對：用法 node scripts/qa/remote-preview-checks.mjs <previewURL> <expectedSHA> [--json out.json]
// 確認「可從外部開啟的網址」確實是 PR 指定 commit 的建置結果，並重驗草稿隔離與索引政策。
import {request} from 'playwright';
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [base,sha]=process.argv.slice(2);
const results=[];const check=(name,ok,detail='')=>results.push({name,status:ok?'PASS':'FAIL',detail:String(detail)});
const ctx=await request.newContext({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
const get=async p=>{const r=await ctx.get(new URL(p.replace(/^\//,''),base).href,{maxRedirects:0});return {status:r.status(),text:await r.text(),headers:r.headers()}};
const sources=readdirSync('src/content/articles').filter(f=>f.endsWith('.md')).map(f=>{const t=readFileSync(join('src/content/articles',f),'utf8');return {slug:f.slice(0,-3),title:t.match(/^title:\s*(.+)$/m)?.[1].trim(),draft:/^draft:\s*true\s*$/m.test(t)}});
const home=await get('/');
const built=home.text.match(/name="build-commit" content="([^"]+)"/)?.[1];
check('Preview 首頁可開啟',home.status===200,home.status);
check('Preview 的 build-commit = 預期 SHA',built===sha,`${built} vs ${sha}`);
check('Preview 帶 noindex（meta + x-robots-tag）',/name="robots" content="noindex/.test(home.text)&&/noindex/.test(home.headers['x-robots-tag']??''),home.headers['x-robots-tag']);
const sitemap=(await get('/sitemap.xml')).text,rss=(await get('/rss.xml')).text,exact=(await get('/search/exact-zh.json')).text;
const locs=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
check('Sitemap 有內容',locs.length>5,locs.length);
for(const p of locs){const r=await get(p);check(`Sitemap 網址 200 ${p}`,r.status===200&&r.text.includes(sha),r.status);}
for(const a of sources){
  const r=await get(`/articles/${a.slug}/`);
  if(a.draft){
    check(`草稿網址 404 ${a.slug}`,r.status===404,r.status);
    check(`草稿不在遠端 RSS/Sitemap/搜尋索引 ${a.slug}`,![rss,sitemap,exact].some(t=>t.includes(a.slug)||t.includes(a.title)));
  }else check(`公開文章 200 且在 RSS ${a.slug}`,r.status===200&&rss.includes(`/articles/${a.slug}/`),r.status);
}
const missing=await get('/this-page-does-not-exist/');
check('不存在的網址回 404',missing.status===404,missing.status);
await ctx.dispose();
const fail=results.filter(r=>r.status==='FAIL');
for(const r of results)if(r.status==='FAIL'||process.argv.includes('--verbose'))console.log(`${r.status}  ${r.name}  [${r.detail}]`);
console.log(`\n遠端 Preview 檢查：${results.length-fail.length} PASS / ${fail.length} FAIL（${base} @ ${sha.slice(0,7)}）`);
const ji=process.argv.indexOf('--json');if(ji>-1)writeFileSync(process.argv[ji+1],JSON.stringify({base,sha,results},null,2));
process.exit(fail.length?1:0);
