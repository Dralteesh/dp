import { useRef } from 'react'
import { useFrame } from '@react-three/fiber/native'
import * as THREE from 'three'
import { ContactShadow } from '../ContactShadow'
import { Sprout } from '../Sprout'
import { TreeProps, Vec3, growthProfile, lumpGeometry, smooth, trunkGeometry } from '../utils'

/** [x, y, z, radius] of a leaf cluster, relative to the top of the trunk. */
export type Lump = [number, number, number, number]

export interface CanopyConfig {
  trunkHeight: number
  trunkRadius: number
  flare: number
  trunkColor?: string
  bend?: number
  bark?: boolean
  lumps?: Lump[]
  lumpColors?: string[]
  lumpStretch?: number
  fronds?: [string, string]
  sproutColor?: string
}

const geoCache = new WeakMap<CanopyConfig, { trunk: THREE.BufferGeometry; lumps: THREE.BufferGeometry[] }>()
/** Geometry is built once per species and shared by every tree of that species. */
function sharedGeometry(c: CanopyConfig) {
  let g = geoCache.get(c)
  if (!g) {
    g = {
      trunk: trunkGeometry({ height: c.trunkHeight, radius: c.trunkRadius, flare: c.flare, bend: c.bend, bark: c.bark }),
      lumps: (c.lumps ?? []).map((_, k) => lumpGeometry(c.lumpColors![k % c.lumpColors!.length])),
    }
    geoCache.set(c, g)
  }
  return g
}

/** Generic broadleaf / palm tree. Self-contained: trunk, canopy, sprout and contact shadow. */
export function CanopyTree({ config: c, growth, position = [0, 0, 0], scale = 1, rotationY = 0 }: TreeProps & { config: CanopyConfig }) {
  const body = useRef<THREE.Group>(null)
  const canopy = useRef<THREE.Group>(null)
  const { trunk, lumps } = sharedGeometry(c)

  useFrame(({ clock }) => {
    const g = body.current, can = canopy.current
    if (!g || !can) return
    const v = growth.current, { h, w } = growthProfile(v), H = h * scale
    g.visible = H > 0.02
    g.scale.set(Math.max(H * w, 0.001), Math.max(H, 0.001), Math.max(H * w, 0.001))
    g.rotation.z = Math.sin(clock.elapsedTime / 1.4 + position[0]) * 0.01
    const n = can.children.length
    can.children.forEach((ch, k) => {
      // each cluster emerges from the top of the trunk and drifts out to its final spot
      const f = Math.max(smooth((v - 0.5 - (k * 1.6) / n) / 1.1), 0.001)
      const u = ch.userData.s as Vec3 | undefined, q = ch.userData.p as Vec3 | undefined
      ch.visible = f > 0.002
      if (u && q) {
        ch.scale.set(f * u[0], f * u[1], f * u[2])
        ch.position.set(q[0] * f, q[1] * f, q[2] * f)
      } else ch.scale.setScalar(f)
    })
  })

  return (
    <group position={position} rotation-y={rotationY}>
      <group ref={body}>
        <mesh geometry={trunk} castShadow receiveShadow>
          <meshStandardMaterial color={c.bark ? '#ffffff' : c.trunkColor} vertexColors={!!c.bark} roughness={0.95} />
        </mesh>
        <group ref={canopy} position={[c.bend ?? 0, c.trunkHeight, 0]}>
          {c.fronds
            ? Array.from({ length: 9 }, (_, k) => (
                <group key={k} rotation-y={k * 0.7}>
                  <mesh position={[0.8, -0.1, 0]} rotation-z={-0.42} scale={[1.05, 0.035, 0.2]} castShadow>
                    <sphereGeometry args={[1, 16, 8]} />
                    <meshStandardMaterial color={c.fronds![k % 2]} roughness={0.95} />
                  </mesh>
                </group>
              ))
            : (c.lumps ?? []).map((l, k) => (
                <mesh
                  key={k}
                  geometry={lumps[k]}
                  userData={{ s: [l[3], l[3] * (c.lumpStretch ?? 1), l[3]], p: [l[0], l[1], l[2]] }}
                  castShadow
                  receiveShadow
                >
                  <meshStandardMaterial vertexColors roughness={0.95} />
                </mesh>
              ))}
        </group>
        <ContactShadow />
      </group>
      <Sprout growth={growth} color={c.sproutColor} />
    </group>
  )
}
