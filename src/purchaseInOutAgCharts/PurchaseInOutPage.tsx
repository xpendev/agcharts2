import { AgCharts } from 'ag-charts-react'
import type { AgChartInstance } from 'ag-charts-community'
import {
  type AgCartesianChartOptions,
  BarSeriesModule,
  CategoryAxisModule,
  ContextMenuModule,
  CrossLinesModule,
  LegendModule,
  ModuleRegistry,
  NumberAxisModule,
} from 'ag-charts-enterprise'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chartContextMenuDownload } from '../agChartsCommon'
import {
  fetchPurchaseInOut,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  type PurchaseInOutSample,
} from './purchaseInOutData'
import './purchaseInOut.css'

ModuleRegistry.registerModules([
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  CrossLinesModule,
  LegendModule,
  ContextMenuModule,
])

const PREV_PERIOD = '直近・1ヶ月'
const CURR_PERIOD = '当月・11月'

function buildOptions(sample: PurchaseInOutSample): AgCartesianChartOptions {
  const data = sample.rows.map((row) => ({
    label: row.label,
    inflow: row.inflow,
    outflowNeg: -row.outflow,
  }))

  const maxAbs = Math.max(
    0.5,
    ...data.map((row) => Math.max(-row.outflowNeg, row.inflow)),
  )
  const axisMax = Math.ceil(maxAbs * 2) / 2

  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: chartContextMenuDownload,
    padding: { top: 8, right: 12, bottom: 8, left: 8 },
    legend: { enabled: true, position: 'top' },
    data,
    series: [
      {
        type: 'bar',
        direction: 'horizontal',
        xKey: 'label',
        yKey: 'outflowNeg',
        yName: '流出',
        fill: '#c44b4b',
        strokeWidth: 0,
        cornerRadius: 0,
      },
      {
        type: 'bar',
        direction: 'horizontal',
        xKey: 'label',
        yKey: 'inflow',
        yName: '流入',
        fill: '#5a9e4a',
        strokeWidth: 0,
        cornerRadius: 0,
      },
    ],
    axes: {
      y: {
        type: 'category',
        position: 'left',
        paddingInner: 0.28,
        paddingOuter: 0.12,
        line: { enabled: false },
        tick: { enabled: false },
        gridLine: {
          enabled: true,
          style: [{ stroke: '#d8dce0', strokeWidth: 1 }],
        },
        label: { fontSize: 11 },
      },
      x: {
        type: 'number',
        position: 'top',
        min: -axisMax,
        max: axisMax,
        nice: false,
        interval: { step: 0.5 },
        title: { text: '(%)', fontSize: 11 },
        label: { fontSize: 10 },
        gridLine: { enabled: false },
        crossLines: [
          {
            type: 'line',
            value: 0,
            stroke: '#333333',
            strokeWidth: 1,
          },
        ],
      },
    },
  }
}

/** KPI + 全体バー（参考図上段） */
function SummaryHeader({ sample }: { sample: PurchaseInOutSample }) {
  const { summary, meta } = sample

  return (
    <div className="pio-summary">
      <div className="pio-kpi">
        <span className="pio-kpi-brand">{meta.brandLabel}</span>
        <div className="pio-kpi-pair">
          <div className="pio-kpi-box">
            <span className="pio-kpi-cap">{PREV_PERIOD}</span>
            <span className="pio-kpi-value">
              {summary.previousPercent.toFixed(1)}%
            </span>
          </div>
          <span className="pio-kpi-arrow" aria-hidden />
          <div className="pio-kpi-box">
            <span className="pio-kpi-cap">{CURR_PERIOD}</span>
            <span className="pio-kpi-value">
              {summary.currentPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="pio-flow">
        <p className="pio-flow-title">{meta.title}</p>
        <div className="pio-flow-row">
          <span className="pio-flow-side out">流出</span>
          <div className="pio-flow-track">
            <div className="pio-flow-out">
              {summary.outflowPercent.toFixed(1)}%
            </div>
            <div className="pio-flow-mid">
              {summary.retainedPercent.toFixed(1)}%
            </div>
            <div className="pio-flow-in">
              +{summary.inflowPercent.toFixed(1)}%
            </div>
          </div>
          <span className="pio-flow-side in">流入</span>
        </div>
      </div>
    </div>
  )
}

export function PurchaseInOutPage() {
  const chartRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<PurchaseInOutSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchPurchaseInOut(size)
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
    () => (sample ? buildOptions(sample) : null),
    [sample],
  )

  const chartHeight = sample
    ? Math.max(260, sample.rows.length * 36 + 72)
    : 320

  const downloadPng = () => {
    setIsDownloading(true)
    setMessage(null)
    try {
      const chart = chartRef.current
      if (!chart || !sample) throw new Error('グラフの準備ができていません。')
      chart.download({
        fileName: `purchase-in-out-${sample.size}-${Date.now()}`,
      })
      setMessage('PNGをダウンロードしました。')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'PNGダウンロードに失敗しました。',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  const copyPng = async () => {
    setIsCopying(true)
    setMessage(null)
    try {
      const chart = chartRef.current
      if (!chart) throw new Error('グラフの準備ができていません。')
      if (!navigator.clipboard?.write) {
        throw new Error('このブラウザでは画像コピーに対応していません。')
      }
      const dataUrl = await chart.getImageDataURL()
      if (!dataUrl) throw new Error('画像の生成に失敗しました。')
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setMessage('PNGをコピーしました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PNGコピーに失敗しました。')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">AG Charts 検証</p>
          <h1 className="tn-page-title">買出入(実績)</h1>
        </div>
        <div className="tn-page-actions">
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
          <button
            type="button"
            className="tn-page-btn"
            disabled={isCopying || !sample}
            onClick={() => {
              void copyPng()
            }}
          >
            {isCopying ? 'コピー中…' : 'PNGをコピー'}
          </button>
          <button
            type="button"
            className="tn-page-btn"
            disabled={isDownloading || !sample}
            onClick={downloadPng}
          >
            {isDownloading ? 'ダウンロード中…' : 'PNGをダウンロード'}
          </button>
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

      <div className="ag-spike-controls" aria-label="ブランド数切替">
        <label className="ag-spike-controls-label" htmlFor="pio-size">
          ブランド数: {size} / {SIZE_MAX}
        </label>
        <input
          id="pio-size"
          className="tn-slider ag-spike-slider"
          type="range"
          min={SIZE_MIN}
          max={SIZE_MAX}
          step={1}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
      </div>

      <div className="tn-page-stage tn-page-stage-purchase-in-out ag-spike-stage">
        {sample && options ? (
          <div className="pio-frame">
            <SummaryHeader sample={sample} />
            <div className="ag-spike-chart-host pio-chart-host">
              <AgCharts
                ref={chartRef}
                options={options}
                style={{ width: '100%', height: chartHeight }}
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
