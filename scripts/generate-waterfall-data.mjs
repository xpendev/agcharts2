import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'api', 'data')

/** 1〜50 は api/generateReportChartData.mjs を使用 */
const WF_FROM_PERIOD = "'26/02 - '26/04"
const WF_TO_PERIOD = "'26/05 - '26/07"
function wfMidCategory(index) {
  return `ブランド${index + 1}`
}

function buildPayload(size) {
  const meta = {
    title: 'サトウ食品 流出入差(金額)',
    yUnit: '(%)',
    fromPeriod: WF_FROM_PERIOD,
    toPeriod: WF_TO_PERIOD,
  }
  if (size === 1) {
    return {
      meta,
      size,
      categories: [WF_FROM_PERIOD],
      values: [17 + (size % 5)],
    }
  }
  const categories = [WF_FROM_PERIOD]
  const values = [17 + (size % 6)]
  let running = values[0]
  const midCount = size - 2
  for (let i = 0; i < midCount; i += 1) {
    const positive = i % 2 === 0
    const mag = 6 + ((i * 3 + size) % 10)
    const delta = positive ? mag : -mag
    categories.push(wfMidCategory(i))
    values.push(delta)
    running = Math.round((running + delta) * 10) / 10
  }
  categories.push(WF_TO_PERIOD)
  values.push(running)
  return { meta, size, categories, values }
}

for (let size = 1; size <= 7; size += 1) {
  const file = path.join(outDir, `waterfall-${size}.json`)
  fs.writeFileSync(file, `${JSON.stringify(buildPayload(size), null, 2)}\n`, 'utf8')
  console.log('wrote', file, `bars=${size}`)
}
