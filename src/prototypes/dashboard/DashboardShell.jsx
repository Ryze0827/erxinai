import { useEffect, useState } from "react";
import { Icon } from "../../console/Icon.jsx";
import { navSections } from "./data.js";

function SidebarNav({ onNavigate }) {
  return (
    <nav className="prototype-sidebar-nav" aria-label="控制台导航">
      {navSections.map((section) => (
        <section className="prototype-nav-section" key={section.label}>
          <h2>{section.label}</h2>
          <div>
            {section.items.map((item) => {
              const active = item.label === "概览";
              return (
                <button
                  className="prototype-nav-item"
                  data-active={active || undefined}
                  type="button"
                  key={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.label)}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {item.badge && <small data-status={item.badge === "正常" || undefined}>{item.badge}</small>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <button className="prototype-nav-item prototype-nav-external" type="button" onClick={() => onNavigate("二星会员店铺") }>
        <Icon name="external" size={17} />
        <span>二星会员店铺</span>
      </button>
    </nav>
  );
}

export function DashboardShell({ variant, titleMeta, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const navigate = (label) => {
    setDrawerOpen(false);
    if (label !== "概览") setNotice(`${label} 将在概览方案确认后单独设计`);
  };

  return (
    <div className={`dashboard-prototype dashboard-prototype--${variant}`}>
      <aside className="prototype-sidebar" data-open={drawerOpen || undefined}>
        <div className="prototype-brand-row">
          <button className="prototype-brand" type="button" aria-label="WayX 首页" onClick={() => setNotice("公开首页保持现状，不在本轮改动范围内")}>WayX</button>
          <button className="prototype-drawer-close" type="button" aria-label="关闭菜单" onClick={() => setDrawerOpen(false)}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <SidebarNav onNavigate={navigate} />
        <div className="prototype-sidebar-footer">
          <button type="button" className="prototype-profile" onClick={() => navigate("个人资料")}>
            <span className="prototype-avatar">L</span>
            <span><strong>Li Wei</strong><small>开发者账户</small></span>
            <Icon name="more" size={16} />
          </button>
        </div>
      </aside>
      <button className="prototype-scrim" type="button" aria-label="关闭菜单" onClick={() => setDrawerOpen(false)} />

      <div className="prototype-workspace">
        <header className="prototype-topbar">
          <div className="prototype-topbar-title">
            <button className="prototype-mobile-menu" type="button" aria-label="打开菜单" onClick={() => setDrawerOpen(true)}>
              <Icon name="menu" size={19} />
            </button>
            <div>
              <span>{titleMeta || "控制台"}</span>
              <strong>概览</strong>
            </div>
          </div>
          <div className="prototype-announcement" title="GPT分组按充值金额，调低倍率/开通专线，详情见历史公告">
            <i aria-hidden="true" />
            <span>GPT分组按充值金额，调低倍率/开通专线，详情见历史公告</span>
          </div>
          <div className="prototype-topbar-actions">
            <button type="button" aria-label="使用指南" onClick={() => setNotice("使用指南") }><Icon name="play" size={17} /><span>使用指南</span></button>
            <button type="button" aria-label="文档" onClick={() => setNotice("文档") }><Icon name="book" size={17} /><span>文档</span></button>
            <button type="button" aria-label="切换语言" onClick={() => setNotice("中 / EN") }><Icon name="globe" size={17} /></button>
            <button type="button" aria-label="通知" onClick={() => setNotice("暂无新通知") }><Icon name="bell" size={17} /><i /></button>
            <button className="prototype-balance" type="button" onClick={() => navigate("充值额度")}>$86.40</button>
          </div>
        </header>
        <main className="prototype-main">{children}</main>
      </div>

      {notice && <div className="prototype-toast" role="status"><Icon name="info" size={16} />{notice}</div>}
    </div>
  );
}

export function PageToolbar({ eyebrow, title, description, range, setRange, refreshing, onRefresh }) {
  return (
    <div className="prototype-page-toolbar">
      <div>
        {eyebrow && <span className="prototype-page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="prototype-toolbar-actions">
        <div className="prototype-range" aria-label="时间范围">
          {["7天", "30天", "自定义"].map((option) => (
            <button key={option} data-active={range === option || undefined} type="button" onClick={() => setRange(option)}>{option}</button>
          ))}
        </div>
        <button className="prototype-refresh" type="button" onClick={onRefresh} disabled={refreshing}>
          <Icon name="refresh" size={16} className={refreshing ? "is-spinning" : ""} />
          <span>{refreshing ? "刷新中" : "刷新"}</span>
        </button>
      </div>
    </div>
  );
}

export function useDashboardControls() {
  const [range, setRange] = useState("30天");
  const [refreshing, setRefreshing] = useState(false);
  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 900);
  };
  return { range, setRange, refreshing, refresh };
}

export function TrendChart({ compact = false }) {
  const points = compact
    ? "0,102 58,89 116,96 174,71 232,79 290,54 348,61 406,35 464,49 522,24 580,37 638,16"
    : "0,134 58,120 116,126 174,96 232,105 290,78 348,85 406,54 464,68 522,39 580,51 638,27";
  const area = `0,160 ${points} 638,160`;
  return (
    <div className="prototype-chart" role="img" aria-label="Token 用量趋势，最近 30 天总体上升">
      <div className="prototype-chart-scale" aria-hidden="true"><span>40</span><span>30</span><span>20</span><span>10</span><span>0</span></div>
      <svg viewBox="0 0 638 172" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`prototype-chart-fill-${compact ? "compact" : "wide"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 55, 90, 125, 160].map((y) => <line key={y} x1="0" y1={y} x2="638" y2={y} />)}
        <polygon points={area} fill={`url(#prototype-chart-fill-${compact ? "compact" : "wide"})`} />
        <polyline points={points} />
      </svg>
      <div className="prototype-chart-dates" aria-hidden="true"><span>07/12</span><span>07/18</span><span>07/24</span><span>07/30</span><span>08/05</span><span>08/11</span></div>
    </div>
  );
}

export function Heatmap({ condensed = false }) {
  return (
    <div className={`prototype-heatmap ${condensed ? "is-condensed" : ""}`} role="img" aria-label="最近六个月 Token 用量热力图">
      <div className="prototype-heatmap-months" aria-hidden="true"><span>3月</span><span>4月</span><span>5月</span><span>6月</span><span>7月</span><span>8月</span></div>
      <div className="prototype-heatmap-grid" aria-hidden="true">
        {Array.from({ length: condensed ? 126 : 154 }, (_, index) => {
          const wave = Math.sin(index * 0.41) * 0.42 + Math.cos(index * 0.17) * 0.24;
          const value = index % 17 === 0 || index % 29 === 0 ? 0 : Math.max(1, Math.min(4, Math.round(2.35 + wave * 2)));
          return <span key={index} data-level={value} />;
        })}
      </div>
      <div className="prototype-heatmap-legend" aria-hidden="true"><span>少</span>{[0, 1, 2, 3, 4].map((value) => <i key={value} data-level={value} />)}<span>多</span></div>
    </div>
  );
}
