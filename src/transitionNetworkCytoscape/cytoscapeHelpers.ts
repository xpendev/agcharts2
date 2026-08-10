import {
  NODE_COUNT_MAX,
  NODE_COUNT_MIN,
  type CytoscapeNetworkNode,
} from './cytoscapeData'

/** 流入/流出線の表示最小値スライダー初期値 */
export const EDGE_MIN_DEFAULT = 50
/** 流入/流出線の表示最小値スライダー上限 */
export const EDGE_MIN_MAX = 1000

/** 楕円配置の中心 X */
const CX = 600
/** 楕円配置の中心 Y */
const CY = 280
/** ノードを並べる大きな楕円軌道の横半径 */
const RADIUS_X = 430
/** ノードを並べる大きな楕円軌道の縦半径 */
const RADIUS_Y = 195

/** ノード楕円サイズ（cytoscapeStyles と揃える） */
const NODE_W = 168
const NODE_H = 64
/** 圏外矢印の先端をノード縁から外へ伸ばす距離 */
const EXTERNAL_TIP_GAP_X = 36
const EXTERNAL_TIP_GAP_Y = 28

/**
 * ノードを楕円状に等間隔配置した座標一覧を返す。
 * 上（12時）から時計回り。描画はしない。
 */
export function ellipsePositions(count: number): { x: number; y: number }[] {
  return Array.from({ length: count }, (_, i) => {
    /** 1周ぶんの角度（2π = 360度） */
    const FULL_TURN = 2 * Math.PI
    /** 12時方向から始めるための開始オフセット */
    const START_AT_TOP = -Math.PI / 2
    /** ノード1個ぶん進む角度 */
    const stepAngle = FULL_TURN / count
    /** i個目までに進む角度 */
    const angleFromStart = i * stepAngle
    /** 最終的な角度（12時開始 + i個目の進み） */
    const angle = START_AT_TOP + angleFromStart

    const x = CX + RADIUS_X * Math.cos(angle)
    const y = CY + RADIUS_Y * Math.sin(angle)
    return { x, y }
  })
}

/** 数値を日本ロケールのカンマ区切りにする */
export function formatInt(n: number): string {
  return n.toLocaleString('ja-JP')
}

/**
 * 前期→当期の差分と増減率を文字列で返す。
 * before が 0 のときは割合を「—」。
 */
export function formatDelta(
  before: number,
  after: number,
): {
  delta: string
  pct: string
} {
  const deltaValue = after - before
  const percentText =
    before === 0 ? '—' : `${Math.round((deltaValue / before) * 100)}%`
  return {
    delta: deltaValue.toLocaleString('ja-JP'),
    pct: percentText,
  }
}

type CyElement = {
  group: 'nodes' | 'edges'
  classes: string
  data: Record<string, string | number>
  position?: { x: number; y: number }
  selectable?: boolean
  grabbable?: boolean
}

/**
 * 圏外矢印用の要素（透明ゴーストノード + エッジ）を返す。
 * Cytoscape のエッジは必ず source/target ノードが必要なため、
 * Scratch の「何もないところからの線」はゴーストノードで代用する。
 */
export function buildExternalElements(
  nodes: CytoscapeNetworkNode[],
  positions: { x: number; y: number }[],
  edgeMinAbs: number,
): CyElement[] {
  const elements: CyElement[] = []

  nodes.forEach((node, index) => {
    if (node.external === 0) return

    const center = positions[index]
    // グラフ中心からノードへ向かう向き＝圏外矢印の向き
    const outwardAngle = Math.atan2(center.y - CY, center.x - CX)
    const tipDistanceX = NODE_W / 2 + EXTERNAL_TIP_GAP_X
    const tipDistanceY = NODE_H / 2 + EXTERNAL_TIP_GAP_Y
    const tip = {
      x: center.x + Math.cos(outwardAngle) * tipDistanceX,
      y: center.y + Math.sin(outwardAngle) * tipDistanceY,
    }
    const ghostId = `ext-ghost-${node.id}`
    const isInflow = node.external > 0
    const isMuted = Math.abs(node.external) < edgeMinAbs

    elements.push({
      group: 'nodes',
      classes: 'external-ghost',
      data: { id: ghostId, label: '' },
      position: tip,
      selectable: false,
      grabbable: false,
    })
    elements.push({
      group: 'edges',
      classes: isMuted ? 'external muted' : 'external',
      data: {
        id: `ext-${node.id}`,
        source: isInflow ? ghostId : node.id,
        target: isInflow ? node.id : ghostId,
        label: formatInt(node.external),
        value: node.external,
        fromLabel: isInflow ? '圏外' : node.label,
        toLabel: isInflow ? node.label : '圏外',
        kind: 'external',
      },
    })
  })

  return elements
}

/** ノード内に表示する複数行ラベルを組み立てる */
export function nodeLabelLines(node: CytoscapeNetworkNode): string {
  const { delta, pct } = formatDelta(node.before, node.after)
  const externalLine =
    node.external >= 0
      ? `外:+${formatInt(node.external)}`
      : `外:${formatInt(node.external)}`
  return [
    node.label,
    `${formatInt(node.before)} → ${formatInt(node.after)}`,
    `${delta} ${pct}`,
    externalLine,
  ].join('\n')
}

/** ノードホバー用ツールチップの文言を返す */
export function nodeTooltipContent(node: CytoscapeNetworkNode): {
  title: string
  lines: string[]
} {
  const { delta, pct } = formatDelta(node.before, node.after)
  const externalLabel =
    node.external >= 0
      ? `圏外からの流入: ${formatInt(node.external)}`
      : `圏外への流出: ${formatInt(Math.abs(node.external))}`
  return {
    title: node.label,
    lines: [
      `前期: ${formatInt(node.before)}`,
      `今期: ${formatInt(node.after)}`,
      `差分: ${delta}（${pct}）`,
      externalLabel,
    ],
  }
}

/** エッジホバー用ツールチップの文言を返す */
export function edgeTooltipContent(
  fromLabel: string,
  toLabel: string,
  value: number,
): {
  title: string
  lines: string[]
} {
  return {
    title: '遷移',
    lines: [`${fromLabel} → ${toLabel}`, `件数: ${formatInt(value)}`],
  }
}

/** ノード数スライダーの min / max */
export const NODE_SLIDER = {
  min: NODE_COUNT_MIN,
  max: NODE_COUNT_MAX,
} as const
