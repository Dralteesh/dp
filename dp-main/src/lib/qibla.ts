import { Coordinates, Qibla } from "adhan";
import { CITY } from "@/lib/prayer";

/** زاوية القبلة من الشمال الحقيقي (0–360) — حساب محلي بلا إنترنت */
export function qiblaBearing(lat = CITY.lat, lng = CITY.lng): number {
  return Qibla(new Coordinates(lat, lng));
}

/** أصغر فرق موقّع بين زاويتين (−180..180) */
export function angleDiff(a: number, b: number): number {
  return ((((a - b) % 360) + 540) % 360) - 180;
}

/**
 * اتجاه الجهاز (من الشمال المغناطيسي) بتعويض ميلان الهاتف.
 * m = قراءة المغنطيس، g = قراءة التسارع (على نفس محاور الجهاز).
 * يعيد null إن كانت القراءات غير صالحة.
 */
export function tiltCompensatedHeading(
  m: { x: number; y: number; z: number },
  g: { x: number; y: number; z: number },
): number | null {
  const gn = Math.hypot(g.x, g.y, g.z);
  if (!gn) return null;
  const ax = g.x / gn, ay = g.y / gn, az = g.z / gn;
  // east = m × g ; north = g × east
  let ex = m.y * az - m.z * ay;
  let ey = m.z * ax - m.x * az;
  let ez = m.x * ay - m.y * ax;
  const en = Math.hypot(ex, ey, ez);
  if (!en) return null;
  ex /= en; ey /= en; ez /= en;
  // المركّبة الشمالية على محور y للجهاز (كما في Android getOrientation)
  const ny = az * ex - ax * ez;
  const heading = (Math.atan2(ey, ny) * 180) / Math.PI;
  return (heading + 360) % 360;
}
