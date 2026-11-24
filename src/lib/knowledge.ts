import * as FileSystem from "expo-file-system/legacy";
import type { KItem } from "@/store/useKnowledge";

export const KNOW_EXT = ["html", "htm", "xhtml", "txt", "md"];
export const isHtmlExt = (e: string) => ["html", "htm", "xhtml"].includes(e);

/** تطبيع عربي: يزيل التشكيل والتطويل ويوحّد الهمزات والتاء المربوطة والألف المقصورة */
export function normChar(c: string): string {
  if (/[\u064B-\u0652\u0640]/.test(c)) return "";
  if (c === "أ" || c === "إ" || c === "آ") return "ا";
  if (c === "ة") return "ه";
  if (c === "ى") return "ي";
  return c.toLowerCase();
}
export function normalize(s: string): string {
  let n = "";
  for (let i = 0; i < s.length; i++) n += normChar(s[i]);
  return n;
}

const ENT: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/g, (m) => ENT[m] ?? m)
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function extractTitle(raw: string, ext: string, fallback: string): string {
  if (isHtmlExt(ext)) {
    const m = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const t = m ? htmlToText(m[1]).replace(/\s+/g, " ").trim() : "";
    if (t) return t.slice(0, 120);
  } else if (ext === "md") {
    const m = raw.match(/^#\s+(.+)$/m);
    if (m) return m[1].trim().slice(0, 120);
  }
  return fallback.replace(/\.[^.]+$/, "");
}

export const isArabicText = (s: string) => {
  const sample = s.slice(0, 4000);
  const ar = (sample.match(/[\u0600-\u06FF]/g) ?? []).length;
  const la = (sample.match(/[A-Za-z]/g) ?? []).length;
  return ar > la;
};

const MAX_INDEX = 3_000_000;
type Cached = { text: string; n: string };
const cache = new Map<string, Cached>();

export async function readRaw(item: Pick<KItem, "uri">): Promise<string> {
  return FileSystem.readAsStringAsync(item.uri);
}

export async function plainOf(item: KItem): Promise<Cached> {
  const hit = cache.get(item.id);
  if (hit) return hit;
  const raw = await readRaw(item);
  let text = isHtmlExt(item.ext) ? htmlToText(raw) : raw;
  if (text.length > MAX_INDEX) text = text.slice(0, MAX_INDEX);
  const c = { text, n: normalize(text) };
  cache.set(item.id, c);
  if (cache.size > 12) cache.delete(cache.keys().next().value as string);
  return c;
}
export const dropCache = (id: string) => cache.delete(id);

function origIndex(text: string, nIdx: number): number {
  let cnt = 0;
  for (let i = 0; i < text.length; i++) {
    if (normChar(text[i]) !== "") {
      if (cnt === nIdx) return i;
      cnt++;
    }
  }
  return 0;
}

export type Hit = { item: KItem; snippet: string; count: number; inTitle: boolean };

/** بحث نصي كامل: كل الكلمات يجب أن تظهر (AND)، مع تطبيع عربي */
export async function searchLibrary(items: KItem[], q: string, max = 40): Promise<Hit[]> {
  const words = normalize(q.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const out: Hit[] = [];
  for (const item of items) {
    const nt = normalize(item.title);
    const inTitle = words.every((w) => nt.includes(w));
    let snippet = "";
    let count = 0;
    let bodyOk = false;
    try {
      const { text, n } = await plainOf(item);
      if (words.every((w) => n.includes(w))) {
        bodyOk = true;
        const first = words[0];
        let from = 0;
        let idx = n.indexOf(first);
        const firstIdx = idx;
        while (idx !== -1 && count < 999) {
          count++;
          from = idx + first.length;
          idx = n.indexOf(first, from);
        }
        const o = origIndex(text, firstIdx);
        const a = Math.max(0, o - 50);
        snippet = (a > 0 ? "…" : "") + text.slice(a, o + 110).replace(/\s+/g, " ") + "…";
      }
    } catch {
      // ملف غير قابل للقراءة: نتجاهله
    }
    if (inTitle || bodyOk) out.push({ item, snippet, count, inTitle });
    if (out.length >= max) break;
  }
  return out.sort((a, b) => Number(b.inTitle) - Number(a.inTitle) || b.count - a.count);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function mdToHtml(md: string): string {
  return md
    .split(/\r?\n/)
    .map((l) => {
      const h = l.match(/^(#{1,4})\s+(.*)$/);
      if (h) return `<h${h[1].length}>${esc(h[2])}</h${h[1].length}>`;
      if (!l.trim()) return "";
      return `<p>${esc(l)}</p>`;
    })
    .join("\n");
}

const READER_CSS = `
:root{--fs:18px}
html{-webkit-text-size-adjust:100%}
body{font-size:var(--fs)!important;line-height:1.95!important;padding:16px 16px 90px!important;margin:0!important;max-width:100%!important;word-wrap:break-word;font-family:sans-serif}
img,video,svg,table,iframe{max-width:100%!important;height:auto}
table{display:block;overflow-x:auto}
pre{white-space:pre-wrap}
mark.hl{background:#fde047;color:#000;border-radius:3px}
mark.hl.cur{background:#fb923c}
html.night,html.night body{background:#0b1220!important;color:#e2e8f0!important}
html.night *{background-color:transparent!important;color:inherit!important;border-color:#334155!important}
html.night a{color:#7dd3fc!important}
html.night mark.hl{background:#a16207!important;color:#fff!important}
html.night mark.hl.cur{background:#c2410c!important}
`;

const READER_JS = `
(function(){
  function nc(c){ if(/[\\u064B-\\u0652\\u0640]/.test(c)) return ''; if(c==='أ'||c==='إ'||c==='آ') return 'ا'; if(c==='ة') return 'ه'; if(c==='ى') return 'ي'; return c.toLowerCase(); }
  function post(o){ window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  var marks=[], cur=-1;
  function prog(){ var h=document.documentElement.scrollHeight-window.innerHeight; return h>0?Math.min(1,Math.max(0,window.scrollY/h)):0; }
  var t=null;
  window.addEventListener('scroll',function(){ if(t) return; t=setTimeout(function(){ t=null; post({t:'p',v:prog()}); },250); });
  window.__goPos=function(p){ var h=document.documentElement.scrollHeight-window.innerHeight; window.scrollTo(0,Math.max(0,p*h)); };
  window.__set=function(fs,night){ document.documentElement.style.setProperty('--fs',fs+'px'); document.documentElement.classList.toggle('night',!!night); };
  window.__snip=function(){ var el=document.elementFromPoint(window.innerWidth/2,24)||document.body; var s=(el.innerText||el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,70); post({t:'snip',v:s,p:prog()}); };
  function clear(){ marks.forEach(function(m){ var p=m.parentNode; if(!p) return; while(m.firstChild) p.insertBefore(m.firstChild,m); p.removeChild(m); p.normalize(); }); marks=[]; cur=-1; }
  function show(i){ if(!marks.length) return; marks.forEach(function(m){m.classList.remove('cur');}); cur=(i+marks.length)%marks.length; var m=marks[cur]; m.classList.add('cur'); m.scrollIntoView({block:'center'}); post({t:'hl',n:marks.length,i:cur}); }
  window.__hl=function(q){
    clear(); var nq=''; for(var k=0;k<q.length;k++) nq+=nc(q[k]); nq=nq.trim();
    if(!nq){ post({t:'hl',n:0,i:-1}); return; }
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(n){ var p=n.parentNode&&n.parentNode.nodeName; return (p==='SCRIPT'||p==='STYLE')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT; }});
    var nodes=[]; while(w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(function(node){
      var s=node.nodeValue, n='', map=[];
      for(var i=0;i<s.length;i++){ var r=nc(s[i]); if(r){ n+=r; map.push(i); } }
      var hits=[], from=0, ix=n.indexOf(nq);
      while(ix!==-1){ hits.push(ix); from=ix+nq.length; ix=n.indexOf(nq,from); }
      for(var h=hits.length-1;h>=0;h--){
        try{
          var a=map[hits[h]], b=map[hits[h]+nq.length-1]+1;
          var rg=document.createRange(); rg.setStart(node,a); rg.setEnd(node,b);
          var mk=document.createElement('mark'); mk.className='hl'; rg.surroundContents(mk); marks.unshift(mk);
        }catch(e){}
      }
    });
    if(marks.length) show(0); else post({t:'hl',n:0,i:-1});
  };
  window.__next=function(d){ show(cur+d); };
  window.__clearHl=clear;
})();
true;
`;

export const READER_INIT_JS = READER_JS;

export function buildReaderHtml(raw: string, ext: string, arabic: boolean, fs: number, night: boolean): string {
  const dir = arabic ? "rtl" : "ltr";
  const extra = `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${READER_CSS}body{direction:${dir};text-align:start}</style>`;
  const cls = night ? "night" : "";
  const vars = `<style>:root{--fs:${fs}px}</style>`;
  if (isHtmlExt(ext)) {
    let h = raw;
    if (/<head[^>]*>/i.test(h)) h = h.replace(/<head[^>]*>/i, (m) => `${m}${extra}${vars}`);
    else if (/<html[^>]*>/i.test(h)) h = h.replace(/<html[^>]*>/i, (m) => `${m}<head>${extra}${vars}</head>`);
    else h = `<html><head>${extra}${vars}</head><body>${h}</body></html>`;
    return h.replace(/<html([^>]*)>/i, (_m, a) => `<html${a} class="${cls}">`);
  }
  const body = ext === "md" ? mdToHtml(raw) : `<pre dir="auto">${esc(raw)}</pre>`;
  return `<!doctype html><html class="${cls}"><head>${extra}${vars}</head><body>${body}</body></html>`;
}
