import type { AgContextMenuOptions } from 'ag-charts-enterprise'

/**
 * 帳票グラフ共通: 右クリックで当該チャートを PNG ダウンロード。
 * （AG Charts Context Menu の標準 `download`）
 */
export const chartContextMenuDownload: AgContextMenuOptions = {
  enabled: true,
  items: ['download'],
}
