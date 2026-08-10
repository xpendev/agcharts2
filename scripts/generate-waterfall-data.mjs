import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

/** size = 棒の数。期首 + 中間 + 期末（size=1 は期首のみ） */
const midLabels = ['流入A', '流入B', '流出A', '流出B', '流入C', '流出C']
/** 上下にばらけた増減（横ばい回避・極端な単発値は避ける） */
const midDeltas = [8.0, -12.0, 10.0, -18.0, 22.0, -9.0]

function buildPayload(size) {
  let labels
  if (size === 1) {
    labels = ['期首']
  } else {
    const midCount = size - 2
    labels = ['期首', ...midLabels.slice(0, midCount), '期末']
  }

  const values = []
  let total = 18 + size
  values.push(total)
  const midCount = size <= 1 ? 0 : size - 2
  for (let i = 0; i < midCount; i += 1) {
    const delta = midDeltas[i] ?? (i % 2 === 0 ? 3 : -3)
    values.push(delta)
    total = Math.round((total + delta) * 10) / 10
  }
  if (size >= 2) {
    values.push(total)
  }

  return {
    meta: {
      title: 'メーカーA 職出入差（全国）',
      yUnit: '(%)',
    },
    size,
    categories: labels,
    values,
  }
}

for (let size = 1; size <= 7; size += 1) {
  const file = path.join(outDir, `waterfall-${size}.json`)
  fs.writeFileSync(file, `${JSON.stringify(buildPayload(size), null, 2)}\n`, 'utf8')
  console.log('wrote', file, `bars=${size}`)
}
