// Static internal link checker for an Astro dist/ directory (trailingSlash always).
import fs from 'node:fs'; import path from 'node:path';
const dist=path.resolve(process.argv[2]); const base=(process.argv[3]||'/');
const files=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html'))files.push(p)}}; walk(dist);
const exists=u=>{let p=decodeURIComponent(u.split(/[?#]/)[0]); if(!p.startsWith(base))return false; p=p.slice(base.length); const f=path.join(dist,p); return fs.existsSync(f)&&fs.statSync(f).isFile()||fs.existsSync(path.join(f,'index.html'))};
const bad=[]; let n=0;
for(const f of files){const h=fs.readFileSync(f,'utf8'); const rel='/'+path.relative(dist,f).replace(/index\.html$/,'');
 for(const m of h.matchAll(/<(a|link)\b[^>]*\bhref="([^"]+)"/g)){const href=m[2]; if(/^(https?:|mailto:|tel:|#|data:)/.test(href))continue; n++;
  const abs=new URL(href,'http://x'+rel).pathname; if(!exists(abs))bad.push({page:rel,href,context:m[0].slice(0,140)});}}
console.log(JSON.stringify({pages:files.length,links:n,broken:bad},null,1)); if(bad.length)process.exitCode=1;
