import config from '../../site.config.json';
import {publishedArticles} from '../lib/site';
const esc=(value)=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[ch]));
export async function GET({site}) {
 const origin=site||new URL(config.site);
 const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:import.meta.env.BASE_URL+'/';
 const url=(path)=>new URL(base+path,origin).href;
 const items=await publishedArticles();
 const body='<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>'+esc(config.brand.name)+'</title><link>'+esc(url(''))+'</link><description>'+esc(config.brand.tagline)+'</description><language>zh-TW</language>'+items.map(x=>'<item><title>'+esc(x.data.title)+'</title><link>'+esc(url('articles/'+x.id+'/'))+'</link><guid isPermaLink="true">'+esc(url('articles/'+x.id+'/'))+'</guid><pubDate>'+x.data.publishedAt.toUTCString()+'</pubDate><description>'+esc(x.data.description)+'</description></item>').join('')+'</channel></rss>';
 return new Response(body,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
