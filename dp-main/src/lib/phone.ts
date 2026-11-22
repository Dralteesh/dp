/** يحوّل رقمًا سوريًا محليًا (09xxxxxxxx) إلى صيغة دولية بدون + (963...) */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("963")) return digits;
  if (digits.startsWith("0")) return "963" + digits.slice(1);
  return digits;
}

export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}
