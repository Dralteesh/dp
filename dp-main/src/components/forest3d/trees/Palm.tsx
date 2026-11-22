import { CanopyConfig, CanopyTree } from './CanopyTree'
import { TreeProps } from '../utils'

const config: CanopyConfig = {
  trunkHeight: 3.3, trunkRadius: 0.1, flare: 0.7, bend: 0.55, trunkColor: '#7a6548',
  fronds: ['#3e6a2c', '#4c7a32'],
}
export const Palm = (p: TreeProps) => <CanopyTree config={config} {...p} />
