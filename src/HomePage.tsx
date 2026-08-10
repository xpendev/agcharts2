import { Link } from 'react-router-dom'

const transitionLinks = [
  {
    to: '/transition-network',
    title: 'スクラッチ',
    note: 'React + SVG（見た目の基準）',
  },
  {
    to: '/transition-network/cytoscape',
    title: 'Cytoscape.js',
    note: '無料ライブラリ',
  },
  {
    to: '/transition-network/gojs',
    title: 'GoJS',
    note: '評価版・有償',
  },
  {
    to: '/transition-network/agcharts',
    title: 'AG Charts Chord',
    note: 'Enterprise・カテゴリ間流出入（圏外なし・最大30）',
  },
] as const

const agChartsLinks = [
  {
    to: '/volume-matrix',
    title: 'ボリューム付数表',
    note: '過去×現在の遷移マトリクス（Bubble）',
  },
  {
    to: '/purchase-in-out',
    title: '買出入(実績)',
    note: 'KPI + 全体バー + 発散棒（800px）',
  },
  {
    to: '/waterfall',
    title: 'ウォーターフォール',
    note: '職出入差（棒の数1〜7）',
  },
  {
    to: '/brand-diverging',
    title: 'ブランド発散棒',
    note: '単一系列・符号で色分け',
  },
  {
    to: '/buyer-dropout',
    title: '購入者割合 / 脱落者',
    note: '上:積上棒 / 下:負の棒（期間1〜7）',
  },
  {
    to: '/brand-composition',
    title: '人数構成比',
    note: 'ブランド別100%積上（1〜8・Sync）',
  },
] as const

export function HomePage() {
  return (
    <main className="tn-home">
      <h1 className="tn-home-title">チャート検証</h1>

      <section className="tn-home-section" aria-labelledby="tn-home-mandala">
        <h2 id="tn-home-mandala" className="tn-home-section-title">
          曼荼羅チャート（transitionNetwork）
        </h2>
        <p className="tn-home-lead">実装を選択してください</p>
        <nav className="tn-home-nav" aria-label="曼荼羅チャート実装一覧">
          {transitionLinks.map((item) => (
            <Link key={item.to} className="tn-home-link" to={item.to}>
              <span className="tn-home-link-title">{item.title}</span>
              <span className="tn-home-link-note">{item.note}</span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="tn-home-section" aria-labelledby="tn-home-agcharts">
        <h2 id="tn-home-agcharts" className="tn-home-section-title">
          AG Charts 帳票グラフ（独立）
        </h2>
        <p className="tn-home-lead">
          各グラフは固定 JSON（データセット 1〜7）をスライダーで切替
        </p>
        <nav className="tn-home-nav" aria-label="AG Charts 帳票グラフ一覧">
          {agChartsLinks.map((item) => (
            <Link key={item.to} className="tn-home-link" to={item.to}>
              <span className="tn-home-link-title">{item.title}</span>
              <span className="tn-home-link-note">{item.note}</span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  )
}
