import type { ClinicSession, Patient, Payment, Prescription } from "@/types";
import { fmtDateFull } from "@/lib/dates";
import { fmtMoney } from "@/lib/format";
import { fmtUsd } from "@/lib/currency";

export type DocCtx = {
  clinicName: string;
  doctorName: string;
  /** شعار العيادة كنص data:image أو فارغ */
  logo?: string;
  currency: string;
  /** YYYY-MM-DD */
  dateISO: string;
};

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const nl2br = (s: string) => esc(s).replace(/\r?\n/g, "<br/>");

const CSS = `
@page { margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: "Noto Naskh Arabic","Noto Sans Arabic","Droid Arabic Naskh",sans-serif; color:#1e2229; font-size:15px; line-height:1.8; margin:0; }
.head { display:flex; align-items:center; gap:14px; border-bottom:3px solid #16a34a; padding-bottom:10px; margin-bottom:18px; }
.head img { width:64px; height:64px; object-fit:contain; border-radius:10px; }
.head h1 { margin:0; font-size:22px; line-height:1.3; }
.head .sub { color:#64748b; font-size:13px; }
.date { margin-inline-start:auto; text-align:end; color:#475569; font-size:13px; }
h2 { font-size:19px; margin:6px 0 12px; text-align:center; }
.meta { background:#f6f5f0; border-radius:10px; padding:8px 12px; margin-bottom:14px; }
table { width:100%; border-collapse:collapse; margin:8px 0; }
th, td { border:1px solid #d9d6cc; padding:6px 8px; text-align:start; vertical-align:top; }
th { background:#f0efea; font-size:13px; }
.num { white-space:nowrap; text-align:end; }
.rx li { margin-bottom:8px; }
.rx small { color:#475569; display:block; }
.tot { margin-top:10px; font-weight:700; }
.sign { margin-top:48px; display:flex; justify-content:flex-end; }
.sign div { text-align:center; min-width:180px; border-top:1px solid #94a3b8; padding-top:6px; }
.foot { margin-top:30px; color:#94a3b8; font-size:11px; text-align:center; }
`;

function page(ctx: DocCtx, title: string, body: string, opts: { signature?: boolean } = {}): string {
  const logo = ctx.logo ? `<img src="${esc(ctx.logo)}" alt=""/>` : "";
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${CSS}</style></head><body>
<div class="head">${logo}<div><h1>${esc(ctx.clinicName || "العيادة")}</h1>${
    ctx.doctorName ? `<div class="sub">د. ${esc(ctx.doctorName.replace(/^د\.?\s*/, ""))}</div>` : ""
  }</div><div class="date">${esc(fmtDateFull(ctx.dateISO))}</div></div>
<h2>${esc(title)}</h2>${body}
${opts.signature === false ? "" : `<div class="sign"><div>${ctx.doctorName ? `د. ${esc(ctx.doctorName.replace(/^د\.?\s*/, ""))}` : "التوقيع"}</div></div>`}
</body></html>`;
}

const patientBlock = (p: Patient) =>
  `<div class="meta"><b>المريض:</b> ${esc(p.name)}${
    p.birthYear ? ` &nbsp;•&nbsp; <b>العمر:</b> ${new Date().getFullYear() - p.birthYear}` : ""
  }${p.phone ? ` &nbsp;•&nbsp; ${esc(p.phone)}` : ""}</div>`;

/** وصفة طبية */
export function rxHtml(ctx: DocCtx, patient: Patient, rx: Prescription): string {
  const items = rx.lines
    .map((l, i) => `<li><b>${i + 1}. ${esc(l.drug)}</b>${l.dosage ? `<small>${esc(l.dosage)}</small>` : ""}</li>`)
    .join("");
  const body = `${patientBlock(patient)}<div class="meta">التاريخ: ${esc(rx.date)}</div>
<ol class="rx" style="padding-inline-start:20px">${items}</ol>
${rx.notes ? `<p><b>تعليمات:</b> ${nl2br(rx.notes)}</p>` : ""}
<p style="margin-top:14px">مع تمنياتنا بالشفاء العاجل.</p>`;
  return page(ctx, "وصفة طبية", body);
}

/** كشف حساب مريض */
export function statementHtml(
  ctx: DocCtx,
  patient: Patient,
  sessions: ClinicSession[],
  payments: Payment[],
): string {
  const f = (n: number) => esc(fmtMoney(n, ctx.currency));
  const charged = sessions.reduce((a, s) => a + s.cost, 0);
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const balance = charged - paid;
  const sRows = [...sessions]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(
      (s) =>
        `<tr><td>${esc(s.date)}</td><td>${esc(s.procedure)}${s.tooth ? ` (سن ${esc(s.tooth)})` : ""}</td><td class="num">${f(s.cost)}${
          s.foreign ? `<br/><small>${esc(fmtUsd(s.foreign.amount))}</small>` : ""
        }</td></tr>`,
    )
    .join("");
  const pRows = [...payments]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(
      (p) =>
        `<tr><td>${esc(p.date)}</td><td>${esc(p.note ?? "")}</td><td class="num">${f(p.amount)}${
          p.foreign ? `<br/><small>${esc(fmtUsd(p.foreign.amount))}</small>` : ""
        }</td></tr>`,
    )
    .join("");
  const body = `${patientBlock(patient)}
<b>الجلسات</b><table><tr><th>التاريخ</th><th>الإجراء</th><th>التكلفة</th></tr>${sRows || `<tr><td colspan="3">—</td></tr>`}</table>
<b>الدفعات</b><table><tr><th>التاريخ</th><th>ملاحظة</th><th>المبلغ</th></tr>${pRows || `<tr><td colspan="3">—</td></tr>`}</table>
<div class="tot">المستحق: ${f(charged)} &nbsp;|&nbsp; المدفوع: ${f(paid)} &nbsp;|&nbsp; ${
    balance > 0 ? `المتبقي: ${f(balance)}` : "الحساب مسدّد"
  }</div>`;
  return page(ctx, "كشف حساب", body, { signature: false });
}

/** تقرير طبي بنص حر */
export function medicalReportHtml(ctx: DocCtx, patient: Patient, text: string): string {
  const body = `${patientBlock(patient)}<p>${nl2br(text.trim() || "—")}</p>`;
  return page(ctx, "تقرير طبي", body);
}

/** إجازة مرضية */
export function sickLeaveHtml(
  ctx: DocCtx,
  patient: Patient,
  o: { days: number; from: string; reason?: string },
): string {
  const body = `${patientBlock(patient)}
<p>أشهد أنا الموقّع أدناه بأن المريض المذكور أعلاه راجع العيادة بتاريخ ${esc(o.from)}، وتستدعي حالته الراحة لمدة
<b>${Math.max(1, Math.round(o.days))}</b> ${o.days === 1 ? "يوم" : "أيام"} اعتبارًا من تاريخ ${esc(o.from)}.</p>
${o.reason ? `<p><b>التشخيص/السبب:</b> ${nl2br(o.reason)}</p>` : ""}
<p>أعطي هذا التقرير بناءً على طلبه.</p>`;
  return page(ctx, "إجازة مرضية", body);
}

/** نموذج موافقة مستنيرة مع مكان توقيع المريض والطبيب */
export function consentHtml(ctx: DocCtx, patient: Patient, title: string, body: string): string {
  const doc = ctx.doctorName ? `د. ${esc(ctx.doctorName.replace(/^د\.?\s*/, ""))}` : "الطبيب";
  const html = `${patientBlock(patient)}<div style="font-size:16px;line-height:2">${nl2br(body)}</div>
<div style="display:flex;justify-content:space-between;margin-top:56px;gap:24px">
<div style="flex:1;text-align:center;border-top:1px solid #94a3b8;padding-top:6px">توقيع المريض / الولي<br/><small>${esc(patient.name)}</small></div>
<div style="flex:1;text-align:center;border-top:1px solid #94a3b8;padding-top:6px">${doc}</div></div>`;
  return page(ctx, title, html, { signature: false });
}
