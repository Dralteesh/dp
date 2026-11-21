import { useRef } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { ContactShadow } from '../ContactShadow'
import { Sprout } from '../Sprout'
import { TreeProps, growthProfile, shadeGeometry, smooth, trunkGeometry } from '../utils'

const TIER_COLORS = ['#1d3a1b', '#244620', '#2c5324', '#365f29', '#436e2f']

/** One scalloped, pillowy cone. */
function tier(i: number) {
  const r = 1.45 - i * 0.26, h = 1.25 - i * 0.06
  const g = new THREE.ConeGeometry(r, h, 96, 8), p = g.attributes.position as THREE.BufferAttribute
  for (let j = 0; j < p.count; j++) {
    let x = p.getX(j), y = p.getY(j), z = p.getZ(j)
    const pf = 1 + 0.1 * Math.sin(Math.min((y + h / 2) / h, 1) * Math.PI * 0.9)
    x *= pf
    z *= pf
    if (y < 0) {
      const w = Math.cos(Math.atan2(z, x) * 7 + i)
      x *= 1 + 0.05 * w
      z *= 1 + 0.05 * w
      y += 0.14 * w * h * 0.5 * (-y / (h / 2))
    }
    p.setXYZ(j, x, y, z)
  }
  g.computeVertexNormals()
  return { geo: shadeGeometry(g, TIER_COLORS[i], -h / 2, h / 2, 0.4, 0.75), h, b: 0.95 + i * 0.68 }
}

let cache: { trunk: THREE.BufferGeometry; tiers: ReturnType<typeof tier>[] } | null = null
/** Geometry is built once and shared by every pine in the forest. */
const shared = () => (cache ??= { trunk: trunkGeometry({ height: 1.6, radius: 0.14, flare: 1.7 }), tiers: [0, 1, 2, 3, 4].map(tier) })

/** Conifer: tiers stack up one after another, each growing out of the previous one. */
export function Pine({ growth, position = [0, 0, 0], scale = 1, rotationY = 0 }: TreeProps) {
  const body = useRef<THREE.Group>(null)
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const { trunk, tiers } = shared()

  useFrame(() => {
    const g = body.current
    if (!g) return
    const v = growth.current, { h, w } = growthProfile(v), H = h * scale
    g.visible = H > 0.02
    g.scale.set(Math.max(H * w, 0.001), Math.max(H, 0.001), Math.max(H * w, 0.001))
    let base = tiers[0].b
    tiers.forEach((t, i) => {
      const k = smooth((v - 0.5 - i * 0.42) / 0.85), m = meshes.current[i]
      if (i > 0) base += (t.b - tiers[i - 1].b) * k
      if (!m) return
      m.visible = k > 0.005
      m.scale.setScalar(Math.max(k, 0.001))
      m.position.y = base + (t.h / 2) * k
    })
  })

  return (
    <group position={position} rotation-y={rotationY}>
      <group ref={body}>
        <mesh geometry={trunk} castShadow receiveShadow>
          <meshStandardMaterial color="#5c4333" roughness={0.95} />
        </mesh>
        {tiers.map((t, i) => (
          <mesh key={i} ref={(m) => { meshes.current[i] = m }} geometry={t.geo} rotation-y={i * 0.5} castShadow receiveShadow>
            <meshStandardMaterial vertexColors roughness={0.95} />
          </mesh>
        ))}
        <ContactShadow />
      </group>
      <Sprout growth={growth} />
    </group>
  )
}
