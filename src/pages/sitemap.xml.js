import {getCollection} from 'astro:content';
import config from '../../site.config.json';
const esc=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
export async function GET({site}) {
 const origin=site||new URL(config.site||'https://example.com');
 const base=import.meta.env.BASE_URL;
 const paths=['',...config.navigation.map(x=>x.id+'/')];
 if(config.navigation.some(x=>x.id==='articles')) {
  const entries=await getCollection('articles',({data})=>!data.draft);
  for(const x of entries)paths.push('articles/'+x.id+'/');
 }
 const urls=[...new Set(paths)].map(path=>'<url><loc>'+esc(new URL(base+path,origin).href)+'</loc></url>').join('');
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
