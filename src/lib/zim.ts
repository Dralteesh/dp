import * as FileSystem from "expo-file-system/legacy";
import { decompress } from "fzstd";

/**
 * قارئ ملفات ZIM (صيغة Kiwix) بجافاسكربت صرف: يقرأ أجزاء من الملف عند الحاجة فقط.
 * يدعم النسخ 5 و6، عناقيد غير مضغوطة أو zstd. عناقيد xz القديمة غير مدعومة.
 */

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const REV = (() => {
  const m = new Uint8Array(128);
  for (let i = 0; i < 64; i++) m[B64.charCodeAt(i)] = i;
  return m;
})();

export function b64ToBytes(b64: string): Uint8Array {
  let len = b64.length;
  while (len > 0 && b64.charCodeAt(len - 1) === 61) len--;
  const out = new Uint8Array(Math.floor((len * 3) / 4));
  let o = 0;
  for (let i = 0; i < len; i += 4) {
    const a = REV[b64.charCodeAt(i)];
    const b = REV[b64.charCodeAt(i + 1)];
    const c = i + 2 < len ? REV[b64.charCodeAt(i + 2)] : 0;
    const d = i + 3 < len ? REV[b64.charCodeAt(i + 3)] : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export function bytesToB64(b: Uint8Array): string {
  const parts: string[] = [];
  let s = "";
  for (let i = 0; i < b.length; i += 3) {
    const x = b[i];
    const y = i + 1 < b.length ? b[i + 1] : 0;
    const z = i + 2 < b.length ? b[i + 2] : 0;
    const n = (x << 16) | (y << 8) | z;
    s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "=") + (i + 2 < b.length ? B64[n & 63] : "=");
    if (s.length >= 8192) {
      parts.push(s);
      s = "";
    }
  }
  parts.push(s);
  return parts.join("");
}

export function utf8Decode(b: Uint8Array): string {
  const parts: string[] = [];
  let u: number[] = [];
  let i = 0;
  const n = b.length;
  while (i < n) {
    const c = b[i++];
    let cp: number;
    if (c < 0x80) cp = c;
    else if (c < 0xe0) cp = ((c & 0x1f) << 6) | (b[i++] & 0x3f);
    else if (c < 0xf0) cp = ((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
    else cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
    if (cp > 0xffff) {
      cp -= 0x10000;
      u.push(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    } else u.push(cp);
    if (u.length >= 8192) {
      parts.push(String.fromCharCode.apply(null, u));
      u = [];
    }
  }
  if (u.length) parts.push(String.fromCharCode.apply(null, u));
  return parts.join("");
}

export function utf8Encode(s: string): Uint8Array {
  const out: number[] = [];
  for (const ch of s) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
  }
  return Uint8Array.from(out);
}

async function readBytes(uri: string, pos: number, len: number): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64, position: pos, length: len });
  return b64ToBytes(b64);
}

const dv = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const u16 = (b: Uint8Array, o: number) => dv(b).getUint16(o, true);
const u32 = (b: Uint8Array, o: number) => dv(b).getUint32(o, true);
const u64 = (b: Uint8Array, o: number) => dv(b).getUint32(o + 4, true) * 4294967296 + dv(b).getUint32(o, true);

export class ZimError extends Error {
  code: string;
  constructor(code: string, msg: string) {
    super(msg);
    this.code = code;
  }
}

export type ZEntry = {
  index: number;
  mime: number;
  redirect: boolean;
  deleted: boolean;
  target: number;
  cluster: number;
  blob: number;
  ns: string;
  urlBytes: Uint8Array;
  url: string;
  title: string;
  /** مفتاح الترتيب بالعنوان (العنوان، وإن كان فارغًا فالرابط) */
  sortBytes: Uint8Array;
};

function indexOfZero(b: Uint8Array, from: number): number {
  for (let i = from; i < b.length; i++) if (b[i] === 0) return i;
  return -1;
}

function parseEntry(b: Uint8Array): Omit<ZEntry, "index"> | null {
  if (b.length < 17) return null;
  const mime = u16(b, 0);
  const ns = String.fromCharCode(b[3]);
  const redirect = mime === 0xffff;
  const deleted = mime === 0xfffe || mime === 0xfffd;
  let target = 0;
  let cluster = 0;
  let blob = 0;
  let p: number;
  if (redirect) {
    target = u32(b, 8);
    p = 12;
  } else {
    cluster = u32(b, 8);
    blob = u32(b, 12);
    p = 16;
  }
  const e1 = indexOfZero(b, p);
  if (e1 < 0) return null;
  const e2 = indexOfZero(b, e1 + 1);
  if (e2 < 0) return null;
  const urlBytes = b.slice(p, e1);
  const titleBytes = b.slice(e1 + 1, e2);
  return {
    mime,
    redirect,
    deleted,
    target,
    cluster,
    blob,
    ns,
    urlBytes,
    url: utf8Decode(urlBytes),
    title: utf8Decode(titleBytes),
    sortBytes: titleBytes.length ? titleBytes : urlBytes,
  };
}

function cmpBytes(a: Uint8Array, b: Uint8Array): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return a.length === b.length ? 0 : a.length < b.length ? -1 : 1;
}
function startsWith(a: Uint8Array, prefix: Uint8Array): boolean {
  if (a.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) if (a[i] !== prefix[i]) return false;
  return true;
}

export type ZHeader = {
  major: number;
  minor: number;
  articleCount: number;
  clusterCount: number;
  urlPtrPos: number;
  titlePtrPos: number;
  clusterPtrPos: number;
  mimeListPos: number;
  mainPage: number;
  checksumPos: number;
};

export function resolvePath(base: string, href: string): string {
  let h = href.split("#")[0].split("?")[0];
  try {
    h = decodeURIComponent(h);
  } catch {
    // نترك الرابط كما هو
  }
  const parts = h.startsWith("/") ? [] : base.split("/").slice(0, -1);
  for (const seg of h.split("/")) {
    if (seg === ".." ) parts.pop();
    else if (seg === "." || seg === "") continue;
    else parts.push(seg);
  }
  return parts.join("/");
}

export class ZimFile {
  uri: string;
  h: ZHeader;
  mimes: string[];
  newNs: boolean;
  private clusters = new Map<number, Uint8Array>();

  private constructor(uri: string, h: ZHeader, mimes: string[]) {
    this.uri = uri;
    this.h = h;
    this.mimes = mimes;
    this.newNs = h.major >= 6 && h.minor >= 1;
  }

  static async open(uri: string): Promise<ZimFile> {
    const b = await readBytes(uri, 0, 80);
    if (b.length < 80 || u32(b, 0) !== 0x044d495a) throw new ZimError("magic", "الملف ليس بصيغة ZIM صحيحة");
    const h: ZHeader = {
      major: u16(b, 4),
      minor: u16(b, 6),
      articleCount: u32(b, 24),
      clusterCount: u32(b, 28),
      urlPtrPos: u64(b, 32),
      titlePtrPos: u64(b, 40),
      clusterPtrPos: u64(b, 48),
      mimeListPos: u64(b, 56),
      mainPage: u32(b, 64),
      checksumPos: u64(b, 72),
    };
    if (h.major !== 5 && h.major !== 6) throw new ZimError("version", `إصدار ZIM غير مدعوم (${h.major})`);
    const ml = await readBytes(uri, h.mimeListPos, 4096);
    const mimes: string[] = [];
    let p = 0;
    while (p < ml.length) {
      const e = indexOfZero(ml, p);
      if (e < 0 || e === p) break;
      mimes.push(utf8Decode(ml.subarray(p, e)));
      p = e + 1;
    }
    return new ZimFile(uri, h, mimes);
  }

  get count() {
    return this.h.articleCount;
  }

  async entryAt(i: number): Promise<ZEntry> {
    const ptr = await readBytes(this.uri, this.h.urlPtrPos + 8 * i, 8);
    const off = u64(ptr, 0);
    let e = parseEntry(await readBytes(this.uri, off, 768));
    if (!e) e = parseEntry(await readBytes(this.uri, off, 16384));
    if (!e) throw new ZimError("entry", "مدخل تالف في الملف");
    return { ...e, index: i };
  }

  async follow(e: ZEntry): Promise<ZEntry> {
    let n = 0;
    while (e.redirect && n++ < 8) e = await this.entryAt(e.target);
    return e;
  }

  pathOf(e: ZEntry): string {
    return this.newNs ? e.url : `${e.ns}/${e.url}`;
  }

  private split(path: string): { ns: string; url: string } {
    if (this.newNs) return { ns: "C", url: path };
    if (path.length > 2 && path[1] === "/") return { ns: path[0], url: path.slice(2) };
    return { ns: "A", url: path };
  }

  /** رقم المدخل لمسار معيّن أو -1 */
  async lookup(path: string): Promise<number> {
    const { ns, url } = this.split(path);
    return this.findByUrl(ns, url);
  }

  async findByUrl(ns: string, url: string): Promise<number> {
    const kb = utf8Encode(url);
    const nsCode = ns.charCodeAt(0);
    let lo = 0;
    let hi = this.h.articleCount - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const e = await this.entryAt(mid);
      const en = e.ns.charCodeAt(0);
      const c = nsCode !== en ? (nsCode < en ? -1 : 1) : cmpBytes(kb, e.urlBytes);
      if (c === 0) return mid;
      if (c < 0) hi = mid - 1;
      else lo = mid + 1;
    }
    return -1;
  }

  private async titleIndex(j: number): Promise<number> {
    return u32(await readBytes(this.uri, this.h.titlePtrPos + 4 * j, 4), 0);
  }

  /** بحث بالبادئة في العناوين (لا فهرسة نصية كاملة) */
  async searchTitles(prefix: string, limit = 20): Promise<{ path: string; title: string }[]> {
    const p = prefix.trim();
    if (!p) return [];
    const ns = this.newNs ? "C" : "A";
    const nsCode = ns.charCodeAt(0);
    const variants = Array.from(new Set([p, p.charAt(0).toUpperCase() + p.slice(1), p.toLowerCase(), p.replace(/\b\w/g, (m) => m.toUpperCase())]));
    const out: { path: string; title: string }[] = [];
    const seen = new Set<string>();
    for (const v of variants) {
      if (out.length >= limit) break;
      const pb = utf8Encode(v);
      let lo = 0;
      let hi = this.h.articleCount;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        const e = await this.entryAt(await this.titleIndex(mid));
        const en = e.ns.charCodeAt(0);
        const c = en !== nsCode ? (en < nsCode ? -1 : 1) : cmpBytes(e.sortBytes, pb);
        if (c < 0) lo = mid + 1;
        else hi = mid;
      }
      const want = Math.min(limit - out.length + 4, this.h.articleCount - lo);
      if (want <= 0) continue;
      const idxBytes = await readBytes(this.uri, this.h.titlePtrPos + 4 * lo, 4 * want);
      for (let k = 0; k < want && out.length < limit; k++) {
        const e = await this.entryAt(u32(idxBytes, 4 * k));
        if (e.ns.charCodeAt(0) !== nsCode || !startsWith(e.sortBytes, pb)) break;
        if (e.deleted) continue;
        const path = this.pathOf(e);
        if (seen.has(path)) continue;
        seen.add(path);
        out.push({ path, title: e.title || e.url });
      }
    }
    return out;
  }

  /** الصفحة الرئيسية */
  async home(): Promise<ZEntry | null> {
    if (this.h.mainPage !== 0xffffffff && this.h.mainPage < this.h.articleCount) return this.follow(await this.entryAt(this.h.mainPage));
    const w = await this.findByUrl("W", "mainPage");
    if (w >= 0) return this.follow(await this.entryAt(w));
    if (this.h.articleCount > 0) {
      const r = await this.searchTitles("A", 1);
      if (r[0]) {
        const i = await this.lookup(r[0].path);
        if (i >= 0) return this.follow(await this.entryAt(i));
      }
    }
    return null;
  }

  async meta(name: string): Promise<string | null> {
    const i = await this.findByUrl("M", name);
    if (i < 0) return null;
    const e = await this.follow(await this.entryAt(i));
    if (e.deleted) return null;
    return utf8Decode(await this.blobOf(e));
  }

  mimeOf(e: ZEntry): string {
    return this.mimes[e.mime] ?? "application/octet-stream";
  }

  async blobOf(e: ZEntry): Promise<Uint8Array> {
    const ptrs = await readBytes(this.uri, this.h.clusterPtrPos + 8 * e.cluster, e.cluster + 1 < this.h.clusterCount ? 16 : 8);
    const start = u64(ptrs, 0);
    const end = ptrs.length >= 16 ? u64(ptrs, 8) : this.h.checksumPos;
    const info = (await readBytes(this.uri, start, 1))[0];
    const comp = info & 15;
    const osz = info & 16 ? 8 : 4;
    const rd = (b: Uint8Array, o: number) => (osz === 8 ? u64(b, o) : u32(b, o));

    if (comp <= 1) {
      const offs = await readBytes(this.uri, start + 1 + e.blob * osz, osz * 2);
      const a = rd(offs, 0);
      const b = rd(offs, osz);
      return readBytes(this.uri, start + 1 + a, b - a);
    }
    if (comp !== 5) throw new ZimError("comp", comp === 4 ? "هذا الملف مضغوط بصيغة xz القديمة وغير مدعوم. نزّل نسخة أحدث (zstd) من library.kiwix.org" : "نوع ضغط غير مدعوم");
    let cached: Uint8Array | undefined = this.clusters.get(e.cluster);
    if (!cached) {
      const size = end - start;
      if (size > 80_000_000) throw new ZimError("big", "الكتلة المضغوطة كبيرة جدًا");
      const raw = await readBytes(this.uri, start, size);
      cached = decompress(raw.subarray(1)) as Uint8Array;
      this.clusters.set(e.cluster, cached);
      if (this.clusters.size > 3) this.clusters.delete(this.clusters.keys().next().value as number);
    }
    const data: Uint8Array = cached;
    const a = rd(data, e.blob * osz);
    const b = rd(data, (e.blob + 1) * osz);
    return data.subarray(a, b);
  }
}

const open = new Map<string, ZimFile>();
export async function getZim(id: string, uri: string): Promise<ZimFile> {
  let z = open.get(id);
  if (!z) {
    z = await ZimFile.open(uri);
    open.set(id, z);
  }
  return z;
}
export const forgetZim = (id: string) => open.delete(id);
