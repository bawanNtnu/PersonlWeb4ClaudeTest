import config from '../../../site.config.json';
import {publishedArticles} from '../../lib/site';

// 工作坊 SiteSearchDialog 會先讀這份「中文完整字串」索引，再合併 Pagefind 結果。
// 工作坊 ZIP 沒有提供產生器，這裡自行補上：只收錄公開文章與已啟用頁面，草稿不會進入索引。
export async function GET(){
  const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:import.meta.env.BASE_URL+'/';
  const plain=(md:string)=>md.replace(/!\[[^\]]*\]\([^)]*\)/g,'').replace(/\[([^\]]*)\]\([^)]*\)/g,'$1').replace(/[#>*`|_-]+/g,' ').replace(/\s+/g,' ').trim();
  const articles=await publishedArticles();
  const pages=config.navigation.filter(x=>x.enabled).map(x=>({url:base+(x.path??x.id+'/'),title:x.label,text:x.label}));
  const docs=[
    {url:base,title:config.brand.name,text:config.brand.tagline},
    ...pages,
    ...articles.map(a=>({url:base+'articles/'+a.id+'/',title:a.data.title,text:[a.data.description,...a.data.tags,plain(a.body??'')].join(' ')})),
  ];
  return new Response(JSON.stringify({docs}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
