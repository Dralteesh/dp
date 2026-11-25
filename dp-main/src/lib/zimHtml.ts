import { buildReaderHtml, htmlToText, isArabicText } from "@/lib/knowledge";
import { resolvePath, utf8Decode, type ZEntry, type ZimFile } from "@/lib/zim";

export const IMG_PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const MAX_CSS = 400_000;

/** سكربت صفحة ZIM: تحميل الصور عند ظهورها، واعتراض الروابط الداخلية */
export const ZIM_JS = `
(function(){
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var imgs=document.querySelectorAll('img[data-zsrc]');
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ var im=e.target; io.unobserve(im); post({t:'img',i:+im.getAttribute('data-zi'),s:im.getAttribute('data-zsrc')}); } }); },{rootMargin:'500px'});
    imgs.forEach(function(im,i){ im.setAttribute('data-zi',i); io.observe(im); });
  }
  window.__setImg=function(i,u){ var im=document.querySelector('img[data-zi="'+i+'"]'); if(im){ im.src=u; } };
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('a'); if(!a) return;
    var h=a.getAttribute('href'); if(!h) return;
    e.preventDefault();
    if(h.charAt(0)==='#'){ var el=document.getElementById(h.slice(1)); if(el) el.scrollIntoView(); return; }
    post({t:'link',h:h});
  },true);
})();
true;
`;

const escAttr = (s: string) => s.replace(/"/g, "&quot;");

async function readText(zim: ZimFile, path: string, max: number): Promise<string | null> {
  try {
    const i = await zim.lookup(path);
    if (i < 0) return null;
    const e = await zim.follow(await zim.entryAt(i));
    if (e.deleted) return null;
    const b = await zim.blobOf(e);
    return b.length > max ? null : utf8Decode(b);
  } catch {
    return null;
  }
}

/** يجهّز صفحة ZIM للعرض: يحذف السكربتات، يضمّن CSS، ويؤجّل الصور */
export async function prepareArticle(zim: ZimFile, entry: ZEntry, fs: number, night: boolean): Promise<{ html: string; path: string; title: string; isHtml: boolean }> {
  const e = await zim.follow(entry);
  const path = zim.pathOf(e);
  const title = e.title || e.url;
  const mime = zim.mimeOf(e);
  const blob = await zim.blobOf(e);
  if (!mime.startsWith("text/html")) {
    if (mime.startsWith("text/")) return { html: buildReaderHtml(utf8Decode(blob), "txt", true, fs, night), path, title, isHtml: false };
    return { html: "", path, title, isHtml: false };
  }
  let raw = utf8Decode(blob);
  raw = raw.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<base\b[^>]*>/gi, "");

  // CSS
  const links = raw.match(/<link\b[^>]*>/gi) ?? [];
  let n = 0;
  for (const tag of links) {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) continue;
    const m = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!m || n >= 6) {
      raw = raw.replace(tag, "");
      continue;
    }
    n++;
    const css = await readText(zim, resolvePath(path, m[1]), MAX_CSS);
    raw = raw.replace(tag, css ? `<style>${css.replace(/@import[^;]+;/g, "")}</style>` : "");
  }

  // الصور تُحمَّل لاحقًا عند الظهور
  raw = raw.replace(/<img\b[^>]*>/gi, (tag) => {
    const m = tag.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
    if (!m || /^data:/i.test(m[2])) return tag;
    return tag.replace(/\ssrcset\s*=\s*(["']).*?\1/gi, "").replace(m[0], ` src="${IMG_PLACEHOLDER}" data-zsrc="${escAttr(m[2])}"`);
  });

  const sample = htmlToText(raw.slice(0, 200_000));
  const html = buildReaderHtml(raw, "html", isArabicText(sample), fs, night).replace("</head>", "<style>img[data-zsrc]{min-height:16px}</style></head>");
  return { html, path, title, isHtml: true };
}
