import { AgCharts } from 'ag-charts-react'
import type { AgChartInstance } from 'ag-charts-community'
import {
  type AgBarSeriesLabelFormatterParams,
  type AgBarSeriesLabelOptions,
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
  fetchCompetitiveImpact,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  type CompetitiveImpactSample,
} from './competitiveImpactData'
import './competitiveImpact.css'

ModuleRegistry.registerModules([
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  CrossLinesModule,
  LegendModule,
  ContextMenuModule,
])

const barValueLabel: AgBarSeriesLabelOptions<
  unknown,
  AgBarSeriesLabelFormatterParams<unknown>
> = {
  enabled: true,
  fontSize: 10,
  color: '#ffffff',
  placement: ['inside-end', 'outside-end'],
  collision: { alwaysShow: true },
  formatter: (params) => {
    const value = Math.abs(params.value)
    return value < 0.01 ? value.toFixed(3) : value.toFixed(2)
  },
  itemStyler: ({ placement }) => ({
    color: String(placement).startsWith('outside') ? '#222222' : '#ffffff',
  }),
}

function buildOptions(sample: CompetitiveImpactSample): AgCartesianChartOptions {
  const data = sample.rows.map((row) => ({
    label: row.label,
    inflow: row.inflow,
    outflowNeg: -row.outflow,
  }))

  const maxAbs = Math.max(
    0.5,
    ...data.map((row) => Math.max(-row.outflowNeg, row.inflow)),
  )
  const axisMax = Math.ceil(maxAbs * 10) / 10

  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: chartContextMenuDownload,
    padding: { top: 8, right: 8, bottom: 8, left: 8 },
    title: {
      text: sample.meta.title,
      fontSize: 13,
      fontWeight: 'bold',
      spacing: 2,
    },
    subtitle: {
      text: sample.meta.subtitle,
      fontSize: 11,
      spacing: 6,
    },
    legend: { enabled: true, position: 'top' },
    data,
    series: [
      {
        type: 'bar',
        direction: 'horizontal',
        xKey: 'label',
        yKey: 'outflowNeg',
        yName: '流出',
        // 同一カテゴリ帯に重ねる（上下ずれ防止）
        grouped: false,
        widthRatio: 0.55,
        fill: '#c44b4b',
        strokeWidth: 0,
        cornerRadius: 0,
        label: barValueLabel,
      },
      {
        type: 'bar',
        direction: 'horizontal',
        xKey: 'label',
        yKey: 'inflow',
        yName: '流入',
        grouped: false,
        widthRatio: 0.55,
        fill: '#5a9e4a',
        strokeWidth: 0,
        cornerRadius: 0,
        label: barValueLabel,
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
        label: { fontSize: 11, avoidCollisions: false },
      },
      x: {
        type: 'number',
        position: 'top',
        min: -axisMax,
        max: axisMax,
        nice: false,
        title: { text: sample.meta.xUnit, fontSize: 11 },
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

export function CompetitiveImpactPage() {
  const chartRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<CompetitiveImpactSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchCompetitiveImpact(size)
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

  const downloadPng = () => {
    setIsDownloading(true)
    setMessage(null)
    try {
      const chart = chartRef.current
      if (!chart || !sample) throw new Error('グラフの準備ができていません。')
      chart.download({ fileName: `competitive-impact-${sample.size}-${Date.now()}` })
      setMessage('PNGをダウンロードしました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'PNGダウンロードに失敗しました。')
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
          <h1 className="tn-page-title">⑤競合へのインパクト</h1>
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

      <div className="ag-spike-controls" aria-label="競合ブランド数切替">
        <label className="ag-spike-controls-label" htmlFor="ci-size">
          競合ブランド数: {size} / {SIZE_MAX}
        </label>
        <input
          id="ci-size"
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
        {sample && options ? (
          <div className="tn-chart-frame-800">
            <div className="ci-frame">
              <div className="ag-spike-chart-host ci-chart-host">
                <AgCharts
                  ref={chartRef}
                  options={options}
                  style={{ width: 800, height: 420 }}
                />
              </div>
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
