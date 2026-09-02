import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

/** 下→上: 継続リピート / スイッチイン / カテゴリエントリ。常に正で合計100 */
function buildCell(brandIndex, periodIndex, size) {
  const repeat =
    Math.round((48 + ((brandIndex * 3 + periodIndex * 2 + size) % 16)) * 10) / 10
  const switchIn =
    Math.round((20 + ((brandIndex * 2 + periodIndex + size) % 10)) * 10) / 10
  const entry = Math.round((100 - repeat - switchIn) * 10) / 10
  return { repeat, switchIn, entry }
}

for (let size = 1; size <= 8; size += 1) {
  const periods = ["'03/4-", "'04/4-", "'05/4-", "'06/4-", "'07/4-"]
  const rows = []
  for (let b = 1; b <= size; b += 1) {
    for (let p = 0; p < periods.length; p += 1) {
      const { repeat, switchIn, entry } = buildCell(b, p, size)
      rows.push({
        brand: `ブランド${b}`,
        period: periods[p],
        repeat,
        switchIn,
        entry,
      })
    }
  }
  const file = path.join(outDir, `brand-composition-${size}.json`)
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        meta: {
          title: '人数構成比',
          yTitle: '人数構成比 (%)',
          series: {
            repeat: 'リピート',
            switchIn: 'トライアル(スイッチイン)',
            entry: 'トライアル(カテゴリエントリ)',
          },
        },
        size,
        rows,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  console.log('wrote', file)
}
