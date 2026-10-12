// axe-core WCAG 2.1 A/AA 掃描（回歸測試用，非工作坊原生）。用法：node scripts/qa/a11y-checks.mjs <baseURL> [out.json]
// 範圍：Sitemap 全部路由 × 1440／390，另含「手機選單開啟」與「搜尋框開啟」兩種互動狀態。
import { chromium } from 'playwright'; import fs from 'node:fs'; import { createRequire } from 'node:module';
const axeSrc=fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'),'utf8');
const base=process.argv[2].replace(/\/?$/,'/'); const out=process.argv[3];
const b=await chromium.launch(); const rows=[];
const scan=async(p,label)=>{await p.addScriptTag({content:axeSrc});const v=await p.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length,targets:x.nodes.slice(0,3).map(n=>n.target.join(' '))})));rows.push({label,violations:v});};
const p0=await b.newPage(); const sm=await (await p0.goto(base+'sitemap.xml')).text(); await p0.close();
const routes=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname).concat(['/404.html']);
for(const w of [1440,390])for(const r of routes){const p=await b.newPage({viewport:{width:w,height:900}});await p.goto(new URL(r.slice(1),base).href,{waitUntil:'networkidle'});
  await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,40))}});await p.waitForTimeout(700);await scan(p,`${w} ${r}`);await p.close();}
{const p=await b.newPage({viewport:{width:390,height:844}});await p.goto(base,{waitUntil:'networkidle'});await p.click('[data-menu-open]');await p.waitForTimeout(200);await scan(p,'390 / mobile-menu-open');await p.close();}
{const p=await b.newPage({viewport:{width:1440,height:900}});await p.goto(base,{waitUntil:'networkidle'});await p.click('[data-search-open]');await p.fill('[data-site-query]','颱風');await p.waitForTimeout(1200);await scan(p,'1440 / search-open-with-results');await p.close();}
await b.close();
const bad=rows.filter(r=>r.violations.length);
console.log(`a11y-checks: ${rows.length-bad.length} clean / ${bad.length} with violations`);for(const r of bad)console.log('  ',r.label,JSON.stringify(r.violations));
if(out)fs.writeFileSync(out,JSON.stringify(rows,null,1)); process.exitCode=bad.length?1:0;
