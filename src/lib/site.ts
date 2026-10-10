import config from '../../site.config.json';
import {getCollection,type CollectionEntry} from 'astro:content';

export const base=import.meta.env.BASE_URL.endsWith('/')?import.meta.env.BASE_URL:import.meta.env.BASE_URL+'/';
/** 由站內相對路徑（不含開頭斜線）組出尊重 BASE_URL 的連結。 */
export const href=(path='')=>base+path.replace(/^\/+/,'');

/** 只有明確設定正式網址並允許索引時，網站才會開放搜尋引擎；預覽與本機建置一律 noindex。 */
export const indexable=Boolean(process.env.SITE_URL)&&process.env.SITE_INDEXABLE==='true';

export type NavItem={id:string;label:string;enabled:boolean;parentId?:string;path?:string};
export const navigation=(config.navigation as NavItem[]).filter(x=>x.enabled);
export const navHref=(item:NavItem)=>href(item.path??item.id+'/');
export const navRoots=navigation.filter(x=>!x.parentId);
export const navChildren=(id:string)=>navigation.filter(x=>x.parentId===id);

export type Article=CollectionEntry<'articles'>;
/** 公開文章唯一入口：所有列表、RSS、Sitemap、搜尋索引都必須經過這裡，草稿才不會外洩。 */
export async function publishedArticles():Promise<Article[]>{
  const entries=await getCollection('articles',({data})=>data.draft!==true);
  return entries.sort((a,b)=>b.data.publishedAt.getTime()-a.data.publishedAt.getTime());
}
export const articleHref=(entry:Article)=>href('articles/'+entry.id+'/');
export const formatDate=(date:Date)=>`${date.getUTCFullYear()}.${String(date.getUTCMonth()+1).padStart(2,'0')}.${String(date.getUTCDate()).padStart(2,'0')}`;
export const monthKey=(date:Date)=>`${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}`;
export const readingMinutes=(entry:Article)=>entry.data.readingMinutes??Math.max(1,Math.round((entry.body?.length??0)/400));
export {config};
