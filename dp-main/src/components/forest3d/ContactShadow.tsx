import { useMemo } from 'react'
import * as THREE from 'three'

let cached: THREE.DataTexture | null = null
/** Radial soft shadow built from raw pixels (no DOM canvas on mobile). */
function shadowTexture() {
  if (!cached) {
    const N = 64, data = new Uint8Array(N * N * 4), c = (N - 1) / 2
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - c, y - c) / (N / 2)
        const a = d >= 1 ? 0 : d < 0.55 ? 0.75 - 0.45 * (d / 0.55) : 0.3 * (1 - (d - 0.55) / 0.45)
        const i = (y * N + x) * 4
        data[i] = 15
        data[i + 1] = 35
        data[i + 2] = 5
        data[i + 3] = Math.round(a * 255)
      }
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat)
    t.magFilter = THREE.LinearFilter
    t.minFilter = THREE.LinearFilter
    t.generateMipmaps = false
    t.needsUpdate = true
    cached = t
  }
  return cached
}

/** Soft dark disc under an object so it sits on the ground. */
export function ContactShadow({ size = 2.8, opacity = 0.8 }: { size?: number; opacity?: number }) {
  const map = useMemo(shadowTexture, [])
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.03, 0]} scale={[size, size, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={map} transparent depthWrite={false} opacity={opacity} fog={false} />
    </mesh>
  )
}
