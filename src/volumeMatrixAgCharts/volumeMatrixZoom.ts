export type MatrixViewport = {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
}

export function createFullViewport(
  colCount: number,
  rowCount: number,
): MatrixViewport {
  return {
    xMin: -0.5,
    xMax: colCount - 0.5,
    yMin: -0.5,
    yMax: rowCount - 0.5,
  }
}

function zoomAxisRangeAtAnchor(
  min: number,
  max: number,
  fullMin: number,
  fullMax: number,
  anchor: number,
  deltaY: number,
  step = 0.12,
): { min: number; max: number } {
  const zoomIn = deltaY < 0
  const width = max - min
  const fullWidth = fullMax - fullMin
  const factor = zoomIn ? 1 - step : 1 + step
  const minWidth = fullWidth * 0.08
  const newWidth = Math.min(fullWidth, Math.max(minWidth, width * factor))
  const center = min + width * anchor
  let nextMin = center - newWidth * anchor
  let nextMax = nextMin + newWidth

  if (nextMin < fullMin) {
    nextMax += fullMin - nextMin
    nextMin = fullMin
  }
  if (nextMax > fullMax) {
    nextMin -= nextMax - fullMax
    nextMax = fullMax
  }

  return {
    min: Math.max(fullMin, nextMin),
    max: Math.min(fullMax, nextMax),
  }
}

function isZoomModifierPressed(event: WheelEvent): boolean {
  return event.ctrlKey || event.metaKey
}

const ZOOM_EPSILON = 0.001

export function isViewportZoomed(
  viewport: MatrixViewport,
  full: MatrixViewport,
): boolean {
  const xZoomed =
    full.xMax - full.xMin - (viewport.xMax - viewport.xMin) > ZOOM_EPSILON
  const yZoomed =
    full.yMax - full.yMin - (viewport.yMax - viewport.yMin) > ZOOM_EPSILON
  return xZoomed || yZoomed
}

function clampViewport(
  viewport: MatrixViewport,
  full: MatrixViewport,
): MatrixViewport {
  const xWidth = viewport.xMax - viewport.xMin
  const yWidth = viewport.yMax - viewport.yMin
  let { xMin, xMax, yMin, yMax } = viewport

  if (xMin < full.xMin) {
    xMin = full.xMin
    xMax = xMin + xWidth
  }
  if (xMax > full.xMax) {
    xMax = full.xMax
    xMin = xMax - xWidth
  }
  if (yMin < full.yMin) {
    yMin = full.yMin
    yMax = yMin + yWidth
  }
  if (yMax > full.yMax) {
    yMax = full.yMax
    yMin = yMax - yWidth
  }

  return { xMin, xMax, yMin, yMax }
}

/** 左ドラッグで表示範囲を平行移動（ピクセル差分 → 軸差分） */
export function panViewportByPixels(
  viewport: MatrixViewport,
  full: MatrixViewport,
  rect: DOMRect,
  deltaX: number,
  deltaY: number,
): MatrixViewport {
  if (rect.width === 0 || rect.height === 0) return viewport

  const xSpan = viewport.xMax - viewport.xMin
  const ySpan = viewport.yMax - viewport.yMin
  const axisDeltaX = -(deltaX / rect.width) * xSpan
  const axisDeltaY = -(deltaY / rect.height) * ySpan

  return clampViewport(
    {
      xMin: viewport.xMin + axisDeltaX,
      xMax: viewport.xMax + axisDeltaX,
      yMin: viewport.yMin + axisDeltaY,
      yMax: viewport.yMax + axisDeltaY,
    },
    full,
  )
}

/** Ctrl（Mac は Cmd）+ ホイールで表示範囲を拡大／縮小 */
export function applyCtrlWheelZoom(
  viewport: MatrixViewport,
  full: MatrixViewport,
  host: HTMLElement,
  event: WheelEvent,
): MatrixViewport | null {
  if (!isZoomModifierPressed(event)) return null

  event.preventDefault()
  event.stopPropagation()

  const rect = host.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null

  const anchorX = (event.clientX - rect.left) / rect.width
  const anchorY = (event.clientY - rect.top) / rect.height

  const x = zoomAxisRangeAtAnchor(
    viewport.xMin,
    viewport.xMax,
    full.xMin,
    full.xMax,
    anchorX,
    event.deltaY,
  )
  const y = zoomAxisRangeAtAnchor(
    viewport.yMin,
    viewport.yMax,
    full.yMin,
    full.yMax,
    anchorY,
    event.deltaY,
  )

  return {
    xMin: x.min,
    xMax: x.max,
    yMin: y.min,
    yMax: y.max,
  }
}
