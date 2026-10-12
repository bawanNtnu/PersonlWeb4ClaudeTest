import config from '../../site.config.json';
import {publishedArticles} from '../lib/site';
import {topics} from '../data/topics';
const esc=(value)=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
export async function GET({site}) {
 const origin=site||new URL(config.site);
 const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:import.meta.env.BASE_URL+'/';
 const articles=await publishedArticles();
 // 頁面路由來自導航設定（含自訂 path），分類頁只列出有公開文章的分類。
 const paths=['',...config.navigation.filter(x=>x.enabled).map(x=>(x.path??x.id+'/')),
  ...topics.filter(t=>articles.some(a=>a.data.topic===t.slug)).map(t=>'topics/'+t.slug+'/'),
  ...articles.map(x=>'articles/'+x.id+'/')];
 const urls=[...new Set(paths)].map(path=>'<url><loc>'+esc(new URL(base+path,origin).href)+'</loc></url>').join('');
 return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
