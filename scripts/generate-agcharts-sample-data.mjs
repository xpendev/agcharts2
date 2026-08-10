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
// 期首 + 中間ステップ + 期末。size=1 は期首のみ、size=2 は期首+期末。
const wfMidLabels = ['流入A', '流入B', '流出A', '流出B', '流入C', '流出C']
/** 上下にばらけた増減（横ばい回避・極端な単発値は避ける） */
const wfMidDeltas = [8.0, -12.0, 10.0, -18.0, 22.0, -9.0]
for (let size = 1; size <= 7; size += 1) {
  let labels
  if (size === 1) {
    labels = ['期首']
  } else {
    const midCount = size - 2
    labels = ['期首', ...wfMidLabels.slice(0, midCount), '期末']
  }
  const values = []
  let total = 18 + size
  values.push(total) // 期首（絶対値・0起点の正棒として描画）
  const midCount = size <= 1 ? 0 : size - 2
  for (let i = 0; i < midCount; i += 1) {
    const delta = wfMidDeltas[i] ?? (i % 2 === 0 ? 3 : -3)
    values.push(delta)
    total = Math.round((total + delta) * 10) / 10
  }
  if (size >= 2) {
    values.push(total) // 期末（totals で自動計算されるが整合用に保持）
  }
  writeJson(`waterfall-${size}.json`, {
    meta: {
      title: `メーカーA 職出入差（全国）`,
      yUnit: '(%)',
    },
    size,
    categories: labels,
    values,
  })
}

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
        repeat: '継続リピート',
        switchIn: 'トライアル(スイッチイン)',
        entry: 'トライアル(カテゴリエントリ)',
      },
    },
    size,
    rows,
  })
}

