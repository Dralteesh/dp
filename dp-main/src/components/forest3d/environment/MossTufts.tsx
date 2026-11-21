import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

/** Small fuzzy mounds scattered over the hill so the moss isn't a flat color. */
export function MossTufts({ count = 900 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const d = new THREE.Object3D(), c = new THREE.Color()
    for (let n = 0; n < count; n++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 6.9, s = 0.07 + Math.random() * 0.08
      d.position.set(Math.cos(a) * r, -r * 0.03, Math.sin(a) * r)
      d.scale.set(s, s * 0.6, s)
      d.updateMatrix()
      m.setMatrixAt(n, d.matrix)
      c.setHSL(0.23 + Math.random() * 0.05, 0.42, 0.34 + Math.random() * 0.1)
      m.setColorAt(n, c)
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [count])
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} receiveShadow>
      <sphereGeometry args={[1, 8, 6]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  )
}
