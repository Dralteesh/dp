import * as THREE from 'three'
import type { MutableRefObject } from 'react'

/** Growth value shared by all trees: 0 = sprout, 1 = sapling, 2 = young tree, 3 = mature. */
export type GrowthRef = MutableRefObject<number>
export type Vec3 = [number, number, number]

export interface TreeProps {
  growth: GrowthRef
  position?: Vec3
  scale?: number
  rotationY?: number
}

export const clamp = (a: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, a))
export const smooth = (x: number) => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}

/** Height / width factors of a whole tree at growth v. */
export function growthProfile(v: number) {
  const e = clamp(v / 3)
  return { h: (0.16 + 0.84 * Math.pow(e, 0.85)) * smooth((v - 0.3) / 0.6), w: 0.65 + 0.35 * e }
}
export const sproutScale = (v: number) => clamp(0.5 + v * 1.2) * (1 - smooth((v - 0.35) / 0.6))

const pos = (g: THREE.BufferGeometry) => g.attributes.position as THREE.BufferAttribute

/** Vertex colors: darker underneath, lighter on top (cheap ambient occlusion). */
export function shadeGeometry(g: THREE.BufferGeometry, hex: string, y0: number, y1: number, lo: number, hi: number) {
  const p = pos(g), c = new THREE.Color(hex), a: number[] = []
  for (let i = 0; i < p.count; i++) {
    const s = lo + hi * clamp((p.getY(i) - y0) / (y1 - y0))
    a.push(c.r * s, c.g * s, c.b * s)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(a, 3))
  return g
}

/** Soft, lumpy sphere used for leaf clusters. */
export function lumpGeometry(hex: string) {
  const g = new THREE.IcosahedronGeometry(1, 3), p = pos(g)
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = 1 + 0.12 * Math.sin(x * 4 + z * 3) * Math.cos(y * 5)
    p.setXYZ(i, x * n, y * n, z * n)
  }
  g.computeVertexNormals()
  return shadeGeometry(g, hex, -1, 1, 0.5, 0.65)
}

export interface TrunkOptions { height: number; radius: number; flare: number; bend?: number; bark?: boolean }

/** Trunk with buttress roots at the base, optional lean (palm) and birch bark colors. */
export function trunkGeometry({ height: th, radius: tr, flare, bend = 0, bark = false }: TrunkOptions) {
  const pts: THREE.Vector2[] = [], st = th / 40
  for (let y = -0.15; y <= th + 0.01; y += st) pts.push(new THREE.Vector2(tr + tr * 0.4 * Math.exp(-Math.max(y, 0) * 3), y))
  const g = new THREE.LatheGeometry(pts, 56), p = pos(g), col: number[] = []
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x)
    const lobe = Math.pow(Math.max(0, Math.cos(a * 5 + 0.3)), 2) + 0.1
    const f = 1 + flare * Math.exp(-Math.max(y, 0) * 4.5) * lobe
    p.setXYZ(i, x * f + bend * Math.pow(clamp(y / th), 2), y, z * f)
    if (bark) {
      const d = Math.sin(y * 17 + Math.sin(a * 3) * 2) > 0.8 || Math.sin(y * 41 + a * 5) > 0.93 ? 0.12 : 0.85
      col.push(d, d, d * 0.95)
    }
  }
  g.computeVertexNormals()
  if (bark) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  return g
}
