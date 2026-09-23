import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// 配色照著本人的穿搭：黑色寬版短 T（胸前黃色印花）、橘色抽繩短褲、白襪綠條紋、米色洞洞鞋、深棕齊肩髮＋厚瀏海
const SKIN = '#f3cfae'
const HAIR = '#3a2619'
const SHIRT = '#1c1c1f'
const PRINT = '#f2c230'
const SHORTS = '#e08a3a'
const DRAWSTRING = '#efb46b'
const SOCK = '#f4f4f0'
const STRIPE = '#5fa66a'
const CLOG = '#c9b896'
const CLOG_HOLE = '#b09a74'
const STRAP = '#d4c4a4'
const BAG = '#c9b48f'
const EYE = '#2a1d16'

const HIP_Y = 0.14
const SHOULDER_Y = 0.29
const HEAD_Y = SHOULDER_Y + 0.075

function Clog({ x }) {
  return (
    <group position={[x, 0, 0]}>
      {/* 鞋身：寬、扁、往前凸，洞洞鞋的塊狀輪廓 */}
      <mesh position={[0, -0.138, 0.014]} castShadow>
        <boxGeometry args={[0.068, 0.032, 0.09]} />
        <meshStandardMaterial color={CLOG} flatShading />
      </mesh>
      {/* 鞋面上的兩排洞 */}
      {[-0.016, 0.016].map((hx) =>
        [-0.006, 0.016].map((hz) => (
          <mesh key={`${hx}-${hz}`} position={[hx, -0.121, hz + 0.014]}>
            <boxGeometry args={[0.012, 0.006, 0.012]} />
            <meshStandardMaterial color={CLOG_HOLE} />
          </mesh>
        ))
      )}
      {/* 後跟帶 */}
      <mesh position={[0, -0.122, -0.036]}>
        <boxGeometry args={[0.05, 0.016, 0.012]} />
        <meshStandardMaterial color={CLOG} flatShading />
      </mesh>
    </group>
  )
}

// 低多邊形小人，面向 +z。約 0.42 個單位高（大概是樹的一半），
// motion 是一個 ref：{ phase, moving }，phase 是走路相位（弧度）、moving 決定四肢要不要擺動
export default function Character({ motion }) {
  const body = useRef(null)
  const leftArm = useRef(null)
  const rightArm = useRef(null)
  const leftLeg = useRef(null)
  const rightLeg = useRef(null)
  const amplitude = useRef(0)

  useFrame(({ clock }, delta) => {
    const { phase, moving } = motion.current
    // 擺動幅度用指數趨近，走 ↔ 停之間不會瞬間切換
    amplitude.current = THREE.MathUtils.lerp(amplitude.current, moving ? 1 : 0, 1 - Math.exp(-delta * 8))
    const amp = amplitude.current
    const swing = Math.sin(phase) * 0.75 * amp

    if (leftLeg.current) leftLeg.current.rotation.x = swing
    if (rightLeg.current) rightLeg.current.rotation.x = -swing
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.8

    if (body.current) {
      // 走路時身體隨步伐微微上下，停下時緩慢呼吸
      body.current.position.y = Math.abs(Math.sin(phase)) * 0.02 * amp
      body.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.012 * (1 - amp)
    }
  })

  return (
    <group>
      {/* 雙腿：以髖關節為軸心擺動。上段藏在短褲裡，露出的是小腿、襪子和鞋 */}
      {[-0.038, 0.038].map((x, i) => (
        <group key={i} ref={i === 0 ? leftLeg : rightLeg} position={[x, HIP_Y, 0]}>
          <mesh position={[0, -0.06, 0]} castShadow>
            <boxGeometry args={[0.05, 0.12, 0.055]} />
            <meshStandardMaterial color={SKIN} flatShading />
          </mesh>
          {/* 白襪 + 一圈綠條紋 */}
          <mesh position={[0, -0.108, 0]} castShadow>
            <boxGeometry args={[0.054, 0.032, 0.058]} />
            <meshStandardMaterial color={SOCK} flatShading />
          </mesh>
          <mesh position={[0, -0.096, 0]}>
            <boxGeometry args={[0.056, 0.008, 0.06]} />
            <meshStandardMaterial color={STRIPE} flatShading />
          </mesh>
          <Clog x={0} />
        </group>
      ))}

      <group ref={body}>
        {/* 短褲：寬鬆、蓋住大腿上段；腰前一小條抽繩 */}
        <mesh position={[0, HIP_Y + 0.008, 0]} castShadow>
          <boxGeometry args={[0.165, 0.08, 0.108]} />
          <meshStandardMaterial color={SHORTS} flatShading />
        </mesh>
        <mesh position={[0, HIP_Y + 0.032, 0.055]}>
          <boxGeometry args={[0.042, 0.006, 0.004]} />
          <meshStandardMaterial color={DRAWSTRING} />
        </mesh>

        {/* 寬版短 T：下緣剛好到短褲腰頭，袖子比身體寬 */}
        <mesh position={[0, HIP_Y + 0.108, 0]} castShadow>
          <boxGeometry args={[0.16, 0.11, 0.1]} />
          <meshStandardMaterial color={SHIRT} flatShading />
        </mesh>
        {/* 胸前黃色印花 */}
        <mesh position={[0.008, HIP_Y + 0.112, 0.052]}>
          <boxGeometry args={[0.038, 0.032, 0.004]} />
          <meshStandardMaterial color={PRINT} />
        </mesh>

        {/* 斜背包：細背帶從右肩斜到左腰，包包掛在左側腰邊，避開臉 */}
        <mesh position={[0.02, HIP_Y + 0.09, 0.054]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.012, 0.16, 0.004]} />
          <meshStandardMaterial color={STRAP} />
        </mesh>
        <mesh position={[0.02, HIP_Y + 0.09, -0.054]} rotation={[0, 0, -0.7]}>
          <boxGeometry args={[0.012, 0.16, 0.004]} />
          <meshStandardMaterial color={STRAP} />
        </mesh>
        <mesh position={[-0.1, HIP_Y + 0.018, 0.012]} castShadow>
          <boxGeometry args={[0.032, 0.05, 0.06]} />
          <meshStandardMaterial color={BAG} flatShading />
        </mesh>

        {/* 雙手：以肩膀為軸心擺動。寬短袖 + 露出的手臂 */}
        {[-0.105, 0.105].map((x, i) => (
          <group key={i} ref={i === 0 ? leftArm : rightArm} position={[x, SHOULDER_Y, 0]}>
            <mesh position={[0, -0.03, 0]} castShadow>
              <boxGeometry args={[0.05, 0.062, 0.056]} />
              <meshStandardMaterial color={SHIRT} flatShading />
            </mesh>
            <mesh position={[0, -0.1, 0]} castShadow>
              <boxGeometry args={[0.038, 0.08, 0.042]} />
              <meshStandardMaterial color={SKIN} flatShading />
            </mesh>
          </group>
        ))}

        {/* 頭（眼睛在 +z，代表正面） */}
        <mesh position={[0, HEAD_Y, 0]} castShadow>
          <boxGeometry args={[0.11, 0.11, 0.11]} />
          <meshStandardMaterial color={SKIN} flatShading />
        </mesh>
        <mesh position={[-0.024, HEAD_Y - 0.01, 0.056]}>
          <boxGeometry args={[0.014, 0.016, 0.005]} />
          <meshStandardMaterial color={EYE} />
        </mesh>
        <mesh position={[0.024, HEAD_Y - 0.01, 0.056]}>
          <boxGeometry args={[0.014, 0.016, 0.005]} />
          <meshStandardMaterial color={EYE} />
        </mesh>

        {/* 頭髮：扁一點的頭頂 + 蓋到眉毛的厚瀏海 + 齊肩側髮與後髮 */}
        <mesh position={[0, HEAD_Y + 0.048, -0.008]} castShadow>
          <boxGeometry args={[0.122, 0.038, 0.122]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
        <mesh position={[0, HEAD_Y + 0.018, 0.056]} castShadow>
          <boxGeometry args={[0.112, 0.052, 0.028]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
        <mesh position={[-0.064, HEAD_Y - 0.035, 0]} castShadow>
          <boxGeometry args={[0.024, 0.14, 0.1]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
        <mesh position={[0.064, HEAD_Y - 0.035, 0]} castShadow>
          <boxGeometry args={[0.024, 0.14, 0.1]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
        <mesh position={[0, HEAD_Y - 0.035, -0.062]} castShadow>
          <boxGeometry args={[0.122, 0.14, 0.028]} />
          <meshStandardMaterial color={HAIR} flatShading />
        </mesh>
      </group>
    </group>
  )
}
