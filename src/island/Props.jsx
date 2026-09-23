import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)

const TRUNK = '#5c4433'
const WALL = '#e8d9c0'
const ROOF = '#a1442e'
const WINDOW = '#ffd27a'

// 讓裝飾物沿著島嶼表面的方向「站立」，並繞自身軸隨機轉一個角度，避免看起來排列整齊
export function Standing({ position, direction, scale = 1, spin = 0, children }) {
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(UP, direction)
    const s = new THREE.Quaternion().setFromAxisAngle(UP, spin)
    return q.multiply(s)
  }, [direction, spin])

  return (
    <group position={position} quaternion={quaternion} scale={scale}>
      {children}
    </group>
  )
}

// 會發光的小窗戶，讓建築在暗色背景裡有「有人在裡面」的溫度
function Window({ position, rotation, size = [0.07, 0.08] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[size[0], size[1], 0.012]} />
      <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={0.9} />
    </mesh>
  )
}

/* ---------- 樹木 ---------- */

// 松樹：三層逐漸縮小的圓錐
export function PineTree({ leaf }) {
  return (
    <>
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.3, 5]} />
        <meshStandardMaterial color={TRUNK} flatShading />
      </mesh>
      <mesh position={[0, 0.42, 0]} castShadow>
        <coneGeometry args={[0.24, 0.32, 6]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <coneGeometry args={[0.18, 0.28, 6]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow>
        <coneGeometry args={[0.11, 0.24, 6]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
    </>
  )
}

// 闊葉樹：一大一小兩團多面體樹冠
export function RoundTree({ leaf }) {
  return (
    <>
      <mesh position={[0, 0.17, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.35, 5]} />
        <meshStandardMaterial color={TRUNK} flatShading />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <icosahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
      <mesh position={[0.15, 0.62, 0.06]} castShadow>
        <icosahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
    </>
  )
}

// 棕櫚：微微傾斜的細長樹幹，頂端垂下五片寬扁的葉子，加一小串椰子
export function PalmTree({ leaf }) {
  return (
    <group rotation={[0, 0, 0.1]}>
      <mesh position={[0, 0.33, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.66, 5]} />
        <meshStandardMaterial color={TRUNK} flatShading />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <group key={i} position={[0, 0.66, 0]} rotation={[0, (i / 5) * Math.PI * 2 + 0.3, 0]}>
          {/* 葉子先往外推一點再往下垂，末端比根部低，看起來像被重量拉彎 */}
          <mesh position={[0, 0.03, 0.16]} rotation={[1.75, 0, 0]} scale={[1, 1, 0.25]} castShadow>
            <coneGeometry args={[0.13, 0.42, 4]} />
            <meshStandardMaterial color={leaf} flatShading side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <mesh position={[0.04, 0.62, 0.03]} castShadow>
        <icosahedronGeometry args={[0.05, 0]} />
        <meshStandardMaterial color="#7a5a3a" flatShading />
      </mesh>
    </group>
  )
}

/* ---------- 地表小物 ---------- */

export function Rock({ tint, stretch = 1 }) {
  return (
    <mesh position={[0, 0.05, 0]} scale={[1, 0.7, stretch]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.12, 0]} />
      <meshStandardMaterial color={tint} flatShading />
    </mesh>
  )
}

export function Bush({ leaf }) {
  return (
    <>
      <mesh position={[0, 0.07, 0]} castShadow>
        <icosahedronGeometry args={[0.11, 0]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
      <mesh position={[0.09, 0.05, 0.04]} castShadow>
        <icosahedronGeometry args={[0.07, 0]} />
        <meshStandardMaterial color={leaf} flatShading />
      </mesh>
    </>
  )
}

/* ---------- 建築 ---------- */

// 旗子：起點的標記，象徵「從這裡出發」
export function Flag() {
  return (
    <>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.1, 0.13, 0.05, 6]} />
        <meshStandardMaterial color="#8a8f98" flatShading />
      </mesh>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.6, 5]} />
        <meshStandardMaterial color="#d9d9d9" />
      </mesh>
      <mesh position={[0.12, 0.54, 0]} castShadow>
        <boxGeometry args={[0.22, 0.14, 0.012]} />
        <meshStandardMaterial color="#e8633c" side={THREE.DoubleSide} />
      </mesh>
    </>
  )
}

// 小屋：方形屋身 + 四角錐屋頂，加上門、窗和煙囪
export function House() {
  return (
    <>
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.3, 0.4]} />
        <meshStandardMaterial color={WALL} flatShading />
      </mesh>
      <mesh position={[0, 0.43, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.32, 0.3, 4]} />
        <meshStandardMaterial color={ROOF} flatShading />
      </mesh>
      <mesh position={[0.12, 0.5, 0.1]} castShadow>
        <boxGeometry args={[0.06, 0.16, 0.06]} />
        <meshStandardMaterial color="#6b6b70" flatShading />
      </mesh>
      <mesh position={[0, 0.07, 0.205]}>
        <boxGeometry args={[0.08, 0.14, 0.012]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
      <Window position={[-0.12, 0.17, 0.205]} />
      <Window position={[0.205, 0.17, 0]} rotation={[0, Math.PI / 2, 0]} />
    </>
  )
}

// 辦公樓：較高的方形建築，正面與側面有一格格發光的窗戶
export function Office() {
  const floors = [0.12, 0.26, 0.4]
  const columns = [-0.1, 0.1]

  return (
    <>
      <mesh position={[0, 0.275, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 0.55, 0.3]} />
        <meshStandardMaterial color="#c9d1d9" flatShading />
      </mesh>
      <mesh position={[0, 0.565, 0]} castShadow>
        <boxGeometry args={[0.4, 0.04, 0.34]} />
        <meshStandardMaterial color="#4a5560" flatShading />
      </mesh>
      <mesh position={[0.1, 0.62, -0.06]} castShadow>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial color="#8a8f98" flatShading />
      </mesh>
      {floors.map((y) =>
        columns.map((x) => (
          <group key={`${x}-${y}`}>
            <Window position={[x, y, 0.155]} />
            <Window position={[x, y, -0.155]} />
            <Window position={[0.185, y, x]} rotation={[0, Math.PI / 2, 0]} />
            <Window position={[-0.185, y, x]} rotation={[0, Math.PI / 2, 0]} />
          </group>
        ))
      )}
      <mesh position={[0, 0.06, 0.155]}>
        <boxGeometry args={[0.1, 0.12, 0.012]} />
        <meshStandardMaterial color="#2f3640" />
      </mesh>
    </>
  )
}

// 燈塔：紅白相間的塔身，頂端一盞發光的燈，象徵在轉職路上找到新方向
export function Lighthouse() {
  const stripes = ['#f2f2f2', '#d64a3a', '#f2f2f2']

  return (
    <>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.06, 8]} />
        <meshStandardMaterial color="#8a8f98" flatShading />
      </mesh>
      {stripes.map((color, i) => (
        <mesh key={i} position={[0, 0.16 + i * 0.2, 0]} castShadow>
          <cylinderGeometry args={[0.13 - i * 0.012, 0.142 - i * 0.012, 0.2, 8]} />
          <meshStandardMaterial color={color} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.12, 8]} />
        <meshStandardMaterial color={WINDOW} emissive={WINDOW} emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.83, 0]} castShadow>
        <coneGeometry args={[0.11, 0.1, 8]} />
        <meshStandardMaterial color="#d64a3a" flatShading />
      </mesh>
      <mesh position={[0, 0.05, 0.16]}>
        <boxGeometry args={[0.08, 0.14, 0.012]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
    </>
  )
}

// 風車：六角形塔身 + 會持續轉動的四片葉片，象徵「正在運轉中」的現在
export function Windmill() {
  const blades = useRef(null)

  useFrame((_, delta) => {
    if (blades.current) blades.current.rotation.z -= delta * 0.8
  })

  return (
    <>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.2, 0.5, 6]} />
        <meshStandardMaterial color={WALL} flatShading />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <coneGeometry args={[0.18, 0.18, 6]} />
        <meshStandardMaterial color={ROOF} flatShading />
      </mesh>
      <mesh position={[0, 0.06, 0.19]}>
        <boxGeometry args={[0.08, 0.12, 0.012]} />
        <meshStandardMaterial color={TRUNK} />
      </mesh>
      <Window position={[0, 0.32, 0.165]} size={[0.06, 0.06]} />
      <mesh position={[0, 0.48, 0.17]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.1, 6]} />
        <meshStandardMaterial color={TRUNK} flatShading />
      </mesh>
      <group ref={blades} position={[0, 0.48, 0.22]}>
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, (i / 4) * Math.PI * 2]} position={[0, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 0.5, 0.012]} />
            <meshStandardMaterial color="#d9d9d9" side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </>
  )
}

/* ---------- 雲 ---------- */

// 幾團多面體湊成的雲，會緩緩左右漂移，讓畫面不那麼靜止
const PUFFS = [
  [0, 0, 0, 0.32],
  [0.3, 0.05, 0.1, 0.24],
  [-0.3, 0.02, -0.05, 0.26],
  [0.05, 0.1, -0.2, 0.2],
]

export function Cloud({ position, scale = 1, speed = 1, phase = 0 }) {
  const ref = useRef(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * 0.25 * speed + phase
    ref.current.position.x = position[0] + Math.sin(t) * 0.3
    ref.current.position.y = position[1] + Math.sin(t * 1.7) * 0.08
  })

  return (
    <group ref={ref} position={position} scale={[scale, scale * 0.6, scale]}>
      {PUFFS.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]}>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color="#e6ecf4" flatShading />
        </mesh>
      ))}
    </group>
  )
}
