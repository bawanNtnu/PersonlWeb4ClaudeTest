// 驗證 browser-checks.mjs 本身：對 dist 副本注入「只有真實瀏覽器才看得到」的缺陷，確認每一項都會被判 FAIL。
import {cpSync,mkdtempSync,readFileSync,writeFileSync,rmSync,existsSync,statSync,readdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import {spawn} from 'node:child_process';
// 注意：必須用非同步 spawn；spawnSync 會卡住本程序的事件迴圈，內建伺服器就無法回應瀏覽器。
const runAsync=(cmd,argv,opts)=>new Promise(ok=>{const c=spawn(cmd,argv,opts);let out='';c.stdout.on('data',d=>out+=d);c.stderr.on('data',d=>out+=d);c.on('close',code=>ok({status:code,out}))});

const project=process.cwd();
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.xml':'application/xml','.woff2':'font/woff2','.txt':'text/plain','.pf_meta':'application/octet-stream'};
const serve=(dir,port)=>new Promise(ok=>{const s=createServer((req,res)=>{let p=decodeURIComponent(new URL(req.url,'http://x').pathname);let f=join(dir,p);if(existsSync(f)&&statSync(f).isDirectory())f=join(f,'index.html');if(!existsSync(f)){res.writeHead(404,{'content-type':types['.html']});res.end(readFileSync(join(dir,'404.html')));return}res.writeHead(200,{'content-type':types[extname(f)]??'application/octet-stream'});res.end(readFileSync(f))});s.listen(port,'127.0.0.1',()=>ok(s))});
const edit=(dir,file,fn)=>{const p=join(dir,file);writeFileSync(p,fn(readFileSync(p,'utf8')))};
const faults=[
  {name:'（基準：未注入）',expect:null,apply:()=>{}},
  {name:'手機選單在「關於我」頁少一項',expect:'手機選單可開啟且項目 = 設定檔 390 /about/',apply:d=>edit(d,'about/index.html',s=>s.replace(/(<nav aria-label="手機主要導覽"[^>]*>)<a href="\/start-here\/">[\s\S]*?<\/a>/,'$1'))},
  {name:'390px 漢堡按鈕被 CSS 隱藏',expect:'導覽型態符合寬度 390 /',apply:d=>edit(d,'index.html',s=>s.replace('</head>','<style>@media(max-width:600px){.practical-menu-toggle{display:none!important}}</style></head>'))},
  {name:'768px 產生水平溢出',expect:'無水平溢出 768 /topics/',apply:d=>edit(d,'topics/index.html',s=>s.replace('</main>','<div style="width:1200px;height:2px"></div></main>'))},
  {name:'頁面 JS 錯誤',expect:'無 console/JS 錯誤 1440 /start-here/',apply:d=>edit(d,'start-here/index.html',s=>s.replace('</body>','<script>throw new Error("injected")</script></body>'))},
  {name:'破圖',expect:'圖片載入 1280 /',apply:d=>edit(d,'index.html',s=>s.replace('illustrations/balcony-west.svg','illustrations/missing.svg'))},
  {name:'搜尋索引遺失',expect:'全站搜尋找得到公開文章',apply:d=>{rmSync(join(d,'search'),{recursive:true});rmSync(join(d,'pagefind'),{recursive:true})}},
  {name:'精選卡片覆蓋層被移除（卡片不能整張點）',expect:'點擊精選卡片描述進入文章',apply:d=>{for(const f of readdirSync(join(d,'_astro')).filter(x=>x.endsWith('.css')))edit(d,'_astro/'+f,s=>s.replace(/\.ab-feature__link:+after\{[^}]*\}/g,''))}},
  {name:'導航指到 404',expect:'點擊導航到達',apply:d=>{for(const f of ['index.html'])edit(d,f,s=>s.replace(/(<nav class="fn-nav"[\s\S]*?)href="\/about\/"/,'$1href="/about-old/"'))}},
];
let missed=0,port=4600;const rows=[];
for(const f of faults){
  const dir=mkdtempSync(join(tmpdir(),'bfault-'));cpSync(join(project,'dist'),dir,{recursive:true});f.apply(dir);
  const server=await serve(dir,++port);
  const r=await runAsync(process.execPath,[join(project,'scripts/qa/browser-checks.mjs'),`http://127.0.0.1:${port}/`,'--json',join(dir,'out.json')],{cwd:project});
  if(!existsSync(join(dir,'out.json'))){console.log('檢查器崩潰：',r.out.slice(-800));}
  server.close();
  const out=JSON.parse(readFileSync(join(dir,'out.json'),'utf8'));
  const fails=out.results.filter(x=>x.status==='FAIL').map(x=>x.name);
  const caught=f.expect===null?fails.length===0:fails.some(n=>n.startsWith(f.expect));
  if(!caught)missed++;
  rows.push({fault:f.name,expected:f.expect??'0 FAIL',got:fails.slice(0,4).join(' ／ ')||'0 FAIL',caught});
  console.log(`${caught?'CAUGHT':'MISSED'}  ${f.name}\n        預期：${f.expect??'0 FAIL'}\n        實際：${fails.slice(0,4).join(' ／ ')||'0 FAIL'}${fails.length>4?` …共 ${fails.length} 項`:''}`);
  rmSync(dir,{recursive:true});
}
console.log(`\n瀏覽器故障注入：${rows.length-missed}/${rows.length} 正確`);
const ji=process.argv.indexOf('--json');if(ji>-1)writeFileSync(process.argv[ji+1],JSON.stringify(rows,null,2));
process.exit(missed?1:0);
