import { useLayoutEffect, useRef, useState } from 'react'

// 傾斜幅度上限（度），以及回正時的過場時間
// 卡片可能長到需要捲動，角度太大時上下兩端的位移會很誇張，所以壓得比一般 tilt card 小
const MAX_TILT = 6
const SETTLE_TRANSITION = 'transform 0.4s ease'

// 票根那一欄的寬度，撕線和撕口的位置都是從這個值算出來的
const STUB_WIDTH = 62

const pad = (n) => String(n).padStart(2, '0')

// 票根上的站號：貼在島上的用該站編號；浮在兩站之間的標成「轉乘」；
// 沒掛在任何一站的 side project 標成額外航班
function boardingInfo(attach) {
  if (attach.kind === 'path') {
    const code = `${pad(attach.afterIndex + 1)}/${pad(attach.afterIndex + 2)}`
    return { code, caption: `Boarding Pass · Transit ${code}` }
  }
  if (attach.kind === 'orbit') {
    return { code: 'EX', caption: 'Boarding Pass · Extra Flight' }
  }
  const code = pad(attach.islandIndex + 1)
  return { code, caption: `Boarding Pass · Stop ${code}` }
}

// 點擊島上告示牌／浮標後彈出的專案詳情卡片，做成登機證票根的樣子：
// 左邊是主要資訊，右邊是一條可以「撕下」的存根，中間用虛線和兩個撕口分開。
// 滑鼠移到卡片上會跟著游標傾斜；點背景或右上角 × 都可以關閉
export default function ProjectCard({ project, onClose }) {
  const cardRef = useRef(null)
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)

  // 內容多的卡片在矮一點的視窗裡可能裝不下。與其讓頁面出現捲軸，
  // 不如整張等比縮小到剛好放得進畫面（offsetHeight 不受 transform 影響，所以量到的一定是原始尺寸）
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const fit = () => {
      const ratio = Math.min(
        (window.innerHeight - FIT_MARGIN) / el.offsetHeight,
        (window.innerWidth - FIT_MARGIN) / el.offsetWidth,
        1
      )
      setScale(Math.max(MIN_SCALE, ratio))
    }

    fit()
    // 只在掛載當下量一次不夠：分欄排版、字型載入都可能讓高度之後才定案。
    // ResizeObserver 回報的是 border box，不受 transform 影響，所以不會和縮放互相觸發
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    window.addEventListener('resize', fit)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [project])

  if (!project) return null

  const { code, caption } = boardingInfo(project.attach)

  // 有補充段落的專案內容量差很多，要用寬版才撐得出「橫的票根」比例；
  // 只有一段簡述的專案維持窄版，不然會變成一張又寬又空的票
  const sectionCount = project.sections?.length ?? 0

  // 分欄要在哪一層做，取決於內容集中在哪裡：
  // 內容集中在少數幾段、或某一段有很長的清單 → 段落整排展開，由段落內的項目自己分欄
  // 內容平均分散在多個段落 → 改成段落之間分欄，每個段落維持完整不被切斷
  const longestList = Math.max(0, ...(project.sections?.map((s) => s.items?.length ?? 0) ?? []))
  const stackSections = sectionCount > 0 && (sectionCount <= 2 || longestList >= 6)

  // 直接改 DOM 的 transform，不透過 React state，滑鼠移動時才不會整張卡片重新渲染
  const handleMouseMove = (e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    card.style.transition = 'transform 0.05s linear'
    card.style.transform = `perspective(900px) rotateX(${(-py * MAX_TILT).toFixed(2)}deg) rotateY(${(px * MAX_TILT).toFixed(2)}deg) scale(1.015)`
  }

  const handleMouseLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transition = SETTLE_TRANSITION
    card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)'
  }

  return (
    <div style={backdropStyle} onClick={onClose}>
      {/* 外層固定歪一點點，像一張隨手放下的票；傾斜互動套在內層，兩個 transform 才不會互相蓋掉 */}
      {/* 卡片寬度跟著內容量走：票根要維持橫的比例，內容越多就需要越寬的版面來攤平高度 */}
      <div
        ref={wrapRef}
        style={{
          ...tiltWrapStyle,
          maxWidth: CARD_WIDTHS[Math.min(sectionCount, 3)],
          transform: `translate(-50%, -50%) rotate(-1.4deg) scale(${scale})`,
        }}
      >
        <article
          ref={cardRef}
          style={cardStyle}
          onClick={(e) => e.stopPropagation()}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* 關閉鈕放在卡片上而不是會捲動的左欄裡，內容捲動時才不會跟著跑掉 */}
          <button style={closeStyle} onClick={onClose} aria-label="關閉">×</button>

          <div style={mainStyle}>
            <p style={boardingStyle}>{caption}</p>
            {project.badge && <p style={stampStyle}>{project.badge}</p>}
            <h3 style={titleStyle}>{project.title}</h3>
            <p style={metaStyle}>
              <span>{project.period}</span>
              {project.team && <span style={teamStyle}>· {project.team}</span>}
            </p>
            <div style={tagRowStyle}>
              {project.tags.map((tag) => (
                <span key={tag} style={tagStyle}>{tag}</span>
              ))}
            </div>
            {project.description && <p style={descStyle}>{project.description}</p>}

            {sectionCount > 0 && (
              <div style={stackSections ? sectionStackStyle : sectionColumnsStyle}>
                {project.sections.map((section) => (
                  <section key={section.heading} style={sectionStyle}>
                    <h4 style={sectionHeadingStyle}>{section.heading}</h4>
                    {section.body && <p style={sectionBodyStyle}>{section.body}</p>}
                    {section.items && (
                      <ul style={stackSections ? itemColumnsStyle : itemListStyle}>
                        {section.items.map((item) => (
                          <li key={item} style={itemStyle}>
                            <span style={bulletStyle} aria-hidden="true">—</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>
            )}

            {project.link && (
              <a href={project.link} target="_blank" rel="noreferrer" style={linkStyle}>
                前往查看 →
              </a>
            )}
          </div>

          <div style={stubStyle}>
            <span style={stubMarkStyle}>✦</span>
            <span style={stubNoStyle}>{code}</span>
          </div>
        </article>
      </div>
    </div>
  )
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const INK = '#2b2621'
const INK_DIM = 'rgba(43, 38, 33, 0.62)'
const INK_FAINT = 'rgba(43, 38, 33, 0.45)'

// 縮放時要留給畫面邊緣的空間，以及縮小的下限（再小就看不清楚了，寧可讓它稍微超出）
const FIT_MARGIN = 32
const MIN_SCALE = 0.6

// 卡片高度由內容決定，不設上限、不內部捲動，裝不下時由上面的 fit 邏輯整張縮小
const backdropStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(13, 17, 23, 0.55)',
  overflow: 'hidden',
  zIndex: 20,
}

// 用絕對定位 + translate(-50%, -50%) 置中，而不是 flex / grid 的 center：
// 格線列的高度會被內容撐大，卡片比畫面高時「在列裡置中」等於沒有位移，
// 結果會變成貼齊頂端往下溢出。translate 是相對元素自身尺寸，任何高度都能正確置中
const tiltWrapStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transformOrigin: 'center',
  width: '90%',
  // 陰影放在外層用 filter：卡片本身被 mask 挖了撕口，drop-shadow 才會跟著挖空的形狀走
  filter: 'drop-shadow(0 20px 34px rgba(0, 0, 0, 0.55))',
}

// 兩個圓形撕口：用 mask 真的把卡片挖穿，而不是蓋一個底色相同的圓點
// （卡片後面是會動的 3D 場景，蓋圓點在亮一點的島嶼前面就會露餡）
// 舊瀏覽器不支援 mask-composite 時會退化成「沒有撕口」，卡片本身仍然正常
const NOTCH_MASK = [
  `radial-gradient(circle 9px at calc(100% - ${STUB_WIDTH}px) 0%, transparent 98%, #000 100%)`,
  `radial-gradient(circle 9px at calc(100% - ${STUB_WIDTH}px) 100%, transparent 98%, #000 100%)`,
].join(', ')

const cardStyle = {
  position: 'relative',
  display: 'grid',
  gridTemplateColumns: `1fr ${STUB_WIDTH}px`,
  background: 'linear-gradient(160deg, #f4ecdd 0%, #efe5d3 55%, #e8dcc7 100%)',
  color: INK,
  borderRadius: '5px',
  fontFamily: 'system-ui, sans-serif',
  maskImage: NOTCH_MASK,
  WebkitMaskImage: NOTCH_MASK,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
  willChange: 'transform',
}

const mainStyle = { position: 'relative', padding: '26px 22px 24px' }

const stubStyle = {
  position: 'relative',
  borderLeft: `2px dashed ${INK_FAINT}`,
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: '10px',
  padding: '16px 0',
}

const stubMarkStyle = { fontSize: '1.05rem', color: INK_DIM }
const stubNoStyle = {
  fontFamily: MONO,
  fontWeight: 600,
  fontSize: '1.1rem',
  writingMode: 'vertical-rl',
  letterSpacing: '0.2em',
  color: INK,
}

const closeStyle = {
  position: 'absolute',
  zIndex: 1,
  top: '16px',
  // 靠左避開存根那一欄，才不會壓在撕線上
  right: `${STUB_WIDTH + 14}px`,
  background: 'none',
  border: 'none',
  color: INK_FAINT,
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
  padding: 0,
}

const boardingStyle = {
  fontFamily: MONO,
  fontSize: '0.6rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: INK_FAINT,
  margin: '0 0 10px',
}

// 彩蛋的標記做成蓋在票上的印章
const stampStyle = {
  display: 'inline-block',
  transform: 'rotate(-4deg)',
  border: '1.5px solid rgba(184, 68, 46, 0.7)',
  borderRadius: '3px',
  padding: '2px 8px',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  color: '#b8442e',
  margin: '0 0 10px',
}

const titleStyle = { fontSize: '1.32rem', fontWeight: 600, margin: '0 0 4px', color: INK }

const metaStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  fontFamily: MONO,
  fontSize: '0.75rem',
  color: INK_DIM,
  margin: '0 0 14px',
}
const teamStyle = { color: INK_FAINT }

// 補充段落用多欄排版：欄寬固定、欄數由容器寬度決定，
// 寬版卡片會自動排成兩欄（高度減半、票根維持橫的比例），窄螢幕則自動收成一欄。
// 用 CSS multi-column 而不是 grid，是因為它會自動把長短不一的段落平均分配到各欄，
// 不會像 grid 那樣在短段落下面留一塊空白
// 卡片寬度上限，索引 = 段落數（3 以上都算同一級）。
// 內容越多需要越寬，文字才不會折太多行把卡片撐高
const CARD_WIDTHS = ['470px', '900px', '900px', '1200px']

const sectionColumnsStyle = {
  marginTop: '16px',
  columnWidth: '380px',
  columnGap: '28px',
}

// 有條列項目時，段落改成整排展開（分欄的工作交給段落內的項目清單）
const sectionStackStyle = { marginTop: '16px' }

// 每個補充段落之間用虛線分隔，跟票根中間的撕線是同一種「印刷表單」的語彙
const sectionStyle = {
  breakInside: 'avoid',
  WebkitColumnBreakInside: 'avoid',
  paddingTop: '13px',
  marginBottom: '14px',
  borderTop: '1px dashed rgba(43, 38, 33, 0.22)',
}
const sectionHeadingStyle = { fontSize: '0.82rem', fontWeight: 600, color: INK, margin: '0 0 5px' }
const sectionBodyStyle = { fontSize: '0.88rem', lineHeight: 1.65, color: 'rgba(43, 38, 33, 0.8)', margin: 0 }

// 條列項目：破折號和文字並排成 flex，長句換行時會自動對齊在文字那一欄（懸掛縮排）
const itemListStyle = { listStyle: 'none', margin: 0, padding: 0 }
// 項目多的時候自己排成多欄，欄數由卡片寬度決定，清單再長也不會把卡片撐成直的
const itemColumnsStyle = { ...itemListStyle, columnWidth: '300px', columnGap: '26px' }
const itemStyle = {
  display: 'flex',
  gap: '8px',
  marginBottom: '6px',
  fontSize: '0.88rem',
  lineHeight: 1.6,
  color: 'rgba(43, 38, 33, 0.8)',
  breakInside: 'avoid',
  WebkitColumnBreakInside: 'avoid',
}
const bulletStyle = { flex: 'none', color: INK_FAINT }
const tagRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }
const tagStyle = {
  fontSize: '0.74rem',
  padding: '2px 9px',
  borderRadius: '999px',
  border: `1px solid ${INK_FAINT}`,
  color: 'rgba(43, 38, 33, 0.78)',
}
const descStyle = { fontSize: '0.92rem', lineHeight: 1.65, color: 'rgba(43, 38, 33, 0.82)', margin: 0 }
const linkStyle = {
  display: 'inline-block',
  marginTop: '18px',
  padding: '5px 12px',
  border: '1px solid rgba(184, 68, 46, 0.55)',
  borderRadius: '3px',
  fontFamily: MONO,
  fontSize: '0.76rem',
  letterSpacing: '0.04em',
  color: '#b8442e',
  textDecoration: 'none',
}
