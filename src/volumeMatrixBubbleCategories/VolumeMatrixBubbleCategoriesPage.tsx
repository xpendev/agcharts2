/**
 * ⑦ブランドクロス — bubble-with-categories ベースの確認用。
 * 参考: https://www.ag-grid.com/charts/gallery/bubble-with-categories/
 */
import { AgCharts } from 'ag-charts-react'
import type { AgChartInstance } from 'ag-charts-community'
import {
  type AgCartesianChartOptions,
  BubbleSeriesModule,
  CategoryAxisModule,
  LegendModule,
  ModuleRegistry,
  ZoomModule,
} from 'ag-charts-enterprise'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getChartPngBlob } from '../agChartsCommon'
import { XlsxExportButton } from '../xlsxExport/XlsxExportButton'
import {
  fetchBubbleCategorySample,
  MATRIX_SIZE_MAX,
  MATRIX_SIZE_MIN,
  type BubbleCategoryPoint,
  type BubbleCategorySample,
} from './volumeMatrixBubbleCategoriesData'
import './volumeMatrixBubbleCategories.css'

ModuleRegistry.registerModules([
  BubbleSeriesModule,
  CategoryAxisModule,
  LegendModule,
  ZoomModule,
])

type VolumeMatrixXlsxCellStyle = 'icon-set' | 'data-bar' | 'png'

const XLSX_CELL_STYLE_OPTIONS: {
  value: VolumeMatrixXlsxCellStyle
  label: string
}[] = [
  { value: 'icon-set', label: 'アイコンセット' },
  { value: 'data-bar', label: 'データバー' },
  { value: 'png', label: 'PNG（画面グラフ）' },
]

const CHART_WIDTH = 800
const CHART_HEIGHT = 600
/** チャート外形から引く外側余白。残り＝格子（マス）領域の推定サイズ */
const PLOT_MARGIN = { left: 0, right: 0, top: 0, bottom: 0 }
/** マス辺に対する最大バブルの割合。1.0=マスいっぱい、小さくするほど格子との余白が増える */
const BUBBLE_MAX_FILL_RATIO = 1.0
/** 最小バブル＝最大バブルに対する割合。大きくするほど大小差が弱くなる */
const BUBBLE_MIN_SIZE_RATIO = 0.3
/** ラベル文字＝最大バブルに対する割合。大きくするほど文字が大きくなる */
const BUBBLE_LABEL_SIZE_RATIO = 0.3

/**
 * category 軸の gridLine（placement: 'between'）は
 * 「各帯の先頭辺」+「軸末端」に線を出す。
 * 外枠（先頭・末端）は strokeWidth: 0、内側境界だけ破線にする。
 */
function categoryInternalGridStyle(categoryCount: number) {
  const hidden = { strokeWidth: 0 }
  const dashed = { stroke: '#b0b0b0', strokeWidth: 1.5, lineDash: [4, 3] }
  return [
    hidden,
    ...Array.from({ length: categoryCount - 1 }, () => dashed),
    hidden,
  ]
}

/** 格子（マス全体）の推定ピクセルサイズ。チャート外形 − PLOT_MARGIN */
function plotAreaSize(): { width: number; height: number } {
  return {
    width: CHART_WIDTH - PLOT_MARGIN.left - PLOT_MARGIN.right,
    height: CHART_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom,
  }
}

/**
 * 1マスの推定ピクセルサイズ。
 * 1マスの幅＝格子幅 ÷ 列数
 * 1マスの高さ＝格子高さ ÷ 行数
 */
function cellSize(
  colCount: number,
  rowCount: number,
): { width: number; height: number } {
  const plot = plotAreaSize()
  return {
    width: plot.width / colCount,
    height: plot.height / rowCount,
  }
}

/**
 * マス数に応じたバブルの minSize / maxSize を返す。
 * maxSize＝min(1マスの幅, 1マスの高さ) × BUBBLE_MAX_FILL_RATIO
 * minSize＝maxSize × BUBBLE_MIN_SIZE_RATIO
 * ※ズーム時は「見えている列・行数」を渡す
 */
function bubbleSizesForMatrix(
  colCount: number,
  rowCount: number,
): { minSize: number; maxSize: number } {
  const { width: cellWidth, height: cellHeight } = cellSize(colCount, rowCount)
  const maxSize = Math.round(
    Math.min(cellWidth, cellHeight) * BUBBLE_MAX_FILL_RATIO,
  )
  const minSize = Math.round(maxSize * BUBBLE_MIN_SIZE_RATIO)
  return { minSize, maxSize }
}

/**
 * バブル内ラベルのフォントサイズ。
 * fontSize＝maxSize × BUBBLE_LABEL_SIZE_RATIO（マスが大きいほど文字も大きくする）
 */
function bubbleLabelFontSize(maxSize: number): number {
  return Math.round(maxSize * BUBBLE_LABEL_SIZE_RATIO)
}

/** ズーム後の可視割合（1=全体、小さいほど拡大） */
type ZoomSpan = { x: number; y: number }

function buildOptions(
  sample: BubbleCategorySample,
  zoomSpan: ZoomSpan,
  onZoomSpan: (span: ZoomSpan) => void,
): AgCartesianChartOptions {
  const { minSize, maxSize } = bubbleSizesForMatrix(
    sample.columns.length * zoomSpan.x,
    sample.rows.length * zoomSpan.y,
  )
  const labelFontSize = bubbleLabelFontSize(maxSize)

  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    title: {
      text: '併買（bubble-with-categories 実験）',
      fontSize: 16,
      fontWeight: 'bold',
    },
    legend: { enabled: false },
    // AG Charts 標準 Zoom（ホイール拡大・ドラッグパン・ダブルクリックでリセット）
    // 軸上のドラッグ／スクロールズームは無効（プロット領域のみ）
    zoom: {
      enabled: true,
      axes: 'xy',
      enableAxisDragging: false,
      enableAxisScrolling: false,
      // minSize/maxSize 更新時もズーム位置を維持
      onDataChange: { strategy: 'preserveRatios' },
    },
    listeners: {
      zoom: (event) => {
        const x = event.ratioX.end - event.ratioX.start
        const y = event.ratioY.end - event.ratioY.start
        onZoomSpan({ x, y })
      },
    },
    seriesArea: {
      border: {
        stroke: '#222222',
        strokeWidth: 1,
      },
    },
    data: sample.points,
    series: [
      {
        type: 'bubble',
        xKey: 'current',
        yKey: 'past',
        sizeKey: 'value',
        labelKey: 'label',
        xName: '現在購入',
        yName: '過去購入',
        sizeName: '%',
        strokeWidth: 0,
        minSize,
        maxSize,
        itemStyler: ({ datum }: { datum: unknown }) => {
          const point = datum as BubbleCategoryPoint
          if (point.hideBubble) {
            return {
              fillOpacity: 0,
              strokeWidth: 0,
            }
          }
          return {
            fill: point.fill,
            fillOpacity: point.value <= 0 ? 0.15 : 0.78,
            strokeWidth: 0,
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
            const point = datum as BubbleCategoryPoint
            return {
              title: `${point.past} → ${point.current}`,
              data: [
                {
                  label: '',
                  value: point.hideBubble ? '-' : `${point.label}%`,
                },
              ],
            }
          },
        },
      },
    ],
    axes: {
      x: {
        type: 'category',
        position: 'top',
        paddingInner: 0,
        label: {
          fontSize: 11,
          autoRotate: false,
          rotation: 270,
        },
        line: { enabled: false },
        tick: { enabled: false },
        gridLine: {
          enabled: true,
          style: categoryInternalGridStyle(sample.columns.length),
        },
      },
      y: {
        type: 'category',
        position: 'left',
        reverse: false,
        paddingInner: 0,
        label: { fontSize: 11 },
        line: { enabled: false },
        tick: { enabled: false },
        gridLine: {
          enabled: true,
          style: categoryInternalGridStyle(sample.rows.length),
        },
      },
    },
  }
}

export function VolumeMatrixBubbleCategoriesPage() {
  const chartRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const [matrixSize, setMatrixSize] = useState(6)
  const [sample, setSample] = useState<BubbleCategorySample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [xlsxCellStyle, setXlsxCellStyle] =
    useState<VolumeMatrixXlsxCellStyle>('icon-set')
  /** ズーム可視割合。拡大すると小さくなり、バブルを大きくする */
  const [zoomSpan, setZoomSpan] = useState<ZoomSpan>({ x: 1, y: 1 })

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    setZoomSpan({ x: 1, y: 1 })

    void fetchBubbleCategorySample(matrixSize)
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
            : 'データの取得に失敗しました。',
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
    return buildOptions(sample, zoomSpan, setZoomSpan)
  }, [sample, zoomSpan])

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">AG Charts 検証</p>
          <h1 className="tn-page-title">
            ⑦ブランドクロス（bubble-with-categories）
          </h1>
        </div>
        <div className="tn-page-actions tn-page-actions-vm-bubble-cat">
          <select
            id="vm-bc-xlsx-cell-style"
            className="vm-xlsx-style-select"
            aria-label="Excel出力形式"
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
          <Link className="tn-page-link" to="/volume-matrix">
            数値軸版へ
          </Link>
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
          <XlsxExportButton
            reportKey="volume-matrix"
            size={matrixSize}
            disabled={!sample || isLoading}
            queryParams={{ cellStyle: xlsxCellStyle }}
            fileSuffix={xlsxCellStyle}
            getPng={
              xlsxCellStyle === 'png'
                ? () => getChartPngBlob(chartRef.current)
                : undefined
            }
          />
        </div>
      </header>

      {message ? (
        <p className="tn-page-message error" role="status">
          {message}
        </p>
      ) : null}

      <div className="ag-spike-controls" aria-label="マトリクス制御">
        <label className="ag-spike-controls-label" htmlFor="vm-bc-size">
          マス数: {matrixSize + 1}×{matrixSize}
        </label>
        <input
          id="vm-bc-size"
          className="tn-slider ag-spike-slider"
          type="range"
          min={MATRIX_SIZE_MIN}
          max={MATRIX_SIZE_MAX}
          step={1}
          value={matrixSize}
          onChange={(e) => setMatrixSize(Number(e.target.value))}
        />
      </div>

      <div className="tn-page-stage tn-page-stage-vm-bubble-cat">
        <div>
          <div className="vm-bubble-cat-chart">
            {options ? (
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
          <p className="vm-bubble-cat-note">
            {sample?.note ?? '*数値：％（行）（人数ベース）'}
          </p>
        </div>
      </div>
    </main>
  )
}
