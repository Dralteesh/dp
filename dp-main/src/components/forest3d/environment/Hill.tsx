import { useMemo } from 'react'
import * as THREE from 'three'

export function Hill() {
  const top = useMemo(() => {
    const g = new THREE.CylinderGeometry(7.5, 7.6, 0.7, 110, 6), p = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z)
      if (y > 0) p.setY(i, y + 0.12 * Math.sin(x * 1.3) * Math.cos(z * 1.1) - Math.max(0, r - 6.3) * 0.28)
      else {
        const k = r > 6.75 ? 0.96 : 1
        p.setX(i, x * k)
        p.setZ(i, z * k)
      }
    }
    g.computeVertexNormals()
    return g
  }, [])
  return (
    <>
      <mesh geometry={top} position={[0, -0.35, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#66802c" roughness={0.95} />
      </mesh>
      <mesh position={[0, -1.4, 0]} receiveShadow>
        <cylinderGeometry args={[7.55, 6.7, 1.4, 110, 1]} />
        <meshStandardMaterial color="#4f3425" roughness={0.95} />
      </mesh>
    </>
  )
}
