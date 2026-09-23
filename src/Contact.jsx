import { useLayoutEffect, useRef, useState } from 'react'

// 聯絡方式只放 Email 和 GitHub：這是公開網頁，電話和地址放上來只會被爬蟲抓去發垃圾訊息，
// 真的需要的人自然會先寫信
const CONTACT = {
  email: 'stitch2007319@gmail.com',
  github: 'https://github.com/Swimming0319',
}

// 技能分三級，依「能不能馬上上手」而不是「學過沒有」來分。
// 標了 fromWork 的是從專案卡片回推出來的（履歷的專長欄沒列，但實際做過），
// 不想放的話直接從陣列刪掉即可
const SKILLS = [
  {
    tier: '主力',
    note: '日常開發的主要工具',
    items: [
      'HTML5 / CSS',
      'RWD',
      'JavaScript',
      'TypeScript',
      'Vue 2 / Vue 3',
      'Nuxt 3',
      'Pinia',
      'Tailwind CSS',
      'UnoCSS',
      'Git / GitHub / GitLab',
    ],
  },
  {
    tier: '熟悉',
    note: '做過完整專案',
    items: ['Element Plus', 'Quasar', '無障礙設計', 'i18n 多語系', 'Vite', 'Figma'],
  },
  {
    tier: '接觸過',
    note: '用過，還在累積',
    items: ['React / Next.js', 'Three.js', 'Shadcn UI', 'MySQL'],
  },
]

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
      <path d="M3.2 6.6 12 12.6l8.8-6" strokeLinecap="round" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.1-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  )
}

// 常駐在畫面右上角的聯絡入口。不是每個人都會捲到旅程終點，
// 而錯過聯絡方式的代價太高，所以低調但一直都在
export function ContactBar() {
  return (
    <div style={barStyle}>
      <a href={`mailto:${CONTACT.email}`} style={barLinkStyle} aria-label="寄信給我">
        <MailIcon />
      </a>
      <a href={CONTACT.github} target="_blank" rel="noreferrer" style={barLinkStyle} aria-label="GitHub">
        <GithubIcon />
      </a>
    </div>
  )
}

// 旅程終點的抵達卡：沿用專案票根的紙質語彙，但換成直式、蓋上抵達章，
// 內容是「我是誰 → 接下來想往哪走 → 怎麼找到我」
function LabelledRow({ label, children }) {
  return (
    <p style={rowStyle}>
      <span style={rowLabelStyle}>{label}</span>
      {children}
    </p>
  )
}

export function ArrivalCard({ visible }) {
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  // 卡片有正反兩面：正面是自我介紹，背面是技能清單
  const [showSkills, setShowSkills] = useState(false)

  // 和專案卡片同樣的保險：視窗不夠高時整張等比縮小，而不是讓內容被切掉
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return

    const fit = () => {
      const ratio = Math.min((window.innerHeight - 48) / el.offsetHeight, 1)
      setScale(Math.max(0.65, ratio))
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(el)
    window.addEventListener('resize', fit)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])

  return (
    <div
      ref={wrapRef}
      style={{
        ...arrivalWrapStyle,
        opacity: visible ? 1 : 0,
        transform: `translateY(-50%) scale(${scale})`,
      }}
    >
      <article style={arrivalCardStyle}>
        <p style={eyebrowStyle}>Arrival · 旅程終點</p>
        <p style={stampStyle}>已抵達</p>

        <h2 style={nameStyle}>孫宜敏 Swimming Sun</h2>

        {showSkills ? (
          SKILLS.map((group) => (
            <div key={group.tier} style={sectionStyle}>
              <h3 style={sectionHeadingStyle}>
                {group.tier}
                <span style={tierNoteStyle}>{group.note}</span>
              </h3>
              <div style={chipRowStyle}>
                {group.items.map((item) => (
                  <span key={item} style={group.tier === '主力' ? chipStrongStyle : chipStyle}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            {/* 年資是寫死的，每年記得更新一次（2023/6 轉入前端） */}
            <p style={introStyle}>
              擁有三年前端開發經驗的工程師，主要技術棧為 Vue 3 / Nuxt 3 / Tailwind CSS / TypeScript，
              並具備 React / Next.js 的部分開發能力，也將 AI 工具整合進日常開發流程。
              擅長將設計稿轉化為高品質的前端介面，並在團隊協作中承擔跨部門溝通的完整交付。
            </p>

            <div style={sectionStyle}>
              <h3 style={sectionHeadingStyle}>人格特質</h3>
              <LabelledRow label="協調性">能融入團體生活 / 在團隊中能發揮所長</LabelledRow>
              <LabelledRow label="創造性">有獨立思考能力 / 旺盛的好奇心 / 想像力豐富</LabelledRow>
            </div>

            <div style={sectionStyle}>
              <h3 style={sectionHeadingStyle}>接下來想往哪走</h3>
              <LabelledRow label="短期">
                在前端架構與效能優化上持續深化 —— SSR 渲染策略、元件設計系統的建立，以及 CI/CD 流程的參與。
              </LabelledRow>
              <LabelledRow label="長期">
                鞏固前端深度的同時擴展後端架構與資料庫的理解，具備更完整的全端視野。
              </LabelledRow>
            </div>
          </>
        )}

        {/* 整張卡片不吃滑鼠事件，只有這一列的按鈕例外，拖曳環繞島嶼時才不會被卡片擋住 */}
        <div style={{ ...actionRowStyle, pointerEvents: visible ? 'auto' : 'none' }}>
          <a href={`mailto:${CONTACT.email}`} style={primaryActionStyle}>
            <MailIcon />
            {CONTACT.email}
          </a>
          <a href={CONTACT.github} target="_blank" rel="noreferrer" style={secondaryActionStyle}>
            <GithubIcon />
            GitHub
          </a>
          <button type="button" style={flipActionStyle} onClick={() => setShowSkills((v) => !v)}>
            {showSkills ? '← 回到簡介' : '技能清單 →'}
          </button>
        </div>
      </article>
    </div>
  )
}

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'
const INK = '#2b2621'
const INK_DIM = 'rgba(43, 38, 33, 0.62)'
const INK_FAINT = 'rgba(43, 38, 33, 0.45)'
const STAMP = '#b8442e'

const barStyle = {
  position: 'absolute',
  top: '24px',
  right: '28px',
  zIndex: 10,
  display: 'flex',
  gap: '14px',
}

const barLinkStyle = {
  display: 'grid',
  placeItems: 'center',
  width: '34px',
  height: '34px',
  borderRadius: '50%',
  color: 'rgba(255, 255, 255, 0.55)',
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  transition: 'color 0.2s ease, background 0.2s ease',
}

// 靠左停在旅程文字原本的位置，而不是畫面正中央：
// 最後一站還有專案標記和彩蛋星星要點，卡片擺中間會把它們整個蓋住。
// pointerEvents: none 讓拖曳環繞的操作可以直接穿過卡片
const arrivalWrapStyle = {
  position: 'absolute',
  top: '50%',
  left: '8%',
  // 縮小時往左邊收，維持靠左停靠的位置
  transformOrigin: 'left center',
  width: '84%',
  maxWidth: '440px',
  zIndex: 15,
  pointerEvents: 'none',
  transition: 'opacity 0.7s ease',
  filter: 'drop-shadow(0 22px 40px rgba(0, 0, 0, 0.55))',
}

const arrivalCardStyle = {
  position: 'relative',
  transform: 'rotate(1.2deg)',
  padding: '30px 30px 28px',
  borderRadius: '5px',
  background: 'linear-gradient(160deg, #f4ecdd 0%, #efe5d3 55%, #e8dcc7 100%)',
  color: INK,
  fontFamily: 'system-ui, sans-serif',
}

const eyebrowStyle = {
  fontFamily: MONO,
  fontSize: '0.6rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: INK_FAINT,
  margin: '0 0 12px',
}

const stampStyle = {
  position: 'absolute',
  top: '24px',
  right: '26px',
  transform: 'rotate(-8deg)',
  border: `2px solid rgba(184, 68, 46, 0.6)`,
  borderRadius: '4px',
  padding: '3px 10px',
  fontFamily: MONO,
  fontSize: '0.8rem',
  letterSpacing: '0.16em',
  color: STAMP,
  margin: 0,
}

const nameStyle = { fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px', color: INK }
const introStyle = { fontSize: '0.92rem', lineHeight: 1.7, color: 'rgba(43, 38, 33, 0.82)', margin: 0 }

const sectionStyle = {
  marginTop: '16px',
  paddingTop: '14px',
  borderTop: `1px dashed ${INK_FAINT}`,
}
const sectionHeadingStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '8px',
  fontSize: '0.82rem',
  fontWeight: 600,
  color: INK,
  margin: '0 0 8px',
}

// 分級說明用小字接在標題後面：標題本身要夠醒目，但「主力／熟悉」這種詞需要一句話界定
const tierNoteStyle = { fontSize: '0.68rem', fontWeight: 400, color: INK_FAINT }

const chipRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '6px' }

const chipBase = {
  fontSize: '0.74rem',
  padding: '3px 9px',
  borderRadius: '999px',
  border: `1px solid ${INK_FAINT}`,
  color: 'rgba(43, 38, 33, 0.78)',
}

// 主力技能用實心底色拉開層次，掃過去第一眼看到的就是這一組
const chipStrongStyle = {
  ...chipBase,
  background: 'rgba(43, 38, 33, 0.82)',
  borderColor: 'transparent',
  color: '#f4ecdd',
}

const chipStyle = chipBase

// 標籤和內文並排，換行時內文會對齊在自己那一欄（懸掛縮排）
const rowStyle = {
  display: 'flex',
  gap: '10px',
  fontSize: '0.85rem',
  lineHeight: 1.6,
  color: 'rgba(43, 38, 33, 0.8)',
  margin: '0 0 6px',
}
const rowLabelStyle = {
  flex: 'none',
  fontFamily: MONO,
  fontSize: '0.72rem',
  letterSpacing: '0.06em',
  color: INK_DIM,
  paddingTop: '2px',
}

const actionRowStyle = { display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }

const actionBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 14px',
  borderRadius: '4px',
  fontFamily: MONO,
  fontSize: '0.78rem',
  textDecoration: 'none',
}

const primaryActionStyle = {
  ...actionBase,
  background: 'rgba(184, 68, 46, 0.12)',
  border: `1px solid rgba(184, 68, 46, 0.55)`,
  color: STAMP,
}

const secondaryActionStyle = {
  ...actionBase,
  border: `1px solid ${INK_FAINT}`,
  color: INK_DIM,
}

// 翻面鈕：和聯絡按鈕同一排但不搶戲，做成純文字的樣子
const flipActionStyle = {
  ...actionBase,
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  color: INK_DIM,
  cursor: 'pointer',
  padding: '8px 4px',
}
