import { CanopyConfig, CanopyTree, Lump } from './CanopyTree'
import { TreeProps } from '../utils'

export const OAK_LUMPS: Lump[] = [[0, 1.1, 0, 1.3], [-1, 0.8, 0.3, 0.95], [1, 0.9, -0.3, 1], [0.2, 1.9, 0, 0.95], [-0.4, 1.6, -0.8, 0.8], [0.5, 1.5, 0.8, 0.8]]

const config: CanopyConfig = {
  trunkHeight: 1.5, trunkRadius: 0.34, flare: 1.4, trunkColor: '#4d3a2c',
  lumps: OAK_LUMPS, lumpColors: ['#3f6a2a', '#4a7a30', '#35592a'], sproutColor: '#5f9a35',
}
export const Oak = (p: TreeProps) => <CanopyTree config={config} {...p} />
