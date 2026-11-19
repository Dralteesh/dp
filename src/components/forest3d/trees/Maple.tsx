import { CanopyConfig, CanopyTree, Lump } from './CanopyTree'
import { TreeProps } from '../utils'
import { OAK_LUMPS } from './Oak'

const lumps: Lump[] = OAK_LUMPS.map(([x, y, z, r]) => [x * 0.9, y * 0.95, z, r * 0.9])
const config: CanopyConfig = {
  trunkHeight: 1.6, trunkRadius: 0.26, flare: 1.2, trunkColor: '#56402f',
  lumps, lumpColors: ['#b85a22', '#a5391d', '#cf7a2a'], sproutColor: '#b0702a',
}
export const Maple = (p: TreeProps) => <CanopyTree config={config} {...p} />
