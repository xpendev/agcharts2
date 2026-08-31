import { AgCharts } from 'ag-charts-react'
import type { AgChartInstance } from 'ag-charts-community'
import {
  type AgCartesianChartOptions,
  BubbleSeriesModule,
  ContextMenuModule,
  CrossLinesModule,
  LegendModule,
  ModuleRegistry,
  NumberAxisModule,
} from 'ag-charts-enterprise'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createChartContextMenu } from '../agChartsCommon'
import { XlsxExportButton } from '../xlsxExport/XlsxExportButton'
import {
  fetchVolumeMatrix,
  MATRIX_SIZE_DEFAULT,
  MATRIX_SIZE_MAX,
  MATRIX_SIZE_MIN,
  type VolumeMatrixCell,
  type VolumeMatrixSample,
} from './volumeMatrixData'
import './volumeMatrix.css'
import {
  applyCtrlWheelZoom,
  createFullViewport,
  isViewportZoomed,
  panViewportByPixels,
  type MatrixViewport,
} from './volumeMatrixZoom'

ModuleRegistry.registerModules([
  BubbleSeriesModule,
  NumberAxisModule,
  CrossLinesModule,
  LegendModule,
  ContextMenuModule,
])

const SIZE_DOMAIN_MAX = 55

export type VolumeMatrixXlsxCellStyle = 'icon-set' | 'data-bar'

const XLSX_CELL_STYLE_OPTIONS: {
  value: VolumeMatrixXlsxCellStyle
  label: string
}[] = [
  { value: 'icon-set', label: 'アイコンセット' },
  { value: 'data-bar', label: 'データバー' },
]

const TITLE_COLOR = '#222222'
const AXIS_LABEL = '#333333'
const GRID = '#b0b0b0'
const BACKGROUND = '#ffffff'

/** チャート用セル（数値軸インデックス付き） */
type ChartCell = VolumeMatrixCell & {
  xIndex: number
  yIndex: number
}

const CHART_WIDTH = 800
const CHART_HEIGHT = 600
/** タイトル・軸ラベル・padding を除いたプロット領域の推定余白 */
const PLOT_INSET = { left: 95, right: 24, top: 130, bottom: 16 }
/** 最大バブルがマス内に収まる占有率（破線グリッドとの余白） */
const BUBBLE_CELL_FILL_RATIO = 0.88
const BUBBLE_MIN_MAX = 8

function plotAreaSize(): { width: number; height: number } {
  return {
    width: CHART_WIDTH - PLOT_INSET.left - PLOT_INSET.right,
    height: CHART_HEIGHT - PLOT_INSET.top - PLOT_INSET.bottom,
  }
}

function cellPixelSize(viewport: MatrixViewport): { width: number; height: number } {
  const plot = plotAreaSize()
  const visibleCols = viewport.xMax - viewport.xMin
  const visibleRows = viewport.yMax - viewport.yMin
  return {
    width: plot.width / visibleCols,
    height: plot.height / visibleRows,
  }
}

function isCellInViewport(cell: ChartCell, viewport: MatrixViewport): boolean {
  return (
    cell.xIndex >= viewport.xMin &&
    cell.xIndex <= viewport.xMax &&
    cell.yIndex >= viewport.yMin &&
    cell.yIndex <= viewport.yMax
  )
}

function maxVisibleBubbleValue(
  chartCells: ChartCell[],
  viewport: MatrixViewport,
): number {
  return chartCells.reduce((max, cell) => {
    if (cell.hideBubble || !isCellInViewport(cell, viewport)) return max
    return Math.max(max, cell.value)
  }, 0)
}

/** マスのピクセルサイズに基づき、最大バブルがマス内に収まるようサイズを決定 */
function bubbleSizesForViewport(
  viewport: MatrixViewport,
  chartCells: ChartCell[],
): { minSize: number; maxSize: number; sizeDomainMax: number } {
  const { width: cellWidth, height: cellHeight } = cellPixelSize(viewport)
  const cellDiameter =
    Math.min(cellWidth, cellHeight) * BUBBLE_CELL_FILL_RATIO
  const maxValue = maxVisibleBubbleValue(chartCells, viewport)
  const sizeDomainMax = maxValue > 0 ? maxValue : SIZE_DOMAIN_MAX
  const maxSize = Math.round(Math.max(BUBBLE_MIN_MAX, cellDiameter))
  const minSize = Math.max(6, Math.round(maxSize * 0.28))
  return { minSize, maxSize, sizeDomainMax }
}

/** バブル maxSize に比例（マス数が少ないほどラベルも大きく） */
function bubbleLabelFontSize(maxSize: number): number {
  return Math.max(8, Math.min(24, Math.round(maxSize * 0.17)))
}

function toChartCells(
  cells: VolumeMatrixCell[],
  columns: string[],
  rows: string[],
): ChartCell[] {
  const colIndex = new Map(columns.map((label, i) => [label, i]))
  const rowIndex = new Map(rows.map((label, i) => [label, i]))
  return cells.map((cell) => ({
    ...cell,
    xIndex: colIndex.get(cell.current) ?? 0,
    yIndex: rowIndex.get(cell.past) ?? 0,
  }))
}

function buildVolumeMatrixOptions(
  cells: VolumeMatrixCell[],
  columns: string[],
  rows: string[],
  viewport: MatrixViewport,
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  const colCount = columns.length
  const rowCount = rows.length
  const chartCells = toChartCells(cells, columns, rows)
  const { minSize, maxSize, sizeDomainMax } = bubbleSizesForViewport(
    viewport,
    chartCells,
  )
  const labelFontSize = bubbleLabelFontSize(maxSize)

  const xTickValues = Array.from({ length: colCount }, (_, i) => i)
  const yTickValues = Array.from({ length: rowCount }, (_, i) => i)
  const xDividers = Array.from({ length: Math.max(0, colCount - 1) }, (_, i) => ({
    type: 'line' as const,
    value: i + 0.5,
    enabled: true,
    stroke: GRID,
    strokeWidth: 1.5,
    lineDash: [4, 3],
  }))
  const yDividers = Array.from({ length: Math.max(0, rowCount - 1) }, (_, i) => ({
    type: 'line' as const,
    value: i + 0.5,
    enabled: true,
    stroke: GRID,
    strokeWidth: 1.5,
    lineDash: [4, 3],
  }))

  return {
    animation: { enabled: false },
    background: { fill: BACKGROUND },
    contextMenu: createChartContextMenu(getChart),
    padding: { top: 16, right: 16, bottom: 8, left: 8 },
    title: {
      text: '・⑦ブランドクロス',
      color: TITLE_COLOR,
      fontSize: 16,
      fontWeight: 'bold',
      spacing: 28,
    },
    legend: { enabled: false },
    data: chartCells,
    series: [
      {
        type: 'bubble',
        xKey: 'xIndex',
        yKey: 'yIndex',
        sizeKey: 'value',
        labelKey: 'label',
        xName: '現在購入',
        yName: '過去購入',
        sizeName: '%',
        maxRenderedItems: 3000,
        minSize,
        maxSize,
        sizeDomain: [0, sizeDomainMax],
        fillOpacity: 0.78,
        stroke: '#333333',
        strokeWidth: 0.8,
        itemStyler: ({ datum }: { datum: unknown }) => {
          const cell = datum as ChartCell
          if (cell.hideBubble) {
            return {
              fillOpacity: 0,
              strokeWidth: 0,
            }
          }
          return {
            fill: cell.fill,
            fillOpacity: cell.value <= 0 ? 0.15 : 0.78,
            stroke: '#333333',
            strokeWidth: 0.8,
          }
        },
        label: {
          enabled: true,
          placement: 'inside',
          color: '#111111',
          fontSize: labelFontSize,
          fontWeight: 'bold',
          collision: { alwaysShow: true },
        },
        tooltip: {
          renderer: ({ datum }: { datum: unknown }) => {
            const cell = datum as ChartCell
            return {
              title: `${cell.past} → ${cell.current}`,
              data: [
                {
                  label: '行%',
                  value: cell.hideBubble ? '-' : `${cell.label}%`,
                },
              ],
            }
          },
        },
      },
    ],
    axes: {
      x: {
        type: 'number',
        position: 'top',
        min: viewport.xMin,
        max: viewport.xMax,
        nice: false,
        label: {
          color: AXIS_LABEL,
          fontSize: 11,
          autoRotate: false,
          rotation: 270,
          avoidCollisions: false,
          minSpacing: 0,
          formatter: ({ value }) => columns[Math.round(Number(value))] ?? '',
        },
        line: { enabled: true, stroke: '#222222', width: 1 },
        tick: { enabled: false },
        interval: { values: xTickValues },
        gridLine: { enabled: false },
        crossLines: xDividers,
      },
      y: {
        type: 'number',
        position: 'left',
        min: viewport.yMin,
        max: viewport.yMax,
        nice: false,
        // 0 を上（カテゴリユーザー）に
        reverse: true,
        label: {
          color: AXIS_LABEL,
          fontSize: 11,
          avoidCollisions: false,
          minSpacing: 0,
          formatter: ({ value }) => rows[Math.round(Number(value))] ?? '',
        },
        line: { enabled: true, stroke: '#222222', width: 1 },
        tick: { enabled: false },
        interval: { values: yTickValues },
        gridLine: { enabled: false },
        crossLines: yDividers,
      },
    },
  }
}

/**
 * ⑦ブランドクロスページ。
 * マス数はクライアント指定 → GET /api/volume-matrix?size=n で固定 JSON を取得。
 */
export function VolumeMatrixPage() {
  const chartRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<MatrixViewport | null>(null)
  const fullViewportRef = useRef<MatrixViewport | null>(null)
  const [matrixSize, setMatrixSize] = useState(MATRIX_SIZE_DEFAULT)
  const [xlsxCellStyle, setXlsxCellStyle] =
    useState<VolumeMatrixXlsxCellStyle>('icon-set')
  const [sample, setSample] = useState<VolumeMatrixSample | null>(null)
  const [viewport, setViewport] = useState<MatrixViewport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)

    void fetchVolumeMatrix(matrixSize)
      .then((next) => {
        if (cancelled) return
        setSample(next)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSample(null)
        setMessage(
          error instanceof Error
            ? error.message
            : 'ボリューム付数表の取得に失敗しました。',
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [matrixSize])

  useEffect(() => {
    if (!sample) {
      setViewport(null)
      return
    }
    setViewport(createFullViewport(sample.columns.length, sample.rows.length))
  }, [sample])

  const fullViewport = useMemo(() => {
    if (!sample) return null
    return createFullViewport(sample.columns.length, sample.rows.length)
  }, [sample])

  viewportRef.current = viewport
  fullViewportRef.current = fullViewport

  const options = useMemo(() => {
    if (!sample || !viewport) return null
    return buildVolumeMatrixOptions(
      sample.cells,
      sample.columns,
      sample.rows,
      viewport,
      () => chartRef.current,
    )
  }, [sample, viewport])

  const isPanReady =
    viewport != null &&
    fullViewport != null &&
    isViewportZoomed(viewport, fullViewport)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const PAN_THRESHOLD = 4
    let pointerDown = false
    let panning = false
    let startX = 0
    let startY = 0
    let lastX = 0
    let lastY = 0

    const onWheel = (event: WheelEvent) => {
      const vp = viewportRef.current
      const full = fullViewportRef.current
      if (!vp || !full) return
      const next = applyCtrlWheelZoom(vp, full, host, event)
      if (next) setViewport(next)
    }

    const onDoubleClick = () => {
      const full = fullViewportRef.current
      if (full) setViewport(full)
    }

    const endPan = () => {
      pointerDown = false
      panning = false
      host.classList.remove('is-panning')
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const vp = viewportRef.current
      const full = fullViewportRef.current
      if (!vp || !full || !isViewportZoomed(vp, full)) return

      pointerDown = true
      panning = false
      startX = lastX = event.clientX
      startY = lastY = event.clientY
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDown) return
      const vp = viewportRef.current
      const full = fullViewportRef.current
      if (!vp || !full) return

      if (!panning) {
        const dx = event.clientX - startX
        const dy = event.clientY - startY
        if (Math.hypot(dx, dy) < PAN_THRESHOLD) return
        panning = true
        host.classList.add('is-panning')
      }

      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY

      const rect = host.getBoundingClientRect()
      setViewport((prev) => {
        if (!prev) return prev
        return panViewportByPixels(prev, full, rect, dx, dy)
      })
      event.preventDefault()
    }

    const onPointerUp = () => endPan()
    const onPointerCancel = () => endPan()

    host.addEventListener('wheel', onWheel, { passive: false, capture: true })
    host.addEventListener('dblclick', onDoubleClick)
    host.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    return () => {
      host.removeEventListener('wheel', onWheel, { capture: true })
      host.removeEventListener('dblclick', onDoubleClick)
      host.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerCancel)
    }
  }, [])

  const noteText = sample?.meta.note ?? '*数値：％（行）（人数ベース）'

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">AG Charts 検証</p>
          <h1 className="tn-page-title">⑦ブランドクロス</h1>
        </div>
        <div className="tn-page-actions tn-page-actions-volume-matrix">
          <label className="vm-xlsx-style-label" htmlFor="vm-xlsx-cell-style">
            Excel近似
          </label>
          <select
            id="vm-xlsx-cell-style"
            className="vm-xlsx-style-select"
            value={xlsxCellStyle}
            onChange={(e) =>
              setXlsxCellStyle(e.target.value as VolumeMatrixXlsxCellStyle)
            }
          >
            {XLSX_CELL_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
          <XlsxExportButton
            reportKey="volume-matrix"
            size={matrixSize}
            disabled={!sample || isLoading}
            queryParams={{ cellStyle: xlsxCellStyle }}
            fileSuffix={xlsxCellStyle}
          />
        </div>
      </header>

      {message ? (
        <p
          className={
            message.includes('失敗') || message.includes('できていません')
              ? 'tn-page-message error'
              : 'tn-page-message'
          }
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div className="ag-spike-controls" aria-label="マトリクス制御">
        <label className="ag-spike-controls-label" htmlFor="vm-size">
          マス数: {matrixSize + 1}×{matrixSize}
        </label>
        <input
          id="vm-size"
          className="tn-slider ag-spike-slider"
          type="range"
          min={MATRIX_SIZE_MIN}
          max={MATRIX_SIZE_MAX}
          step={1}
          value={matrixSize}
          onChange={(e) => setMatrixSize(Number(e.target.value))}
        />
      </div>

      <div className="tn-page-stage tn-page-stage-volume-matrix">
        <div className="volume-matrix">
          <div
            ref={hostRef}
            className={`tn-lib-canvas-host tn-volume-matrix-host${
              isPanReady ? ' is-pan-ready' : ''
            }`}
          >
            {options && sample ? (
              <AgCharts
                ref={chartRef}
                options={options}
                style={{ width: 800, height: 600 }}
              />
            ) : (
              <div className="tn-graph-placeholder" role="status">
                {isLoading
                  ? 'データを読み込み中…'
                  : '表示できるデータがありません。'}
              </div>
            )}
          </div>
          <p className="volume-matrix-note">{noteText}</p>
        </div>
      </div>
    </main>
  )
}
