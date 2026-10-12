// 用法：node scripts/qa/screenshots.mjs <baseURL> <outDir> [route,route...] [width,width...]
// 依序以 1440/1280/768/390 寬度截全頁圖，並記錄是否有水平溢出與 console 錯誤。
import {chromium} from 'playwright';
import {mkdirSync,writeFileSync} from 'node:fs';
const [baseURL='http://127.0.0.1:4321/',out='qa-artifacts/screens',routesArg='/,/articles/,/articles/first-year-five-plants/',widthsArg='1440,1280,768,390']=process.argv.slice(2);
const routes=routesArg.split(','),widths=widthsArg.split(',').map(Number);
mkdirSync(out,{recursive:true});
const launch={};if(/^https:/.test(baseURL)&&process.env.HTTPS_PROXY)launch.proxy={server:process.env.HTTPS_PROXY};
const browser=await chromium.launch(launch);
const report=[];
for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width<500?844:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  for(const route of routes){
    errors.length=0;
    const res=await page.goto(new URL(route.replace(/^\//,''),baseURL).href,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    // 觸發 Reveal 動效後再截圖，避免截到「尚未進場」的空白狀態。
    await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}window.scrollTo(0,0)});
    await page.waitForTimeout(700);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    const name=(route==='/'?'home':route.replace(/^\/|\/$/g,'').replace(/[/?=&]/g,'_'))+'-'+width+'.png';
    await page.screenshot({path:`${out}/${name}`,fullPage:true});
    report.push({route,width,status:res?.status(),horizontalOverflowPx:overflow,errors:[...errors],file:name});
  }
  await page.close();
}
await browser.close();
writeFileSync(`${out}/screens.json`,JSON.stringify(report,null,2));
console.log(report.map(r=>`${r.width}\t${r.status}\toverflow=${r.horizontalOverflowPx}\terrors=${r.errors.length}\t${r.route}`).join('\n'));
