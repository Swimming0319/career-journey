import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { placeAbove, toScreen } from './overlay.js'

// 引導泡泡指向的位置：告示牌 local 座標裡，發光菱形（中心 0.6、半徑約 0.11）的頂端
const ANCHOR = new THREE.Vector3(0, 0.72, 0)

// 往上找到直接掛在場景底下的那一層（也就是標記所在的整座島），遮擋判斷只需要測這座島
function islandRoot(object) {
  let root = object
  while (root.parent && root.parent.type !== 'Scene') root = root.parent
  return root
}

function isInside(object, ancestor) {
  for (let o = object; o; o = o.parent) if (o === ancestor) return true
  return false
}

// 泡泡大約 100px 寬、40px 高：標記要離畫面邊緣至少這麼遠，泡泡才不會被切掉（手機上島比較容易超出畫面）
const EDGE_X = 56
const EDGE_TOP = 48

function setVisible(el, visible) {
  el.style.opacity = visible ? '1' : '0'
}

// 新手引導的定位器（放在 Canvas 裡、本身不畫任何東西）：每一幀從 projectIds 這幾個標記中，
// 挑出「在畫面內、沒被地形或樹木擋住，而且離相機最近」的那一個，把 Canvas 外的引導泡泡擺到它正上方。
// 相機停靠時會繞著島自轉，只盯同一個標記的話，它轉到島的背面時引導就會消失半圈，所以每一幀重新挑
export default function GuideTracker({ projectIds, guideRef }) {
  const { scene, camera, size } = useThree()
  const markers = useRef(new Map())
  const scratch = useRef({
    raycaster: new THREE.Raycaster(),
    anchor: new THREE.Vector3(),
    dir: new THREE.Vector3(),
    best: new THREE.Vector3(),
    screen: new THREE.Vector3(),
  })

  useFrame(() => {
    if (!guideRef.current) return
    const { raycaster, anchor, dir, best, screen } = scratch.current
    let bestDist = Infinity

    projectIds.forEach((id) => {
      // getObjectByName 會走訪整個場景，找到一次就記起來
      if (!markers.current.has(id)) markers.current.set(id, scene.getObjectByName(id))
      const marker = markers.current.get(id)
      if (!marker) return

      marker.localToWorld(anchor.copy(ANCHOR))
      const dist = dir.subVectors(anchor, camera.position).length()
      if (dist >= bestDist) return

      const { x, y, behind } = toScreen(screen.copy(anchor), camera, size)
      if (behind || x < EDGE_X || x > size.width - EDGE_X || y < EDGE_TOP || y > size.height) return

      // 從相機往標記打一條射線，中途先撞到島上其他東西就代表被擋住了
      raycaster.set(camera.position, dir.normalize())
      raycaster.far = dist
      const blocked = raycaster.intersectObject(islandRoot(marker), true).some((hit) => !isInside(hit.object, marker))
      if (blocked) return

      bestDist = dist
      best.copy(anchor)
    })

    if (bestDist === Infinity) {
      setVisible(guideRef.current, false)
      return
    }
    placeAbove(guideRef.current, toScreen(best, camera, size), 6)
    setVisible(guideRef.current, true)
  })

  return null
}
