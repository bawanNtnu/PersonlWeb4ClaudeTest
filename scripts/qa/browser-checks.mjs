// 真實 Chromium 互動驗收。用法：node scripts/qa/browser-checks.mjs [baseURL] [--json out.json] [--shots dir]
// 預期值來自 site.config.json（導航）與 src/content/articles（公開/草稿），不是來自頁面本身。
import {chromium} from 'playwright';
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';

const args=process.argv.slice(2);
const opt=(n,f)=>{const i=args.indexOf(n);return i>-1?args[i+1]:f};
const baseURL=args.find(a=>/^https?:/.test(a))??'http://127.0.0.1:4321/';
const shots=opt('--shots');if(shots)mkdirSync(shots,{recursive:true});
const config=JSON.parse(readFileSync('site.config.json','utf8'));
const nav=config.navigation.filter(x=>x.enabled);
const navPath=x=>'/'+(x.path??x.id+'/');
const roots=nav.filter(x=>!x.parentId);
const childrenOf=id=>nav.filter(x=>x.parentId===id);
const expectedDesktop=nav.map(navPath).sort();
const sources=readdirSync('src/content/articles').filter(f=>f.endsWith('.md')).map(f=>{const t=readFileSync(join('src/content/articles',f),'utf8');return {slug:f.slice(0,-3),title:t.match(/^title:\s*(.+)$/m)?.[1].trim(),draft:/^draft:\s*true\s*$/m.test(t)}});
const published=sources.filter(s=>!s.draft),drafts=sources.filter(s=>s.draft);
const routes=['/','/start-here/','/articles/',`/articles/${published[0].slug}/`,'/topics/','/topics/method/','/about/',...nav.filter(x=>!['start-here','articles','topics','about'].includes(x.id)).map(navPath)];
const widths=[1440,1280,768,390];

const results=[];const check=(name,ok,detail='')=>results.push({name,status:ok?'PASS':'FAIL',detail:String(detail)});
const url=p=>new URL(p.replace(/^\//,''),baseURL).href;
const launch={};if(/^https:/.test(baseURL)&&process.env.HTTPS_PROXY)launch.proxy={server:process.env.HTTPS_PROXY};
const browser=await chromium.launch(launch);
process.on('uncaughtException',e=>{check('檢查器未預期中止',false,e.message.split('\n')[0]);report();process.exit(1)});
process.on('unhandledRejection',e=>{check('檢查器未預期中止',false,String(e?.message??e).split('\n')[0]);report();process.exit(1)});

for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width<500?844:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  for(const route of [...new Set(routes)]){
    errors.length=0;
    const res=await page.goto(url(route),{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts.ready);
    const tag=`${width} ${route}`;
    check(`HTTP 200 ${tag}`,res?.status()===200,res?.status());
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    check(`無水平溢出 ${tag}`,overflow<=0,`${overflow}px`);
    const broken=await page.$$eval('img',imgs=>imgs.filter(i=>i.complete&&i.naturalWidth===0).map(i=>i.src));
    check(`圖片載入 ${tag}`,broken.length===0,broken.join(','));
    // 主導覽：≥901px 顯示桌機選單、≤900px 改為手機選單按鈕
    const deskVisible=await page.locator('.fn-header__desktop').isVisible();
    const toggleVisible=await page.locator('.practical-menu-toggle').isVisible();
    check(`導覽型態符合寬度 ${tag}`,width>900?deskVisible&&!toggleVisible:!deskVisible&&toggleVisible,`desktop=${deskVisible} toggle=${toggleVisible}`);
    const desk=(await page.$$eval('.fn-nav a',as=>as.map(a=>a.getAttribute('href')))).sort();
    check(`桌機導覽 = 設定檔 ${tag}`,JSON.stringify([...new Set(desk)])===JSON.stringify(expectedDesktop),desk.join(','));
    if(toggleVisible){
      await page.click('.practical-menu-toggle');
      const dlg=page.locator('.practical-menu-dialog');
      const open=await dlg.evaluate(d=>d.open);
      const items=await page.$$eval('.practical-menu-dialog nav a',as=>as.filter(a=>a.offsetParent!==null).map(a=>({href:a.getAttribute('href'),text:a.textContent.trim()})));
      check(`手機選單可開啟且項目 = 設定檔 ${tag}`,open&&JSON.stringify(items.map(i=>i.href).sort())===JSON.stringify(expectedDesktop),items.map(i=>i.href).join(','));
      await page.keyboard.press('Escape');
      const closed=!(await dlg.evaluate(d=>d.open));
      const focusBack=await page.evaluate(()=>document.activeElement?.classList.contains('practical-menu-toggle'));
      check(`手機選單 Esc 關閉且焦點回到按鈕 ${tag}`,closed&&focusBack,`closed=${closed} focus=${focusBack}`);
    }
    check(`無 console/JS 錯誤 ${tag}`,errors.length===0,errors.join(' | '));
    if(shots&&width)await page.screenshot({path:join(shots,`${(route==='/'?'home':route.replace(/^\/|\/$/g,'').replace(/\//g,'_'))}-${width}.png`),fullPage:true});
  }
  await page.close();
}

// 導航目的地：從首頁實際點擊每一個第一層與第二層項目
{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  for(const item of nav){
    try{
      await page.goto(url('/'));
      if(item.parentId){
        const parent=nav.find(x=>x.id===item.parentId);
        await page.locator('.fn-nav summary',{hasText:parent.label}).click({timeout:5000});
      }
      await Promise.all([page.waitForLoadState('load'),page.locator(`.fn-nav a[href="${navPath(item)}"]`).first().click({timeout:5000})]);
      const ok=new URL(page.url()).pathname===navPath(item)&&!(await page.title()).includes('找不到');
      check(`點擊導航到達 ${item.label} ${navPath(item)}`,ok,page.url());
      const current=await page.$$eval('.fn-nav [aria-current="page"]',as=>as.map(a=>a.getAttribute('href')));
      check(`aria-current 標示目前頁 ${navPath(item)}`,current.includes(navPath(item)),current.join(','));
    }catch(error){check(`點擊導航到達 ${item.label} ${navPath(item)}`,false,'互動失敗：'+error.message.split('\n')[0]);}
  }
  // 第二層選單（若有）：鍵盤 Tab 到 summary → Enter 展開 → 子項可見 → Escape 收合
  for(const parent of roots.filter(r=>childrenOf(r.id).length)){
    await page.goto(url('/'));
    const summary=page.locator('.fn-nav summary',{hasText:parent.label});
    await summary.focus();await page.keyboard.press('Enter');
    const visible=await page.locator('.fn-nav__group[open] .fn-nav__submenu a').evaluateAll(as=>as.filter(a=>a.offsetParent!==null).length);
    check(`子選單鍵盤展開 ${parent.label}`,visible===childrenOf(parent.id).length+1,visible);
    await page.keyboard.press('Escape');
    const closed=await page.locator('.fn-nav__group[open]').count()===0;
    check(`子選單 Escape 收合 ${parent.label}`,closed);
  }
  // 維護任務 2：精選卡片整張可點（點描述文字也會進入文章）
  try{
    await page.goto(url('/'));
    const card=page.locator('.ab-feature--link').first();
    const target=await card.locator('a').getAttribute('href');
    // 卡片的 ::after 覆蓋層會接住點擊（設計如此），因此以真實滑鼠座標點在描述文字上，而非 locator.click。
    await card.locator('p').scrollIntoViewIfNeeded();
    const box=await card.locator('p').boundingBox();
    await Promise.all([page.waitForURL(u=>new URL(u).pathname===target,{timeout:5000}),page.mouse.click(box.x+box.width/2,box.y+box.height/2)]);
    check('點擊精選卡片描述進入文章',new URL(page.url()).pathname===target,page.url());
  }catch(error){check('點擊精選卡片描述進入文章',false,error.message.split('\n')[0]);}
  // 鍵盤：第一個 Tab 停在「跳到主要內容」
  await page.goto(url('/'));await page.keyboard.press('Tab');
  check('第一個 Tab 是跳到主要內容',await page.evaluate(()=>document.activeElement?.getAttribute('href')==='#main'));
  // 全站搜尋（工作坊 SiteSearchDialog + Pagefind + exact-zh.json）
  await page.keyboard.press('Control+k');
  const field=page.locator('[data-site-query]');
  await field.fill('竹筷');
  await page.waitForFunction(()=>document.querySelectorAll('[data-search-results] li').length>0,null,{timeout:8000}).catch(()=>{});
  const hits=await page.$$eval('[data-search-results] a',as=>as.map(a=>a.getAttribute('href')));
  check('全站搜尋找得到公開文章（竹筷）',hits.some(h=>h.includes('finger-and-chopstick-watering')),hits.join(','));
  for(const d of drafts){
    await field.fill(d.title);await page.waitForTimeout(900);
    const draftHits=await page.$$eval('[data-search-results] a',as=>as.map(a=>a.getAttribute('href')));
    check(`全站搜尋不會找到草稿 ${d.slug}`,!draftHits.some(h=>h.includes(d.slug)),draftHits.join(','));
  }
  await page.keyboard.press('Escape');
  // 文章列表篩選
  await page.goto(url('/articles/?tag='+encodeURIComponent('颱風')));
  const shown=await page.$$eval('[data-article-list] li',ls=>ls.filter(l=>!l.hidden).length);
  check('標籤篩選 ?tag=颱風 只顯示 1 篇',shown===1,shown);
  await page.goto(url('/articles/?q='+encodeURIComponent('不存在的關鍵字xyz')));
  check('查無結果時顯示提示',await page.locator('[data-empty]').isVisible());
  // 草稿網址不得存在
  for(const d of drafts){const r=await page.goto(url(`/articles/${d.slug}/`));check(`草稿網址不可開啟 ${d.slug}`,r?.status()===404,r?.status());}
  await page.close();
}
// prefers-reduced-motion：Reveal 區塊必須直接可見
{
  const ctx=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await ctx.newPage();await page.goto(url('/'));
  const hidden=await page.$$eval('[data-motion-reveal]',els=>els.filter(e=>getComputedStyle(e).opacity!=='1').length);
  check('reduced-motion 下 Reveal 內容直接可見',hidden===0,hidden);
  await ctx.close();
}
await browser.close();

report();
function report(){
const fail=results.filter(r=>r.status==='FAIL');
for(const r of results)if(r.status==='FAIL'||args.includes('--verbose'))console.log(`${r.status}  ${r.name}${r.detail?'  ['+r.detail+']':''}`);
console.log(`\n瀏覽器檢查：${results.length-fail.length} PASS / ${fail.length} FAIL（${baseURL}，寬度 ${widths.join('/')}）`);
const out=opt('--json');if(out)writeFileSync(out,JSON.stringify({baseURL,summary:{pass:results.length-fail.length,fail:fail.length},results},null,2));
process.exitCode=fail.length?1:0;
}
