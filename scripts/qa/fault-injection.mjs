// 驗證「驗證器」本身：在 dist 的副本注入已知缺陷，確認 static-checks.mjs 會對每一種缺陷判 FAIL。
// 若有任何注入沒有被抓到，代表驗證器漏報，本腳本以 exit 1 結束（禁止據此宣稱驗收通過）。
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync,renameSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

const project=process.cwd();
const run=(root)=>{const r=spawnSync(process.execPath,[join(project,'scripts/qa/static-checks.mjs'),'--root',root,'--json',join(root,'out.json')],{encoding:'utf8',env:{...process.env,SITE_URL:'',SITE_INDEXABLE:''}});return {code:r.status,out:JSON.parse(readFileSync(join(root,'out.json'),'utf8'))}};
const fresh=()=>{const root=mkdtempSync(join(tmpdir(),'fault-'));cpSync(join(project,'dist'),join(root,'dist'),{recursive:true});cpSync(join(project,'site.config.json'),join(root,'site.config.json'));cpSync(join(project,'src/content/articles'),join(root,'src/content/articles'),{recursive:true});return root};
const edit=(root,file,fn)=>{const p=join(root,'dist',file);writeFileSync(p,fn(readFileSync(p,'utf8')))};

const faults=[
  {name:'刪除「關於我」頁',expect:'路由存在 /about/',apply:r=>rmSync(join(r,'dist/about'),{recursive:true})},
  {name:'草稿外洩到文章列表與 RSS',expect:'草稿',apply:r=>{
    writeFileSync(join(r,'src/content/articles/zz-secret-draft.md'),'---\ntitle: 不該公開的草稿\ndescription: x\npublishedAt: 2026-10-01\ntopic: method\ndraft: true\n---\n');
    edit(r,'articles/index.html',s=>s.replace('</ol>','<li><a href="/articles/zz-secret-draft/">不該公開的草稿</a></li></ol>'));
    edit(r,'rss.xml',s=>s.replace('</channel>','<item><title>不該公開的草稿</title><link>https://x/articles/zz-secret-draft/</link></item></channel>'));}},
  {name:'草稿頁面被建置出來（只有頁面，沒有連結）',expect:'草稿未產生頁面',apply:r=>{
    writeFileSync(join(r,'src/content/articles/zz-secret-draft.md'),'---\ntitle: 另一篇草稿\ndescription: x\npublishedAt: 2026-10-01\ntopic: method\ndraft: true\n---\n');
    mkdirSync(join(r,'dist/articles/zz-secret-draft'),{recursive:true});writeFileSync(join(r,'dist/articles/zz-secret-draft/index.html'),'<html><head><title>x</title></head><body>另一篇草稿</body></html>');}},
  {name:'某一頁手機選單漏掉一項',expect:'手機導覽一致 /about/',apply:r=>edit(r,'about/index.html',s=>s.replace(/(<nav aria-label="手機主要導覽"[^>]*>)<a href="\/start-here\/">[^<]*<span[^>]*>[^<]*<\/span><\/a>/,'$1'))},
  {name:'桌機導覽目的地改錯（指向不存在的頁）',expect:'所有內部連結',apply:r=>edit(r,'index.html',s=>s.replace('<nav class="fn-nav" aria-label="主要導覽">','<nav class="fn-nav" aria-label="主要導覽"><a href="/no-such-page/">壞連結</a>'))},
  {name:'公開文章從 RSS 消失',expect:'公開文章在 RSS',apply:r=>edit(r,'rss.xml',s=>s.replace(/<item>[\s\S]*?<\/item>/,''))},
  {name:'Sitemap 漏掉一頁（孤兒頁）',expect:'每個頁面都在 Sitemap',apply:r=>edit(r,'sitemap.xml',s=>s.replace(/<url><loc>[^<]*\/about\/<\/loc><\/url>/,''))},
  {name:'預覽被設成可索引',expect:'robots.txt 符合索引政策',apply:r=>edit(r,'robots.txt',s=>s.replace('Disallow: /','Allow: /'))},
  {name:'頁面少了 canonical',expect:'metadata /topics/',apply:r=>edit(r,'topics/index.html',s=>s.replace(/<link rel="canonical"[^>]*>/,''))},
  {name:'某頁移除模擬內容聲明',expect:'模擬網站聲明 /start-here/',apply:r=>edit(r,'start-here/index.html',s=>s.replaceAll('模擬網站','網站'))},
  {name:'兩頁標題重複',expect:'<title> 不重複',apply:r=>edit(r,'topics/index.html',s=>s.replace(/<title>[^<]+<\/title>/,'<title>關於我｜陽台觀察室</title>'))},
];

let missed=0;const rows=[];
const baseline=fresh();const b=run(baseline);
rows.push({fault:'（基準：未注入）',expected:'0 FAIL',got:`${b.out.summary.fail} FAIL`,caught:b.out.summary.fail===0});
if(b.out.summary.fail!==0)missed++;
rmSync(baseline,{recursive:true});
for(const f of faults){
  const root=fresh();f.apply(root);const {code,out}=run(root);
  const hits=out.results.filter(x=>x.status==='FAIL');
  const caught=code===1&&hits.some(x=>x.name.includes(f.expect));
  if(!caught)missed++;
  rows.push({fault:f.name,expected:f.expect,got:hits.map(x=>x.name).slice(0,4).join(' ／ ')||'（沒有 FAIL）',caught});
  rmSync(root,{recursive:true});
}
for(const r of rows)console.log(`${r.caught?'CAUGHT':'MISSED'}  ${r.fault}\n        預期：${r.expected}\n        實際：${r.got}`);
console.log(`\n故障注入：${rows.length-missed}/${rows.length} 正確`);
if(process.argv.includes('--json'))writeFileSync(process.argv[process.argv.indexOf('--json')+1],JSON.stringify(rows,null,2));
process.exit(missed?1:0);
