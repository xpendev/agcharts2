import { AgCharts } from 'ag-charts-react'
import type { AgChartInstance } from 'ag-charts-community'
import {
  type AgCartesianChartOptions,
  BarSeriesModule,
  CategoryAxisModule,
  ContextMenuModule,
  LegendModule,
  ModuleRegistry,
  NumberAxisModule,
} from 'ag-charts-enterprise'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createChartContextMenu } from '../agChartsCommon'
import { XlsxExportButton } from '../xlsxExport/XlsxExportButton'
import {
  fetchBuyerDropout,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  type BuyerDropoutSample,
} from './buyerDropoutData'
import './buyerDropout.css'

ModuleRegistry.registerModules([
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  LegendModule,
  ContextMenuModule,
])

function buildTopOptions(
  sample: BuyerDropoutSample,
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: createChartContextMenu(getChart),
    title: { text: sample.meta.topTitle, fontSize: 14 },
    legend: { enabled: false },
    data: sample.stacked,
    series: [
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'base',
        yName: sample.meta.series.base,
        stacked: true,
        fill: '#6a6358',
        strokeWidth: 0,
      },
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'mid',
        yName: sample.meta.series.mid,
        stacked: true,
        fill: '#2f7a3a',
        strokeWidth: 0,
      },
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'top',
        yName: sample.meta.series.top,
        stacked: true,
        fill: '#8fbf5a',
        strokeWidth: 0,
      },
    ],
    axes: {
      x: {
        type: 'category',
        tick: { enabled: false },
        // 参考画像どおり期間ラベルは上段。件数多くても間引かない
        interval: { values: sample.stacked.map((row) => row.period) },
        label: {
          fontSize: 11,
          avoidCollisions: false,
          minSpacing: 0,
          autoRotate: false,
          rotation: 270,
        },
      },
      y: {
        type: 'number',
        title: { text: sample.meta.yUnit, fontSize: 11 },
        min: 0,
        max: 50,
        nice: false,
        interval: { step: 10 },
        gridLine: { enabled: true },
        label: { fontSize: 11, avoidCollisions: false, minSpacing: 0 },
      },
    },
  }
}

function buildBottomOptions(
  sample: BuyerDropoutSample,
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: createChartContextMenu(getChart),
    title: { text: sample.meta.bottomTitle, fontSize: 14 },
    legend: { enabled: false },
    data: sample.dropout,
    series: [
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'value',
        fill: '#c44b4b',
        stroke: '#8a2f2f',
        strokeWidth: 0.5,
        label: {
          enabled: true,
          placement: 'outside-end',
          orientation: 'vertical',
          collision: { alwaysShow: true },
          formatter: ({ value }) => Number(value).toFixed(2),
        },
      },
    ],
    axes: {
      x: {
        type: 'category',
        tick: { enabled: false },
        // 期間は上段に表示済みのため下段は非表示
        label: { enabled: false },
      },
      y: {
        type: 'number',
        title: { text: sample.meta.yUnit, fontSize: 11 },
        min: -9,
        max: 0,
        nice: false,
        interval: { step: 3 },
        gridLine: { enabled: true },
        label: { fontSize: 11, avoidCollisions: false, minSpacing: 0 },
      },
    },
  }
}

export function BuyerDropoutPage() {
  const topRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const bottomRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<BuyerDropoutSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchBuyerDropout(size)
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

  const topOptions = useMemo(
    () =>
      sample ? buildTopOptions(sample, () => topRef.current) : null,
    [sample],
  )
  const bottomOptions = useMemo(
    () =>
      sample ? buildBottomOptions(sample, () => bottomRef.current) : null,
    [sample],
  )

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">AG Charts 検証</p>
          <h1 className="tn-page-title">①新規・継続・脱落率</h1>
        </div>
        <div className="tn-page-actions">
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
          <XlsxExportButton
            reportKey="buyer-dropout"
            size={size}
            disabled={!sample || isLoading}
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

      <div className="ag-spike-controls" aria-label="期間数切替">
        <label className="ag-spike-controls-label" htmlFor="bdout-size">
          期間数: {size} / {SIZE_MAX}
        </label>
        <input
          id="bdout-size"
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
        {topOptions && bottomOptions && sample ? (
          <div className="tn-chart-frame-800 buyer-dropout-frame">
            <div className="ag-spike-chart-host">
              <AgCharts
                ref={topRef}
                options={topOptions}
                style={{ width: 800, height: 300 }}
              />
            </div>
            <div className="ag-spike-chart-host">
              <AgCharts
                ref={bottomRef}
                options={bottomOptions}
                style={{ width: 800, height: 280 }}
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
