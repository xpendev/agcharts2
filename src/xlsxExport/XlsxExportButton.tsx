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
}

/**
 * 帳票共通: XlsX 出力ボタン。
 * GET /api/xlsx/{reportKey}?size=n → ダウンロード
 */
export function XlsxExportButton({
  reportKey,
  size,
  disabled = false,
  queryParams,
  fileSuffix,
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
      const response = await fetch(`/api/xlsx/${reportKey}?${params.toString()}`)
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
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileSuffix
        ? `${reportKey}-${size}-${fileSuffix}.xlsx`
        : `${reportKey}-${size}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
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
      {isExporting ? 'XlsX出力中…' : 'XlsX出力'}
    </button>
  )
}
