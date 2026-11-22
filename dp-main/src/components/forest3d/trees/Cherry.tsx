import { CanopyConfig, CanopyTree } from './CanopyTree'
import { TreeProps } from '../utils'

const config: CanopyConfig = {
  trunkHeight: 1.3, trunkRadius: 0.17, flare: 1, trunkColor: '#453228',
  lumps: [[0, 1, 0, 1.05], [-0.8, 0.7, 0.2, 0.8], [0.8, 0.8, -0.1, 0.8], [0.1, 1.6, 0, 0.7], [-0.3, 1.3, 0.7, 0.6]],
  lumpColors: ['#d9a5b0', '#c98a9c', '#e6bcc6'], sproutColor: '#7aae48',
}
export const Cherry = (p: TreeProps) => <CanopyTree config={config} {...p} />
