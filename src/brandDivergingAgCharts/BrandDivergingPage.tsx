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
  fetchBrandDiverging,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  type BrandDivergingSample,
} from './brandDivergingData'
import './brandDiverging.css'

ModuleRegistry.registerModules([
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  CrossLinesModule,
  LegendModule,
  ContextMenuModule,
])

function buildOptions(sample: BrandDivergingSample): AgCartesianChartOptions {
  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: chartContextMenuDownload,
    title: { text: sample.meta.title, fontSize: 18 },
    legend: { enabled: false },
    data: sample.rows,
    series: [
      {
        type: 'bar',
        direction: 'horizontal',
        xKey: 'label',
        yKey: 'value',
        cornerRadius: 0,
        itemStyler: ({ datum }) => {
          const row = datum as { value: number }
          const positive = row.value >= 0
          return {
            fill: positive ? '#4a7db8' : '#c44b4b',
            stroke: positive ? '#2f547a' : '#8a2f2f',
            strokeWidth: 0.5,
          }
        },
      },
    ],
    axes: {
      y: {
        type: 'category',
        position: 'left',
        paddingInner: 0.35,
        tick: { enabled: false },
        gridLine: { enabled: false },
        label: { fontSize: 11, avoidCollisions: false },
      },
      x: {
        type: 'number',
        position: 'bottom',
        nice: true,
        gridLine: { enabled: true },
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

export function BrandDivergingPage() {
  const chartRef = useRef<AgChartInstance<AgCartesianChartOptions> | null>(null)
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<BrandDivergingSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchBrandDiverging(size)
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
      chart.download({
        fileName: `brand-diverging-${sample.size}-${Date.now()}`,
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
          <h1 className="tn-page-title">⑥流出入差ランキング</h1>
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
        <label className="ag-spike-controls-label" htmlFor="bd-size">
          ブランド数: {size} / {SIZE_MAX}
        </label>
        <input
          id="bd-size"
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
                style={{ width: 800, height: 420 }}
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
