import go from 'gojs'

const $ = go.GraphObject.make

/** PNG 出力・キャンバス背景色 */
export const GOJS_DIAGRAM_BG = '#1a1f24'

// --- ノード色 ---
/** ノード塗り（通常） */
export const NODE_FILL = '#3d7fa8'
/** ノード枠線（通常） */
export const NODE_STROKE = '#9fd0ef'
/** ノード塗り（ホバー） */
export const NODE_FILL_HOVER = '#4f96bd'
/** ノード枠線（ホバー） */
export const NODE_STROKE_HOVER = '#c5e6f8'
/** ノード内テキスト色 */
export const NODE_TEXT = '#ffffff'

// --- 遷移リンク色 ---
/** リンク線・矢印（通常） */
export const LINK_STROKE = '#5b9fd4'
/** リンク線（ホバー） */
export const LINK_STROKE_HOVER = '#9fd0ef'
/** 表示最小値未満のリンク（グレー） */
export const LINK_STROKE_MUTED = '#6a737a'
/** 表示最小値未満のリンク（ホバー） */
export const LINK_STROKE_MUTED_HOVER = '#8a939b'
/** リンクラベル色 */
export const LINK_LABEL = '#e8eef3'
/** 表示最小値未満のリンクラベル */
export const LINK_LABEL_MUTED = '#9aa3ab'

// --- 圏外リンク色 ---
/** 圏外リンク色 */
export const EXTERNAL_LINK_STROKE = '#7eb6de'
/** 圏外リンク（グレー） */
export const EXTERNAL_LINK_STROKE_MUTED = '#6a737a'

// --- ノードサイズ ---
/** ノード楕円の幅 */
export const NODE_WIDTH = 168
/** ノード楕円の高さ */
export const NODE_HEIGHT = 64

/** 件数から線幅を求める（おおよそ 1.2〜4） */
function linkStrokeWidthFromValue(value: number): number {
  const BASE_WIDTH = 1.2
  const VALUE_SCALE = 400
  const MAX_WIDTH = 4
  return Math.min(MAX_WIDTH, BASE_WIDTH + Math.abs(value) / VALUE_SCALE)
}

type GraphObjectHandlers = {
  mouseEnter: (e: go.InputEvent, obj: go.GraphObject) => void
  mouseLeave: (e: go.InputEvent, obj: go.GraphObject) => void
}

/** ノードテンプレート（見た目＋渡されたホバーハンドラ）を組み立てる */
export function buildNodeTemplate(handlers: GraphObjectHandlers): go.Node {
  return $(
    go.Node,
    'Auto',
    {
      locationSpot: go.Spot.Center,
      selectable: true,
      mouseEnter: handlers.mouseEnter,
      mouseLeave: handlers.mouseLeave,
    },
    new go.Binding('location', 'loc', go.Point.parse),
    $(go.Shape, 'Ellipse', {
      name: 'SHAPE',
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      fill: NODE_FILL,
      stroke: NODE_STROKE,
      strokeWidth: 1,
    }),
    $(
      go.TextBlock,
      {
        stroke: NODE_TEXT,
        font: '11px sans-serif',
        textAlign: 'center',
        margin: 4,
      },
      new go.Binding('text', 'label'),
    ),
  )
}

/** 圏外矢印用の透明ゴーストノード */
export function buildGhostNodeTemplate(): go.Node {
  return $(
    go.Node,
    {
      locationSpot: go.Spot.Center,
      selectable: false,
      pickable: false,
    },
    new go.Binding('location', 'loc', go.Point.parse),
    $(go.Shape, 'Circle', {
      width: 1,
      height: 1,
      fill: null,
      stroke: null,
    }),
  )
}

/** リンクテンプレート（見た目＋渡されたホバーハンドラ）を組み立てる */
export function buildLinkTemplate(handlers: GraphObjectHandlers): go.Link {
  return $(
    go.Link,
    {
      routing: go.Routing.Normal,
      curve: go.Curve.Bezier,
      selectable: false,
      mouseEnter: handlers.mouseEnter,
      mouseLeave: handlers.mouseLeave,
    },
    $(
      go.Shape,
      { name: 'PATH', stroke: LINK_STROKE, strokeWidth: 1.5 },
      new go.Binding('strokeWidth', 'value', linkStrokeWidthFromValue),
      new go.Binding('stroke', 'muted', (muted: boolean) =>
        muted ? LINK_STROKE_MUTED : LINK_STROKE,
      ),
      new go.Binding('opacity', 'muted', (muted: boolean) => (muted ? 0.55 : 1)),
    ),
    $(
      go.Shape,
      {
        name: 'ARROW',
        toArrow: 'Standard',
        fill: LINK_STROKE,
        stroke: null,
        scale: 1.2,
      },
      new go.Binding('fill', 'muted', (muted: boolean) =>
        muted ? LINK_STROKE_MUTED : LINK_STROKE,
      ),
      new go.Binding('opacity', 'muted', (muted: boolean) => (muted ? 0.55 : 1)),
    ),
    $(
      go.TextBlock,
      {
        stroke: LINK_LABEL,
        font: '11px sans-serif',
        segmentOffset: new go.Point(0, -10),
      },
      new go.Binding('text', 'label'),
      new go.Binding('stroke', 'muted', (muted: boolean) =>
        muted ? LINK_LABEL_MUTED : LINK_LABEL,
      ),
    ),
  )
}

/** 圏外リンクテンプレート（Scratch の圏外矢印に近い見た目） */
export function buildExternalLinkTemplate(
  handlers: GraphObjectHandlers,
): go.Link {
  return $(
    go.Link,
    {
      routing: go.Routing.Normal,
      curve: go.Curve.None,
      selectable: false,
      mouseEnter: handlers.mouseEnter,
      mouseLeave: handlers.mouseLeave,
    },
    $(
      go.Shape,
      {
        name: 'PATH',
        stroke: EXTERNAL_LINK_STROKE,
        strokeWidth: 1.4,
      },
      new go.Binding('stroke', 'muted', (muted: boolean) =>
        muted ? EXTERNAL_LINK_STROKE_MUTED : EXTERNAL_LINK_STROKE,
      ),
      new go.Binding('opacity', 'muted', (muted: boolean) => (muted ? 0.55 : 1)),
    ),
    $(
      go.Shape,
      {
        name: 'ARROW',
        toArrow: 'Standard',
        fill: EXTERNAL_LINK_STROKE,
        stroke: null,
        scale: 1.1,
      },
      new go.Binding('fill', 'muted', (muted: boolean) =>
        muted ? EXTERNAL_LINK_STROKE_MUTED : EXTERNAL_LINK_STROKE,
      ),
      new go.Binding('opacity', 'muted', (muted: boolean) => (muted ? 0.55 : 1)),
    ),
    $(
      go.TextBlock,
      {
        stroke: LINK_LABEL,
        font: '11px sans-serif',
        segmentOffset: new go.Point(0, -10),
      },
      new go.Binding('text', 'label'),
      new go.Binding('stroke', 'muted', (muted: boolean) =>
        muted ? LINK_LABEL_MUTED : LINK_LABEL,
      ),
    ),
  )
}
