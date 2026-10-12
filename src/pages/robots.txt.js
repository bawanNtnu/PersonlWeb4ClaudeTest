import config from '../../site.config.json';
import {indexable} from '../lib/site';
export async function GET({site}) {
 const origin=site||new URL(config.site);
 const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:import.meta.env.BASE_URL+'/';
 // 預覽與尚未決定正式網址的建置一律禁止索引；正式發布時以 SITE_URL + SITE_INDEXABLE=true 開啟。
 const body='User-agent: *\n'+(indexable?'Allow: /':'Disallow: /')+'\nSitemap: '+new URL(base+'sitemap.xml',origin).href+'\n';
 return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
