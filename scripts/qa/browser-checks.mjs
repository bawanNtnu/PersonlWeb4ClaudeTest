// 獨立瀏覽器互動驗證（回歸測試用，非工作坊原生）。
// 用法：node scripts/qa/browser-checks.mjs <baseURL> [--out dir] [--shots] [--expect-sha <sha>]
// 1440/1280/768/390 × Sitemap 全部路由：HTTP、JS 錯誤、水平溢出、Reveal 內容可見、aria-current；
// 互動：桌機子選單（鍵盤）、手機選單（開關／Esc／焦點返回／子項目導覽）、全站搜尋（中文完整比對、草稿不出現、Ctrl+K）、返回頁首。
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const argv=process.argv.slice(2); const base=argv[0].replace(/\/?$/,'/');
const opt=k=>{const i=argv.indexOf(k);return i<0?undefined:argv[i+1]};
const out=opt('--out')||'qa-artifacts/browser'; const shots=argv.includes('--shots'); const sha=opt('--expect-sha');
fs.mkdirSync(out,{recursive:true});
const results=[]; const check=(name,ok,detail='')=>results.push({name,ok:!!ok,detail:ok?'':String(detail).slice(0,300)});
const widths=[1440,1280,768,390];
const browser=await chromium.launch();
const guard=async(name,fn)=>{try{await fn()}catch(e){check(name,false,'threw: '+e.message.split('\n')[0])}};
try{
  // 路由清單取自實際 Sitemap
  const ctx0=await browser.newContext(); const p0=await ctx0.newPage();
  const smResp=await p0.goto(base+'sitemap.xml'); const sm=await smResp.text();
  const routes=[...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>new URL(m[1]).pathname);
  check('sitemap has routes',routes.length>=5,routes.length);
  if(sha){const r=await p0.goto(base);const h=await r.text();const m=h.match(/name="build-commit" content="([^"]+)"/);check('build-commit matches '+sha.slice(0,7),m&&m[1].startsWith(sha),m?.[1]);
    check('preview served with noindex',/noindex/.test((r.headers()['x-robots-tag']||'')+h.match(/name="robots" content="([^"]+)"/)?.[1]),'no noindex');}
  await ctx0.close();
  for(const w of widths){
    const ctx=await browser.newContext({viewport:{width:w,height:w>=1280?900:w>=768?1024:844},hasTouch:w<=768});
    for(const r of routes){
      const page=await ctx.newPage(); const errs=[]; page.on('pageerror',e=>errs.push(e.message)); page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
      await guard(`${w} ${r} load`,async()=>{
        const resp=await page.goto(new URL(r.slice(1),base).href,{waitUntil:'networkidle'});
        check(`${w} ${r} HTTP 200`,resp.status()===200,resp.status());
        // 慢慢捲到底，觸發 Reveal（IntersectionObserver），再檢查是否仍有未顯示的內容
        await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0)});
        await page.waitForTimeout(900);
        const st=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth,
          hiddenReveal:[...document.querySelectorAll('[data-motion-reveal]')].filter(e=>getComputedStyle(e).opacity<0.99).length,
          current:[...document.querySelectorAll('header [aria-current="page"]')].map(a=>a.getAttribute('href'))}));
        check(`${w} ${r} no horizontal overflow`,st.sw<=st.iw,`${st.sw}>${st.iw}`);
        check(`${w} ${r} reveal content visible after scroll`,st.hiddenReveal===0,st.hiddenReveal+' hidden');
        if(r!=='/'&&!r.startsWith('/articles/')||r==='/articles/')check(`${w} ${r} aria-current marks this page`,st.current.includes(r),JSON.stringify(st.current));
        check(`${w} ${r} no JS errors`,errs.length===0,errs.join(' | '));
        if(shots)await page.screenshot({path:path.join(out,`${(r.replace(/^\/|\/$/g,'').replace(/\//g,'_')||'home')}-${w}.png`),fullPage:true});
      });
      await page.close();
    }
    const page=await ctx.newPage(); await page.goto(base,{waitUntil:'networkidle'});
    if(w>900){
      await guard(`${w} desktop submenu`,async()=>{
        const summary=page.locator('.student-navigation summary').first();
        await summary.focus(); await page.keyboard.press('Enter');
        const sub=page.locator('.student-navigation__submenu a',{hasText:'陽台工具'});
        check(`${w} submenu opens with keyboard`,await sub.isVisible());
        await sub.click(); await page.waitForURL(/page-custom-1/); check(`${w} submenu link navigates`,page.url().endsWith('/page-custom-1/'),page.url());
      });
    }else{
      await guard(`${w} mobile menu`,async()=>{
        check(`${w} desktop nav hidden on small screens`,!(await page.locator('.desktop-nav').isVisible()));
        const trigger=page.locator('[data-menu-open]'); await trigger.click();
        const dlg=page.locator('.practical-menu-dialog'); check(`${w} mobile menu opens`,await dlg.isVisible());
        check(`${w} aria-expanded true when open`,await trigger.getAttribute('aria-expanded')==='true');
        check(`${w} focus moves into menu`,await page.evaluate(()=>!!document.activeElement?.closest('dialog')));
        await page.keyboard.press('Escape'); await page.waitForTimeout(150);
        check(`${w} Escape closes menu`,!(await dlg.isVisible()));
        check(`${w} focus returns to trigger`,await page.evaluate(()=>document.activeElement?.hasAttribute('data-menu-open')));
        check(`${w} aria-expanded false when closed`,await trigger.getAttribute('aria-expanded')==='false');
        await trigger.click(); await dlg.getByRole('link',{name:/陽台工具/}).click(); await page.waitForURL(/page-custom-1/);
        check(`${w} nested mobile link navigates`,page.url().endsWith('/page-custom-1/'),page.url());
      });
    }
    await guard(`${w} search`,async()=>{
      await page.goto(base,{waitUntil:'networkidle'});
      await page.locator('[data-search-open]').click(); const dlg=page.locator('[data-site-search]');
      check(`${w} search dialog opens`,await dlg.isVisible());
      const q=page.locator('[data-site-query]'); const results=page.locator('[data-search-results] a');
      await q.fill('薄荷'); await page.waitForTimeout(1200);
      const hrefs=await results.evaluateAll(as=>as.map(a=>new URL(a.href).pathname));
      check(`${w} search 薄荷 finds article`,hrefs.includes('/articles/mint-comeback/'),JSON.stringify(hrefs));
      for(const term of ['龜背芋','黃金葛過冬','QA-DRAFT-MARKER']){
        await q.fill(term); await page.waitForTimeout(1200);
        const h=await results.evaluateAll(as=>as.map(a=>new URL(a.href).pathname));
        check(`${w} search "${term}" returns no draft`,!h.some(x=>/monstera|winter-pothos/.test(x))&&!(await page.locator('[data-search-results]').innerText()).includes('QA-DRAFT'),JSON.stringify(h));
      }
      // Chromium：有文字時第一次 Esc 先清空 type=search 欄位，第二次才關閉對話框（已單獨確認）。
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      if(await dlg.isVisible()){check(`${w} search 1st Escape clears query`,(await q.inputValue())==='');await page.keyboard.press('Escape');await page.waitForTimeout(150);}
      check(`${w} search Escape closes`,!(await dlg.isVisible()));
      check(`${w} search focus returns to trigger`,await page.evaluate(()=>document.activeElement?.hasAttribute('data-search-open')));
      if(w===1440){await page.keyboard.press('Control+k');await page.waitForTimeout(200);check(`${w} Ctrl+K opens search`,await dlg.isVisible());await page.keyboard.press('Escape');}
    });
    await guard(`${w} back to top`,async()=>{
      await page.goto(new URL('articles/one-notebook-plant-log/',base).href,{waitUntil:'networkidle'});
      const btn=page.locator('[data-back-to-top]'); check(`${w} back-to-top hidden at top`,!(await btn.isVisible()));
      await page.evaluate(()=>scrollTo(0,document.body.scrollHeight)); await page.waitForTimeout(300);
      if(await page.evaluate(()=>scrollY>420)){check(`${w} back-to-top visible after scroll`,await btn.isVisible());await btn.click();await page.waitForTimeout(900);check(`${w} back-to-top returns to top`,await page.evaluate(()=>scrollY<5));}
    });
    await ctx.close();
  }
  // 降低動態：不需捲動，Reveal 內容即可見
  await guard('reduced motion',async()=>{const c=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:900}});const p=await c.newPage();await p.goto(base,{waitUntil:'networkidle'});await p.waitForTimeout(300);
    check('reduced-motion reveal visible without scrolling',await p.evaluate(()=>[...document.querySelectorAll('[data-motion-reveal]')].every(e=>getComputedStyle(e).opacity>0.99)));await c.close();});
}finally{await browser.close()}
const fail=results.filter(r=>!r.ok);
fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({base,results},null,1));
console.log(`browser-checks: ${results.length-fail.length} PASS / ${fail.length} FAIL`); for(const f of fail)console.log('  FAIL',f.name,'::',f.detail);
process.exitCode=fail.length?1:0;
