// 「PR 內容 = Preview 版本」：以本機對同一 commit 的建置（dist/）逐頁比對遠端 Preview 的實際 HTML。
// 正規化：網站網址（canonical/og:url 等 origin）、build-commit 標記。其餘（標題、主內容、導覽、資產雜湊）必須完全一致。
// 用法：node scripts/qa/compare-local-remote.mjs <previewURL> [--json out.json]
import {request} from 'playwright';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const base=process.argv[2];
const ctx=await request.newContext({proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined});
const sitemap=readFileSync('dist/sitemap.xml','utf8');
const paths=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
const norm=html=>html.replace(/https?:\/\/[^"'<\s]*?(balcony-field-notes[^"'<\s/]*|\.invalid|localhost:\d+|127\.0\.0\.1:\d+)/g,'ORIGIN').replace(/name="build-commit" content="[^"]*"/,'name="build-commit"')
  // 工作坊 MobileMenu 以 Math.random() 產生 id，每次建置不同（不可重現建置），比對前正規化
  .replace(/mobile-menu-[a-z0-9]+/g,'mobile-menu-X');
const rows=[];
for(const p of [...paths,'/rss.xml','/search/exact-zh.json']){
  const local=join('dist',p.endsWith('/')?p+'index.html':p);
  if(!existsSync(local)){rows.push({path:p,same:false,reason:'本機無此檔'});continue}
  const r=await ctx.get(new URL(p.replace(/^\//,''),base).href);
  const a=norm(readFileSync(local,'utf8')),b=norm(await r.text());
  let i=0;while(i<a.length&&a[i]===b[i])i++;
  rows.push({path:p,status:r.status(),same:a===b,reason:a===b?'':`第 ${i} 字元起不同：本機「${a.slice(i,i+60)}」 vs 遠端「${b.slice(i,i+60)}」`});
}
await ctx.dispose();
for(const r of rows)console.log(`${r.same?'SAME':'DIFF'}  ${r.path}${r.reason?'\n      '+r.reason:''}`);
const diff=rows.filter(r=>!r.same).length;
console.log(`\n本機 vs 遠端：${rows.length-diff}/${rows.length} 頁一致`);
const ji=process.argv.indexOf('--json');if(ji>-1)writeFileSync(process.argv[ji+1],JSON.stringify({base,rows},null,2));
process.exit(diff?1:0);
