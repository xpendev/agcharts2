import {
  NODE_H,
  NODE_W,
  VIEW_H,
  VIEW_W,
  externalArrow,
  formatDelta,
  formatInt,
  type LaidOutEdge,
  type LaidOutNode,
  type TooltipState,
} from './scratchHelpers'
import { scratchStyles } from './scratchStyles'

type ScratchGraphProps = {
  nodes: LaidOutNode[]
  edges: LaidOutEdge[]
  edgeMinAbs: number
  tooltip: TooltipState | null
  hoverEdgeKey: string | null
  hoverNodeId: string | null
  onHoverEdge: (key: string | null, tooltip: TooltipState | null) => void
  onHoverNode: (id: string | null, tooltip: TooltipState | null) => void
}

/** 矢じり path（右向き三角）。marker 内の viewBox 0..10 上で描く */
const ARROW_PATH_D = 'M 0 1.5 L 9 5 L 0 8.5 Z'

/** 遷移線の太さ: 件数に応じて増やし、上限 4 で頭打ち */
function edgeStrokeWidth(value: number): number {
  const rawWidth = 1.2 + Math.abs(value) / 400
  return Math.min(4, rawWidth)
}

type ArrowMarkerProps = {
  id: string
  fill: string
  /** 通常矢印 7 / 圏外矢印 6 */
  size: number
}

/** defs 内の矢じり部品（同じ形・色とサイズだけ違う） */
function ArrowMarker({ id, fill, size }: ArrowMarkerProps) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth={size}
      markerHeight={size}
      orient="auto-start-reverse"
    >
      <path d={ARROW_PATH_D} fill={fill} />
    </marker>
  )
}

/**
 * 中央の曼荼羅チャート SVG。
 * 座標は props の nodes/edges（Helpers の戻り値）をそのまま使う。
 */
export function ScratchGraph({
  nodes,
  edges,
  edgeMinAbs,
  tooltip,
  hoverEdgeKey,
  hoverNodeId,
  onHoverEdge,
  onHoverNode,
}: ScratchGraphProps) {
  return (
    <div className="tn-graph-area">
      <svg
        className="scratch-network-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="曼荼羅チャート"

      >
        <defs>
          {/* 矢じり部品置き場。line の markerEnd から id で参照する */}
          <ArrowMarker
            id="tn-arrow"
            fill={scratchStyles.arrowMarkerFill}
            size={7}
          />
          <ArrowMarker
            id="tn-arrow-muted"
            fill={scratchStyles.arrowMarkerMutedFill}
            size={7}
          />
          <ArrowMarker
            id="tn-arrow-ext"
            fill={scratchStyles.arrowExtMarkerFill}
            size={6}
          />
          <ArrowMarker
            id="tn-arrow-ext-muted"
            fill={scratchStyles.arrowMarkerMutedFill}
            size={6}
          />
          <linearGradient id="tn-node-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scratchStyles.nodeGradient.start} />
            <stop offset="100%" stopColor={scratchStyles.nodeGradient.end} />
          </linearGradient>
          <linearGradient id="tn-node-fill-hover" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={scratchStyles.nodeGradientHover.start}
            />
            <stop
              offset="100%"
              stopColor={scratchStyles.nodeGradientHover.end}
            />
          </linearGradient>
        </defs>

        <rect
          width={VIEW_W}
          height={VIEW_H}
          fill={scratchStyles.canvasBg}
          rx="8"
        />

        {/* --- 遷移矢印 --- */}
        {edges.map(({ edge, fromLabel, toLabel, geom }) => {
          const edgeKey = `${edge.from}-${edge.to}`
          const isHovered = hoverEdgeKey === edgeKey
          const isMuted = Math.abs(edge.value) < edgeMinAbs
          const baseWidth = edgeStrokeWidth(edge.value)
          const strokeWidth = isHovered ? baseWidth + 1 : baseWidth

          const strokeColor = isHovered
            ? isMuted
              ? scratchStyles.edgeStrokeMutedHover
              : scratchStyles.edgeStrokeHover
            : isMuted
              ? scratchStyles.edgeStrokeMuted
              : scratchStyles.edgeStroke

          const markerEnd = isMuted
            ? 'url(#tn-arrow-muted)'
            : 'url(#tn-arrow)'
          const labelFill = isMuted
            ? scratchStyles.edgeLabelFillMuted
            : scratchStyles.edgeLabelFill

          return (
            <g key={edgeKey} opacity={isMuted ? 0.55 : 0.95}>
              <line
                x1={geom.start.x}
                y1={geom.start.y}
                x2={geom.end.x}
                y2={geom.end.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                markerEnd={markerEnd}
                pointerEvents="none"
              />
              {/*
                ホバー用の太い透明線（実線は細いので当たりを広げる）。
                React の onMouseEnter / Leave。jQuery ではない。
              */}
              <line
                x1={geom.start.x}
                y1={geom.start.y}
                x2={geom.end.x}
                y2={geom.end.y}
                stroke="transparent"
                strokeWidth={14}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  onHoverEdge(edgeKey, {
                    x: geom.mid.x,
                    y: geom.mid.y,
                    title: '遷移',
                    lines: [
                      `${fromLabel} → ${toLabel}`,
                      `件数: ${formatInt(edge.value)}`,
                    ],
                  })
                }}
                onMouseLeave={() => onHoverEdge(null, null)}
              />
              <text
                x={geom.labelPos.x}
                y={geom.labelPos.y}
                fill={labelFill}
                fontSize={11}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
              >
                {formatInt(edge.value)}
              </text>
            </g>
          )
        })}

        {/* --- ノード（楕円）＋圏外矢印 --- */}
        {nodes.map((node) => {
          const hasExternal = node.external !== 0
          const isExternalMuted = Math.abs(node.external) < edgeMinAbs
          const externalGeom = externalArrow(node.center, node.external)
          const { delta, pct } = formatDelta(node.before, node.after)
          const isHovered = hoverNodeId === node.id
          const externalTooltipLine =
            node.external >= 0
              ? `圏外からの流入: ${formatInt(node.external)}`
              : `圏外への流出: ${formatInt(Math.abs(node.external))}`

          return (
            <g key={node.id}>
              {hasExternal ? (
                <g opacity={isExternalMuted ? 0.55 : 1}>
                  <line
                    x1={externalGeom.lineStart.x}
                    y1={externalGeom.lineStart.y}
                    x2={externalGeom.lineEnd.x}
                    y2={externalGeom.lineEnd.y}
                    stroke={
                      isExternalMuted
                        ? scratchStyles.externalStrokeMuted
                        : scratchStyles.externalStroke
                    }
                    strokeWidth={1.4}
                    markerEnd={
                      isExternalMuted
                        ? 'url(#tn-arrow-ext-muted)'
                        : 'url(#tn-arrow-ext)'
                    }
                    pointerEvents="none"
                  />
                  <text
                    x={externalGeom.label.x}
                    y={externalGeom.label.y}
                    fill={
                      isExternalMuted
                        ? scratchStyles.externalLabelFillMuted
                        : scratchStyles.externalLabelFill
                    }
                    fontSize={11}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    pointerEvents="none"
                  >
                    {formatInt(node.external)}
                  </text>
                </g>
              ) : null}

              <ellipse
                cx={node.center.x}
                cy={node.center.y}
                rx={NODE_W / 2}
                ry={NODE_H / 2}
                fill={
                  isHovered ? 'url(#tn-node-fill-hover)' : 'url(#tn-node-fill)'
                }
                stroke={
                  isHovered
                    ? scratchStyles.nodeStrokeHover
                    : scratchStyles.nodeStroke
                }
                strokeWidth={isHovered ? 2 : 1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => {
                  onHoverNode(node.id, {
                    x: node.center.x,
                    y: node.center.y - NODE_H / 2 - 8,
                    title: node.label,
                    lines: [
                      `前期: ${formatInt(node.before)}`,
                      `今期: ${formatInt(node.after)}`,
                      `差分: ${delta}（${pct}）`,
                      externalTooltipLine,
                    ],
                  })
                }}
                onMouseLeave={() => onHoverNode(null, null)}
              />
              <text
                x={node.center.x}
                y={node.center.y - 16}
                fill={scratchStyles.nodeTitleFill}
                fontSize={12}
                fontWeight={600}
                textAnchor="middle"
                pointerEvents="none"
              >
                {node.label}
              </text>
              <text
                x={node.center.x}
                y={node.center.y + 2}
                fill={scratchStyles.nodeBodyFill}
                fontSize={11}
                textAnchor="middle"
                pointerEvents="none"
              >
                {formatInt(node.before)} → {formatInt(node.after)}
              </text>
              <text
                x={node.center.x}
                y={node.center.y + 18}
                fill={scratchStyles.nodeDeltaFill}
                fontSize={11}
                textAnchor="middle"
                pointerEvents="none"
              >
                {delta} {pct}
              </text>
            </g>
          )
        })}
      </svg>

      {tooltip ? (
        <div
          className="tn-tooltip"
          style={{
            left: `${(tooltip.x / VIEW_W) * 100}%`,
            top: `${(tooltip.y / VIEW_H) * 100}%`,
          }}
        >
          <div className="tn-tooltip-title">{tooltip.title}</div>
          {tooltip.lines.map((line) => (
            <div key={line} className="tn-tooltip-line">
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
