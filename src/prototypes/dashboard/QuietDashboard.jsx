import { Icon } from "../../console/Icon.jsx";
import { DashboardShell, Heatmap, PageToolbar, TrendChart, useDashboardControls } from "./DashboardShell.jsx";
import { modelRows, quickActions, summaryMetrics } from "./data.js";

export function QuietDashboard() {
  const controls = useDashboardControls();

  return (
    <DashboardShell variant="quiet" titleMeta="工作台">
      <PageToolbar
        title="概览"
        description="今天的流量、成本与模型分布，一眼掌握。"
        range={controls.range}
        setRange={controls.setRange}
        refreshing={controls.refreshing}
        onRefresh={controls.refresh}
      />

      <section className="quiet-metric-band" aria-label="今日关键指标">
        {summaryMetrics.map((metric) => (
          <article key={metric.eyebrow}>
            <div className="quiet-metric-heading">
              <span>{metric.eyebrow}</span>
              {metric.change && <small>{metric.change}</small>}
            </div>
            <strong>{metric.value}<small>{metric.unit}</small></strong>
            <p><span>{metric.metaLabel}</span><b>{metric.metaValue}</b></p>
            {metric.detailLabel && <p><span>{metric.detailLabel}</span><b>{metric.detailValue}</b></p>}
          </article>
        ))}
      </section>

      <div className="quiet-dashboard-grid">
        <section className="prototype-panel quiet-trend-panel">
          <header className="prototype-panel-heading">
            <div><h2>Token 用量趋势</h2><p>最近 {controls.range === "自定义" ? "自定义周期" : controls.range}</p></div>
            <div className="quiet-chart-total"><span>本周期</span><strong>428.6M</strong></div>
          </header>
          <TrendChart />
        </section>

        <section className="prototype-panel quiet-actions-panel">
          <header className="prototype-panel-heading"><div><h2>快捷操作</h2><p>常用任务</p></div></header>
          <div className="quiet-action-list">
            {quickActions.map((action, index) => (
              <button type="button" key={action.label}>
                <Icon name={action.icon} size={17} />
                <span>{action.label}</span>
                {index === 0 ? <kbd>N</kbd> : <Icon name="chevronRight" size={15} />}
              </button>
            ))}
          </div>
        </section>

        <section className="prototype-panel quiet-heatmap-panel">
          <header className="prototype-panel-heading">
            <div><h2>Token 热力图</h2><p>最近六个月 · 每日使用强度</p></div>
            <button className="prototype-text-button" type="button">查看用量 <Icon name="chevronRight" size={14} /></button>
          </header>
          <Heatmap />
        </section>

        <section className="prototype-panel quiet-model-panel">
          <header className="prototype-panel-heading"><div><h2>模型分布</h2><p>按今日 Token 计</p></div></header>
          <div className="quiet-model-table" role="table" aria-label="模型分布">
            <div role="row" className="quiet-model-header"><span role="columnheader">模型</span><span role="columnheader">请求</span><span role="columnheader">Token</span><span role="columnheader">实际成本</span></div>
            {modelRows.map((row) => (
              <div role="row" key={row.name}>
                <span role="cell"><i style={{ "--share": `${row.share}%` }} />{row.name}</span>
                <span role="cell">{row.requests}</span>
                <span role="cell">{row.tokens}</span>
                <span role="cell">{row.cost}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
