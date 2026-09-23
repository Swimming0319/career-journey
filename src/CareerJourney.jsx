import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Island from './island/Island.jsx'
import Traveler from './traveler/Traveler.jsx'
import { computeStopFractions, segmentAt } from './journeyMath.js'
import { PROJECTS, EASTER_EGG } from './projects.js'
import { PathMarker, OrbitMarker } from './markers/FloatingMarkers.jsx'
import ProjectCard from './markers/ProjectCard.jsx'
import { ContactBar, ArrivalCard } from './Contact.jsx'

gsap.registerPlugin(ScrollTrigger)

// 在這裡定義你的旅程停靠站 — 每一站對應你經歷的一個階段
// position 是這座島在 3D 空間中的座標，你可以自由調整讓路徑更有起伏
// color 用冷色調到暖色調的漸層，呼應「起點 → 現在」的成長感；scale 讓島嶼隨旅程逐漸變大
// roughness 是地形起伏程度；treeCount / rockCount / bushCount 控制島上的植被與岩石數量
// buildings 可放的種類：flag（旗子）、house（小屋）、office（辦公樓）、lighthouse（燈塔）、windmill（風車）
// period 是這一站的時間區間，獨立成一個欄位（而不是寫進 desc）才能每一站都用同樣的格式呈現
const STOPS = [
  { position: [0, 0, 0], color: '#5b7c99', scale: 0.8, roughness: 0.12, treeCount: 2, rockCount: 2, bushCount: 1, buildings: ['flag'], clouds: 1, label: '01', title: '非本科背景', period: '2017 ～ 2022', desc: '北科大經營管理碩士畢業後，在永光化學做國貿行銷、也在 HTC 和飛捷科技做過物控管理，跟前端完全是兩個世界。' },
  { position: [9, 2, -11], color: '#4d8b6d', scale: 0.95, roughness: 0.2, treeCount: 5, rockCount: 4, bushCount: 3, buildings: ['lighthouse'], clouds: 1, label: '02', title: '轉職契機', period: '2022/12 ～ 2023/5', desc: '報名緯育 TIBAME 前端工程師培訓班，從 HTML / CSS / JavaScript / Vue.js 重新學起，把好奇心正式轉成程式碼。' },
  { position: [20, -1, -24], color: '#c98a3e', scale: 1.1, roughness: 0.28, treeCount: 8, rockCount: 5, bushCount: 4, buildings: ['office'], clouds: 2, label: '03', title: '第一份前端工作', period: '2023/6 ～ 2025/8', desc: '加入小驢行擔任前端工程師，參與屏東縣復康巴士系統、臺灣藝術大學校首頁等政府標案，深入實作無障礙設計與多語系支援。' },
  { position: [32, 2, -38], color: '#e07a4c', scale: 1.25, roughness: 0.22, treeCount: 10, rockCount: 5, bushCount: 4, buildings: ['windmill'], clouds: 2, label: '04', title: '第二份前端工作', period: '2025/11 ～ 2026/3', desc: '在好好證券基金交易平台，負責產品優化及迭代並主導基金詳情頁與找基金頁從 Nuxt 2 升級到 Nuxt 3，並透過反覆調校 AI prompt 找出最適合的工作量估算方式。' },
  { position: [45, 4, -54], color: '#ff7b54', scale: 1.4, roughness: 0.18, treeCount: 12, rockCount: 5, bushCount: 5, buildings: ['house', 'office'], clouds: 3, label: '05', title: '現在', period: '2026/7 ～ 仍在職', desc: '目前在長川資訊擔任前端工程師，用 Vue 3 / Nuxt 開發網頁，負責重構台灣觀光協會後台管理系統的台灣國際旅展管理模組。' },
]

// 用 Catmull-Rom 曲線把所有停靠站串成一條平滑的路徑
function buildCurve(stops) {
  const points = stops.map((s) => new THREE.Vector3(...s.position))
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5)
}

// 停靠時的環繞視角設定：
// autoSpeed 是沒有拖曳時的自轉速度（弧度/秒）；dragSpeed 是滑鼠每移動 1px 轉多少弧度
// pitchMin / pitchMax 限制上下俯仰角，避免轉到島底或正上方
// （停靠範圍的比例由 journeyMath.js 的 DWELL_RANGE 統一控制，相機、飛船、人物共用）
const ORBIT = { autoSpeed: 0.12, dragSpeed: 0.005, pitchMin: 0.12, pitchMax: 1.15 }

// 相機不直接走在曲線上（那樣會穿過島的中心），而是往路徑的側邊與上方偏移一段距離，
// 再看向曲線上稍微前方的一點：這樣每一站的島都會出現在畫面裡，同時保留「航行感」
// side / up 是島嶼 scale = 1 時的偏移量，會乘上目前所在那一站的 scale，大島自動退遠一點
// lookDown 讓視線瞄準島中心稍下方，島就會在畫面裡往上移，避開左下角的文字
const CAMERA_OFFSET = { side: 5.4, up: 2.6, lookDown: 0.25 }
const LOOK_AHEAD = 0.015
const WORLD_UP = new THREE.Vector3(0, 1, 0)

function CameraRig({ curve, progress, stops, stopFractions }) {
  const gl = useThree((state) => state.gl)
  const lookTarget = useRef(new THREE.Vector3())
  const orbit = useRef({ yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 })
  const lightRef = useRef(null)
  const scratch = useRef({
    point: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    side: new THREE.Vector3(),
    target: new THREE.Vector3(),
    lookPoint: new THREE.Vector3(),
    center: new THREE.Vector3(),
    viewDir: new THREE.Vector3(),
    right: new THREE.Vector3(),
  })

  // 在畫布上按住拖曳 → 累積 yaw（左右）與 pitch（上下）的偏移角
  useEffect(() => {
    const el = gl.domElement
    const state = orbit.current

    const onDown = (e) => {
      state.dragging = true
      state.lastX = e.clientX
      state.lastY = e.clientY
    }
    const onMove = (e) => {
      if (!state.dragging) return
      state.yaw -= (e.clientX - state.lastX) * ORBIT.dragSpeed
      state.pitch += (e.clientY - state.lastY) * ORBIT.dragSpeed
      state.lastX = e.clientX
      state.lastY = e.clientY
    }
    const onUp = () => {
      state.dragging = false
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl])

  useFrame(({ camera }, delta) => {
    const { point, tangent, side, target, lookPoint, center, viewDir, right } = scratch.current
    const state = orbit.current
    const { index, eased, dwell } = segmentAt(progress.current, stops.length)
    const t = THREE.MathUtils.lerp(stopFractions[index], stopFractions[index + 1], eased)
    const islandScale = THREE.MathUtils.lerp(stops[index].scale, stops[index + 1].scale, eased)

    // 沒有拖曳時緩慢自轉；離開停靠站（dwell 歸零）時把角度歸零，抵達下一站才不會突然大轉
    if (!state.dragging) state.yaw += ORBIT.autoSpeed * delta * dwell
    if (dwell <= 0.001) {
      state.yaw = 0
      state.pitch = 0
    } else if (dwell >= 0.999) {
      // 完全停靠時把 yaw 收斂到 -π ~ π（畫面上看不出差別），離站時最多只需回轉半圈
      state.yaw = Math.atan2(Math.sin(state.yaw), Math.cos(state.yaw))
    }

    curve.getPointAt(t, point)
    curve.getTangentAt(t, tangent)
    // 側向 = 前進方向 × 世界上方，得到一個永遠垂直於路徑、與地面平行的方向
    side.crossVectors(tangent, WORLD_UP).normalize()

    // 把「側向 + 上方」的偏移換成以島為中心的球座標，再套上環繞角度（乘上 dwell 讓它在移動時淡出）
    const sideDist = CAMERA_OFFSET.side * islandScale
    const upDist = CAMERA_OFFSET.up * islandScale
    const radius = Math.hypot(sideDist, upDist)
    const baseYaw = Math.atan2(side.x, side.z)
    const basePitch = Math.atan2(upDist, sideDist)
    const yaw = baseYaw + state.yaw * dwell
    const pitch = THREE.MathUtils.clamp(basePitch + state.pitch * dwell, ORBIT.pitchMin, ORBIT.pitchMax)

    target.set(
      point.x + Math.sin(yaw) * Math.cos(pitch) * radius,
      point.y + Math.sin(pitch) * radius,
      point.z + Math.cos(yaw) * Math.cos(pitch) * radius
    )

    // 移動中看向路徑前方一點（航行感）；停靠時視線收回島中心，環繞時島才會固定在畫面中央
    curve.getPointAt(THREE.MathUtils.clamp(t + LOOK_AHEAD, 0, 1), lookPoint)
    center.copy(point)
    lookPoint.lerp(center, dwell)
    lookPoint.y -= CAMERA_OFFSET.lookDown * islandScale

    // lerp 讓相機移動平滑，避免捲動時的抖動感
    camera.position.lerp(target, 0.15)
    lookTarget.current.lerp(lookPoint, 0.15)
    camera.lookAt(lookTarget.current)

    // 主光源跟著相機走（在觀看者的左上方），環繞島嶼時看到的永遠是被照亮的那一面
    const light = lightRef.current
    if (light) {
      viewDir.subVectors(lookTarget.current, camera.position).normalize()
      right.crossVectors(viewDir, WORLD_UP).normalize()
      light.position.copy(camera.position).addScaledVector(WORLD_UP, 8).addScaledVector(right, -5)
      light.target.position.copy(lookTarget.current)
      light.target.updateMatrixWorld()
    }
  })

  return <directionalLight ref={lightRef} intensity={1.1} castShadow />
}

function Scene({ curve, progress, stops, stopFractions, onSelectProject, labelRef }) {
  const points = useMemo(() => curve.getPoints(200), [curve])
  const linePositions = useMemo(
    () => new Float32Array(points.flatMap((p) => [p.x, p.y, p.z])),
    [points]
  )

  // 依 islandIndex 把專案分組，貼在島上的告示牌；path / orbit 兩種則不屬於任何一座島，另外處理
  const projectsByIsland = useMemo(() => {
    const map = new Map()
    PROJECTS.forEach((project) => {
      if (project.attach.islandIndex === undefined) return
      const list = map.get(project.attach.islandIndex) ?? []
      list.push(project)
      map.set(project.attach.islandIndex, list)
    })
    return map
  }, [])

  const pathMarkers = useMemo(() => PROJECTS.filter((project) => project.attach.kind === 'path'), [])

  return (
    <>
      {/* 讓遠處的島嶼漸漸隱入背景色，製造景深層次感 */}
      <fog attach="fog" args={['#0d1117', 20, 55]} />

      {/* 半球光讓上方偏冷、下方偏暖，島嶼底部的岩石不會死黑一片 */}
      <hemisphereLight args={['#9fb6d4', '#3a2a22', 0.55]} />
      <ambientLight intensity={0.25} />

      {/* 主光源（directionalLight）放在 CameraRig 裡，會跟著相機移動 */}
      <CameraRig curve={curve} progress={progress} stops={stops} stopFractions={stopFractions} />

      {/* 飛船 + 小人：沿路徑飛行，停靠時下船在島上散步 */}
      <Traveler curve={curve} progress={progress} stops={stops} stopFractions={stopFractions} />

      {stops.map((stop, i) => (
        <Island
          key={i}
          position={stop.position}
          color={stop.color}
          scale={stop.scale}
          seed={i}
          roughness={stop.roughness}
          treeCount={stop.treeCount}
          rockCount={stop.rockCount}
          bushCount={stop.bushCount}
          buildings={stop.buildings}
          clouds={stop.clouds}
          markers={(projectsByIsland.get(i) ?? []).map((project) => ({ id: project.id, dir: project.attach.dir, title: project.title }))}
          onSelectProject={onSelectProject}
          labelRef={labelRef}
        />
      ))}

      {pathMarkers.map((project) => (
        <PathMarker
          key={project.id}
          curve={curve}
          stopFractions={stopFractions}
          afterIndex={project.attach.afterIndex}
          islandScale={THREE.MathUtils.lerp(
            stops[project.attach.afterIndex].scale,
            stops[project.attach.afterIndex + 1].scale,
            0.5
          )}
          onClick={() => onSelectProject(project.id)}
          title={project.title}
          labelRef={labelRef}
        />
      ))}

      {/* 藏在「現在」這座島附近的驚喜：沒有正式列在職涯經歷裡的 side project */}
      <OrbitMarker
        islandPosition={stops[EASTER_EGG.attach.islandIndex].position}
        offset={EASTER_EGG.attach.offset}
        scale={stops[EASTER_EGG.attach.islandIndex].scale}
        onClick={() => onSelectProject(EASTER_EGG.id)}
        title={EASTER_EGG.title}
        labelRef={labelRef}
      />

      {/* 一條淡淡的引導線，讓路徑本身也有視覺存在感 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={points.length}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#888" transparent opacity={0.3} />
      </line>
    </>
  )
}

export default function CareerJourney() {
  const progress = useRef(0)
  const containerRef = useRef(null)
  const curve = useMemo(() => buildCurve(STOPS), [])
  const stopFractions = useMemo(() => computeStopFractions(curve, STOPS.length), [curve])
  const [activeStop, setActiveStop] = useState(0)
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const labelRef = useRef(null)
  // 第一次成功點開專案之後就把操作提示收起來，之後不再干擾畫面
  const [hintVisible, setHintVisible] = useState(true)
  // 捲到最後一站停妥之後，把旅程文字換成抵達卡（用布林而不是連續的進度值，捲動時才不會每一幀都重繪）
  const [arrived, setArrived] = useState(false)
  const onSelectProject = (id) => {
    setSelectedProjectId(id)
    if (id) setHintVisible(false)
  }
  const selectedProject = useMemo(
    () => [...PROJECTS, EASTER_EGG].find((project) => project.id === selectedProjectId) ?? null,
    [selectedProjectId]
  )

  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: containerRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1, // 數字越大，捲動跟隨的延遲感越明顯
        onUpdate: (self) => {
          progress.current = self.progress
          // 進度 i/(N-1) 時相機正好停在第 i 站，所以用四捨五入讓文字在相機接近該站時切換
          setActiveStop(Math.round(self.progress * (STOPS.length - 1)))
          setArrived(self.progress > ARRIVAL_AT)
        },
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    // 容器高度 = 停靠站數量 × 100vh，這個高度決定了整段捲動的「長度」
    <div ref={containerRef} style={{ height: `${STOPS.length * 100}vh`, position: 'relative' }}>
      {/* cursor: grab 提示使用者可以按住拖曳來環繞島嶼 */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%', background: '#0d1117', cursor: 'grab' }}>
        <Canvas shadows camera={{ fov: 50 }}>
          <Scene
            curve={curve}
            progress={progress}
            stops={STOPS}
            stopFractions={stopFractions}
            onSelectProject={onSelectProject}
            labelRef={labelRef}
          />
        </Canvas>

        {/* 滑過島上標記時顯示專案名稱，位置每一幀由標記自己算好直接寫進這個節點的 style，不走 React state */}
        <div ref={labelRef} style={hoverLabelStyle} />

        <ContactBar />

        {/* 旅程文字和抵達卡交接：捲到終點時前者淡出、後者淡入 */}
        <ArrivalCard visible={arrived} />

        <div style={{ ...overlayStyle, opacity: arrived ? 0 : 1 }}>
          <p style={labelStyle}>{STOPS[activeStop].label}</p>
          <h2 style={titleStyle}>{STOPS[activeStop].title}</h2>
          <p style={stopPeriodStyle}>{STOPS[activeStop].period}</p>
          <p style={descStyle}>{STOPS[activeStop].desc}</p>
          <p style={{ ...hintStyle, opacity: hintVisible ? 1 : 0 }}>
            <span className="hint-dot" aria-hidden="true" />
            島上發光的標記可以點擊查看專案，按住拖曳可以環繞島嶼
          </p>
        </div>

        <ProjectCard project={selectedProject} onClose={() => setSelectedProjectId(null)} />
      </div>
    </div>
  )
}

// 懸浮在標記正上方的專案名稱：初始透明、不接收滑鼠事件（避免擋到底下的 3D 標記），
// 顯示/隱藏與位置都由 ProjectPin 等元件在 useFrame 裡直接改 style，這裡只定義外觀
const hoverLabelStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  padding: '4px 10px',
  borderRadius: '6px',
  background: 'rgba(13, 17, 23, 0.85)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#fff',
  fontSize: '0.8rem',
  fontFamily: 'system-ui, sans-serif',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  opacity: 0,
  transition: 'opacity 0.15s ease',
  zIndex: 5,
}

// 捲動進度超過這個比例就算抵達終點。最後一站的停靠區大約從 0.925 開始，
// 取 0.94 是為了確保相機已經停妥、正在環繞最後一座島時卡片才出現
const ARRIVAL_AT = 0.94

const overlayStyle = {
  position: 'absolute',
  bottom: '10%',
  left: '8%',
  maxWidth: '440px',
  color: '#fff',
  pointerEvents: 'none',
  fontFamily: 'system-ui, sans-serif',
  transition: 'opacity 0.5s ease',
}

const labelStyle = { fontSize: '0.85rem', opacity: 0.5, marginBottom: '0.25rem', letterSpacing: '0.05em' }
// 明確指定 color，避免被 index.css 的 h2 全域顏色（淺色模式下是近黑色）蓋掉
const titleStyle = { fontSize: '1.75rem', margin: '0 0 0.3rem 0', fontWeight: 600, color: '#fff' }
// 時間區間用等寬字，跟專案卡片上的 period 同一種視覺語言
const stopPeriodStyle = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.8rem',
  letterSpacing: '0.04em',
  color: 'rgba(255, 255, 255, 0.55)',
  margin: '0 0 0.75rem 0',
}
const descStyle = { fontSize: '0.95rem', opacity: 0.75, lineHeight: 1.6, margin: 0 }
// 操作提示：字小、偏灰，前面帶一顆會呼吸的青色小點（動畫定義在 index.css 的 .hint-dot）
const hintStyle = {
  fontSize: '0.8rem',
  color: 'rgba(255, 255, 255, 0.55)',
  marginTop: '1rem',
  display: 'flex',
  alignItems: 'center',
  transition: 'opacity 0.6s ease',
}
