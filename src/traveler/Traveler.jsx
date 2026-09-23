import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { segmentAt, DWELL_RANGE, HOP_RANGE } from '../journeyMath.js'
import { surfacePoint, islandRotationY } from '../island/terrain.js'
import Character from './Character.jsx'
import Airship from './Airship.jsx'

const WORLD_UP = new THREE.Vector3(0, 1, 0)
const ORIGIN = new THREE.Vector3(0, 0, 0)

// 飛船相對於路徑點的偏移（乘上該站的 scale）
// 停靠時（DOCK）往相機那一側偏，剛好懸在島的邊緣；飛行中（TRANSIT）收回路徑附近，離相機遠一點、在畫面裡才不會太大
const DOCK = { side: 2.1, up: 0.25 }
const TRANSIT = { side: 0.8, up: 0.5 }

// 人物坐在吊艙裡時，相對於飛船的位置（腳底貼吊艙地板，對應 Airship 裡吊艙的高度）
const SEAT = new THREE.Vector3(0, -0.12, 0.02)

// 人物腳底往地形法線方向多推一點，避免在陡坡上陷進低多邊形地面
const FOOT_LIFT = 0.02

// 人物相對島上建築、樹木的比例；1 會比辦公樓還醒目
const CHARACTER_SCALE = 0.8

// 停靠區裡真正在走路的範圍（扣掉兩端的跳船過場）
const WALK_RANGE = DWELL_RANGE - HOP_RANGE

// 走完整圈環島路線，走路相位要累積多少弧度（決定步伐頻率）
const STEPS_PER_LOOP = 60

// 每座島預先算好：碼頭方向、環島散步路線（都在島的 local 座標，用單位方向向量表示）
function buildRoutes(curve, stops, stopFractions) {
  return stops.map((stop, i) => {
    const tangent = curve.getTangentAt(stopFractions[i])
    const sideWorld = new THREE.Vector3().crossVectors(tangent, WORLD_UP).normalize()
    const rotationY = islandRotationY(i)
    const toLocal = new THREE.Quaternion().setFromAxisAngle(WORLD_UP, -rotationY)

    // 碼頭：飛船停靠那一側、稍微偏上的位置
    const dockDir = sideWorld.clone().addScaledVector(WORLD_UP, 0.55).normalize().applyQuaternion(toLocal)

    // 從碼頭出發、每 90° 一個路標、高度略有起伏，最後回到碼頭形成閉合路線
    const horizontal = new THREE.Vector3(dockDir.x, 0, dockDir.z).normalize()
    const waypoints = [dockDir]
    ;[0.62, 0.78, 0.6].forEach((y, k) => {
      const angle = ((k + 1) / 4) * Math.PI * 2
      const h = horizontal.clone().applyAxisAngle(WORLD_UP, angle)
      const r = Math.sqrt(1 - y * y)
      waypoints.push(new THREE.Vector3(h.x * r, y, h.z * r))
    })

    return {
      loop: new THREE.CatmullRomCurve3(waypoints, true, 'catmullrom', 0.5),
      toWorld: new THREE.Quaternion().setFromAxisAngle(WORLD_UP, rotationY),
      islandPosition: new THREE.Vector3(...stop.position),
      seed: i,
    }
  })
}

// 飛船載著人物沿路徑飛行；停靠時人物跳下船，在島上繞一圈，離站前回到碼頭跳上船
export default function Traveler({ curve, progress, stops, stopFractions }) {
  const routes = useMemo(() => buildRoutes(curve, stops, stopFractions), [curve, stops, stopFractions])
  const ship = useRef(null)
  const character = useRef(null)
  const motion = useRef({ phase: 0, moving: false })
  const lastWalk = useRef(null)
  const scratch = useRef({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    side: new THREE.Vector3(),
    shipTarget: new THREE.Vector3(),
    lookMatrix: new THREE.Matrix4(),
    shipQuat: new THREE.Quaternion(),
    seatWorld: new THREE.Vector3(),
    dirLocal: new THREE.Vector3(),
    posLocal: new THREE.Vector3(),
    tanLocal: new THREE.Vector3(),
    up: new THREE.Vector3(),
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    walkPos: new THREE.Vector3(),
    walkQuat: new THREE.Quaternion(),
    basis: new THREE.Matrix4(),
  })

  useFrame(() => {
    if (!ship.current || !character.current) return
    const s = scratch.current
    const { index, eased, nearest, offset } = segmentAt(progress.current, stops.length)

    /* ---------- 飛船 ---------- */
    const t = THREE.MathUtils.lerp(stopFractions[index], stopFractions[index + 1], eased)
    const islandScale = THREE.MathUtils.lerp(stops[index].scale, stops[index + 1].scale, eased)

    curve.getPointAt(t, s.point)
    curve.getTangentAt(t, s.tangent)
    s.side.crossVectors(s.tangent, WORLD_UP).normalize()
    // travel 在兩端（停靠）為 0、路程中點為 1：讓偏移量在 DOCK 與 TRANSIT 之間平滑過渡
    const travel = Math.sin(eased * Math.PI)
    const sideOffset = THREE.MathUtils.lerp(DOCK.side, TRANSIT.side, travel) * islandScale
    const upOffset = THREE.MathUtils.lerp(DOCK.up, TRANSIT.up, travel) * islandScale
    s.shipTarget.copy(s.point).addScaledVector(s.side, sideOffset).addScaledVector(WORLD_UP, upOffset)

    ship.current.position.lerp(s.shipTarget, 0.2)
    // 船頭朝前進方向：Matrix4.lookAt(eye, target) 會讓 +z 指向 eye，所以參數順序是 (前方, 原點)
    s.lookMatrix.lookAt(s.tangent, ORIGIN, WORLD_UP)
    s.shipQuat.setFromRotationMatrix(s.lookMatrix)
    ship.current.quaternion.slerp(s.shipQuat, 0.1)
    ship.current.updateMatrixWorld()
    s.seatWorld.copy(SEAT)
    ship.current.localToWorld(s.seatWorld)

    /* ---------- 人物 ---------- */
    const distance = Math.abs(offset)

    if (distance >= DWELL_RANGE) {
      // 在島與島之間：坐在飛船上
      character.current.position.copy(s.seatWorld)
      character.current.quaternion.copy(ship.current.quaternion)
      motion.current.moving = false
      lastWalk.current = null
      return
    }

    const route = routes[nearest]
    const stop = stops[nearest]
    // hop：0 = 還在船上，1 = 完全站在島上；中間播一段拋物線跳躍
    const hop = THREE.MathUtils.clamp((DWELL_RANGE - distance) / HOP_RANGE, 0, 1)
    // w：環島路線的進度，抵達時 0（碼頭）→ 停靠中點 0.5 → 離開前 1（回到碼頭）
    // 頭尾兩站只有一半的停靠區（起點沒有「抵達」、終點沒有「離開」），
    // 若照中間站的算法，人物在終點只能走到半圈就被捲動盡頭卡住；所以把僅有的那一半映射成完整一圈
    const isFirst = nearest === 0
    const isLast = nearest === stops.length - 1
    const w = isLast
      ? THREE.MathUtils.clamp(1 + offset / WALK_RANGE, 0, 1) // offset ∈ [-WALK, 0] → 0 → 1
      : isFirst
        ? THREE.MathUtils.clamp(offset / WALK_RANGE, 0, 1) // offset ∈ [0, WALK] → 0 → 1
        : THREE.MathUtils.clamp(0.5 + offset / (2 * WALK_RANGE), 0, 1)

    // 島的 local 座標：路線上的方向 → 貼到地形表面
    route.loop.getPointAt(w, s.dirLocal).normalize()
    surfacePoint(s.dirLocal, route.seed, stop.roughness, s.posLocal).addScaledVector(s.dirLocal, FOOT_LIFT)
    route.loop.getTangentAt(w, s.tanLocal)

    // 轉成世界座標：位置要乘 scale、套島的旋轉、加島的位置；方向只需套旋轉
    s.walkPos.copy(s.posLocal).multiplyScalar(stop.scale).applyQuaternion(route.toWorld).add(route.islandPosition)
    // 站立方向往「正上方」拉一些，在島側面的斜坡上才不會看起來像躺著走
    s.up.copy(s.dirLocal).lerp(WORLD_UP, 0.45).normalize().applyQuaternion(route.toWorld)
    s.forward.copy(s.tanLocal).applyQuaternion(route.toWorld)
    s.forward.addScaledVector(s.up, -s.forward.dot(s.up)).normalize()
    s.right.crossVectors(s.up, s.forward).normalize()
    s.basis.makeBasis(s.right, s.up, s.forward)
    s.walkQuat.setFromRotationMatrix(s.basis)

    // 船 ↔ 島之間用 hop 混合，並加一個往上的拋物線
    character.current.position.lerpVectors(s.seatWorld, s.walkPos, hop)
    character.current.position.y += Math.sin(hop * Math.PI) * 0.35
    character.current.quaternion.slerpQuaternions(ship.current.quaternion, s.walkQuat, hop)

    // 走路動畫只在真的沿路線前進時播放：相位隨路線進度累積，捲動停下來人物就停下來
    if (hop >= 1 && lastWalk.current !== null) {
      const dw = Math.abs(w - lastWalk.current)
      motion.current.phase += dw * STEPS_PER_LOOP
      motion.current.moving = dw > 1e-5
    } else {
      motion.current.moving = false
    }
    lastWalk.current = w
  })

  return (
    <>
      <group ref={ship}>
        <Airship />
      </group>
      {/* 人物縮到 0.8 倍，和建築、樹木的比例比較協調 */}
      <group ref={character} scale={CHARACTER_SCALE}>
        <Character motion={motion} />
      </group>
    </>
  )
}
