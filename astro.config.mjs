import {defineConfig} from 'astro/config';
import config from './site.config.json' with {type:'json'};

// 網址來源優先序：明確指定的正式網址 → Cloudflare Pages 建置時提供的部署網址 → 設定檔佔位網址。
const site=process.env.SITE_URL||process.env.CF_PAGES_URL||config.site;
const base=process.env.ASTRO_BASE_PATH||config.base;

// Markdown 文章裡寫 /illustrations/x.svg 或 /articles/y/ 這類站內絕對路徑時，自動加上 BASE_URL，
// 讓網站日後搬到子路徑（例如 GitHub Pages 專案站）也不會破圖或斷鏈。
function rehypeBasePath(){
  const prefix=base.endsWith('/')?base:base+'/';
  const fix=value=>typeof value==='string'&&value.startsWith('/')&&!value.startsWith('//')&&prefix!=='/'&&!value.startsWith(prefix)?prefix+value.slice(1):value;
  const walk=node=>{
    if(node.type==='element'&&node.properties){
      if('src' in node.properties)node.properties.src=fix(node.properties.src);
      if('href' in node.properties)node.properties.href=fix(node.properties.href);
    }
    (node.children||[]).forEach(walk);
  };
  return tree=>walk(tree);
}

export default defineConfig({site,base,output:'static',trailingSlash:'always',markdown:{rehypePlugins:[rehypeBasePath]}});
