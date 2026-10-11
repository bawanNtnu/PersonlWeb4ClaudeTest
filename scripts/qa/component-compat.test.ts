// 元件向下相容測試：不帶 href 時，學員站修改後的 FeatureGrid 與工作坊原版輸出必須逐字相同；帶 href 時整張卡片成為連結。
// 用法：npx vitest run scripts/qa/component-compat.test.ts
import {experimental_AstroContainer as AstroContainer} from 'astro/container';
import {expect,test} from 'vitest';
import Original from './fixtures/FeatureGrid.original.astro';
import Current from '../../src/components/blocks/FeatureGrid.astro';

const items=[{title:'第一步',description:'說明一'},{title:'第二步',description:'說明二'}];
// 開發模式會加上 data-astro-source-file/loc 除錯屬性（含檔名與行號），比對前移除
const strip=(html:string)=>html.replace(/ data-astro-(cid-[a-z0-9]+(="")?|source-(file|loc)="[^"]*")/g,'');

test('無 href 時輸出與工作坊原版相同',async()=>{
  const c=await AstroContainer.create();
  expect(strip(await c.renderToString(Current,{props:{items,columns:2}}))).toBe(strip(await c.renderToString(Original,{props:{items,columns:2}})));
});
test('有 href 時標題成為唯一連結，且卡片標記為可點',async()=>{
  const c=await AstroContainer.create();
  const html=await c.renderToString(Current,{props:{items:[{title:'A',description:'d',href:'/articles/a/'}]}});
  expect(html).toContain('class="ab-feature ab-feature--link"');
  expect(html.match(/<a /g)?.length).toBe(1);
  expect(html).toContain('href="/articles/a/"');
});
