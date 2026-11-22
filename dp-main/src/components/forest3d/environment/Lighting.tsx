// three >= r155 uses physical light units: intensities tuned for older versions are multiplied by PI.
const K = Math.PI

export function Lighting({ night = false }: { night?: boolean }) {
  return (
    <>
      <hemisphereLight args={night ? ['#7f93c8', '#1f3340', 0.55 * K] : ['#dfe9d0', '#4a6a2e', 1.0 * K]} />
      <directionalLight
        color={night ? '#9db4ff' : '#fff1cf'} intensity={(night ? 0.5 : 1.15) * K} position={[-5, 11, 8]} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-left={-11} shadow-camera-right={11}
        shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={34}
        shadow-bias={-0.0004}
      />
      <directionalLight color="#c4ecff" intensity={(night ? 0.15 : 0.45) * K} position={[6, 5, -9]} />
      <fog attach="fog" args={[night ? '#1c2f3a' : '#9fb383', 15, 34]} />
    </>
  )
}
