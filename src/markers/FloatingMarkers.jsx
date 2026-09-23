import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ProjectBuoy, DreamStar } from './ProjectPin.jsx'

const WORLD_UP = new THREE.Vector3(0, 1, 0)

// 浮在兩站之間的專案標記（例如外包案的時間點剛好卡在兩份工作的空檔），
// 用路徑的側向偏移離開主線一段距離，避免擋到引導線和飛船
export function PathMarker({ curve, stopFractions, afterIndex, islandScale = 1, onClick, title, labelRef }) {
  const group = useRef(null)
  const base = useMemo(() => {
    const t = THREE.MathUtils.lerp(stopFractions[afterIndex], stopFractions[afterIndex + 1], 0.5)
    const point = curve.getPointAt(t)
    const tangent = curve.getTangentAt(t)
    const side = new THREE.Vector3().crossVectors(tangent, WORLD_UP).normalize()
    return point.clone().addScaledVector(side, -3.2).addScaledVector(WORLD_UP, -0.6)
  }, [curve, stopFractions, afterIndex])

  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = base.y + Math.sin(clock.getElapsedTime() * 0.7) * 0.15
  })

  return (
    <group ref={group} position={base} scale={islandScale}>
      <ProjectBuoy onClick={onClick} title={title} labelRef={labelRef} />
    </group>
  )
}

// 飄在某座島旁邊、不隨島嶼自轉的驚喜物件，給沒有掛在任何一站正式經歷裡的 side project
export function OrbitMarker({ islandPosition, offset, scale = 1, onClick, title, labelRef }) {
  const group = useRef(null)
  const base = useMemo(
    () => new THREE.Vector3(...islandPosition).add(new THREE.Vector3(...offset)),
    [islandPosition, offset]
  )

  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = base.y + Math.sin(clock.getElapsedTime() * 0.5) * 0.2
  })

  return (
    <group ref={group} position={base} scale={scale}>
      <DreamStar onClick={onClick} title={title} labelRef={labelRef} />
    </group>
  )
}
