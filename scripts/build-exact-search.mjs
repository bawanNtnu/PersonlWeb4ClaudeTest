// Optional Chinese exact-match companion index for Pagefind / SiteSearchDialog.
// Uses the actual generated HTML; this is not a replacement for Pagefind.
import {readdirSync,readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,relative,resolve,sep} from 'node:path';
const dist=resolve(process.argv[2]||'dist');
if(!existsSync(dist))throw Error('Build dist/ before generating search data');
const config=JSON.parse(readFileSync(resolve('site.config.json'),'utf8'));
const base=(process.env.ASTRO_BASE_PATH||config.base||'/').replace(/\/?$/,'/');
const paths=[];
function walk(dir){for(const e of readdirSync(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()&&e.name!=='pagefind')walk(p);else if(e.isFile()&&e.name.endsWith('.html'))paths.push(p)}}
walk(dist);
const decode=s=>s.replace(/&#(x[0-9a-f]+|\d+);/gi,(_,v)=>String.fromCodePoint(v[0].toLowerCase()==='x'?parseInt(v.slice(1),16):Number(v)))
 .replace(/&(amp|lt|gt|quot|apos|nbsp);/gi,(_,v)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[v]));
const docs=[];
for(const file of paths){
 const relativePath=relative(dist,file).split(sep).join('/');
 if(relativePath==='404.html'||relativePath==='404/index.html')continue;
 const html=readFileSync(file,'utf8');
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
 if(!main)continue;
 const text=decode(main.replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
 if(!text)continue;
 const title=decode(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'文章');
 const route=relativePath.replace(/index\.html$/,'');
 docs.push({url:base+route,title,text});
}
const target=join(dist,'search','exact-zh.json');mkdirSync(join(dist,'search'),{recursive:true});
writeFileSync(target,JSON.stringify({version:1,docs}), 'utf8');
console.log('Supplemental Chinese search index:',docs.length,'pages. Pagefind is separate.');
