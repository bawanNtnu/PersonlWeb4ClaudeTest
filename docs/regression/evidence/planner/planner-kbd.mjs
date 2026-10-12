import { chromium } from 'playwright';
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1440,height:900}});
await p.goto('https://efd6b288.personal-site-starter.pages.dev/starter/',{waitUntil:'networkidle'});
const desc=()=>p.evaluate(()=>{const a=document.activeElement;return (a?.getAttribute('aria-label')||a?.tagName)+' | row='+(a?.closest('.nav-row')?.dataset.navId||'-')});
const order=()=>p.$$eval('.nav-row',rs=>rs.map(r=>r.dataset.navId).join(','));
await p.locator('.nav-row[data-nav-id="about"] button[aria-label^="上移"]').focus();
console.log('before:',await desc(),'|',await order());
for(const key of ['Enter','Enter','Space']){await p.keyboard.press(key);await p.waitForTimeout(200);console.log('after',key+':',await desc(),'|',await order());}
await p.keyboard.press('Tab'); console.log('after Tab:',await desc());
// indent via keyboard
await p.locator('.nav-row[data-nav-id="topics"] button[aria-label^="縮排"]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(200);
console.log('after indent:',await desc());
await b.close();
