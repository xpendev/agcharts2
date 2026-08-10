import type { ScratchEdge, ScratchNode } from './scratchData'

/** SVG viewBox 幅（紙の横サイズ） */
export const VIEW_W = 1200
/** SVG viewBox 高さ（紙の縦サイズ） */
export const VIEW_H = 560
/** グラフ中心 X（ノード配置・圏外矢印の基準） */
export const CX = VIEW_W / 2
/** グラフ中心 Y */
export const CY = VIEW_H / 2
/** ノード楕円の幅 */
export const NODE_W = 168
/** ノード楕円の高さ */
export const NODE_H = 64

/** 流入/流出線の表示最小値スライダー初期値 */
export const EDGE_MIN_DEFAULT = 50
/** 流入/流出線の表示最小値スライダー上限 */
export const EDGE_MIN_MAX = 1000

/** ノードを並べる大きな楕円軌道の横半径 */
const RADIUS_X = 430
/** ノードを並べる大きな楕円軌道の縦半径 */
const RADIUS_Y = 195

/** 件数ラベルを線から少しずらす距離（px） */
const EDGE_LABEL_OFFSET = 12
/** 圏外矢印の先端をノード縁から外へ伸ばす距離（横方向めやす） */
const EXTERNAL_TIP_GAP_X = 36
/** 圏外矢印の先端をノード縁から外へ伸ばす距離（縦方向めやす） */
const EXTERNAL_TIP_GAP_Y = 28
/** 圏外件数ラベルを先端からさらに外へずらす距離 */
const EXTERNAL_LABEL_GAP = 14

/** 2D 座標 */
export type Point = { x: number; y: number }

/** グラフ上ツールチップの表示状態 */
export type TooltipState = {
  x: number
  y: number
  title: string
  lines: string[]
}

/** 座標付きノード（layoutNodes の戻り値） */
export type LaidOutNode = ScratchNode & { center: Point }

/** 幾何情報付きエッジ（layoutEdges の戻り値） */
export type LaidOutEdge = {
  edge: ScratchEdge
  fromLabel: string
  toLabel: string
  geom: {
    /** 線の始点（出発ノードの縁） */
    start: Point
    /** 線の終点（到着ノードの縁） */
    end: Point
    /** 線の中点（ツールチップ位置など） */
    mid: Point
    /** 件数ラベルの位置 */
    labelPos: Point
  }
}

/** 数値を日本ロケールのカンマ区切りにする */
export function formatInt(n: number): string {
  return n.toLocaleString('ja-JP')
}

/**
 * 前期→当期の差分と増減率を文字列で返す。
 * before が 0 のときは割合を計算できないので「—」。
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

/**
 * ノード中心を、大きな楕円軌道上に等間隔で並べた座標一覧を返す。
 * 上（12時）から時計回り。描画はしない。
 */
function nodeCenters(count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    /** 1周ぶんの角度（2π = 360度） */
    const FULL_TURN = 2 * Math.PI
    /** 12時方向から始めるための開始オフセット（必須ではなく見た目の都合） */
    const START_AT_TOP = -Math.PI / 2
    /** ノード1個ぶん進む角度 */
    const stepAngle = FULL_TURN / count
    /** i個目までに進む角度 */
    const angleFromStart = i * stepAngle
    /** 最終的な角度（12時開始 + i個目の進み） */
    const angle = START_AT_TOP + angleFromStart

    // 中心から「その角度の方向」へ、軌道半径ぶん進んだ点がノード中心
    const x = CX + RADIUS_X * Math.cos(angle)
    const y = CY + RADIUS_Y * Math.sin(angle)
    return { x, y }
  })
}

/**
 * 楕円ノードの「縁」上の点を返す。
 * 線を中心から生やさず、ノード外周から出すために使う。
 */
function ellipseEdgePoint(center: Point, angle: number): Point {
  const halfWidth = NODE_W / 2
  const halfHeight = NODE_H / 2
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  // 楕円の縁までの距離（向きによって変わる）
  const denom = Math.sqrt(
    halfWidth * halfWidth * sin * sin + halfHeight * halfHeight * cos * cos,
  )
  const distanceToEdge = (halfWidth * halfHeight) / denom

  return {
    x: center.x + distanceToEdge * cos,
    y: center.y + distanceToEdge * sin,
  }
}

/** 点 a から点 b へ向かう向き（ラジアン） */
function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}

/** 2点の中点 */
function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/**
 * ノード中心どうしから、矢印1本分の始終点・ラベル位置を作る。
 * start/end はノード縁上（中心ではない）。
 */
function buildEdgeGeometry(fromCenter: Point, toCenter: Point): LaidOutEdge['geom'] {
  const directionAngle = angleBetween(fromCenter, toCenter)
  // 到着側は逆向き（ノードへ向かう側の縁）
  const oppositeAngle = directionAngle + Math.PI

  const start = ellipseEdgePoint(fromCenter, directionAngle)
  const end = ellipseEdgePoint(toCenter, oppositeAngle)
  const mid = midpoint(start, end)

  // 線に対して垂直方向へ少しずらしてラベルを置く
  const perpendicularX = -Math.sin(directionAngle)
  const perpendicularY = Math.cos(directionAngle)
  const labelPos = {
    x: mid.x + perpendicularX * EDGE_LABEL_OFFSET,
    y: mid.y + perpendicularY * EDGE_LABEL_OFFSET,
  }

  return { start, end, mid, labelPos }
}

/**
 * 圏外流入／流出矢印の始終点とラベル位置を返す。
 * external < 0 … ノードから外へ流出 / >= 0 … 外からノードへ流入
 */
export function externalArrow(
  center: Point,
  external: number,
): { lineStart: Point; lineEnd: Point; label: Point } {
  // グラフ中心からノードへ向かう向き＝圏外矢印の向き
  const outwardAngle = angleBetween({ x: CX, y: CY }, center)
  const isOutflow = external < 0

  const tip = {
    x: center.x + Math.cos(outwardAngle) * (NODE_W / 2 + EXTERNAL_TIP_GAP_X),
    y: center.y + Math.sin(outwardAngle) * (NODE_H / 2 + EXTERNAL_TIP_GAP_Y),
  }
  const baseOnNodeEdge = ellipseEdgePoint(center, outwardAngle)
  const label = {
    x: tip.x + Math.cos(outwardAngle) * EXTERNAL_LABEL_GAP,
    y: tip.y + Math.sin(outwardAngle) * EXTERNAL_LABEL_GAP,
  }

  if (isOutflow) {
    return { lineStart: baseOnNodeEdge, lineEnd: tip, label }
  }
  return { lineStart: tip, lineEnd: baseOnNodeEdge, label }
}

/** ノードに center を付けた LaidOutNode 一覧を返す（描画はしない） */
export function layoutNodes(nodes: ScratchNode[]): LaidOutNode[] {
  const centers = nodeCenters(nodes.length)
  return nodes.map((node, index) => ({
    ...node,
    center: centers[index],
  }))
}

/**
 * エッジに始終点などの幾何情報を付けた LaidOutEdge 一覧を返す。
 * from/to のノードが見つからない行は捨てる。
 */
export function layoutEdges(
  edges: ScratchEdge[],
  nodes: LaidOutNode[],
): LaidOutEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return edges
    .map((edge) => {
      const fromNode = nodeById.get(edge.from)
      const toNode = nodeById.get(edge.to)
      if (!fromNode || !toNode) return null

      return {
        edge,
        fromLabel: fromNode.label,
        toLabel: toNode.label,
        geom: buildEdgeGeometry(fromNode.center, toNode.center),
      }
    })
    .filter((item): item is LaidOutEdge => item !== null)
}
