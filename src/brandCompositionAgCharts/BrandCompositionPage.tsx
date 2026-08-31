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
  fetchBrandComposition,
  groupRowsByBrand,
  SIZE_DEFAULT,
  SIZE_MAX,
  SIZE_MIN,
  type BrandCompositionSample,
  type BrandGroup,
} from './brandCompositionData'
import './brandComposition.css'

ModuleRegistry.registerModules([
  BarSeriesModule,
  CategoryAxisModule,
  NumberAxisModule,
  LegendModule,
  ContextMenuModule,
])

function buildBrandOptions(
  sample: BrandCompositionSample,
  group: BrandGroup,
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: createChartContextMenu(getChart),
    legend: {
      enabled: true,
      position: 'bottom',
    },
    sync: { enabled: false },
    padding: { top: 8, right: 12, bottom: 8, left: 8 },
    data: group.rows,
    series: [
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'repeat',
        yName: sample.meta.series.repeat,
        stacked: true,
        normalizedTo: 100,
        fill: '#8a8a8a',
        strokeWidth: 0,
      },
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'switchIn',
        yName: sample.meta.series.switchIn,
        stacked: true,
        normalizedTo: 100,
        fill: '#5a9e4a',
        strokeWidth: 0,
      },
      {
        type: 'bar',
        xKey: 'period',
        yKey: 'entry',
        yName: sample.meta.series.entry,
        stacked: true,
        normalizedTo: 100,
        fill: '#b8d96a',
        strokeWidth: 0,
      },
    ],
    axes: {
      x: {
        type: 'category',
        interval: { values: group.rows.map((row) => row.period) },
        label: { fontSize: 10, avoidCollisions: false, minSpacing: 0 },
        tick: { enabled: false },
      },
      y: {
        type: 'number',
        title: { text: sample.meta.yTitle, fontSize: 11 },
        min: 0,
        max: 100,
        nice: false,
        gridLine: { enabled: true },
        label: { fontSize: 10, avoidCollisions: false, minSpacing: 0 },
      },
    },
  }
}

export function BrandCompositionPage() {
  const chartRefs = useRef(new Map<string, AgChartInstance>())
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<BrandCompositionSample | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchBrandComposition(size)
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

  const brandGroups = useMemo(() => {
    if (!sample) return []
    return groupRowsByBrand(sample.rows)
  }, [sample])

  const brandCount = brandGroups.length
  const chartHeight = brandCount <= 1 ? 440 : 260

  const chartOptionsByBrand = useMemo(() => {
    if (!sample) return new Map<string, AgCartesianChartOptions>()
    const map = new Map<string, AgCartesianChartOptions>()
    brandGroups.forEach((group) => {
      map.set(
        group.brand,
        buildBrandOptions(sample, group, () => chartRefs.current.get(group.brand) ?? null),
      )
    })
    return map
  }, [sample, brandGroups])

  const gridClass =
    brandCount <= 1 ? 'bc-grid bc-grid--single' : 'bc-grid bc-grid--multi'

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">AG Charts 検証</p>
          <h1 className="tn-page-title">②新規・継続 構成比</h1>
        </div>
        <div className="tn-page-actions">
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
          <XlsxExportButton
            reportKey="brand-composition"
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

      <div className="ag-spike-controls" aria-label="データセット切替">
        <label className="ag-spike-controls-label" htmlFor="bc-size">
          ブランド数: {size} / {SIZE_MAX}
        </label>
        <input
          id="bc-size"
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
        {brandGroups.length > 0 && sample ? (
          <div className="tn-chart-frame-800">
            <div key={sample.size} className={gridClass}>
              {brandGroups.map((group) => {
                const options = chartOptionsByBrand.get(group.brand)
                if (!options) return null
                return (
                  <div key={group.brand} className="bc-tile">
                    <div className="bc-tile-header">
                      <span className="bc-tile-title">{group.brand}</span>
                    </div>
                    <div className="ag-spike-chart-host bc-tile-chart">
                      <AgCharts
                        ref={(instance) => {
                          if (instance) {
                            chartRefs.current.set(group.brand, instance)
                          } else {
                            chartRefs.current.delete(group.brand)
                          }
                        }}
                        options={options}
                        style={{ width: '100%', height: chartHeight }}
                      />
                    </div>
                  </div>
                )
              })}
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
