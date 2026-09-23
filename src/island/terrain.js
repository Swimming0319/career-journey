import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

const noise = new ImprovedNoise()

// 島嶼的基準半徑：地形起伏、裝飾物擺放都以這個值為中心來計算
export const BASE_RADIUS = 1.4

// 上半球在 Y 軸壓扁的比例，讓島看起來像「浮在空中的一塊陸地」而不是一顆球
const TOP_SQUASH = 0.78

// 每座島繞 Y 軸的旋轉角（用 seed 當亂數）。Island 用它擺放島嶼，Traveler 用它把人物貼到島上
export const islandRotationY = (seed) => seed * 2.1

// 簡單的線性同餘產生器：同一個 seed 永遠產生同一組數字，
// 讓島嶼的樹木位置、岩石大小在每次重新渲染時都保持一致，不會亂跳動
export function hashRandom(seed) {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// 多層 Perlin noise 疊加（fBm）：低頻負責大山丘的輪廓，高頻補上碎石般的小細節
function fbm(x, y, z, octaves = 4) {
  let amplitude = 1
  let frequency = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += noise.noise(x * frequency, y * frequency, z * frequency) * amplitude
    norm += amplitude
    amplitude *= 0.5
    frequency *= 2.1
  }
  return sum / norm
}

// 給一個單位方向向量，回傳這座島在該方向上的表面半徑
// 上半球：越靠近頂部起伏越大，做出山峰；下半球：往下收成尖錐狀的岩石底座
export function sampleRadius(dir, seed, roughness) {
  const ox = seed * 17.3
  const oy = seed * 5.1
  const oz = seed * 11.7

  if (dir.y >= 0) {
    const n = fbm(dir.x * 1.6 + ox, dir.y * 1.6 + oy, dir.z * 1.6 + oz)
    const peak = Math.pow(dir.y, 1.5)
    return BASE_RADIUS + n * roughness * 2 * (0.4 + 0.6 * peak) + peak * roughness * 1.2
  }

  const n = fbm(dir.x * 2.5 + ox, dir.y * 2.5 + oy, dir.z * 2.5 + oz, 3)
  const taper = 1 - Math.pow(-dir.y, 1.3) * 0.55
  return BASE_RADIUS * taper + n * roughness * 1.2
}

// 方向 → 實際的表面座標（含上半球壓扁），樹木、建築都用這個函式貼到地形上
export function surfacePoint(dir, seed, roughness, target = new THREE.Vector3()) {
  const r = sampleRadius(dir, seed, roughness)
  target.copy(dir).multiplyScalar(r)
  if (dir.y > 0) target.y *= TOP_SQUASH
  return target
}

// 把該方向的高度換算成 -1 ~ 1 左右的相對值，方便判斷「這裡是沙灘、草地還是岩石」
export function relativeHeight(dir, seed, roughness) {
  return (sampleRadius(dir, seed, roughness) - BASE_RADIUS) / (roughness * 2)
}

// 從每站的主色衍生出一整組配色：草地、深草、沙灘、岩石，維持「冷 → 暖」的整體漸層
export function makePalette(hex) {
  const grass = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  grass.getHSL(hsl)

  return {
    grass,
    grassLight: grass.clone().offsetHSL(0.02, 0, 0.08),
    grassDark: grass.clone().offsetHSL(-0.005, -0.05, -0.1),
    sand: new THREE.Color().setHSL(hsl.h + 0.04, hsl.s * 0.45, Math.min(0.82, hsl.l + 0.28)),
    rock: new THREE.Color().setHSL(hsl.h, hsl.s * 0.22, hsl.l * 0.72),
    rockDark: new THREE.Color().setHSL(hsl.h, hsl.s * 0.18, hsl.l * 0.42),
    leaf: new THREE.Color().setHSL(0.33 + (hsl.h - 0.5) * 0.08, 0.35, 0.34),
  }
}

// 依照高度與位置決定每個三角面的顏色：底部岩石 → 海岸沙灘 → 草地 → 山頂岩石
function bandColor(dirY, height, palette, target) {
  if (dirY < 0) {
    return target.copy(palette.rock).lerp(palette.rockDark, Math.min(1, -dirY * 1.4))
  }
  if (dirY < 0.16) return target.copy(palette.sand)
  if (height > 0.75) return target.copy(palette.rock)
  if (height > 0.4) return target.copy(palette.grassDark).lerp(palette.rock, (height - 0.4) / 0.35)
  return target.copy(palette.grassDark).lerp(palette.grassLight, THREE.MathUtils.clamp(height + 0.5, 0, 1))
}

// 產生整座島的地形幾何：位移每個頂點，並用「每個面單一顏色」的方式上色，保持俐落的低多邊形風格
export function buildTerrainGeometry(seed, roughness, palette) {
  const geometry = new THREE.IcosahedronGeometry(1, 4) // detail 4 → 5120 個面，非索引式，因此可以逐面上色
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)

  const dir = new THREE.Vector3()
  const point = new THREE.Vector3()
  const faceDir = new THREE.Vector3()
  const color = new THREE.Color()

  for (let i = 0; i < position.count; i += 3) {
    faceDir.set(0, 0, 0)
    let faceRadius = 0

    for (let k = 0; k < 3; k++) {
      dir.fromBufferAttribute(position, i + k).normalize()
      faceDir.add(dir)
      faceRadius += sampleRadius(dir, seed, roughness)
      surfacePoint(dir, seed, roughness, point)
      position.setXYZ(i + k, point.x, point.y, point.z)
    }

    faceDir.normalize()
    const height = (faceRadius / 3 - BASE_RADIUS) / (roughness * 2)
    bandColor(faceDir.y, height, palette, color)

    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = color.r
      colors[(i + k) * 3 + 1] = color.g
      colors[(i + k) * 3 + 2] = color.b
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}
