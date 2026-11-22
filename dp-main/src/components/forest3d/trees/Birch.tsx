import { CanopyConfig, CanopyTree } from './CanopyTree'
import { TreeProps } from '../utils'

const config: CanopyConfig = {
  trunkHeight: 2.3, trunkRadius: 0.1, flare: 0.9, bark: true,
  lumps: [[0, 0.45, 0, 0.8], [0.4, 1, 0.1, 0.6], [-0.4, 0.9, -0.1, 0.6], [0, 1.4, 0, 0.5]],
  lumpColors: ['#7e9a3a', '#92a944', '#6b8a35'], lumpStretch: 1.15,
}
export const Birch = (p: TreeProps) => <CanopyTree config={config} {...p} />
