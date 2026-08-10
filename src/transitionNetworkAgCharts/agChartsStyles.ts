import type { AgChartOptions } from 'ag-charts-enterprise'
import { formatInt } from './agChartsHelpers'

// --- 色（他実装のダーク基調に合わせる） ---
const NODE_FILL = '#3d7fa8'
const NODE_STROKE = '#9fd0ef'
const LINK_FILL = '#5b9fd4'
const LINK_STROKE = '#7eb6de'
const LABEL_COLOR = '#e8eef3'
const TITLE_COLOR = '#eef5fa'
const SUBTITLE_COLOR = '#8aa0b2'
const BACKGROUND = '#1a1f24'

/** Chord 1 行（Helpers の toChordRows の戻りと同じ形） */
type ChordRow = {
  from: string
  to: string
  size: number
  value: number
}

/** Chord の見た目オプションを組み立てる（均等サイズ + 実数はツールチップ） */
export function buildChordOptions(data: ChordRow[]): AgChartOptions {
  return {
    background: { fill: BACKGROUND },
    padding: {
      top: 10,
      right: 18,
      bottom: 10,
      left: 18,
    },
    title: {
      text: 'カテゴリ間遷移（Chord）',
      color: TITLE_COLOR,
      spacing: 4,
    },
    subtitle: {
      text: '見た目の太さは均等。つながりは1〜3本。実件数はツールチップ',
      color: SUBTITLE_COLOR,
      spacing: 8,
    },
    data,
    series: [
      {
        type: 'chord',
        fromKey: 'from',
        toKey: 'to',
        // sizeKey は見た目用の均等値。実件数は datum.value をツールチップで表示
        sizeKey: 'size',
        sizeName: '件数',
        // --- 外周ノード（カテゴリ） ---
        node: {
          fill: NODE_FILL,
          stroke: NODE_STROKE,
          strokeWidth: 1,
          spacing: 1,
          width: 14,
        },
        // --- 弧（遷移） ---
        link: {
          fill: LINK_FILL,
          fillOpacity: 0.35,
          stroke: LINK_STROKE,
          strokeWidth: 1,
          strokeOpacity: 0.45,
        },
        label: {
          color: LABEL_COLOR,
          fontSize: 12,
        },
        tooltip: {
          renderer: ({ datum }) => {
            const row = datum as ChordRow
            // ノードホバー時は from/to が揃わないことがあるのでガード
            const hasLink =
              row?.from != null && row?.to != null && row?.value != null
            if (hasLink) {
              return {
                title: `${row.from} → ${row.to}`,
                data: [{ label: '件数', value: formatInt(row.value) }],
              }
            }
            return {
              title: String(row?.from ?? row?.to ?? 'カテゴリ'),
              data: [],
            }
          },
        },
      },
    ],
  }
}
