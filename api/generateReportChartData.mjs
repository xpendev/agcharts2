/**
 * 曼荼羅以外の帳票 JSON を 1〜50 生成する。
 * node api/generateReportChartData.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'data')
const MAX = 50

function writeJson(name, payload) {
  fs.writeFileSync(
    path.join(outDir, name),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  )
}

function round1(n) {
  return Math.round(n * 10) / 10
}

function round2(n) {
  return Math.round(n * 100) / 100
}

function periodLabel(index) {
  return `'${String(3 + index).padStart(2, '0')}/4-`
}

// --- volume-matrix (size = N×N) ---
function genVolumeMatrix(size) {
  const columns = []
  const rows = []
  for (let i = 1; i <= size; i += 1) {
    const id = `brand-${i}`
    const label = `ブランド${i}`
    columns.push({ id, label })
    rows.push({ id, label })
  }
  const cells = []
  for (let r = 0; r < size; r += 1) {
    const weights = []
    let sum = 0
    for (let c = 0; c < size; c += 1) {
      const w =
        c === r
          ? 40 + ((r * 3) % 15)
          : 5 + ((r * 7 + c * 11) % 20)
      weights.push(w)
      sum += w
    }
    for (let c = 0; c < size; c += 1) {
      cells.push({
        pastId: `brand-${r + 1}`,
        currentId: `brand-${c + 1}`,
        value: round1((weights[c] / sum) * 100),
      })
    }
  }
  return {
    meta: {
      title: 'ボリューム付数表',
      pastPeriodLabel: "過去購入 ('09/1 - '09/12)",
      currentPeriodLabel: "現在購入 ('10/1 - '10/12)",
      note: '*数値：％（行）（人数ベース）',
      unit: 'row_percent',
    },
    size,
    columns,
    rows,
    cells,
  }
}

// --- purchase-in-out (size = ブランド数) ---
function genPurchaseInOut(size) {
  const rows = []
  for (let i = 1; i <= size; i += 1) {
    rows.push({
      label: `ブランド${i}`,
      outflow: round2(0.15 + ((i * 7 + size * 3) % 50) / 100),
      inflow: round2(0.12 + ((i * 5 + size * 2) % 55) / 100),
    })
  }
  return {
    meta: {
      title: '買出入(実績)',
      brandLabel: 'ブランド',
    },
    size,
    summary: {
      previousPercent: round1(34 + (size % 5) * 0.2),
      currentPercent: round1(34.8 + (size % 5) * 0.2),
      outflowPercent: round1(-4 - (size % 4) * 0.1),
      retainedPercent: round1(30.5 + (size % 3) * 0.1),
      inflowPercent: round1(4.5 + (size % 5) * 0.1),
    },
    rows,
  }
}

// --- waterfall (size = 棒の数) ---
function genWaterfall(size) {
  if (size === 1) {
    return {
      meta: { title: 'メーカーA 職出入差（全国）', yUnit: '(%)' },
      size,
      categories: ['期首'],
      values: [22],
    }
  }
  const categories = ['期首']
  const values = [20 + (size % 6)]
  let running = values[0]
  const midCount = size - 2
  for (let i = 0; i < midCount; i += 1) {
    const positive = i % 2 === 0
    const mag = 6 + ((i * 3 + size) % 10)
    const delta = positive ? mag : -mag
    // カテゴリ名は一意にする（A〜Zの循環だと重複し、同一X位置に棒が重なる）
    const n = i + 1
    categories.push(positive ? `流入${n}` : `流出${n}`)
    values.push(delta)
    running += delta
  }
  categories.push('期末')
  values.push(round1(running))
  return {
    meta: { title: 'メーカーA 職出入差（全国）', yUnit: '(%)' },
    size,
    categories,
    values,
  }
}

// --- brand-diverging (size = ブランド数) ---
function genBrandDiverging(size) {
  const rows = []
  for (let i = 0; i < size; i += 1) {
    const positive = i < Math.ceil(size * 0.75)
    const mag = positive
      ? round1(80 - i * (70 / Math.max(size - 1, 1)))
      : -round1(10 + ((i * 5) % 30))
    rows.push({
      label: `ブランド${i + 1}`,
      value: mag,
    })
  }
  return {
    meta: { title: 'ブランド' },
    size,
    rows,
  }
}

// --- buyer-dropout (size = 期間数) ---
function genBuyerDropout(size) {
  const stacked = []
  const dropout = []
  const denom = Math.max(size - 1, 1)
  for (let i = 0; i < size; i += 1) {
    const period = `'${String(5 + i).padStart(2, '0')}/4-`
    let base
    let mid
    let top
    let value
    if (size <= 7) {
      base = round1(22 - i * 0.5)
      mid = round1(11 + i * 0.4)
      top = round1(7 + i * 0.2)
      value = round2(-7 + i * 0.35)
      if (size === 3 && i === 2) value = -5
    } else {
      const t = i / denom
      base = round1(22 - t * 8)
      mid = round1(11 + t * 4)
      top = round1(7 + t * 2)
      value = round2(-7 + t * 5.5)
    }
    stacked.push({ period, base, mid, top })
    dropout.push({ period, value })
  }
  return {
    meta: {
      topTitle: 'ブランド1 購入者の割合',
      bottomTitle: '脱落者の割合',
      yUnit: '(%)',
      series: { base: '継続', mid: 'トライアル', top: 'その他' },
    },
    size,
    stacked,
    dropout,
  }
}

// --- brand-composition (size = ブランド数, 期間は固定5) ---
const BC_PERIODS = 5
function genBrandComposition(size) {
  const rows = []
  for (let b = 1; b <= size; b += 1) {
    const brand = `ブランド${b}`
    for (let p = 0; p < BC_PERIODS; p += 1) {
      const repeat = 45 + ((b * 3 + p * 5) % 25)
      const switchIn = 15 + ((b * 5 + p * 3) % 20)
      let entry = 100 - repeat - switchIn
      if (entry < 5) {
        entry = 5
      }
      const scale = 100 / (repeat + switchIn + entry)
      rows.push({
        brand,
        period: periodLabel(p),
        repeat: round1(repeat * scale),
        switchIn: round1(switchIn * scale),
        entry: round1(100 - round1(repeat * scale) - round1(switchIn * scale)),
      })
    }
  }
  return {
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
  }
}

// --- competitive-impact (size = 競合ブランド数) ---
function genCompetitiveImpact(size) {
  const rows = []
  for (let i = 1; i <= size; i += 1) {
    // ブランド2は短い棒のラベル（outside-end）確認用
    const isBrand2 = i === 1
    const outflow = isBrand2
      ? 0.002
      : round2(0.08 + ((i * 11 + size * 7) % 60) / 100)
    const inflow = isBrand2
      ? 0.002
      : round2(0.06 + ((i * 7 + size * 5) % 65) / 100)
    rows.push({
      label: `ブランド${i + 1}`,
      outflow,
      inflow,
    })
  }
  // 最後に「その他（買出入合計）」を追加
  rows.push({
    label: 'その他（買出入合計）',
    outflow: round2(0.12 + (size % 5) * 0.02),
    inflow:  round2(0.10 + (size % 4) * 0.02),
  })
  return {
    meta: {
      title: 'ブランド1 流入・流出インパクト',
      subtitle: '購入・販売 週数 シャフル0',
      xUnit: '(%)',
    },
    size,
    rows,
  }
}

for (let size = 1; size <= MAX; size += 1) {
  writeJson(`volume-matrix-${size}.json`, genVolumeMatrix(size))
  writeJson(`purchase-in-out-${size}.json`, genPurchaseInOut(size))
  writeJson(`waterfall-${size}.json`, genWaterfall(size))
  writeJson(`brand-diverging-${size}.json`, genBrandDiverging(size))
  writeJson(`buyer-dropout-${size}.json`, genBuyerDropout(size))
  writeJson(`brand-composition-${size}.json`, genBrandComposition(size))
  writeJson(`competitive-impact-${size}.json`, genCompetitiveImpact(size))
}

console.log(`wrote 7 charts × ${MAX} sizes (= ${7 * MAX} files)`)
