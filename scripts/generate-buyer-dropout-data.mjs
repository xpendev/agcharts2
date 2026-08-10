import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

function periodLabel(year) {
  return `'${String(year).padStart(2, '0')}/4-`
}

function buildPayload(size) {
  const yearStart = 5
  const stacked = []
  const dropout = []
  for (let i = 0; i < size; i += 1) {
    const period = periodLabel(yearStart + i)
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
  return {
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
  }
}

for (let size = 1; size <= 7; size += 1) {
  const file = path.join(outDir, `buyer-dropout-${size}.json`)
  fs.writeFileSync(file, `${JSON.stringify(buildPayload(size), null, 2)}\n`, 'utf8')
  console.log('wrote', file)
}

const obsolete = path.join(outDir, 'buyer-dropout.json')
if (fs.existsSync(obsolete)) {
  fs.unlinkSync(obsolete)
  console.log('removed', obsolete)
}
