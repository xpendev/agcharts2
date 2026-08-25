import { useState } from 'react'

type XlsxExportButtonProps = {
  /** API パス末尾（例: brand-composition） */
  reportKey: string
  size: number
  disabled?: boolean
}

/**
 * 帳票共通: XlsX 出力ボタン。
 * GET /api/xlsx/{reportKey}?size=n → ダウンロード
 */
export function XlsxExportButton({
  reportKey,
  size,
  disabled = false,
}: XlsxExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const onClick = async () => {
    setIsExporting(true)
    try {
      const response = await fetch(`/api/xlsx/${reportKey}?size=${size}`)
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
      anchor.download = `${reportKey}-${size}.xlsx`
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
