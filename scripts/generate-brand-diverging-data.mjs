import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

const LABELS = ['B', 'D', 'H', 'C', 'F', 'E', 'G']
const POSITIVE_VALUES = [80, 60, 45, 30, 18, 12, 8]

/**
 * size 件。末尾を必ずマイナスにし、どの件数でも負方向が1本以上ある。
 */
function buildRows(size) {
  const rows = []
  for (let i = 0; i < size; i += 1) {
    const label = `ブランド${LABELS[i]}`
    if (i === size - 1) {
      rows.push({ label, value: -(10 + Math.floor(i / 2) * 5) })
    } else {
      rows.push({ label, value: POSITIVE_VALUES[i] })
    }
  }
  return rows
}

for (let size = 1; size <= 7; size += 1) {
  const rows = buildRows(size)
  const negCount = rows.filter((r) => r.value < 0).length
  if (negCount < 1) {
    throw new Error(`size ${size}: expected at least one negative`)
  }
  const file = path.join(outDir, `brand-diverging-${size}.json`)
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        meta: { title: 'ブランドA' },
        size,
        rows,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  console.log(
    'wrote',
    `brand-diverging-${size}.json`,
    rows.map((r) => `${r.label}:${r.value}`).join(' | '),
  )
}
