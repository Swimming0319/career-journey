import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const ENVELOPE = '#c9563f'
const ENVELOPE_BAND = '#e8d9c0'
const WOOD = '#8b5a2b'
const ROPE = '#d9c7a3'
const METAL = '#6b6b70'
const LAMP = '#ffd27a'

// 氣囊中心高度；吊艙頂在 y ≈ 0.05，氣囊底部約在 ENVELOPE_Y - 0.26，中間留出能看到人的空隙
const ENVELOPE_Y = 0.55
const ROPE_LENGTH = ENVELOPE_Y - 0.26 - 0.05
const ROPE_MID_Y = 0.05 + ROPE_LENGTH / 2

// 低多邊形飛船，面向 +z（前進方向）。整體會輕微上下漂浮、螺旋槳持續轉動
export default function Airship() {
  const bob = useRef(null)
  const propeller = useRef(null)

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime()
    if (bob.current) {
      bob.current.position.y = Math.sin(t * 1.3) * 0.04
      bob.current.rotation.z = Math.sin(t * 0.9) * 0.03
    }
    if (propeller.current) propeller.current.rotation.z += delta * 12
  })

  return (
    <group ref={bob}>
      {/* 氣囊：拉長的球體，中間一圈淺色帶。放高一點，讓吊艙裡的人從上方也看得到 */}
      <mesh position={[0, ENVELOPE_Y, 0]} scale={[1, 0.82, 1.75]} castShadow>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color={ENVELOPE} flatShading />
      </mesh>
      <mesh position={[0, ENVELOPE_Y, 0]} scale={[1.02, 0.84, 0.35]}>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color={ENVELOPE_BAND} flatShading />
      </mesh>

      {/* 尾翼：上、左、右三片 */}
      <mesh position={[0, ENVELOPE_Y + 0.24, -0.5]} castShadow>
        <boxGeometry args={[0.03, 0.18, 0.2]} />
        <meshStandardMaterial color={ENVELOPE_BAND} flatShading />
      </mesh>
      <mesh position={[0.24, ENVELOPE_Y, -0.5]} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.2]} />
        <meshStandardMaterial color={ENVELOPE_BAND} flatShading />
      </mesh>
      <mesh position={[-0.24, ENVELOPE_Y, -0.5]} castShadow>
        <boxGeometry args={[0.2, 0.03, 0.2]} />
        <meshStandardMaterial color={ENVELOPE_BAND} flatShading />
      </mesh>

      {/* 吊艙 */}
      <mesh position={[0, -0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.16, 0.48]} />
        <meshStandardMaterial color={WOOD} flatShading />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.34, 0.02, 0.5]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>

      {/* 四條繫繩：從吊艙四角連到氣囊底部 */}
      {[
        [-0.14, 0.2],
        [0.14, 0.2],
        [-0.14, -0.2],
        [0.14, -0.2],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x * 0.85, ROPE_MID_Y, z]} rotation={[0, 0, x > 0 ? -0.12 : 0.12]}>
          <cylinderGeometry args={[0.006, 0.006, ROPE_LENGTH, 4]} />
          <meshStandardMaterial color={ROPE} />
        </mesh>
      ))}

      {/* 船尾螺旋槳 */}
      <mesh position={[0, -0.02, -0.26]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.05, 6]} />
        <meshStandardMaterial color={METAL} flatShading />
      </mesh>
      <group ref={propeller} position={[0, -0.02, -0.3]}>
        <mesh>
          <boxGeometry args={[0.03, 0.26, 0.012]} />
          <meshStandardMaterial color={ENVELOPE_BAND} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.03, 0.26, 0.012]} />
          <meshStandardMaterial color={ENVELOPE_BAND} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 船頭的燈 */}
      <mesh position={[0, 0.02, 0.26]}>
        <icosahedronGeometry args={[0.035, 0]} />
        <meshStandardMaterial color={LAMP} emissive={LAMP} emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}
