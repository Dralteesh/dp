import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { PdfReader } from "@/components/docs/PdfReader";
import { kindOf, mimeOf, useDocs } from "@/store/useDocs";
import { screenBg } from "@/lib/ui";

const MAX_INLINE = 25_000_000; // أكبر من هذا يُفتح بتطبيق خارجي

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function b64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

const wrapHtml = (body: string, extraCss = "") => `<!doctype html><html dir="auto"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<style>body{font-family:sans-serif;margin:0;padding:16px;line-height:1.8;color:#0f172a;background:#fff;word-wrap:break-word}
img{max-width:100%;height:auto}table{border-collapse:collapse;margin:8px 0;font-size:14px}td,th{border:1px solid #cbd5e1;padding:4px 8px}${extraCss}</style></head><body>${body}</body></html>`;

function sheetHtml(XLSX: any, b64: string) {
  const wb = XLSX.read(b64, { type: "base64" });
  const names: string[] = wb.SheetNames;
  const tabs = names.map((n, i) => `<button onclick="show(${i})" id="b${i}">${esc(n)}</button>`).join("");
  const tables = names.map((n, i) => `<div class="sh" id="s${i}" style="display:${i ? "none" : "block"};overflow-x:auto">${XLSX.utils.sheet_to_html(wb.Sheets[n], { header: "", footer: "" })}</div>`).join("");
  return wrapHtml(
    `<div style="position:sticky;top:0;background:#fff;padding-bottom:6px">${tabs}</div>${tables}
<script>function show(i){document.querySelectorAll('.sh').forEach((e,j)=>e.style.display=j==i?'block':'none');}</script>`,
    "button{margin:2px;padding:6px 12px;border:1px solid #cbd5e1;border-radius:14px;background:#f1f5f9;font-size:14px}",
  );
}

/** قارئ المستندات: PDF/صور/نصوص/Word/Excel داخل التطبيق، وغيرها بتطبيق خارجي */
export default function DocViewer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = useDocs((s) => s.docs.find((d) => d.id === id));

  const [html, setHtml] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const kind = doc ? kindOf(doc.ext) : "other";

  const openExternal = async () => {
    if (!doc) return;
    if (!(await Sharing.isAvailableAsync())) return Alert.alert("غير متاح", "المشاركة غير متاحة على هذا الجهاز.");
    await Sharing.shareAsync(doc.uri, { mimeType: mimeOf(doc.ext), dialogTitle: doc.name });
  };

  useEffect(() => {
    if (!doc || kind === "pdf") return;
    useDocs.getState().touch(doc.id);
    let alive = true;
    (async () => {
      try {
        if (doc.size > MAX_INLINE && kind !== "image") throw new Error("الملف كبير جدًا للعرض داخل التطبيق.");
        if (kind === "text") {
          const t = await FileSystem.readAsStringAsync(doc.uri);
          if (alive) setText(t);
        } else if (kind === "docx") {
          const b64 = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mammoth = require("mammoth");
          const r = await mammoth.convertToHtml({ arrayBuffer: b64ToArrayBuffer(b64) });
          if (alive) setHtml(wrapHtml(r.value || "<p>(مستند فارغ)</p>"));
        } else if (kind === "sheet") {
          const b64 = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const XLSX = require("xlsx");
          if (alive) setHtml(sheetHtml(XLSX, b64));
        }
      } catch (e) {
        if (alive) setError(String((e as Error)?.message ?? e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?.id, kind]);

  if (doc && kind === "pdf") return <PdfReader doc={doc} />;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: screenBg() }}>
      <View className="flex-row items-center gap-3 px-4 pt-2 pb-2">
        <Pressable onPress={() => router.back()} hitSlop={10} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
          <Ionicons name="arrow-forward" size={20} color="#0F172A" />
        </Pressable>
        <Text w="bold" className="flex-1 text-base" numberOfLines={1}>
          {doc?.name ?? "مستند"}
        </Text>
        {doc ? (
          <Pressable onPress={openExternal} hitSlop={10} className="w-10 h-10 rounded-full bg-surface border border-line items-center justify-center">
            <Ionicons name="open-outline" size={20} color="#0F172A" />
          </Pressable>
        ) : null}
      </View>

      {!doc ? (
        <Text className="text-center text-muted mt-10">المستند غير موجود.</Text>
      ) : kind === "other" || error ? (
        <View className="flex-1 items-center justify-center px-8 gap-3">
          <Ionicons name="document-outline" size={56} color="#94A3B8" />
          <Text className="text-center text-muted leading-6">
            {error ?? "هذا النوع من الملفات لا يُعرض داخل التطبيق (مثل PowerPoint)."}
          </Text>
          <Button label="فتح بتطبيق آخر" icon="open-outline" onPress={openExternal} />
        </View>
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#0E6FA5" />
      ) : kind === "image" ? (
        <ScrollView maximumZoomScale={5} minimumZoomScale={1} contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <Image source={{ uri: doc.uri }} style={{ width: "100%", height: 600 }} resizeMode="contain" />
        </ScrollView>
      ) : kind === "text" ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text className="leading-7" selectable>
            {text}
          </Text>
        </ScrollView>
      ) : html ? (
        <WebView originWhitelist={["*"]} source={{ html, baseUrl: "https://localhost" }} style={{ flex: 1, backgroundColor: "transparent" }} javaScriptEnabled setBuiltInZoomControls />
      ) : null}
    </SafeAreaView>
  );
}
