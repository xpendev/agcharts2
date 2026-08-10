import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

/** size = ブランド数。ブランド1 から順に採用 */
const BASE_ROWS = [
  { label: 'ブランド1', outflow: 0.39, inflow: 0.33 },
  { label: 'ブランド2', outflow: 0.52, inflow: 0.41 },
  { label: 'ブランド3', outflow: 0.28, inflow: 0.55 },
  { label: 'ブランド4', outflow: 0.61, inflow: 0.22 },
  { label: 'ブランド5', outflow: 0.35, inflow: 0.48 },
  { label: 'ブランド6', outflow: 0.44, inflow: 0.31 },
  { label: 'ブランド7', outflow: 0.19, inflow: 0.62 },
]

function buildPayload(size) {
  const rows = BASE_ROWS.slice(0, size).map((row) => ({ ...row }))
  const previousPercent = size === 7 ? 35.0 : Math.round((34.2 + size * 0.1) * 10) / 10
  const currentPercent = size === 7 ? 35.8 : Math.round((previousPercent + 0.6 + size * 0.05) * 10) / 10
  const outflowPercent = size === 7 ? -4.4 : Math.round((-3.8 - size * 0.08) * 10) / 10
  const inflowPercent = size === 7 ? 5.1 : Math.round((4.4 + size * 0.1) * 10) / 10
  const retainedPercent =
    size === 7 ? 30.6 : Math.round((previousPercent + outflowPercent) * 10) / 10

  return {
    meta: {
      title: '買出入(実績)',
      brandLabel: 'ブランド',
    },
    size,
    summary: {
      previousPercent,
      currentPercent,
      outflowPercent,
      retainedPercent,
      inflowPercent,
    },
    rows,
  }
}

for (let size = 1; size <= 7; size += 1) {
  const file = path.join(outDir, `purchase-in-out-${size}.json`)
  const payload = buildPayload(size)
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log('wrote', file, `rows=${payload.rows.length}`)
}
