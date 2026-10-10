export async function GET({site}) {
 const origin=site||new URL('https://example.com');
 const base=import.meta.env.BASE_URL;
 const demo=origin.hostname==='example.com'||origin.hostname.endsWith('.invalid');
 const body='User-agent: *\n'+(demo?'Disallow: /':'Allow: /')+'\nSitemap: '+new URL(base+'sitemap.xml',origin).href+'\n';
 return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
