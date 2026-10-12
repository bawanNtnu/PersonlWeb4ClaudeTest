/** 植物分類（主題）的唯一資料來源。slug 會成為網址 /topics/<slug>/，發布後請勿更改。 */
export const topics=[
  {slug:'environment',label:'陽台環境',description:'西曬、颱風、通風與兩坪空間的限制。'},
  {slug:'method',label:'觀察方法',description:'怎麼看、怎麼記、怎麼判斷要不要澆水。'},
  {slug:'herbs',label:'香草',description:'薄荷、羅勒、迷迭香這些最常被新手買回家的植物。'},
  {slug:'foliage',label:'觀葉植物',description:'龜背芋、黃金葛等以葉子為主角的植物。'},
  {slug:'succulents',label:'多肉植物',description:'看起來最好養、其實最容易澆太多水的一群。'},
] as const;
export const topicSlugs=topics.map(t=>t.slug) as unknown as [typeof topics[number]['slug'],...typeof topics[number]['slug'][]];
export type TopicSlug=typeof topics[number]['slug'];
export const topicBySlug=(slug:string)=>topics.find(t=>t.slug===slug);
