import { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const POST = '#8a8f98'
const PLAQUE_IDLE = '#4dd0e1'
const BUOY_IDLE = '#7ee787'
const STAR_IDLE = '#ffd27a'
const HOVER = '#ffffff'

// 共用的滑鼠事件：滑過時放大＋變色提示「這裡可以點」，同時把專案名稱顯示在標記正上方；
// 離開時把游標還原成拖曳用的 grab，懸浮文字也一併收起。
// labelRef 是外層（Canvas 外）那個 DOM 節點的 ref，直接改它的 style 而不透過 React state，
// 這樣文字位置才能每一幀跟著相機/捲動更新，不會因為 setState 造成不必要的重渲染
function useHoverHandlers(onClick, labelRef, title) {
  const [hovered, setHovered] = useState(false)
  const group = useRef(null)
  const worldPos = useRef(new THREE.Vector3())
  const { camera, size } = useThree()

  useFrame(() => {
    if (!hovered || !labelRef?.current || !group.current) return
    group.current.getWorldPosition(worldPos.current)
    worldPos.current.project(camera)
    const x = (worldPos.current.x * 0.5 + 0.5) * size.width
    const y = (1 - (worldPos.current.y * 0.5 + 0.5)) * size.height
    labelRef.current.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - 12}px)`
  })

  return {
    hovered,
    group,
    handlers: {
      onClick: (e) => {
        e.stopPropagation()
        onClick()
      },
      onPointerOver: (e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
        if (labelRef?.current && title) {
          labelRef.current.textContent = title
          labelRef.current.style.opacity = '1'
        }
      },
      onPointerOut: () => {
        setHovered(false)
        document.body.style.cursor = 'grab'
        if (labelRef?.current) labelRef.current.style.opacity = '0'
      },
    },
  }
}

// 「可以點」的視覺提示：一圈平放的光環從中心往外擴散、同時淡出，週期性重複
// 這是遊戲 UI 常見的 ping 效果，比靜態的圖示更容易被眼角餘光注意到
function ClickPulse({ color, radius = 0.16, y = 0, period = 2.2, paused = false }) {
  const ring = useRef(null)
  const material = useRef(null)

  useFrame(({ clock }) => {
    if (!ring.current || !material.current) return
    if (paused) {
      material.current.opacity = 0
      return
    }
    const phase = (clock.getElapsedTime() % period) / period
    const scale = 1 + phase * 1.6
    ring.current.scale.set(scale, scale, scale)
    material.current.opacity = (1 - phase) * 0.7
  })

  return (
    <mesh ref={ring} position={[0, y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.82, radius, 32]} />
      <meshBasicMaterial ref={material} color={color} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

// 會呼吸的發光體：沒有 hover 時亮度緩緩脈動、輕輕上下漂；hover 時放大、變白、變得更亮
function useGlowMotion(hovered, { baseY, bobAmplitude = 0.03, hoverScale = 1.25 }) {
  const mesh = useRef(null)
  const material = useRef(null)
  const scale = useRef(1)

  useFrame(({ clock }, delta) => {
    if (!mesh.current || !material.current) return
    const t = clock.getElapsedTime()
    scale.current = THREE.MathUtils.lerp(scale.current, hovered ? hoverScale : 1, 1 - Math.exp(-delta * 10))
    mesh.current.scale.setScalar(scale.current)
    mesh.current.position.y = baseY + Math.sin(t * 2) * bobAmplitude
    material.current.emissiveIntensity = hovered ? 1.6 : 0.6 + (Math.sin(t * 3) + 1) * 0.2
  })

  return { mesh, material }
}

// 立在島上的告示牌：木樁 + 會緩緩自轉的發光菱形，代表「站上這座島的某個專案」
export function ProjectPin({ onClick, title, labelRef }) {
  const { hovered, group, handlers } = useHoverHandlers(onClick, labelRef, title)
  const { mesh, material } = useGlowMotion(hovered, { baseY: 0.6 })
  const spin = useRef(null)

  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.getElapsedTime() * 0.6
  })

  return (
    <group ref={group} {...handlers}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.04, 6]} />
        <meshStandardMaterial color={POST} flatShading />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.52, 5]} />
        <meshStandardMaterial color="#d9d9d9" />
      </mesh>
      <group ref={mesh} position={[0, 0.6, 0]}>
        <mesh ref={spin}>
          <octahedronGeometry args={[0.11, 0]} />
          <meshStandardMaterial
            ref={material}
            color={hovered ? HOVER : PLAQUE_IDLE}
            emissive={hovered ? HOVER : PLAQUE_IDLE}
            emissiveIntensity={0.7}
            flatShading
          />
        </mesh>
      </group>
      <ClickPulse color={PLAQUE_IDLE} y={0.045} paused={hovered} />
    </group>
  )
}

// 浮標版本：拿掉木樁改成一個小木筏底座，給那些「不屬於任何一座島」的專案（例如卡在兩份工作空檔的案子）
export function ProjectBuoy({ onClick, title, labelRef }) {
  const { hovered, group, handlers } = useHoverHandlers(onClick, labelRef, title)
  const { mesh, material } = useGlowMotion(hovered, { baseY: 0.6 })
  const spin = useRef(null)

  useFrame(({ clock }) => {
    if (spin.current) spin.current.rotation.y = clock.getElapsedTime() * 0.6
  })

  return (
    <group ref={group} {...handlers}>
      <mesh receiveShadow>
        <cylinderGeometry args={[0.32, 0.28, 0.1, 8]} />
        <meshStandardMaterial color="#7a6a52" flatShading />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 5]} />
        <meshStandardMaterial color="#d9d9d9" />
      </mesh>
      <group ref={mesh} position={[0, 0.6, 0]}>
        <mesh ref={spin}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial
            ref={material}
            color={hovered ? HOVER : BUOY_IDLE}
            emissive={hovered ? HOVER : BUOY_IDLE}
            emissiveIntensity={0.7}
            flatShading
          />
        </mesh>
      </group>
      <ClickPulse color={BUOY_IDLE} radius={0.36} y={0.06} paused={hovered} />
    </group>
  )
}

// 五角星的立體幾何：用 Shape 畫出星形輪廓再擠出厚度，邊緣加一點斜角讓它有低多邊形寶石感
function useStarGeometry(outer = 0.26, inner = 0.11, depth = 0.09) {
  return useMemo(() => {
    const shape = new THREE.Shape()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const x = Math.cos(a) * r
      const y = Math.sin(a) * r
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 1,
    })
    geometry.center()
    return geometry
  }, [outer, inner, depth])
}

const SPARKLE_COUNT = 6

// 隱藏彩蛋：一顆會緩慢旋轉、閃爍的金色立體星星，周圍繞著小碎鑽。滑過去會變大、變亮
export function DreamStar({ onClick, title, labelRef }) {
  const { hovered, group, handlers } = useHoverHandlers(onClick, labelRef, title)
  const { mesh, material } = useGlowMotion(hovered, { baseY: 0, bobAmplitude: 0.05, hoverScale: 1.35 })
  const geometry = useStarGeometry()
  const star = useRef(null)
  const sparkleRefs = useRef([])
  const specs = useMemo(
    () =>
      Array.from({ length: SPARKLE_COUNT }, (_, i) => ({
        angle: (i / SPARKLE_COUNT) * Math.PI * 2,
        radius: 0.36 + (i % 2) * 0.08,
        speed: 0.4 + (i % 3) * 0.15,
      })),
    []
  )

  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime()
    if (star.current) {
      // 先把星形的正面朝向相機（不管相機環繞到哪一側都看得出是星星），
      // 再疊上左右搖擺與微傾，讓側面的厚度和斜角時不時露出來，保有立體感
      star.current.lookAt(camera.position)
      star.current.rotateY(Math.sin(t * 0.9) * 0.6)
      star.current.rotateZ(Math.sin(t * 0.7) * 0.15)
    }
    specs.forEach((s, i) => {
      const sparkle = sparkleRefs.current[i]
      if (!sparkle) return
      const a = s.angle + t * s.speed
      sparkle.position.set(Math.cos(a) * s.radius, Math.sin(t * 1.3 + i) * 0.08, Math.sin(a) * s.radius)
    })
  })

  return (
    <group ref={group} {...handlers}>
      <group ref={mesh}>
        <mesh ref={star} geometry={geometry} castShadow>
          <meshStandardMaterial
            ref={material}
            color={hovered ? HOVER : STAR_IDLE}
            emissive={hovered ? HOVER : STAR_IDLE}
            emissiveIntensity={0.8}
            flatShading
          />
        </mesh>
      </group>
      {specs.map((_, i) => (
        <mesh key={i} ref={(el) => { sparkleRefs.current[i] = el }}>
          <icosahedronGeometry args={[0.025, 0]} />
          <meshStandardMaterial color="#fff3cc" emissive="#fff3cc" emissiveIntensity={1.2} />
        </mesh>
      ))}
      <ClickPulse color={STAR_IDLE} radius={0.34} y={-0.38} period={2.6} paused={hovered} />
    </group>
  )
}
