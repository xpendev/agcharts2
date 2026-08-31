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
import { createChartContextMenu } from '../agChartsCommon'
import { XlsxExportButton } from '../xlsxExport/XlsxExportButton'
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
  color: '#222222',
  placement: 'outside-end',
  collision: { alwaysShow: true },
  formatter: (params) => {
    const value = Math.abs(params.value)
    return value < 0.01 ? value.toFixed(3) : value.toFixed(2)
  },
}

function buildOptions(
  sample: CompetitiveImpactSample,
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  const data = sample.rows.map((row) => ({
    label: row.label,
    inflow: row.inflow,
    outflowNeg: -row.outflow,
  }))

  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: createChartContextMenu(getChart),
    padding: { top: 8, right: 20, bottom: 8, left: 8 },
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
        // 高さ不足でもブランド名を間引かない
        interval: { values: data.map((row) => row.label) },
        label: { fontSize: 11, avoidCollisions: false, minSpacing: 0 },
      },
      x: {
        type: 'number',
        position: 'top',
        min: -1,
        max: 1,
        nice: false,
        interval: { step: 0.5 },
        title: { text: sample.meta.xUnit, fontSize: 11 },
        label: { fontSize: 10, avoidCollisions: false, minSpacing: 0 },
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
    () =>
      sample ? buildOptions(sample, () => chartRef.current) : null,
    [sample],
  )

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
          <XlsxExportButton
            reportKey="competitive-impact"
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
          <div className="tn-chart-frame-800 ci-chart-frame">
            <div className="ci-frame">
              <div className="ag-spike-chart-host ci-chart-host">
                <AgCharts
                  ref={chartRef}
                  options={options}
                  style={{ width: '100%', height: 420 }}
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
