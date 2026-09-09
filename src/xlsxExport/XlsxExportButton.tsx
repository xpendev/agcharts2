import { useState } from 'react'

type XlsxExportButtonProps = {
  /** API パス末尾（例: brand-composition） */
  reportKey: string
  size: number
  disabled?: boolean
  /** 追加クエリ（例: cellStyle=data-bar） */
  queryParams?: Record<string, string>
  /** ダウンロードファイル名の末尾（例: data-bar → report-size-data-bar.xlsx） */
  fileSuffix?: string
  /** ボタン表示ラベル */
  label?: string
  /**
   * 指定時は AG Charts 等から得た PNG を POST し、サーバで Excel に貼付する。
   * 未指定時は従来どおり GET /api/xlsx/{reportKey}?size=n
   */
  getPng?: () => Promise<Blob>
}

/**
 * 帳票共通: XlsX 出力ボタン。
 * GET /api/xlsx/{reportKey}?size=n → ダウンロード
 * getPng あり: POST（body=PNG）→ ダウンロード
 */
export function XlsxExportButton({
  reportKey,
  size,
  disabled = false,
  queryParams,
  fileSuffix,
  label = 'XlsX出力',
  getPng,
}: XlsxExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const onClick = async () => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({ size: String(size) })
      if (queryParams) {
        for (const [key, value] of Object.entries(queryParams)) {
          params.set(key, value)
        }
      }
      const url = `/api/xlsx/${reportKey}?${params.toString()}`

      let response: Response
      if (getPng) {
        const png = await getPng()
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'image/png' },
          body: png,
        })
      } else {
        response = await fetch(url)
      }

      if (!response.ok) {
        let detail = `HTTP ${response.status}`
        try {
          const json = (await response.json()) as { error?: string }
          if (json.error) detail = json.error
        } catch {
          // ignore
        }
        throw new Error(detail)
      }
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = fileSuffix
        ? `${reportKey}-${size}-${fileSuffix}.xlsx`
        : `${reportKey}-${size}.xlsx`
      anchor.click()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'XlsX の出力に失敗しました。',
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      type="button"
      className="tn-page-btn"
      disabled={disabled || isExporting}
      onClick={() => {
        void onClick()
      }}
    >
      {isExporting ? 'XlsX出力中…' : label}
    </button>
  )
}
