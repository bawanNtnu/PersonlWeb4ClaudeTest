// 前後截圖像素比對。用法：node scripts/qa/visual-diff.mjs <beforeDir> <afterDir> <diffOutDir> [--expect-changed ^prefix,substring]
// 未列入 expect-changed 的頁面若有任何像素差異即 FAIL（代表修改波及了不該動的頁面）。
import {readFileSync,readdirSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
const [before,after,out]=process.argv.slice(2);
const ei=process.argv.indexOf('--expect-changed');
const expected=ei>-1?process.argv[ei+1].split(',').filter(Boolean):[];
mkdirSync(out,{recursive:true});
const rows=[];let unexpected=0;
for(const file of readdirSync(before).filter(f=>f.endsWith('.png'))){
  if(!existsSync(join(after,file))){rows.push({file,status:'MISSING'});unexpected++;continue}
  const a=PNG.sync.read(readFileSync(join(before,file))),b=PNG.sync.read(readFileSync(join(after,file)));
  const w=Math.max(a.width,b.width),h=Math.max(a.height,b.height);
  const pad=img=>{if(img.width===w&&img.height===h)return img;const p=new PNG({width:w,height:h});p.data.fill(255);PNG.bitblt(img,p,0,0,img.width,img.height,0,0);return p};
  const pa=pad(a),pb=pad(b),diff=new PNG({width:w,height:h});
  const n=pixelmatch(pa.data,pb.data,diff.data,w,h,{threshold:0.1});
  // 規則：以 ^ 開頭表示前綴比對，其餘為「檔名包含」比對
  const isExpected=expected.some(p=>p.startsWith('^')?file.startsWith(p.slice(1)):file.includes(p));
  const changed=n>0||a.height!==b.height;
  if(changed)writeFileSync(join(out,file),PNG.sync.write(diff));
  const status=!changed?'UNCHANGED':isExpected?'CHANGED (expected)':'CHANGED (UNEXPECTED)';
  if(status==='CHANGED (UNEXPECTED)')unexpected++;
  rows.push({file,status,diffPixels:n,heightBefore:a.height,heightAfter:b.height});
}
writeFileSync(join(out,'visual-diff.json'),JSON.stringify(rows,null,2));
for(const r of rows)if(r.status!=='UNCHANGED')console.log(`${r.status.padEnd(22)} ${r.file}  diff=${r.diffPixels}px  h ${r.heightBefore}→${r.heightAfter}`);
console.log(`\n視覺比對：${rows.filter(r=>r.status==='UNCHANGED').length} 未變、${rows.filter(r=>r.status==='CHANGED (expected)').length} 預期變更、${unexpected} 非預期變更（共 ${rows.length}）`);
process.exit(unexpected?1:0);
