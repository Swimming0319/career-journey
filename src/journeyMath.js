import * as THREE from 'three'

// 一段路程（兩站之間）裡，前後各 DWELL_RANGE 的比例算是「停靠」：相機與飛船停在島邊、人物在島上散步
// 中間 1 - 2 × DWELL_RANGE 的比例才是真正在島與島之間移動
export const DWELL_RANGE = 0.3

// 停靠區的最外緣 HOP_RANGE 這一小段，用來播人物「跳下船 / 跳上船」的過場
export const HOP_RANGE = 0.05

// 算出每一站在曲線上對應的「弧長比例」（0 ~ 1）。
// 站與站之間的距離不一樣，所以不能直接用 i / (N-1) 當進度，否則相機會停在島與島之間而不是島的正中央
export function computeStopFractions(curve, count) {
  const divisions = 400
  const lengths = curve.getLengths(divisions)
  const total = lengths[divisions]
  return Array.from({ length: count }, (_, i) => lengths[Math.round((i / (count - 1)) * divisions)] / total)
}

// 把 0 ~ 1 的捲動進度拆解成這一幀需要的所有資訊：
// index   目前在第幾段（第 index 站 → 第 index+1 站）
// eased   這一段內的移動比例：前後 DWELL_RANGE 停住不動，中間用 smoothstep 緩入緩出
// nearest 最接近的那一站
// offset  距離 nearest 的有號距離（-0.5 ~ 0.5），負值代表還沒抵達、正值代表已經離開
// dwell   1 = 完全停靠在 nearest，0 = 在兩站中間；用來控制環繞視角開多少
export function segmentAt(progress, count) {
  const segments = count - 1
  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * segments
  const index = Math.min(Math.floor(scaled), segments - 1)
  const local = scaled - index
  const eased = THREE.MathUtils.smoothstep(local, DWELL_RANGE, 1 - DWELL_RANGE)

  const nearest = Math.round(scaled)
  const offset = scaled - nearest
  const dwell = 1 - THREE.MathUtils.smoothstep(Math.abs(offset), 0.05, DWELL_RANGE)

  return { index, local, eased, nearest, offset, dwell }
}
