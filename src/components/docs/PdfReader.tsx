import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Text } from "@/components/ui/Text";
import { inputAlign } from "@/lib/rtl";
import { useDocs, type DocItem } from "@/store/useDocs";
import { PDFJS_MAIN, PDFJS_WORKER } from "@/lib/pdfjsInline";

const BLUE = "#0E6FA5";
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174";
const MAX_PDF = 60_000_000;
const ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3];

/**
 * صفحة القارئ (pdf.js داخل WebView): تمرير مستمر، رسم الصفحات القريبة فقط لتوفير الذاكرة،
 * وتكبير يعيد الرسم بوضوح كامل، ووضع ليلي. الواجهة الأصلية تتحكم بالصفحات والتكبير.
 */
const READER_TPL = `<!doctype html><html dir="ltr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>
html,body{margin:0;background:#525659;-webkit-tap-highlight-color:transparent}
body.n{background:#101215}
#s{color:#fff;font-family:sans-serif;padding:28px 20px;text-align:center;direction:rtl}
#w{position:relative}
.pg{position:relative;margin:8px auto;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.35);overflow:hidden}
.pg canvas{display:block;width:100%;height:100%}
body.n .pg{filter:invert(.9) hue-rotate(180deg)}
</style></head><body>
<div id="s">جارٍ تحميل القارئ…</div><div id="w"></div>
@@PDFJS_TAG@@
<script>
var pdf=null,zoom=1,total=0,cur=1,sizes=[],tops=[],hs=[],els=[],rend={},tok=0,tick=false,W=0;
function post(o){window.ReactNativeWebView.postMessage(JSON.stringify(o));}
function msg(t){var s=document.getElementById('s');s.style.display='block';s.textContent=t;}
function layout(){
  W=Math.max(220,window.innerWidth-16)*zoom;var y=0;
  for(var i=0;i<total;i++){
    var h=Math.round(sizes[i].h*(W/sizes[i].w));
    els[i].style.width=W+'px';els[i].style.height=h+'px';
    hs[i]=h;tops[i]=y+8;y+=h+16;
  }
}
function release(i){if(rend[i]){var c=els[i].firstChild;if(c){c.width=0;c.height=0;els[i].removeChild(c);}rend[i]=0;}}
async function draw(i){
  if(rend[i])return;rend[i]=1;var my=tok;
  try{
    var p=await pdf.getPage(i+1);var base=W/sizes[i].w;
    var dpr=Math.min(window.devicePixelRatio||1,2.5);var s=base*dpr;
    var vp=p.getViewport({scale:s});
    while(vp.width*vp.height>14000000&&s>0.5){s*=0.85;vp=p.getViewport({scale:s});}
    var c=document.createElement('canvas');c.width=Math.floor(vp.width);c.height=Math.floor(vp.height);
    await p.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;
    if(my!==tok||!rend[i]){c.width=0;return;}
    els[i].appendChild(c);
  }catch(e){rend[i]=0;}
}
function sync(){
  var y=window.scrollY,vh=window.innerHeight,lo=y-1400,hi=y+vh+1400,c=1;
  for(var i=0;i<total;i++){
    var t=tops[i],b=t+hs[i];
    if(t<=y+vh*0.3)c=i+1;
    if(b>=lo&&t<=hi)draw(i);else if(b<y-4000||t>y+vh+4000)release(i);
  }
  if(c!==cur){cur=c;post({t:'page',n:cur});}
}
function req(){if(!tick){tick=true;requestAnimationFrame(function(){tick=false;sync();});}}
window.addEventListener('scroll',req,{passive:true});
window.__go=function(n){n=Math.max(1,Math.min(total,n|0));window.scrollTo(window.scrollX,tops[n-1]-8);cur=n;post({t:'page',n:cur});sync();};
window.__zoom=function(z){
  if(!total)return;var i=cur-1,off=(window.scrollY-tops[i])/hs[i];
  zoom=z;tok++;for(var k=0;k<total;k++)release(k);layout();
  window.scrollTo(0,tops[i]+off*hs[i]);sync();
};
window.__night=function(b){document.body.className=b?'n':'';};
window.__open=async function(b64,start,z,night){
  try{
    zoom=z||1;window.__night(night);msg('جارٍ فتح الملف…');
    pdfjsLib.GlobalWorkerOptions.workerSrc=window.__workerUrl||'${PDFJS}/pdf.worker.min.js';
    var raw=atob(b64),bytes=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    pdf=await pdfjsLib.getDocument({data:bytes}).promise;total=pdf.numPages;
    var w=document.getElementById('w');
    for(var a=0;a<total;a+=30){
      var ps=[];for(var b=a;b<Math.min(total,a+30);b++)ps.push(pdf.getPage(b+1));
      var got=await Promise.all(ps);
      for(var k=0;k<got.length;k++){var v=got[k].getViewport({scale:1});sizes.push({w:v.width,h:v.height});}
    }
    for(var j=0;j<total;j++){var d=document.createElement('div');d.className='pg';w.appendChild(d);els.push(d);}
    document.getElementById('s').style.display='none';
    layout();post({t:'loaded',pages:total});
    window.__go(Math.min(start||1,total));
  }catch(e){post({t:'error',m:String(e&&e.message||e)});}
};
if(window.__fail||typeof pdfjsLib==='undefined'){post({t:'error',m:'تعذّر تحميل قارئ PDF. يلزم اتصال بالإنترنت أول مرة فقط.'});}
else post({t:'ready'});
</script></body></html>`;

// pdf.js مضمَّن داخل التطبيق (يعمل بدون إنترنت)؛ وإن لم يتوفر نرجع إلى CDN.
const INLINE_OK = PDFJS_MAIN.length > 0 && PDFJS_WORKER.length > 0;
const PDFJS_TAG = INLINE_OK
  ? "<script>window.__workerUrl=URL.createObjectURL(new Blob([" + JSON.stringify(PDFJS_WORKER).replace(/</g, "\\u003c") + "],{type:'text/javascript'}));</script>\n<script>" +
    PDFJS_MAIN.replace(/<\/script/gi, "<\\/script") +
    "</script>"
  : '<script src="' + PDFJS + '/pdf.min.js" onerror="window.__fail=1"></script>';
const READER_HTML = READER_TPL.replace("@@PDFJS_TAG@@", () => PDFJS_TAG);

export function PdfReader({ doc }: { doc: DocItem }) {
  const router = useRouter();
  const web = useRef<WebView>(null);
  const patchDoc = useDocs((s) => s.patchDoc);
  const touch = useDocs((s) => s.touch);

  const [b64, setB64] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(doc.page ?? 1);
  const [pages, setPages] = useState(doc.pages ?? 0);
  const [zoom, setZoom] = useState(doc.zoom ?? 1);
  const [night, setNight] = useState(!!doc.night);
  const [jump, setJump] = useState(false);
  const [jumpText, setJumpText] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    touch(doc.id);
    let alive = true;
    (async () => {
      try {
        if (doc.size > MAX_PDF) throw new Error("الملف كبير جدًا للعرض داخل التطبيق.");
        const s = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
        if (alive) setB64(s);
      } catch (e) {
        if (alive) {
          setError(String((e as Error)?.message ?? e));
          setLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  useEffect(() => {
    if (ready && b64 && !sent) {
      setSent(true);
      web.current?.injectJavaScript(`window.__open(${JSON.stringify(b64)},${page},${zoom},${night});true;`);
    }
  }, [ready, b64, sent, page, zoom, night]);

  const run = useCallback((js: string) => web.current?.injectJavaScript(`${js};true;`), []);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.t === "ready") setReady(true);
      else if (m.t === "loaded") {
        setPages(m.pages);
        setLoading(false);
        patchDoc(doc.id, { pages: m.pages });
      } else if (m.t === "page") {
        setPage(m.n);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => patchDoc(doc.id, { page: m.n }), 500);
      } else if (m.t === "error") {
        setError(m.m);
        setLoading(false);
      }
    } catch {
      // رسالة غير مفهومة: نتجاهلها
    }
  };

  const go = (n: number) => run(`window.__go(${n})`);

  const changeZoom = (dir: 1 | -1) => {
    const i = ZOOMS.indexOf(zoom);
    const z = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 0 : i) + dir))];
    if (z === zoom) return;
    setZoom(z);
    patchDoc(doc.id, { zoom: z });
    run(`window.__zoom(${z})`);
  };

  const toggleNight = () => {
    const n = !night;
    setNight(n);
    patchDoc(doc.id, { night: n });
    run(`window.__night(${n})`);
  };

  const share = async () => {
    if (!(await Sharing.isAvailableAsync())) return Alert.alert("غير متاح", "المشاركة غير متاحة على هذا الجهاز.");
    await Sharing.shareAsync(doc.uri, { mimeType: "application/pdf", dialogTitle: doc.name });
  };

  const submitJump = () => {
    const n = parseInt(jumpText.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))), 10);
    if (!n || n < 1 || n > pages) return Alert.alert("رقم غير صحيح", `اكتب رقمًا من 1 إلى ${pages}.`);
    setJump(false);
    go(n);
  };

  const pct = pages ? Math.min(100, Math.round((page / pages) * 100)) : 0;
  const IconBtn = ({ name, onPress, label, on, disabled }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; on?: boolean; disabled?: boolean }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={label}
      className="w-11 h-11 rounded-full items-center justify-center"
      style={{ backgroundColor: on ? BLUE : "transparent", opacity: disabled ? 0.35 : 1 }}
    >
      <Ionicons name={name} size={22} color={on ? "#FFFFFF" : "#0F172A"} />
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#F2F8FC" }}>
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
          <Ionicons name="arrow-forward" size={20} color="#0F172A" />
        </Pressable>
        <View className="flex-1">
          <Text w="bold" className="text-base" numberOfLines={1}>
            {doc.name}
          </Text>
          <Text className="text-xs text-muted">{pages ? `${pages} صفحة • ${pct}%` : "PDF"}</Text>
        </View>
        <Pressable onPress={share} hitSlop={10} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
          <Ionicons name="share-outline" size={20} color="#0F172A" />
        </Pressable>
      </View>
      <View style={{ height: 3, backgroundColor: "#D6EBF7" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: BLUE }} />
      </View>

      <View style={{ flex: 1, backgroundColor: night ? "#101215" : "#525659" }}>
        {error ? (
          <View className="flex-1 items-center justify-center px-8 gap-3">
            <Ionicons name="document-outline" size={56} color="#94A3B8" />
            <Text className="text-center leading-6" style={{ color: "#E2E8F0" }}>
              {error}
            </Text>
            <Button label="فتح بتطبيق آخر" icon="open-outline" onPress={share} />
          </View>
        ) : (
          <>
            <WebView
              ref={web}
              originWhitelist={["*"]}
              source={{ html: READER_HTML, baseUrl: "https://localhost" }}
              style={{ flex: 1, backgroundColor: "transparent" }}
              javaScriptEnabled
              onMessage={onMessage}
              setBuiltInZoomControls={false}
              overScrollMode="never"
            />
            {loading ? (
              <View pointerEvents="none" style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : null}
          </>
        )}
      </View>

      {!error && (
        <View className="flex-row items-center justify-between bg-surface border-t border-line px-3 py-2">
          <IconBtn name="remove" label="تصغير" onPress={() => changeZoom(-1)} disabled={zoom <= ZOOMS[0]} />
          <IconBtn name="add" label="تكبير" onPress={() => changeZoom(1)} disabled={zoom >= ZOOMS[ZOOMS.length - 1]} />
          <IconBtn name="chevron-forward" label="الصفحة السابقة" onPress={() => go(page - 1)} disabled={page <= 1} />
          <Pressable
            onPress={() => {
              setJumpText(String(page));
              setJump(true);
            }}
            className="px-4 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "#D6EBF7" }}
          >
            <Text w="bold" style={{ color: BLUE }}>
              {page} / {pages || "…"}
            </Text>
          </Pressable>
          <IconBtn name="chevron-back" label="الصفحة التالية" onPress={() => go(page + 1)} disabled={!pages || page >= pages} />
          <IconBtn name={night ? "sunny" : "moon"} label="الوضع الليلي" onPress={toggleNight} on={night} />
        </View>
      )}

      <Sheet visible={jump} onClose={() => setJump(false)} title="الانتقال إلى صفحة">
        <TextInput
          value={jumpText}
          onChangeText={setJumpText}
          keyboardType="number-pad"
          autoFocus
          selectTextOnFocus
          onSubmitEditing={submitJump}
          placeholder={`1 – ${pages}`}
          placeholderTextColor="#94A3B8"
          style={{ borderWidth: 2, borderColor: "#0B4F73", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Cairo_600SemiBold", fontSize: 20, textAlign: inputAlign(), color: "#0F172A", marginBottom: 12 }}
        />
        <Button label="انتقل" icon="arrow-redo" onPress={submitJump} />
      </Sheet>
    </SafeAreaView>
  );
}
