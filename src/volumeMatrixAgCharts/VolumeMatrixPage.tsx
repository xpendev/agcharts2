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

function bubbleSizesFor(size: number): { minSize: number; maxSize: number } {
  // 800×600 の描画領域を粗く見積もり。マスが少ないほど1セルが大きくなる
  const approxBand = Math.floor(480 / Math.max(size, 1))
  // 少マス時は大きく（上限 140）、多マス時は格子内に収める
  const maxSize = Math.max(20, Math.min(140, approxBand - 8))
  const minSize = Math.max(14, Math.floor(maxSize * 0.4))
  return { minSize, maxSize }
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
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  const size = columns.length
  const { minSize, maxSize } = bubbleSizesFor(size)
  const chartCells = toChartCells(cells, columns, rows)

  // セル境界の区切り線（1マスは0本、3×3 なら 0.5 / 1.5 の2本）
  const tickValues = Array.from({ length: size }, (_, i) => i)
  const dividers = Array.from({ length: Math.max(0, size - 1) }, (_, i) => ({
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
    padding: { top: 8, right: 16, bottom: 8, left: 8 },
    title: {
      text: '・⑦ブランドクロス',
      color: TITLE_COLOR,
      fontSize: 16,
      fontWeight: 'bold',
      spacing: 2,
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
        sizeDomain: [0, SIZE_DOMAIN_MAX],
        fillOpacity: 0.78,
        stroke: '#333333',
        strokeWidth: 0.8,
        itemStyler: ({ datum }: { datum: unknown }) => {
          const cell = datum as ChartCell
          const isSameBrand = cell.past === cell.current
          if (isSameBrand) {
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
          fontSize: size >= 6 ? 8 : 9,
          fontWeight: 'bold',
          collision: { alwaysShow: true },
        },
        tooltip: {
          renderer: ({ datum }: { datum: unknown }) => {
            const cell = datum as ChartCell
            const isSameBrand = cell.past === cell.current
            return {
              title: `${cell.past} → ${cell.current}`,
              data: [
                {
                  label: '行%',
                  value: isSameBrand ? '-' : `${cell.label}%`,
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
        min: -0.5,
        max: size - 0.5,
        nice: false,
        title: {
          text: "現在購入 ('10/1 - '10/12)",
          color: TITLE_COLOR,
          fontSize: 13,
          spacing: 26,
        },
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
        interval: { values: tickValues },
        gridLine: { enabled: false },
        crossLines: dividers,
      },
      y: {
        type: 'number',
        position: 'left',
        min: -0.5,
        max: size - 0.5,
        nice: false,
        // 0 を上（ブランド1）に
        reverse: true,
        title: {
          text: "過去購入 ('09/1 - '09/12)",
          color: TITLE_COLOR,
          fontSize: 13,
        },
        label: {
          color: AXIS_LABEL,
          fontSize: 11,
          avoidCollisions: false,
          minSpacing: 0,
          formatter: ({ value }) => rows[Math.round(Number(value))] ?? '',
        },
        line: { enabled: true, stroke: '#222222', width: 1 },
        tick: { enabled: false },
        interval: { values: tickValues },
        gridLine: { enabled: false },
        crossLines: dividers,
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
  const [matrixSize, setMatrixSize] = useState(MATRIX_SIZE_DEFAULT)
  const [xlsxCellStyle, setXlsxCellStyle] =
    useState<VolumeMatrixXlsxCellStyle>('icon-set')
  const [sample, setSample] = useState<VolumeMatrixSample | null>(null)
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

  const options = useMemo(() => {
    if (!sample) return null
    return buildVolumeMatrixOptions(
      sample.cells,
      sample.columns,
      sample.rows,
      () => chartRef.current,
    )
  }, [sample])

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
          マス数: {matrixSize}×{matrixSize}
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
          <div className="tn-lib-canvas-host tn-volume-matrix-host">
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
