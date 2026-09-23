// 專案作品的資料。除了 title / period / tags / description 之外，內容比較多的專案可以再補：
// - team      團隊規模，會接在時間區間後面
// - sections  結構化的補充段落 [{ heading, body?, items? }]，卡片上每段之間會用虛線分隔
//             body 是一段文字，items 是條列項目，同一段可以只給其中一種
// - link      作品網址
//
// attach 決定這個標記要出現在場景的哪裡：
// - { islandIndex, dir }        貼在某座島的表面上（dir 是島的 local 方向向量，會自動投影到地形）
// - { kind: 'path', afterIndex } 浮在 afterIndex 站和下一站之間的路上（適合「剛好卡在兩份工作空檔」的專案）
// - { kind: 'orbit', islandIndex, offset } 飄在某座島旁邊、不隨島嶼旋轉（適合想額外做出驚喜感的 side project）
export const PROJECTS = [
  {
    id: 'taiwan-arts-univ',
    // 放在島的 +z / -x 側：這一側沒有樹叢，和屏東復康的告示牌、辦公樓都隔得開
    attach: { islandIndex: 2, dir: [-0.45, 0.45, 0.77] },
    title: '臺藝大校首頁',
    period: '2024/12 ～ 2025/7',
    team: '5 人前端團隊',
    tags: ['Nuxt3', 'TypeScript', 'UnoCSS', 'Nuxt-Swiper', 'SweetAlert2', 'Dayjs', 'panzoom（圖片縮放）'],
    description: '臺灣藝術大學官方網站改版，需符合無障礙設計規範並同時支援多語系。',
    sections: [
      {
        heading: '前台負責項目',
        items: [
          '共用元件：Pagination、卡片（輪播）、卡片（無輪播）、下拉選單',
          '認識臺藝 / 導覽與交通 / 停車資訊 / 教學單位 / 行政單位頁面切版',
          'Nuxt-Swiper：使用 Thumbs gallery loop 呈現類似 LINE 的圖片預覽功能',
          '部分頁面 API 串接及 i18n 介接',
          '無障礙設計',
          '網站上線後維護',
        ],
      },
      {
        heading: '後台負責項目',
        items: ['藝聞報導影片 API 串接', '公開資訊 API 串接', '網站上線後維護'],
      },
    ],
    link: 'https://www.ntua.edu.tw/',
  },
  {
    id: 'pingtung-accessible-bus',
    attach: { islandIndex: 2, dir: [-0.75, 0.45, -0.2] },
    title: '屏東縣復康系統',
    period: '2024/11 ～ 2025/5',
    team: '5 人前端團隊',
    tags: ['Nuxt3', 'TypeScript', 'UnoCSS', 'Element Plus', 'SweetAlert2'],
    description: '政府標案且為無障礙網站設計，主要提供復康預約系統服務。',
    sections: [
      {
        heading: '後台系統',
        body: '使用 OpenAuth.Net 框架快速開發，頁面包含菜單管理、角色管理、個案資料、預約訂單、派車調度、團體訂車、醫療院所資料管理、司機車輛管理、報表管理等。',
      },
      {
        heading: '前台負責項目',
        body: '會員專區頁面切版、API 串接，以及網站上線後維護。',
      },
      {
        heading: '後台負責項目',
        body: '個案資料、預約訂單、派車調度、報表管理，以及上線後維護。',
      },
    ],
    link: 'https://ptrehab.mass.org.tw/',
  },
  {
    id: 'ssc-ski',
    attach: { kind: 'path', afterIndex: 2 },
    title: 'SSC 臨冬滑雪俱樂部',
    period: '2025/7 ～ 2025/9（外包）',
    team: '2 人前端團隊',
    tags: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Shadcn UI'],
    description:
      '為台灣滑雪教練與學員打造課程預訂與媒合平台，支援訂單管理、課程搜尋、教練入駐與線上金流功能。',
    sections: [
      {
        heading: '主要負責項目',
        items: [
          '共用元件：課程卡片、教練＆滑雪組織卡片、購物車列表、課程列表、篩選下拉選單',
          '頁面切版及 API 串接：首頁 / 訂單管理 / 課程管理 / 教學評價 / 購物車 / 滑雪課程 / 活動消息 / 專欄文章 / 搜尋 / 滑雪指南 / 關於我們 / 教練＆組織介紹',
        ],
      },
    ],
    link: 'https://sscclubtw.com/zh-TW',
  },
  {
    id: 'howhow-fund',
    // 島的 +x / -z 側是空地，樹叢集中在另一側
    attach: { islandIndex: 3, dir: [0.65, 0.42, -0.62] },
    title: '好好證券基金交易平台',
    period: '2025/11 ～ 2026/3',
    team: '2 人前端團隊',
    tags: ['Nuxt2', 'Tailwind', 'Highcharts JS'],
    description: '基金交易平台，涵蓋基金掛單買賣、定期定額、帳戶管理等金融功能模組。',
    sections: [
      {
        heading: '主要負責項目',
        items: [
          '前台和後台產品優化及迭代',
          '前台會員中心改版，透過區塊化設計改善使用者體驗，實作包含動態化的會員等級身份區塊，並針對交易權限進行邏輯判定、控制各類型交易帳戶卡片的顯示時機與欄位資訊等',
          '前台基金詳情頁、找基金頁面的框架升級（Nuxt 2 → Nuxt 3）',
          '升級前評估階段，透過反覆測試與調校 AI prompt，找出最符合專案情境的提問策略',
        ],
      },
    ],
    link: 'https://www.fundswap.com.tw/trade/funds',
  },
  {
    id: 'tourism-association',
    // 島的 +x 側沒有樹木和建築，離小屋、辦公樓都遠
    attach: { islandIndex: 4, dir: [0.88, 0.42, -0.2] },
    title: '台灣觀光協會後台',
    period: '2026/8 ～ 仍在進行',
    // 套件多的時候用 tag 比條列省版面很多，用途不明顯的才在括號裡補一句
    tags: [
      'Vue',
      'TypeScript',
      'Quasar',
      'Pinia',
      'Vue Router',
      'axios',
      'xlsx（表單匯出）',
      'dayjs',
      'driver.js（導覽教學）',
      'vue-draggable-plus（拖拉排序）',
      '@vueuse/core',
    ],
    description: '台灣觀光協會的後台管理系統。',
    sections: [
      {
        heading: '系統範圍',
        items: [
          '系統管理：帳號／角色權限',
          '會員管理：旅遊相關公司基本資料',
          '捐贈管理：會員入會即「捐贈」形式的會費、申請審核、繳費',
          '展會活動模組：台灣美食展（TCE）、台灣國際旅展（TITF）、國際推廣活動（ITPE），皆為「活動設定 → 報名表單 → 審核 → 通知信 → 資料匯出」的共用樣板',
          '公告管理',
        ],
      },
      {
        heading: '負責項目',
        body: '台灣國際旅展（TITF）模組主力開發者',
        items: [
          '活動管理：管理列表、活動新增／編輯、活動複製',
          '報名相關：報名名單、報名資料下載、分租攤位設定、線上表單設定／匯出、賣家信件',
          '基本設定子模組：攤位區別、館別、文件類型、付款方式、審核狀態、開立發票類型、線上表單、Rich Editor 互動、郵件樣板',
          '應屆層級設定：展會活動與附件、廣告刊登、承租設備系統、吉祥物遊行、大會舞台、攤位評選自評表、應屆付款方式設定',
        ],
      },
      {
        heading: '其他支援',
        items: ['捐贈模組：捐贈申請審核列表篩選器、捐贈會員管理大表'],
      },
    ],
  },
]

// 沒有掛在任何一站正式經歷裡的 side project，飄在「現在」那座島旁邊，用不同的視覺造型做出驚喜感
export const EASTER_EGG = {
  id: 'remmap',
  attach: { kind: 'orbit', islandIndex: 4, offset: [2.6, 1.3, -1.8] },
  badge: '✨ 隱藏彩蛋',
  title: 'RemMap · 睡眠夢境地圖',
  period: '2026/8 ～ 2026/9（Side Project）',
  tags: ['Nuxt 4', 'Vue 3', 'TypeScript', 'Three.js', 'Tailwind CSS', 'fflate', '@vite-pwa/nuxt'],
  description:
    '純前端工具：上傳 Apple Health 匯出的 export.xml，在瀏覽器本機解析睡眠階段資料，用 Three.js 轉換成資料驅動的抽象 3D「夢境地形」。',
  sections: [
    {
      heading: '隱私設計',
      body: '全程不上傳健康資料到伺服器，是相對於其他睡眠視覺化 App 的差異化賣點。唯一會連到伺服器的功能（模擬夢境場景生圖）也只送出範圍受限的分數，不接受自由文字。',
    },
    {
      heading: '功能項目',
      items: [
        '檔案上傳與解析：選擇 zip 或範例資料，在 Web Worker 內完成解壓縮與串流解析並即時回報進度',
        '多來源與多夜整合：自動選出同一晚的主要資料來源（如 Apple Watch + 第三方 App），並依 12 小時門檻切分夜晚供切換查看',
        '3D 夢境地形：依睡眠階段（REM／淺眠／深眠／清醒）映射地形高度、色彩與粒子密度，交界處平滑混合，並依時間軸從入睡到清醒逐漸展開',
        '效能自適應：依裝置核心數、記憶體與省電模式調整粒子數與網格解析度；閒置一段時間後停止鏡頭搖晃與粒子飄動',
        '模擬夢境場景：依當晚「沉靜度／波動度」查表生成 AI 插畫，包成弧形背景可拖曳環顧',
        'PWA：可加到主畫面，核心的上傳、解析與檢視流程離線可用',
      ],
    },
    {
      heading: '技術取捨',
      items: [
        '解析與視覺化全部在瀏覽器本機完成',
        '沒有引入 Pinia，用 Vue 內建的 ref／composables 就夠',
        '伺服器端只有一支 Nuxt server API，代理生圖並做 rate limit',
        'Playwright 只當 devDependency 用來截圖驗證畫面，單元測試交給 Vitest',
      ],
    },
  ],
  link: 'https://remmap.vercel.app',
}
