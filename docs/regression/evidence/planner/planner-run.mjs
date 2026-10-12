import { chromium } from 'playwright';
import fs from 'node:fs';
const out=process.argv[2]; const log=[]; const L=(...a)=>{const s=a.join(' ');log.push(s);console.log(s)};
const b=await chromium.launch(); const ctx=await b.newContext({acceptDownloads:true,viewport:{width:1440,height:900}}); const p=await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
p.on('dialog',async d=>{L('DIALOG',d.type(),d.message());await d.accept()});
await p.goto('https://efd6b288.personal-site-starter.pages.dev/starter/',{waitUntil:'networkidle'});
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const cr=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((m,n)=>n-m);return ((x+.05)/(y+.05)).toFixed(3)};
const palette=async()=>p.evaluate(()=>Object.fromEntries(['primary','secondary','accent','background','text'].map(k=>[k,document.querySelector('#palette-'+k+'-hex').value])));
// W5: contrast of every theme preset
const themes=['paper','morning','studio','botanical','ocean','sand','slate','lavender'];const themeRows=[];
for(const t of themes){await p.check(`input[name=theme][value=${t}]`);await p.waitForTimeout(100);const c=await palette();
 themeRows.push({theme:t,...c,text_bg:cr(c.text,c.background),primary_bg:cr(c.primary,c.background),accent_bg:cr(c.accent,c.background),secondary_bg:cr(c.secondary,c.background)});}
L('THEMES '+JSON.stringify(themeRows,null,1));
// 1 kind/layout
await p.check('input[name=kind][value=knowledge]'); await p.check('input[name=layout][value=field-notes]');
await p.fill('input[name=siteName]','陽台觀察室（回歸測試）'); await p.fill('input[name=tagline]','租屋小陽台的植物觀察紀錄（模擬資料）');
await p.check('input[name=theme][value=botanical]');
await p.fill('#palette-primary-hex','#3F6A4D'); await p.press('#palette-primary-hex','Tab'); await p.waitForTimeout(200);
L('PALETTE after primary change',JSON.stringify(await palette()),'brandColor=',await p.inputValue('#brand-color'));
// 3 nav: rename start-here
const row=id=>p.locator(`.nav-row[data-nav-id="${id}"]`);
await row('start-here').locator('input[type=text]').fill('新手入門'); await row('start-here').locator('input[type=text]').press('Tab'); await p.waitForTimeout(200);
const al=await row('start-here').locator('button').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')));
L('W4 aria-labels after rename start-here->新手入門:',JSON.stringify(al));
L('W4 checkbox label:',await row('start-here').locator('input[type=checkbox]').getAttribute('aria-label'));
// move up twice
for(let i=0;i<2;i++){await row('start-here').getByRole('button',{name:/上移/}).click();await p.waitForTimeout(150);}
L('W4 aria-labels after moves:',JSON.stringify(await row('start-here').locator('button').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')))));
L('focus after move:',await p.evaluate(()=>document.activeElement?.getAttribute('aria-label')||document.activeElement?.tagName));
// enable resources? keep off. add custom page
await p.click('#add-nav-page'); await p.waitForTimeout(200);
await row('page-custom-1').locator('input[type=text]').fill('陽台工具'); await row('page-custom-1').locator('input[type=text]').press('Tab');
L('custom checkbox checked:',await row('page-custom-1').locator('input[type=checkbox]').isChecked());
let order=await p.$$eval('.nav-row',rs=>rs.map(r=>r.dataset.navId)); L('order',order);
while((order=await p.$$eval('.nav-row',rs=>rs.map(r=>r.dataset.navId))).indexOf('page-custom-1')>1){await row('page-custom-1').getByRole('button',{name:/上移/}).click();await p.waitForTimeout(120);}
await row('page-custom-1').getByRole('button',{name:/縮排為子選單/}).click(); await p.waitForTimeout(200);
L('order after',JSON.stringify(await p.$$eval('.nav-row',rs=>rs.map(r=>({id:r.dataset.navId,cls:r.className,label:r.querySelector('input[type=text]').value})))));
L('custom aria-labels:',JSON.stringify(await row('page-custom-1').locator('button,input').evaluateAll(bs=>bs.map(b=>b.getAttribute('aria-label')))));
// CTA
L('cta options',JSON.stringify(await p.$$eval('#cta-target option',o=>o.map(x=>[x.value,x.textContent]))));
await p.selectOption('#cta-target','start-here'); await p.fill('#cta-label','從這裡開始');
// patterns
await p.check('input[type=checkbox][value=featured-work]');
const fwSel=p.locator('select[aria-label="作品與成果展示要放在哪頁"]'); L('featured options',JSON.stringify(await fwSel.locator('option').evaluateAll(o=>o.map(x=>[x.value,x.textContent]))));
await fwSel.selectOption('/');
await p.check('input[name=footerPattern][value=footer-editorial]');
await p.fill('#notes','回歸測試：全站內容為模擬資料，不代表真實個人。');
// preview text
L('NAV PREVIEW',await p.evaluate(()=>{const h=[...document.querySelectorAll('*')].find(e=>/NAVIGATION PREVIEW/.test(e.textContent)&&e.children.length<12&&e.textContent.length<600);return h?h.innerText:''}));
// screenshots
for(const w of [1440,1280,768,390]){await p.setViewportSize({width:w,height:900});await p.waitForTimeout(250);
 const ov=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,iw:innerWidth}));L('overflow',w,JSON.stringify(ov));
 await p.screenshot({path:`${out}/planner-${w}.png`,fullPage:true});}
await p.setViewportSize({width:1440,height:900});
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#save-plan')]);
await dl.saveAs(out+'/site-brief.json'); L('download suggested name:',dl.suggestedFilename());
L('PAGE ERRORS',JSON.stringify(errs));
fs.writeFileSync(out+'/planner-log.txt',log.join('\n'));
await b.close();
