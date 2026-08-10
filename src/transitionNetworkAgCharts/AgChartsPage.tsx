import { AgCharts } from 'ag-charts-react'
import {
  AnimationModule,
  ChordSeriesModule,
  LegendModule,
  ModuleRegistry,
} from 'ag-charts-enterprise'
import type { AgChartInstance, AgChartOptions } from 'ag-charts-community'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAgChartsNetwork,
  type AgChartsNetworkEdge,
  type AgChartsNetworkNode,
} from './agChartsData'
import {
  EDGE_MIN_DEFAULT,
  EDGE_MIN_MAX,
  filterAgChartsEdges,
  NODE_SLIDER,
  toChordRows,
} from './agChartsHelpers'
import { buildChordOptions } from './agChartsStyles'

// Chord は Enterprise 機能。評価利用時はウォーターマークが出ることがある。
ModuleRegistry.registerModules([
  AnimationModule,
  ChordSeriesModule,
  LegendModule,
])

/**
 * AG Charts Chord 版ページ。
 * state を持ち、API → Helpers → Chart options をつなぐ司令塔。
 */
export function AgChartsPage() {
  const chartRef = useRef<AgChartInstance<AgChartOptions> | null>(null)
  /** グラフに渡すノード数（スライダー確定値） */
  const [nodeCount, setNodeCount] = useState(8)
  /** しきい値未満の遷移を非表示にする絶対値 */
  const [edgeMinAbs, setEdgeMinAbs] = useState(EDGE_MIN_DEFAULT)
  const [message, setMessage] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isCopying, setIsCopying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [network, setNetwork] = useState<{
    nodes: AgChartsNetworkNode[]
    edges: AgChartsNetworkEdge[]
  } | null>(null)

  // --- API ---
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setMessage(null)

    void fetchAgChartsNetwork(nodeCount)
      .then((next) => {
        if (cancelled) return
        setNetwork(next)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setNetwork(null)
        setMessage(
          error instanceof Error
            ? error.message
            : '曼荼羅チャートの取得に失敗しました。',
        )
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [nodeCount])

  // --- Helpers → Styles ---
  const visibleEdges = useMemo(
    () => filterAgChartsEdges(network?.edges ?? [], edgeMinAbs),
    [network, edgeMinAbs],
  )
  const chordData = useMemo(
    () => toChordRows(visibleEdges, network?.nodes ?? []),
    [visibleEdges, network],
  )
  const options = useMemo(() => buildChordOptions(chordData), [chordData])

  const downloadPng = () => {
    setIsDownloading(true)
    setMessage(null)
    try {
      const chart = chartRef.current
      if (!chart) {
        throw new Error('グラフの準備ができていません。')
      }
      chart.download({ fileName: `transition-network-agcharts-${Date.now()}` })
      setMessage('PNGをダウンロードしました（AG Charts download API）。')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'PNGダウンロードに失敗しました。',
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
      if (!chart) {
        throw new Error('グラフの準備ができていません。')
      }
      if (!navigator.clipboard?.write) {
        throw new Error(
          'このブラウザではクリップボードへの画像コピーに対応していません。',
        )
      }
      const dataUrl = await chart.getImageDataURL()
      if (!dataUrl) {
        throw new Error('画像の生成に失敗しました。')
      }
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      setMessage('PNGをコピーしました。Ctrl+V で貼り付けできます。')
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'PNGコピーに失敗しました。',
      )
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <main className="tn-page">
      <header className="tn-page-header">
        <div>
          <p className="tn-page-eyebrow">ライブラリ検証</p>
          <h1 className="tn-page-title">曼荼羅チャート — AG Charts Chord</h1>
          <p className="tn-page-subtitle">
            AG Charts Enterprise の Customised Chord
            で、カテゴリ間の流出入を1枚の円環図として表示します（圏外なし・最大30）。
          </p>
        </div>
        <div className="tn-page-actions">
          <Link className="tn-page-link" to="/">
            トップ
          </Link>
          <Link className="tn-page-link" to="/transition-network">
            スクラッチ版へ
          </Link>
          <Link className="tn-page-link" to="/transition-network/cytoscape">
            Cytoscape 版へ
          </Link>
          <Link className="tn-page-link" to="/transition-network/gojs">
            GoJS 版へ
          </Link>
          <button
            type="button"
            className="tn-page-btn"
            disabled={isCopying}
            onClick={() => {
              void copyPng()
            }}
          >
            {isCopying ? 'コピー中…' : 'PNGをコピー'}
          </button>
          <button
            type="button"
            className="tn-page-btn"
            disabled={isDownloading}
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

      <div className="tn-page-stage tn-page-stage-agcharts">
        <div className="transition-network">
          <div className="tn-top-row">
            <aside className="tn-summary" aria-label="サマリ">
              <div className="tn-summary-badge">
                <div className="tn-summary-badge-title">集計項目</div>
                <div className="tn-summary-badge-line">
                  カテゴリ間遷移（Chord）
                </div>
                <div className="tn-summary-badge-line">圏外は非表示</div>
              </div>
              <div className="tn-summary-base">
                <div className="tn-summary-base-title">ベース金額</div>
                <div className="tn-summary-base-line">前期 26/01-26/06</div>
                <div className="tn-summary-base-line">当期 26/01-26/03</div>
              </div>
            </aside>

            <aside className="tn-top-control" aria-label="表示制御">
              <div className="tn-top-control-source">
                [データソース] 消費者購買系: CIPS
              </div>
              <label
                className="tn-top-control-label"
                htmlFor="tn-ag-edge-min"
              >
                流入/流出線表示最小値(絶対値)
              </label>
              <div className="tn-top-control-value">
                {edgeMinAbs.toLocaleString('ja-JP')}
              </div>
              <input
                id="tn-ag-edge-min"
                className="tn-slider"
                type="range"
                min={0}
                max={EDGE_MIN_MAX}
                step={1}
                value={edgeMinAbs}
                onChange={(e) => setEdgeMinAbs(Number(e.target.value))}
              />
            </aside>
          </div>

          <div className="tn-graph-area">
            <div className="tn-lib-badge">
              {isLoading
                ? 'データを読み込み中…'
                : 'AG Charts Chord（Enterprise・評価利用可）'}
            </div>
            <div className="tn-lib-canvas-host tn-agcharts-host">
              {network ? (
                <AgCharts
                  ref={chartRef}
                  options={options}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <div className="tn-graph-placeholder" role="status">
                  {isLoading
                    ? 'データを読み込み中…'
                    : '表示できるデータがありません。'}
                </div>
              )}
            </div>
          </div>

          <div className="tn-bottom-control">
            <label
              className="tn-bottom-control-label"
              htmlFor="tn-ag-node-count"
            >
              カテゴリ数: {nodeCount}
            </label>
            <input
              id="tn-ag-node-count"
              className="tn-slider tn-slider-bottom"
              type="range"
              min={NODE_SLIDER.min}
              max={NODE_SLIDER.max}
              step={1}
              value={nodeCount}
              onChange={(e) => setNodeCount(Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
