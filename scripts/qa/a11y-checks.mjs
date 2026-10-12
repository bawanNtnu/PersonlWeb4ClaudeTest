// axe-core 無障礙掃描 + 品牌色 WCAG 對比計算。用法：node scripts/qa/a11y-checks.mjs [baseURL] [--json out.json]
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {writeFileSync} from 'node:fs';
const args=process.argv.slice(2);
const baseURL=args.find(a=>/^https?:/.test(a))??'http://127.0.0.1:4321/';
const results=[];const check=(name,ok,detail='')=>results.push({name,status:ok?'PASS':'FAIL',detail:String(detail)});

// 1. 色彩對比（WCAG 2.x 相對亮度）：設計 token 的文字/背景組合
const lum=hex=>{const c=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return (x+0.05)/(y+0.05)};
const pairs=[
  ['內文 ink / paper','#28392E','#F6F7EF',4.5],['次要文字 muted / paper','#4E5B50','#F6F7EF',4.5],
  ['連結與 kicker moss / paper','#3F6A4D','#F6F7EF',4.5],['按鈕文字 paper / moss','#F6F7EF','#3F6A4D',4.5],
  ['moss / 頁尾 paper-deep','#3F6A4D','#ECEEE2',4.5],['草稿橫幅 paper / clay','#F6F7EF','#8A5A3E',4.5],
  ['聲明列 paper / ink','#F6F7EF','#28392E',4.5],
];
for(const [name,fg,bg,min] of pairs){const r=ratio(fg,bg);check(`對比 ${name} ≥ ${min}`,r>=min,r.toFixed(2)+':1');}
// 工作坊 botanical 色盤的 accent #B48569 對背景僅約 3.0:1（不足 4.5），本站規定只能作裝飾：建置後的 CSS 不得把它用在文字 color
import('node:fs').then(()=>{});
const {readdirSync,readFileSync}=await import('node:fs');
const css=readdirSync('dist/_astro').filter(f=>f.endsWith('.css')).map(f=>readFileSync('dist/_astro/'+f,'utf8')).join('\n').toLowerCase();
const accentAsText=/(^|[;{])\s*color:\s*(#b48569|var\(--brand-accent\))/m.test(css);
check(`accent #B48569（${ratio('#B48569','#F6F7EF').toFixed(2)}:1）未被用作文字顏色`,!accentAsText);

// 2. axe-core（WCAG 2.1 A/AA 規則）
const routes=['/','/start-here/','/start-here/tools/','/articles/','/articles/first-year-five-plants/','/topics/','/about/','/404.html'];
const launch={};if(/^https:/.test(baseURL)&&process.env.HTTPS_PROXY)launch.proxy={server:process.env.HTTPS_PROXY};
const browser=await chromium.launch(launch);
for(const width of [1440,390]){
  const ctx=await browser.newContext({viewport:{width,height:900}});const page=await ctx.newPage();
  for(const r of routes){
    await page.goto(new URL(r.replace(/^\//,''),baseURL).href,{waitUntil:'networkidle'});
    // 讓 Reveal 動效全部進場，避免掃到透明中的元素
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=500){scrollTo(0,y);await new Promise(t=>setTimeout(t,40))}scrollTo(0,0)});await page.waitForTimeout(700);
    const res=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const v=res.violations.map(x=>`${x.id}(${x.impact}) ×${x.nodes.length}: ${x.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' | ')}`);
    check(`axe WCAG A/AA ${width} ${r}`,res.violations.length===0,v.join(' ;; '));
  }
  await ctx.close();
}
// 3. axe 反向測試：故意移除圖片 alt、製造低對比文字，axe 必須抓到
{
  const ctx=await browser.newContext({viewport:{width:1280,height:900}});const page=await ctx.newPage();
  await page.goto(new URL('',baseURL).href,{waitUntil:'networkidle'});
  await page.evaluate(()=>{document.querySelector('.fn-figure img')?.removeAttribute('alt');const p=document.querySelector('.fn-deck');if(p)p.style.color='#e6e6e0';});
  const res=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();
  const ids=res.violations.map(v=>v.id);
  check('axe 反向測試：注入缺 alt 與低對比後會被偵測',ids.includes('image-alt')&&ids.includes('color-contrast'),ids.join(','));
  await ctx.close();
}
await browser.close();
const fail=results.filter(r=>r.status==='FAIL');
for(const r of results)if(r.status==='FAIL'||args.includes('--verbose'))console.log(`${r.status}  ${r.name}  [${r.detail}]`);
console.log(`\n無障礙檢查：${results.length-fail.length} PASS / ${fail.length} FAIL（${baseURL}）`);
const ji=args.indexOf('--json');if(ji>-1)writeFileSync(args[ji+1],JSON.stringify({baseURL,results},null,2));
process.exit(fail.length?1:0);
