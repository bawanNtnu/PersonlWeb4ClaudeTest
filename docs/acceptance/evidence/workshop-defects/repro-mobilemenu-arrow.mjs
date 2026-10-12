// 最小重現：單層選單、桌機與手機連結完全相同，手機選單使用工作坊 MobileMenu 的原始標記（含 aria-hidden 的 ↗）。
import {createServer} from 'node:http';import {spawn} from 'node:child_process';import {once} from 'node:events';
const links=[['首頁','/'],['關於','/about/'],['工具箱','/toolbox/']];
const variant=process.argv[2]??'workshop-arrow';
const mobileLink=([l,h])=>variant==='workshop-arrow'?`<a href="${h}">${l} <span aria-hidden="true">↗</span></a>`:`<a href="${h}">${l}</a>`;
const server=createServer((req,res)=>{const p=new URL(req.url,'http://x').pathname;if(!links.some(x=>x[1]===p)){res.writeHead(404);res.end();return}
res.setHeader('content-type','text/html; charset=utf-8');
res.end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>.practical-menu{display:none}@media(max-width:600px){.desktop{display:none}.practical-menu{display:block}}</style><header><nav aria-label="主要導覽" class="desktop">${links.map(([l,h])=>`<a href="${h}">${l}</a>`).join('')}</nav><div class="practical-menu"><button aria-label="開啟選單" aria-expanded="false" aria-controls="m1" onclick="document.getElementById('m1').showModal()">≡</button><dialog id="m1" aria-label="網站導覽"><nav aria-label="手機主要導覽">${links.map(mobileLink).join('')}</nav></dialog></div></header><main>x</main>`)});
server.listen(4377,'127.0.0.1');await once(server,'listening');
const c=spawn(process.execPath,['scripts/verify-student-navigation.mjs','--url','http://127.0.0.1:4377/','--paths','/,/about/,/toolbox/','--expect-links','/,/about/,/toolbox/']);let o='';c.stdout.on('data',d=>o+=d);c.stderr.on('data',d=>o+=d);
const [code]=await once(c,'close');server.close();console.log(`variant=${variant} exit=${code}\n`+o.trim());
