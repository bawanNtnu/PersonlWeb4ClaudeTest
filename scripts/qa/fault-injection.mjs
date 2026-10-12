// 故障注入：每個案例複製網站 → 注入一個真實缺陷 → 建置 → 執行「工作坊原生工具」與「獨立工具」，記錄是否偵測到。
// 用法：WORKSHOP_PACK=/path/to/unzipped-pack node scripts/qa/fault-injection.mjs <workdir> <out.json> [caseId...]
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync, spawn } from 'node:child_process';
const site=process.cwd(); const pack=process.env.WORKSHOP_PACK; const work=path.resolve(process.argv[2]); const out=path.resolve(process.argv[3]);
const only=process.argv.slice(4);
if(!pack)throw Error('WORKSHOP_PACK required');
const PORT=4500, BASE=`http://127.0.0.1:${PORT}/`;
const NAV=['--url',BASE,'--paths','/,/start-here/,/page-custom-1/,/articles/,/articles/mint-comeback/,/topics/,/about/','--expect-links','/start-here/,/page-custom-1/,/articles/,/topics/,/about/'];
// tools: v28=工作坊 verify-v2-8-output；nav=工作坊 verify-student-navigation；audit=工作坊 Editorial audit.mjs；
//        static／browser／a11y＝本次獨立工具。expect 為「應該抓到」的工具（缺陷真實存在時理想上都應該抓到）。
const cases=[
 {id:'F00-baseline',desc:'未注入（基準，應全部 PASS）',edits:[],tools:['v28','nav','audit','static','browser','a11y'],clean:true},
 {id:'F01-nav-404',desc:'子選單連結指向不存在頁面',edits:[['src/components/StudentNavigation.astro',"<a href={base+(child.path??child.id+'/')}>","<a href={base+'tools-missing/'}>"]],tools:['v28','nav','static']},
 {id:'F02-mobile-missing',desc:'手機選單少了「關於我」',edits:[['src/layouts/SiteLayout.astro',"if(item.parentId)return [];","if(item.parentId||item.id==='about')return [];"]],tools:['v28','nav','static']},
 {id:'F03-draft-json',desc:'AI 自寫 JSON 搜尋端點未過濾草稿',add:[['src/pages/search/all-articles.json.ts',"import {getCollection} from 'astro:content';\nexport async function GET(){const all=await getCollection('articles');return new Response(JSON.stringify(all.map(a=>({url:'/articles/'+a.id+'/',title:a.data.title,body:a.body}))),{headers:{'Content-Type':'application/json'}})}\n"]],tools:['v28','static']},
 {id:'F04-short-title-leak',desc:'首頁以純文字預告草稿標題（7 字中文標題）',edits:[['src/pages/index.astro','<Reveal>','<p class="meta">下一篇預告：黃金葛過冬筆記</p>\n  <Reveal>']],tools:['v28','static']},
 {id:'F05-drafts-folder-loaded',desc:'Collection 同時讀 articles/ 與 drafts/（drafts/ 依 Skill 資料夾模型未加 draft 旗標）',edits:[['src/content.config.ts',"loader:glob({pattern:'**/*.md',base:'./src/content/articles'})","loader:glob({pattern:'{articles,drafts}/*.md',base:'./src/content',generateId:({entry})=>entry.split('/').pop().replace(/\\.md$/,'')})"],['src/content/drafts/winter-pothos.md','draft: true\n','']],tools:['v28','static']},
 {id:'F06-footer-path-404',desc:'為自訂頁設定好看網址 path（生成器頁尾仍用 id）',edits:[['site.config.json','"label": "陽台工具",','"label": "陽台工具",\n      "path": "start-here/tools/",']],tools:['v28','nav','static'],nav:['--url',BASE,'--paths','/,/start-here/,/start-here/tools/,/articles/,/about/','--expect-links','/start-here/,/start-here/tools/,/articles/,/topics/,/about/']},
 {id:'F07-overflow-390',desc:'內頁麵包屑區塊設固定最小寬度 520px，手機水平溢出',edits:[['public/site.css','.h01 .rail a{color:var(--ed-ink)}','.h01 .rail a{color:var(--ed-ink)}\n.page-head{min-width:520px}']],tools:['nav','audit','browser']},
 {id:'F08-low-contrast',desc:'文章日期／中繼資料改為淺灰（約 1.8:1）',edits:[['public/site.css','.meta{font-size:15px;color:var(--muted)}','.meta{font-size:15px;color:#b9c0b4}']],tools:['audit','a11y']},
 {id:'F09-noindex-removed',desc:'Preview 移除 noindex',edits:[['src/layouts/SiteLayout.astro','{!indexable&&<meta name="robots" content="noindex, nofollow"/>}','']],tools:['v28','static']},
 {id:'F10-menu-focus',desc:'手機選單關閉後焦點未回到按鈕',edits:[['src/components/blocks/MobileMenu.astro',"trigger.setAttribute('aria-expanded','false');trigger.focus()","trigger.setAttribute('aria-expanded','false')"]],tools:['nav','browser']},
 {id:'F10b-menu-esc-blocked',desc:'手機選單攔截 cancel，Esc 無法關閉',edits:[['src/components/blocks/MobileMenu.astro',"const close=()=>dialog.close();","const close=()=>dialog.close();\n  dialog.addEventListener('cancel',e=>e.preventDefault());"]],tools:['nav','browser']},
 {id:'F11-no-exact-index',desc:'build 漏掉中文完整比對索引',edits:[['package.json',' && node scripts/build-exact-search.mjs','']],tools:['v28','static','browser']},
 {id:'F12-no-description',desc:'所有頁面缺 meta description（對照組）',edits:[['src/layouts/SiteLayout.astro','<meta name="description" content={description}/>','']],tools:['v28','static']},
 {id:'F13-draft-in-rss',desc:'RSS 未過濾草稿（對照組）',edits:[['src/pages/rss.xml.js',"getCollection('articles',({data})=>!data.draft)","getCollection('articles')"]],tools:['v28','static']},
 {id:'F14-reveal-stuck',desc:'Reveal 永遠不顯示內容（JS 不加 visible class）',edits:[['src/components/effects/Reveal.astro',"requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('motion-is-visible')));","void 0;"]],tools:['audit','browser']},
];
const run=(cmd,args,cwd,env={})=>{const r=spawnSync(cmd,args,{cwd,encoding:'utf8',env:{...process.env,...env},timeout:900000});return {code:r.status,out:((r.stdout||'')+(r.stderr||'')).slice(-1500)}};
let server=null;
// 用 astro 本體（不透過 npx）且以獨立行程群組啟動，換案例時整組終止；並以 __variant.txt 確認伺服器真的在服務「這個」變體。
const stop=async()=>{if(server){try{process.kill(-server.pid,'SIGKILL')}catch{}server=null;await new Promise(r=>setTimeout(r,800))}};
const serve=async(dir,id)=>{await stop();
  server=spawn(process.execPath,[path.join(site,'node_modules/astro/astro.js'),'preview','--host','127.0.0.1','--port',String(PORT)],{cwd:dir,stdio:'ignore',detached:true});
  for(let i=0;i<60;i++){try{const r=await fetch(BASE+'__variant.txt');if(r.ok&&(await r.text()).trim()===id)return}catch{}await new Promise(r=>setTimeout(r,500))}throw Error('server for '+id+' not serving expected variant')};
const copy=(src,dst)=>{fs.cpSync(src,dst,{recursive:true,filter:s=>!/[\\/](node_modules|dist|\.git|\.astro|qa-artifacts)$/.test(s)});fs.symlinkSync(path.join(src,'node_modules'),path.join(dst,'node_modules'))};
const report=[];
fs.mkdirSync(work,{recursive:true});
for(const c of cases.filter(c=>!only.length||only.includes(c.id))){
  const dir=path.join(work,c.id); fs.rmSync(dir,{recursive:true,force:true}); copy(site,dir);
  const row={id:c.id,desc:c.desc,injected:true,build:null,tools:{}};
  for(const [file,find,rep] of c.edits||[]){const p=path.join(dir,file);const s=fs.readFileSync(p,'utf8');if(!s.includes(find)){row.injected=false;row.injectError=file+': pattern not found';break}fs.writeFileSync(p,s.replace(find,rep))}
  for(const [file,body] of c.add||[]){const p=path.join(dir,file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,body)}
  if(!row.injected){report.push(row);console.log(c.id,'INJECTION FAILED',row.injectError);continue}
  const b=run('npm',['run','build'],dir); row.build=b.code===0?'ok':'FAILED'; if(b.code!==0)row.buildOut=b.out;
  const needServer=c.tools.some(t=>['nav','audit','browser','a11y'].includes(t));
  if(b.code===0)fs.writeFileSync(path.join(dir,'dist/__variant.txt'),c.id);
  if(b.code===0&&needServer)await serve(dir,c.id);
  for(const t of c.tools){
    if(b.code!==0){row.tools[t]={code:'build-failed',detected:true};continue}
    let r;
    if(t==='v28')r=run(process.execPath,['scripts/verify-v2-8-output.mjs','--student-site',dir],pack);
    if(t==='nav')r=run(process.execPath,['scripts/verify-student-navigation.mjs',...(c.nav||NAV)],pack);
    if(t==='audit')r=run(process.execPath,[path.join(pack,'.ai/astro-editorial-layout-design/scripts/audit.mjs'),'--base',BASE.slice(0,-1),'--paths','/,/articles/mint-comeback/','--widths','1440,390','--out',path.join(dir,'qa-artifacts/audit')],path.join(site,'node_modules','..'));
    if(t==='static')r=run(process.execPath,[path.join(site,'scripts/qa/static-checks.mjs'),dir],site);
    if(t==='browser')r=run(process.execPath,[path.join(site,'scripts/qa/browser-checks.mjs'),BASE,'--out',path.join(dir,'qa-artifacts/browser')],site);
    if(t==='a11y')r=run(process.execPath,[path.join(site,'scripts/qa/a11y-checks.mjs'),BASE],site);
    row.tools[t]={code:r.code,detected:r.code!==0,tail:r.out.split('\n').filter(l=>/FAIL|Error|fail|violations|NOTICE|passed/.test(l)).slice(0,6).join(' | ').slice(0,600)};
  }
  report.push(row);
  console.log(c.id.padEnd(22),'build='+row.build,Object.entries(row.tools).map(([k,v])=>k+':'+(v.detected?'DETECTED':'pass')).join('  '));
  fs.writeFileSync(out,JSON.stringify(report,null,1));
}
await stop();
fs.writeFileSync(out,JSON.stringify(report,null,1));
