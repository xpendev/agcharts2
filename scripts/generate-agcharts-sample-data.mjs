import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

function writeJson(name, payload) {
  const file = path.join(outDir, name)
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log('wrote', file)
}

// --- purchase-in-out（専用スクリプトに委譲） ---
spawnSync(process.execPath, [path.join(__dirname, 'generate-purchase-in-out-data.mjs')], {
  stdio: 'inherit',
})

// --- waterfall（size = 棒の数 1〜7） ---
spawnSync(process.execPath, [path.join(__dirname, 'generate-waterfall-data.mjs')], {
  stdio: 'inherit',
})

// --- brand-diverging（size = ブランド数 1〜7、末尾は必ずマイナス） ---
const BRAND_DIVERGING_LABELS = ['B', 'D', 'H', 'C', 'F', 'E', 'G']
const BRAND_DIVERGING_POS = [80, 60, 45, 30, 18, 12, 8]
for (let size = 1; size <= 7; size += 1) {
  const rows = []
  for (let i = 0; i < size; i += 1) {
    const label = `ブランド${BRAND_DIVERGING_LABELS[i]}`
    if (i === size - 1) {
      rows.push({ label, value: -(10 + Math.floor(i / 2) * 5) })
    } else {
      rows.push({ label, value: BRAND_DIVERGING_POS[i] })
    }
  }
  writeJson(`brand-diverging-${size}.json`, {
    meta: { title: 'ブランドA' },
    size,
    rows,
  })
}

// --- buyer-dropout（size = 期間数 1〜7） ---
for (let size = 1; size <= 7; size += 1) {
  const yearStart = 5
  const stacked = []
  const dropout = []
  for (let i = 0; i < size; i += 1) {
    const y = yearStart + i
    const period = `'${String(y).padStart(2, '0')}/4-`
    stacked.push({
      period,
      base: Math.round((22 - i * 0.5) * 10) / 10,
      mid: Math.round((11 + i * 0.4) * 10) / 10,
      top: Math.round((7 + i * 0.2) * 10) / 10,
    })
    dropout.push({
      period,
      value: Math.round((-7 + i * 0.35) * 100) / 100,
    })
  }
  writeJson(`buyer-dropout-${size}.json`, {
    meta: {
      topTitle: 'ブランド1 購入者の割合',
      bottomTitle: '脱落者の割合',
      yUnit: '(%)',
      series: {
        base: '継続',
        mid: 'トライアル',
        top: 'その他',
      },
    },
    size,
    stacked,
    dropout,
  })
}

// --- brand-composition（size = ブランド数 1〜8） ---
// 積上順（下→上）: 継続リピート → スイッチイン → カテゴリエントリ。常に正・合計100
function buildCompositionCell(brandIndex, periodIndex, size) {
  const repeat =
    Math.round((48 + ((brandIndex * 3 + periodIndex * 2 + size) % 16)) * 10) / 10
  const switchIn =
    Math.round((20 + ((brandIndex * 2 + periodIndex + size) % 10)) * 10) / 10
  const entry = Math.round((100 - repeat - switchIn) * 10) / 10
  return { repeat, switchIn, entry }
}

for (let size = 1; size <= 8; size += 1) {
  const brandCount = size
  const periods = ["'03/4-", "'04/4-", "'05/4-", "'06/4-", "'07/4-"]
  const rows = []
  for (let b = 1; b <= brandCount; b += 1) {
    for (let p = 0; p < periods.length; p += 1) {
      const { repeat, switchIn, entry } = buildCompositionCell(b, p, size)
      rows.push({
        brand: `ブランド${b}`,
        period: periods[p],
        repeat,
        switchIn,
        entry,
      })
    }
  }
  writeJson(`brand-composition-${size}.json`, {
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
  })
}

