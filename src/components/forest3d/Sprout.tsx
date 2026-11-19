import { useRef } from 'react'
import { useFrame } from '@react-three/fiber/native'
import type * as THREE from 'three'
import { GrowthRef, sproutScale } from './utils'

/** Seedling shown at growth 0 that fades into the trunk of its tree. */
export function Sprout({ growth, color = '#6aa83a' }: { growth: GrowthRef; color?: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const s = sproutScale(growth.current)
    g.visible = s > 0.01
    g.scale.setScalar(Math.max(s, 0.001))
  })
  return (
    <group ref={ref}>
      <mesh scale={[0.38, 0.12, 0.38]} castShadow receiveShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#5a3b28" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.55, 10]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
      {[-1, 1].map((d) => (
        <mesh key={d} position={[d * 0.2, 0.58, 0]} rotation-z={-d * 0.45} scale={[0.3, 0.05, 0.14]} castShadow>
          <sphereGeometry args={[1, 20, 10]} />
          <meshStandardMaterial color={color} roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}
