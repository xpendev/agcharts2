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
  SyncModule,
} from 'ag-charts-enterprise'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createChartContextMenu } from '../agChartsCommon'
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
  SyncModule,
  ContextMenuModule,
])

const SYNC_GROUP_PREFIX = 'brand-composition'

function buildBrandOptions(
  sample: BrandCompositionSample,
  group: BrandGroup,
  options: {
    showLegend: boolean
    enableSync: boolean
    syncGroupId: string
  },
  getChart: () => AgChartInstance | null,
): AgCartesianChartOptions {
  return {
    animation: { enabled: false },
    background: { fill: '#ffffff' },
    contextMenu: createChartContextMenu(getChart),
    // タイトルは DnD ハンドル側に出す（チャート内タイトルは使わない）
    legend: {
      enabled: options.showLegend,
      position: 'bottom',
    },
    sync: options.enableSync
      ? {
          enabled: true,
          groupId: options.syncGroupId,
          axes: 'xy',
          nodeInteraction: true,
        }
      : { enabled: false },
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
        label: { fontSize: 10 },
        tick: { enabled: false },
      },
      y: {
        type: 'number',
        title: { text: sample.meta.yTitle, fontSize: 11 },
        min: 0,
        max: 100,
        nice: false,
        gridLine: { enabled: true },
      },
    },
  }
}

// function reorderBrands(
//   brands: string[],
//   fromBrand: string,
//   toBrand: string,
// ): string[] {
//   if (fromBrand === toBrand) return brands
//   const next = [...brands]
//   const fromIndex = next.indexOf(fromBrand)
//   const toIndex = next.indexOf(toBrand)
//   if (fromIndex < 0 || toIndex < 0) return brands
//   next.splice(fromIndex, 1)
//   next.splice(toIndex, 0, fromBrand)
//   return next
// }

export function BrandCompositionPage() {
  const chartRefs = useRef(
    new Map<string, AgChartInstance<AgCartesianChartOptions>>(),
  )
  const [size, setSize] = useState(SIZE_DEFAULT)
  const [sample, setSample] = useState<BrandCompositionSample | null>(null)
  const [brandOrder, setBrandOrder] = useState<string[]>([])
  // const [draggingBrand, setDraggingBrand] = useState<string | null>(null)
  // const [dropTargetBrand, setDropTargetBrand] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)
    void fetchBrandComposition(size)
      .then((next) => {
        if (cancelled) return
        setSample(next)
        setBrandOrder(groupRowsByBrand(next.rows).map((g) => g.brand))
        // setDraggingBrand(null)
        // setDropTargetBrand(null)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSample(null)
        setBrandOrder([])
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

  const brandGroupMap = useMemo(() => {
    if (!sample) return new Map<string, BrandGroup>()
    return new Map(
      groupRowsByBrand(sample.rows).map((group) => [group.brand, group]),
    )
  }, [sample])

  const orderedGroups = useMemo(() => {
    return brandOrder
      .map((brand) => brandGroupMap.get(brand))
      .filter((group): group is BrandGroup => Boolean(group))
  }, [brandOrder, brandGroupMap])

  const brandCount = orderedGroups.length
  const enableSync = brandCount >= 2
  // const canDrag = brandCount >= 2
  const syncGroupId = `${SYNC_GROUP_PREFIX}-${sample?.size ?? size}`
  const chartHeight = brandCount <= 1 ? 440 : 260

  const chartOptionsByBrand = useMemo(() => {
    if (!sample) return new Map<string, AgCartesianChartOptions>()
    const map = new Map<string, AgCartesianChartOptions>()
    orderedGroups.forEach((group) => {
      map.set(
        group.brand,
        buildBrandOptions(
          sample,
          group,
          {
            showLegend: true,
            enableSync,
            syncGroupId,
          },
          () => chartRefs.current.get(group.brand) ?? null,
        ),
      )
    })
    return map
  }, [sample, orderedGroups, enableSync, syncGroupId])

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
        {orderedGroups.length > 0 && sample ? (
          <div className="tn-chart-frame-800">
            <div key={sample.size} className={gridClass}>
              {orderedGroups.map((group) => {
                const options = chartOptionsByBrand.get(group.brand)
                if (!options) return null
                // const isDragging = draggingBrand === group.brand
                // const isDropTarget =
                //   dropTargetBrand === group.brand && draggingBrand !== group.brand
                return (
                  <div
                    key={group.brand}
                    className="bc-tile"
                    // className={[
                    //   'bc-tile',
                    //   isDragging ? 'bc-tile--dragging' : '',
                    //   isDropTarget ? 'bc-tile--drop-target' : '',
                    // ]
                    //   .filter(Boolean)
                    //   .join(' ')}
                    // onDragOver={(event) => {
                    //   if (!canDrag || !draggingBrand) return
                    //   event.preventDefault()
                    //   event.dataTransfer.dropEffect = 'move'
                    //   if (dropTargetBrand !== group.brand) {
                    //     setDropTargetBrand(group.brand)
                    //   }
                    // }}
                    // onDragLeave={() => {
                    //   if (dropTargetBrand === group.brand) {
                    //     setDropTargetBrand(null)
                    //   }
                    // }}
                    // onDrop={(event) => {
                    //   if (!canDrag || !draggingBrand) return
                    //   event.preventDefault()
                    //   setBrandOrder((prev) =>
                    //     reorderBrands(prev, draggingBrand, group.brand),
                    //   )
                    //   setDraggingBrand(null)
                    //   setDropTargetBrand(null)
                    // }}
                  >
                    <div
                      className="bc-tile-handle"
                      // draggable={canDrag}
                      // title={
                      //   canDrag
                      //     ? 'ドラッグして並べ替え'
                      //     : undefined
                      // }
                      // onDragStart={(event) => {
                      //   if (!canDrag) {
                      //     event.preventDefault()
                      //     return
                      //   }
                      //   event.dataTransfer.effectAllowed = 'move'
                      //   event.dataTransfer.setData('text/plain', group.brand)
                      //   setDraggingBrand(group.brand)
                      // }}
                      // onDragEnd={() => {
                      //   setDraggingBrand(null)
                      //   setDropTargetBrand(null)
                      // }}
                    >
                      {/* <span className="bc-tile-handle-grip" aria-hidden>
                        ⋮⋮
                      </span> */}
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
