/**
 * SVG → PNG 変換と、コピー／ダウンロード。
 *
 * 流れ:
 * 1. SVG DOM を文字列化して画像として読む
 * 2. Canvas に描く
 * 3. PNG Blob を得る
 * 4. クリップボードへ書く、またはファイル保存する
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'))
    img.src = src
  })
}

function buildPngFilename(prefix: string): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${prefix}-${stamp}.png`
}

/** Blob を一時 URL にして <a download> で保存する */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function copyPngToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write) {
    throw new Error(
      'このブラウザではクリップボードへの画像コピーに対応していません。',
    )
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** SVG を Canvas 上の指定位置に描画する */
async function drawSvgOnCanvas(
  ctx: CanvasRenderingContext2D,
  svg: SVGSVGElement,
  containerRect: DOMRect,
): Promise<void> {
  const svgRect = svg.getBoundingClientRect()
  if (svgRect.width === 0 || svgRect.height === 0) return

  // 表示サイズを属性に載せてからシリアライズする
  const clone = svg.cloneNode(true) as SVGSVGElement
  if (!clone.getAttribute('width')) {
    clone.setAttribute('width', String(svgRect.width))
  }
  if (!clone.getAttribute('height')) {
    clone.setAttribute('height', String(svgRect.height))
  }

  const svgString = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  })
  const objectUrl = URL.createObjectURL(svgBlob)

  try {
    const image = await loadImage(objectUrl)
    ctx.drawImage(
      image,
      svgRect.left - containerRect.left,
      svgRect.top - containerRect.top,
      svgRect.width,
      svgRect.height,
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** 表示中 SVG を PNG Blob にする（高 DPI 向けに devicePixelRatio を反映） */
async function renderSvgToPngBlob(svg: SVGSVGElement): Promise<Blob> {
  const rect = svg.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    throw new Error('コピー対象のグラフが表示されていません。')
  }

  const devicePixelRatio = window.devicePixelRatio || 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(rect.width * devicePixelRatio)
  canvas.height = Math.round(rect.height * devicePixelRatio)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas が利用できません。')
  }

  ctx.scale(devicePixelRatio, devicePixelRatio)

  const backgroundColor = getComputedStyle(svg).backgroundColor
  const hasBackground =
    backgroundColor &&
    backgroundColor !== 'transparent' &&
    backgroundColor !== 'rgba(0, 0, 0, 0)'
  if (hasBackground) {
    ctx.fillStyle = backgroundColor
    ctx.fillRect(0, 0, rect.width, rect.height)
  }

  await drawSvgOnCanvas(ctx, svg, rect)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('画像の生成に失敗しました。')),
      'image/png',
    )
  })
}

export async function copyScratchSvgToClipboard(
  svg: SVGSVGElement,
): Promise<void> {
  const pngBlob = await renderSvgToPngBlob(svg)
  await copyPngToClipboard(pngBlob)
}

export async function downloadScratchSvgAsPng(
  svg: SVGSVGElement,
  filenamePrefix = 'chart',
): Promise<void> {
  const pngBlob = await renderSvgToPngBlob(svg)
  downloadBlob(pngBlob, buildPngFilename(filenamePrefix))
}
