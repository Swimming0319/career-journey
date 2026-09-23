import { useMemo } from 'react'
import * as THREE from 'three'
import {
  hashRandom,
  surfacePoint,
  relativeHeight,
  makePalette,
  buildTerrainGeometry,
  islandRotationY,
} from './terrain.js'
import {
  Standing,
  PineTree,
  RoundTree,
  PalmTree,
  Rock,
  Bush,
  Flag,
  House,
  Office,
  Lighthouse,
  Windmill,
  Cloud,
} from './Props.jsx'
import { ProjectPin } from '../markers/ProjectPin.jsx'

const UP = new THREE.Vector3(0, 1, 0)

// 建築的固定擺放位置（島頂附近），第一棟放正中央，之後的排在面向相機（-x / +z）那一側
const BUILDING_SLOTS = [
  new THREE.Vector3(0, 1, 0.12).normalize(),
  new THREE.Vector3(-0.55, 1, 0.35).normalize(),
  new THREE.Vector3(0.45, 1, 0.4).normalize(),
]

const BUILDINGS = { flag: Flag, house: House, office: Office, lighthouse: Lighthouse, windmill: Windmill }
const TREES = { pine: PineTree, round: RoundTree, palm: PalmTree }

// 在上半球隨機取一個方向，minY 越大就越集中在島頂
function randomUpperDir(rand, minY) {
  const theta = rand() * Math.PI * 2
  const y = minY + rand() * (1 - minY)
  const r = Math.sqrt(1 - y * y)
  return new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r)
}

// 決定整座島上所有裝飾物的位置、種類、大小；用 seed 固定亂數，讓結果每次都一樣
function useDecorations(seed, roughness, treeCount, rockCount, bushCount, buildings) {
  return useMemo(() => {
    const rand = hashRandom(seed * 733 + 7)
    const items = []
    const hasBuilding = buildings.length > 0

    const place = (type, dir, extra = {}) => {
      // 樹和建築的方向往「正上方」拉，避免站在斜坡上的物件看起來像要倒了；岩石則貼著地表方向
      const upright = type === 'rock' ? 0.2 : 0.6
      const direction = dir.clone().lerp(UP, upright).normalize()
      items.push({
        type,
        position: surfacePoint(dir, seed, roughness),
        direction,
        spin: rand() * Math.PI * 2,
        scale: 1,
        variant: rand(),
        ...extra,
      })
    }

    // 樹：避開建築所在的島頂，也不長在太高的岩石區
    let placed = 0
    for (let attempt = 0; placed < treeCount && attempt < treeCount * 12; attempt++) {
      const dir = randomUpperDir(rand, 0.3)
      if (hasBuilding && dir.y > 0.88) continue
      if (relativeHeight(dir, seed, roughness) > 0.65) continue

      // 靠近海岸線的地方比較容易長出棕櫚，高處則是松樹與闊葉樹
      const roll = rand()
      const type = dir.y < 0.5 && roll < 0.45 ? 'palm' : roll < 0.7 ? 'pine' : 'round'
      place(type, dir, { scale: 0.7 + rand() * 0.5 })
      placed++
    }

    for (let i = 0; i < rockCount; i++) {
      const dir = randomUpperDir(rand, 0.1)
      place('rock', dir, { scale: 0.6 + rand() * 0.9, stretch: 0.8 + rand() * 0.7 })
    }

    for (let i = 0; i < bushCount; i++) {
      const dir = randomUpperDir(rand, 0.25)
      if (relativeHeight(dir, seed, roughness) > 0.7) continue
      place('bush', dir, { scale: 0.7 + rand() * 0.6 })
    }

    buildings.forEach((kind, i) => {
      const dir = BUILDING_SLOTS[i % BUILDING_SLOTS.length]
      // 建築正面朝向島的外側，spin 固定成朝向 +z 附近，比較容易被相機看到
      place(kind, dir, { spin: Math.atan2(dir.x, dir.z) + Math.PI, scale: 1 })
    })

    return items
  }, [seed, roughness, treeCount, rockCount, bushCount, buildings])
}

// 專案標記的位置是手動指定的（不像樹木、岩石那樣用亂數亂灑），
// 這樣才能保證告示牌一定出現在看得到、也不會跟建築物重疊的地方
function useMarkerPlacements(markers, seed, roughness) {
  return useMemo(
    () =>
      markers.map((marker) => {
        const dir = new THREE.Vector3(...marker.dir).normalize()
        return {
          id: marker.id,
          title: marker.title,
          position: surfacePoint(dir, seed, roughness),
          direction: dir.clone().lerp(UP, 0.6).normalize(),
          spin: Math.atan2(dir.x, dir.z) + Math.PI,
        }
      }),
    [markers, seed, roughness]
  )
}

// 一座島 = 程式生成的地形 + 樹木 / 岩石 / 灌木 / 建築 + 漂浮在旁邊的雲 + 可點擊的專案告示牌
// rotation 只繞 Y 軸（用 seed 當亂數），這樣每座島的「頂部」都朝上，只是轉了不同角度
export default function Island({
  position,
  color = '#7c9885',
  scale = 1,
  seed = 0,
  roughness = 0.15,
  treeCount = 0,
  rockCount = 4,
  bushCount = 3,
  buildings = [],
  clouds = 1,
  markers = [],
  onSelectProject,
  labelRef,
}) {
  const palette = useMemo(() => makePalette(color), [color])
  const geometry = useMemo(() => buildTerrainGeometry(seed, roughness, palette), [seed, roughness, palette])
  const decorations = useDecorations(seed, roughness, treeCount, rockCount, bushCount, buildings)
  const markerPlacements = useMarkerPlacements(markers, seed, roughness)

  // 每棵樹的葉色都在主葉色附近微調，避免整片樹林是同一個綠
  const leafColors = useMemo(
    () => decorations.map((item) => palette.leaf.clone().offsetHSL((item.variant - 0.5) * 0.06, 0, (item.variant - 0.5) * 0.12)),
    [decorations, palette]
  )

  const cloudSpecs = useMemo(() => {
    const rand = hashRandom(seed * 311 + 3)
    return Array.from({ length: clouds }, () => ({
      position: [(rand() - 0.5) * 4, 1.6 + rand() * 0.8, (rand() - 0.5) * 3],
      scale: 0.7 + rand() * 0.5,
      speed: 0.7 + rand() * 0.6,
      phase: rand() * Math.PI * 2,
    }))
  }, [seed, clouds])

  return (
    <group position={position} rotation={[0, islandRotationY(seed), 0]} scale={scale}>
      <mesh castShadow receiveShadow geometry={geometry}>
        <meshStandardMaterial vertexColors flatShading />
      </mesh>

      {decorations.map((item, i) => {
        const Tree = TREES[item.type]
        const Building = BUILDINGS[item.type]
        return (
          <Standing key={i} position={item.position} direction={item.direction} scale={item.scale} spin={item.spin}>
            {Tree && <Tree leaf={leafColors[i]} />}
            {item.type === 'rock' && <Rock tint={palette.rock} stretch={item.stretch} />}
            {item.type === 'bush' && <Bush leaf={leafColors[i]} />}
            {Building && <Building />}
          </Standing>
        )
      })}

      {cloudSpecs.map((spec, i) => (
        <Cloud key={i} {...spec} />
      ))}

      {markerPlacements.map((marker) => (
        <Standing key={marker.id} position={marker.position} direction={marker.direction} spin={marker.spin}>
          <ProjectPin onClick={() => onSelectProject?.(marker.id)} title={marker.title} labelRef={labelRef} />
        </Standing>
      ))}
    </group>
  )
}
