import { useState } from "react";
import { Icon } from "../../console/Icon.jsx";
import { DashboardShell, Heatmap, PageToolbar, TrendChart, useDashboardControls } from "./DashboardShell.jsx";
import { modelRows, quickActions, summaryMetrics } from "./data.js";

export function EditorialDashboard() {
  const controls = useDashboardControls();
  const [focus, setFocus] = useState("成本");

  return (
    <DashboardShell variant="editorial" titleMeta="2026 年 8 月 11 日 · 星期二">
      <PageToolbar
        eyebrow="DAILY BRIEFING"
        title="早上好，Li Wei。"
        description="WayX 今日稳定运行，成本较标准定价低 19.7%。"
        range={controls.range}
        setRange={controls.setRange}
        refreshing={controls.refreshing}
        onRefresh={controls.refresh}
      />

      <div className="editorial-dashboard-grid">
        <section className="editorial-lead-panel">
          <div className="editorial-lead-copy">
            <span>今日实际支出</span>
            <strong>$12.3847</strong>
            <p>标准成本 $15.42 <b>已节省 $3.04</b></p>
          </div>
          <div className="editorial-lead-chart">
            <header><span>过去 30 天</span><strong>428.6M Token</strong></header>
            <TrendChart compact />
          </div>
        </section>

        <aside className="editorial-note-panel">
          <span>今日摘要</span>
          <h2>流量在 14:00 达到峰值，主要由 gpt-5.2 驱动。</h2>
          <p>服务保持稳定。当前 RPM 128，平均耗时 842 ms，无需操作。</p>
          <button type="button">查看渠道状态 <Icon name="chevronRight" size={15} /></button>
        </aside>

        <section className="editorial-metrics-panel" aria-label="今日关键指标">
          {summaryMetrics.slice(0, 3).map((metric) => (
            <article key={metric.eyebrow}>
              <span>{metric.eyebrow}</span>
              <strong>{metric.value}<small>{metric.unit}</small></strong>
              <p>{metric.metaLabel} <b>{metric.metaValue}</b></p>
            </article>
          ))}
        </section>

        <section className="editorial-focus-panel">
          <header className="editorial-section-heading">
            <div><span>观察重点</span><h2>{focus}</h2></div>
            <div>{["成本", "请求", "Token"].map((item) => <button key={item} type="button" data-active={focus === item || undefined} onClick={() => setFocus(item)}>{item}</button>)}</div>
          </header>
          <div className="editorial-model-list">
            {modelRows.map((row, index) => (
              <div key={row.name}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{row.name}</strong>
                <i><b style={{ width: `${row.share}%` }} /></i>
                <em>{focus === "成本" ? row.cost : focus === "请求" ? row.requests : row.tokens}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="editorial-heatmap-panel">
          <header className="editorial-section-heading"><div><span>活跃度档案</span><h2>Token 热力图</h2></div><small>最近六个月</small></header>
          <Heatmap condensed />
        </section>

        <section className="editorial-actions-panel">
          <header className="editorial-section-heading"><div><span>继续工作</span><h2>快捷操作</h2></div></header>
          <div>
            {quickActions.slice(0, 4).map((action) => <button type="button" key={action.label}><Icon name={action.icon} size={17} /><span>{action.label}</span><Icon name="chevronRight" size={14} /></button>)}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
