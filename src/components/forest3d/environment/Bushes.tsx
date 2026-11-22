const BUSHES: [number, number, number][] = [[-6, 1.6, 0.6], [6.1, 2, 0.55], [-1.5, 4.4, 0.4], [1.8, 4.8, 0.45], [-5, -3, 0.7], [5.2, -3, 0.7], [0, -4.2, 0.8], [-1.6, -0.6, 0.4], [2.2, -0.4, 0.4]]

export function Bushes() {
  return (
    <>
      {BUSHES.map(([x, z, r], i) => (
        <mesh key={i} position={[x, r * 0.45, z]} scale={[1, 0.7, 1]} castShadow receiveShadow>
          <sphereGeometry args={[r, 40, 28]} />
          <meshStandardMaterial color="#4f6e2c" roughness={0.95} />
        </mesh>
      ))}
    </>
  )
}
