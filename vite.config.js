import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages 會把網站放在 /career-journey/ 這個子路徑底下，
  // 不設 base 的話 JS 和圖片會全部抓錯路徑，畫面一片空白且沒有明顯錯誤。
  // 只在 build 時套用，本機 npm run dev 仍然是根路徑
  base: command === 'build' ? '/career-journey/' : '/',
  plugins: [react()],
}))
