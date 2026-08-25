import type { AgChartInstance } from 'ag-charts-community'
import type { AgContextMenuOptions } from 'ag-charts-enterprise'

type ChartLike = Pick<AgChartInstance, 'getImageDataURL'> | null | undefined

/** チャート PNG をクリップボードへコピーする */
export async function copyChartPngToClipboard(chart: ChartLike): Promise<void> {
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
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/**
 * 帳票グラフ共通: 右クリックで Download（標準）と Copy（PNG クリップボード）。
 * getChart はメニュー実行時に当該チャート instance を返す。
 */
export function createChartContextMenu(
  getChart: () => ChartLike,
): AgContextMenuOptions {
  return {
    enabled: true,
    items: [
      'download',
      {
        type: 'action',
        showOn: 'always',
        label: 'Copy',
        action: () => {
          void copyChartPngToClipboard(getChart()).catch((error: unknown) => {
            const message =
              error instanceof Error
                ? error.message
                : 'PNGコピーに失敗しました。'
            window.alert(message)
          })
        },
      },
    ],
  }
}
