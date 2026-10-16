// 3D 標記和 Canvas 外的 DOM 提示（名稱標籤、新手引導泡泡）共用的定位工具

// 把世界座標換算成 Canvas 上的像素座標（會改到傳進來的向量）；z > 1 代表這個點在相機背後
export function toScreen(vector, camera, size) {
  vector.project(camera)
  return {
    x: (vector.x * 0.5 + 0.5) * size.width,
    y: (1 - (vector.y * 0.5 + 0.5)) * size.height,
    behind: vector.z > 1,
  }
}

// 把 DOM 節點擺到螢幕座標 (x, y) 的正上方，gap 是和標記之間的距離；
// 點在相機背後時（例如從按鈕亮起、但還沒飛到的浮標）投影出來的位置是錯的，直接藏起來
export function placeAbove(el, { x, y, behind }, gap) {
  el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y - gap}px)`
  el.style.visibility = behind ? 'hidden' : 'visible'
}
