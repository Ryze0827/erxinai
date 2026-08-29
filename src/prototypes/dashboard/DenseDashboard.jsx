import { Icon } from "../../console/Icon.jsx";
import { DashboardShell, Heatmap, PageToolbar, TrendChart, useDashboardControls } from "./DashboardShell.jsx";
import { modelRows, quickActions, summaryMetrics } from "./data.js";

export function DenseDashboard() {
  const controls = useDashboardControls();

  return (
    <DashboardShell variant="dense" titleMeta="WayX / Console">
      <PageToolbar
        eyebrow="OPERATIONS / TODAY"
        title="概览"
        description="实时运行态势与成本观察"
        range={controls.range}
        setRange={controls.setRange}
        refreshing={controls.refreshing}
        onRefresh={controls.refresh}
      />

      <section className="dense-command-strip" aria-label="今日关键指标">
        {summaryMetrics.map((metric, index) => (
          <article key={metric.eyebrow}>
            <span>{String(index + 1).padStart(2, "0")} / {metric.eyebrow}</span>
            <strong>{metric.value}<small>{metric.unit}</small></strong>
            <div><b>{metric.metaLabel}</b><em>{metric.metaValue}</em></div>
            {metric.detailLabel && <div><b>{metric.detailLabel}</b><em>{metric.detailValue}</em></div>}
          </article>
        ))}
        <div className="dense-system-status"><i /><span>所有渠道运行正常</span><small>刚刚检查</small></div>
      </section>

      <div className="dense-dashboard-grid">
        <section className="dense-trend-panel">
          <header className="dense-section-heading">
            <div><span>01</span><h2>Token 用量趋势</h2></div>
            <div className="dense-live"><i /> LIVE DATA</div>
          </header>
          <div className="dense-trend-summary"><strong>428.6M</strong><span>周期 Token</span><b>+11.2%</b></div>
          <TrendChart compact />
        </section>

        <aside className="dense-actions-panel">
          <header className="dense-section-heading"><div><span>02</span><h2>任务入口</h2></div><small>⌘ K</small></header>
          <div className="dense-actions-list">
            {quickActions.map((action, index) => (
              <button type="button" key={action.label}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon name={action.icon} size={17} />
                <strong>{action.label}</strong>
                <Icon name="arrowUp" size={14} />
              </button>
            ))}
          </div>
        </aside>

        <section className="dense-heatmap-panel">
          <header className="dense-section-heading"><div><span>03</span><h2>六个月活跃度</h2></div><small>Token (M)</small></header>
          <Heatmap condensed />
        </section>

        <section className="dense-model-panel">
          <header className="dense-section-heading"><div><span>04</span><h2>模型分布</h2></div><button type="button">全部模型 <Icon name="chevronDown" size={14} /></button></header>
          <div className="dense-model-table" role="table" aria-label="模型分布">
            <div role="row"><span role="columnheader">模型 / MODEL</span><span role="columnheader">请求</span><span role="columnheader">TOKEN</span><span role="columnheader">成本</span><span role="columnheader">占比</span></div>
            {modelRows.map((row) => (
              <div role="row" key={row.name}>
                <strong role="cell">{row.name}</strong><span role="cell">{row.requests}</span><span role="cell">{row.tokens}</span><span role="cell">{row.cost}</span><span role="cell"><i><b style={{ width: `${row.share}%` }} /></i>{row.share}%</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
