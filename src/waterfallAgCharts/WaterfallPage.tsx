import { AgCharts } from 'ag-charts-react'
import type { AgChartInstance } from 'ag-charts-community'
import {
  type AgCartesianChartOptions,
  CategoryAxisModule,
  ContextMenuModule,
  LegendModule,
  ModuleRegistry,
  NumberAxisModule,
  WaterfallSeriesModule,
} from 'ag-charts-enterprise'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createChartContextMenu } from '../agChartsCommon'
import {
  fetchWaterfall,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  type WaterfallSample,
} from './waterfallData'
import './waterfall.css'

ModuleRegistry.registerModules([
  WaterfallSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  LegendModule,
  ContextMenuModule,
])

function formatBarLabel(
  startLabel: string,
  params: {
    value: unknown
    itemType?: string
    totalValue?: unknown
    datum?: { category?: string }
  },
): string {
  const itemType = params.itemType
  // To 期間など total は累計値（符号なし）
  if (itemType === 'total' || itemType === 'subtotal') {
    const n = Number(params.totalValue ?? params.value)
    if (!Number.isFinite(n)) return ''
    return n.toFixed(1)
  }
  // From 期間は 0 起点の絶対値棒（符号なし）
  if (params.datum?.category === startLabel) {
    const n = Number(params.value)
    if (!Number.isFinite(n)) return ''
    return n.toFixed(1)
  }
  const n = Number(params.value)
  if (!Number.isFinite(n)) return ''
  if (n > 0) return `+${n.toFixed(1)}`
  return n.toFixed(1)
}

function buildOptions(
  sample: WaterfallSample,
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  const startLabel =
    sample.meta.fromPeriod ?? sample.categories[0] ?? ''
  const endLabel =
    sample.meta.toPeriod ??
    sample.categories[sample.categories.length - 1] ??
    ''
  const barLabel = {
    enabled: true,
    placement: 'outside-end' as const,
    fontSize: 11,
    spacing: 4,
    collision: { alwaysShow: true },
    formatter: (params: {
      value: unknown
      itemType?: string
      totalValue?: unknown
      datum?: { category?: string }
    }) => formatBarLabel(startLabel, params),
  }

  // size = 棒数。To 期間は totals で挿入し、カテゴリ数と表示棒数を一致させる。
  const isSingle = sample.categories.length <= 1
  const data = isSingle
    ? [
        {
          category: startLabel,
          amount: sample.values[0] ?? 0,
        },
      ]
    : sample.categories.slice(0, -1).map((category, i) => ({
        category,
        amount: sample.values[i] ?? 0,
      }))

  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: createChartContextMenu(getChart),
    title: { text: sample.meta.title, fontSize: 16 },
    legend: { enabled: false },
    padding: { top: 28, right: 20, bottom: 12, left: 12 },
    data,
    series: [
      {
        type: 'waterfall',
        xKey: 'category',
        yKey: 'amount',
        ...(isSingle
          ? {}
          : {
              totals: [
                {
                  totalType: 'total' as const,
                  index: data.length - 1,
                  axisLabel: endLabel,
                },
              ],
            }),
        item: {
          positive: {
            fill: '#5a9e4a',
            stroke: '#3d6e32',
            label: barLabel,
            // From 期間は参考図どおり総計色（グレー）
            itemStyler: ({ datum }) => {
              const row = datum as { category?: string }
              if (row.category === startLabel) {
                return { fill: '#8a8a8a', stroke: '#555555' }
              }
            },
          },
          negative: {
            fill: '#c44b4b',
            stroke: '#8a2f2f',
            label: barLabel,
          },
          total: {
            fill: '#8a8a8a',
            stroke: '#555555',
            label: barLabel,
          },
        },
      },
    ],
    axes: {
      x: {
        type: 'category',
        interval: {
          values: isSingle
            ? data.map((row) => row.category)
            : [...data.map((row) => row.category), endLabel],
        },
        label: {
          autoRotate: false,
          rotation: 270,
          fontSize: 10,
          avoidCollisions: false,
          minSpacing: 0,
        },
        tick: { enabled: false },
      },
      y: {
        type: 'number',
        title: { text: sample.meta.yUnit, fontSize: 11 },
        nice: true,
        gridLine: { enabled: true },
        label: { fontSize: 11, avoidCollisions: false, minSpacing: 0 },
      },
    },
  }
}

export function WaterfallPage() {
  const chartRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<WaterfallSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchWaterfall(size)
      .then((next) => {
        if (!cancelled) setSample(next)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSample(null)
        setMessage(
          error instanceof Error ? error.message : 'データの取得に失敗しました。',
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [size])

  const options = useMemo(
    () =>
      sample ? buildOptions(sample, () => chartRef.current) : null,
    [sample],
  )

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">AG Charts 検証</p>
          <h1 className="tn-page-title">③シェア流出入</h1>
        </div>
        <div className="tn-page-actions">
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
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

      <div className="ag-spike-controls" aria-label="棒の数切替">
        <label className="ag-spike-controls-label" htmlFor="wf-size">
          棒の数: {size} / {SIZE_MAX}
        </label>
        <input
          id="wf-size"
          className="tn-slider ag-spike-slider"
          type="range"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={1}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
      </div>

      <div className="tn-page-stage tn-page-stage-fit ag-spike-stage">
        {options && sample ? (
          <div className="tn-chart-frame-800">
            <div className="ag-spike-chart-host">
              <AgCharts
                ref={chartRef}
                options={options}
                style={{ width: 800, height: 480 }}
              />
            </div>
          </div>
        ) : (
          <div className="tn-graph-placeholder" role="status">
            {isLoading ? 'データを読み込み中…' : '表示できるデータがありません。'}
          </div>
        )}
      </div>
    </main>
  )
}
