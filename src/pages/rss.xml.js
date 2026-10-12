import {getCollection} from 'astro:content';
import config from '../../site.config.json';
const esc=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
export async function GET({site}) {
 const origin=site||new URL(config.site||'https://example.com');
 const base=import.meta.env.BASE_URL;
 const items=config.navigation.some(x=>x.id==='articles')?(await getCollection('articles',({data})=>!data.draft)).sort((a,b)=>b.data.publishedAt-a.data.publishedAt):[];
 const url=(path)=>new URL(base+path,origin).href;
 const body='<?xml version="1.0" encoding="UTF-8"?>'+'<rss version="2.0"><channel><title>'+esc(config.brand.name)+'</title><link>'+esc(url(''))+'</link><description>'+esc(config.brand.tagline)+'</description>'+items.map(x=>'<item><title>'+esc(x.data.title)+'</title><link>'+esc(url('articles/'+x.id+'/'))+'</link><guid>'+esc(url('articles/'+x.id+'/'))+'</guid><pubDate>'+x.data.publishedAt.toUTCString()+'</pubDate><description>'+esc(x.data.description)+'</description></item>').join('')+'</channel></rss>';
 return new Response(body,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
