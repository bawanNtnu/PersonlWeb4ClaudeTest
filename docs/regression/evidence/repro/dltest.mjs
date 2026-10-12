import { chromium } from 'playwright';
const b=await chromium.launch(); const ctx=await b.newContext({acceptDownloads:true}); const p=await ctx.newPage();
await p.goto('http://127.0.0.1:4700/');
for(const id of ['a','b','c']){const [d]=await Promise.all([p.waitForEvent('download'),p.click('#'+id)]);console.log(id,'->',d.suggestedFilename());}
await b.close();
