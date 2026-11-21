import { useMemo } from 'react'
import * as THREE from 'three'

const ROCKS: [number, number, number][] = [[-1.6, 3.7, 0.4], [2, 4, 0.3], [-5.7, 0.6, 0.5], [5.6, 0.2, 0.45], [1.8, 0.2, 0.2], [-0.8, 0.5, 0.15]]

function rockGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 4), p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const n = 1 + 0.08 * Math.sin(p.getX(i) * 3 + p.getZ(i) * 2)
    p.setXYZ(i, p.getX(i) * n, p.getY(i) * n, p.getZ(i) * n)
  }
  g.computeVertexNormals()
  return g
}

export function Rocks() {
  const geo = useMemo(rockGeometry, [])
  return (
    <>
      {ROCKS.map(([x, z, s], i) => (
        <mesh key={i} geometry={geo} position={[x, s * 0.34, z]} scale={[s, s * 0.62, s * 0.85]} castShadow receiveShadow>
          <meshStandardMaterial color="#777870" roughness={0.95} />
        </mesh>
      ))}
    </>
  )
}
