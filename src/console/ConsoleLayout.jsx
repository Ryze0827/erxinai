import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { announcementsApi, keysApi, subscriptionsApi } from "../api";
import { useConsole, resolveFeature } from "./ConsoleContext";
import { Icon } from "./Icon";
import { useLocale } from "./i18n";
import { Button, EmptyState, IconButton, Spinner, ToastViewport } from "./UI";
import { safeExternalUrl, safeImageUrl } from "./utils";
import "./console.css";

const SIDEBAR_STORAGE_KEY = "sentence_console_sidebar_collapsed";

const coreNav = [
  { path: "/dashboard", key: "nav.dashboard", icon: "dashboard" },
  { path: "/keys", key: "nav.keys", icon: "key" },
  { path: "/batch-image", key: "nav.batch", icon: "image", feature: "batch", standardOnly: true },
  { path: "/usage", key: "nav.usage", icon: "chart", standardOnly: true },
  { path: "/available-channels", key: "nav.channels", icon: "channel", feature: "available", standardOnly: true },
  { path: "/monitor", key: "nav.monitor", icon: "pulse", feature: "monitor" },
];

const accountNav = [
  { path: "/subscriptions", key: "nav.subscriptions", icon: "card", standardOnly: true },
  { path: "/purchase", key: "nav.purchase", icon: "cart", feature: "payment", standardOnly: true },
  { path: "/orders", key: "nav.orders", icon: "order", feature: "payment", standardOnly: true },
  { path: "/redeem", key: "nav.redeem", icon: "gift", standardOnly: true },
  { path: "/affiliate", key: "nav.affiliate", icon: "users", feature: "affiliate", standardOnly: true },
  { path: "/profile", key: "nav.profile", icon: "user" },
];

const featureDefinitions = {
  payment: ["payment_enabled", "opt-out"],
  monitor: ["channel_monitor_enabled", "opt-out"],
  available: ["available_channels_enabled", "opt-in"],
  affiliate: ["affiliate_enabled", "opt-in"],
};

function itemEnabled(item, settings, simpleMode, batchEnabled) {
  if (item.standardOnly && simpleMode) return false;
  if (item.feature === "batch") return batchEnabled;
  const definition = featureDefinitions[item.feature];
  return definition ? resolveFeature(settings, definition[0], definition[1]) : true;
}

async function findBatchAccess(signal) {
  let page = 1;
  while (!signal.aborted) {
    const result = await keysApi.list(page, 100, { status: "active", sort_by: "created_at", sort_order: "desc" }, signal);
    const items = result?.items || [];
    const allowed = items.some((key) => key.group?.platform === "gemini" && key.group?.allow_batch_image_generation === true);
    if (allowed) return true;
    if (!items.length || page >= Number(result?.pages || 1)) return false;
    page += 1;
  }
  return false;
}

function useBatchNavigationAccess(authenticated) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (!authenticated) return undefined;
    const controller = new AbortController();
    findBatchAccess(controller.signal).then((value) => { if (!controller.signal.aborted) setEnabled(value); }).catch(() => { if (!controller.signal.aborted) setEnabled(false); });
    return () => controller.abort();
  }, [authenticated]);
  return enabled;
}

function SidebarSection({ title, items, onNavigate, collapsed }) {
  const { t } = useLocale();
  return <div className="console-nav-section"><span className="console-nav-label">{title}</span>{items.map((item) => { const label = item.label || t(item.key); return <NavLink key={item.path} to={item.path} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} className={({ isActive }) => `console-nav-link ${isActive ? "is-active" : ""}`} onClick={onNavigate}><Icon name={item.icon} size={19} /><span>{label}</span><Icon name="chevronRight" size={14} /></NavLink>; })}</div>;
}

function AnnouncementMenu() {
  const { t, formatDate } = useLocale();
  const { notify } = useConsole();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const mountedRef = useRef(true);

  const load = async () => {
    try {
      const nextItems = await announcementsApi.list(false);
      if (!mountedRef.current) return;
      setItems(nextItems);
      setLoaded(true);
    } catch (error) {
      if (mountedRef.current) notify("error", error.message);
    }
  };

  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, []);
  const unread = items.filter((item) => !item.is_read && !item.read_at).length;
  const markRead = async (item) => {
    if (item.is_read || item.read_at) return;
    try {
      await announcementsApi.markRead(item.id);
      if (!mountedRef.current) return;
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_read: true } : entry));
    } catch (error) {
      if (mountedRef.current) notify("error", error.message);
    }
  };

  return <div className="console-popover-wrap"><IconButton icon="bell" label={t("announcement.title")} onClick={() => setOpen((value) => !value)} />{unread > 0 && <b className="console-notification-dot">{unread > 9 ? "9+" : unread}</b>}{open && <div className="console-popover console-announcements"><div className="console-popover-head"><strong>{t("announcement.title")}</strong><IconButton icon="refresh" label={t("common.refresh")} onClick={load} /></div>{!loaded ? <Spinner /> : !items.length ? <EmptyState title={t("announcement.empty")} /> : <div className="console-announcement-list">{items.map((item) => <button key={item.id} className={item.is_read || item.read_at ? "is-read" : ""} onClick={() => markRead(item)}><strong>{item.title}</strong><p>{item.content || item.message}</p><small>{formatDate(item.created_at)}</small></button>)}</div>}</div>}</div>;
}

function UserMenu({ onNavigate }) {
  const { t } = useLocale();
  const { user, logout, settings } = useConsole();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const initial = displayName.trim().slice(0, 1).toUpperCase();
  const avatar = safeImageUrl(user?.avatar_url);

  useEffect(() => {
    const close = (event) => !wrapperRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return <div className="console-user-menu" ref={wrapperRef}><button className="console-user-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu">{avatar ? <img src={avatar} alt="" /> : <span>{initial}</span>}<div><strong>{displayName}</strong><small>{user?.role}</small></div><Icon name="chevronDown" size={14} /></button>{open && <div className="console-popover console-user-popover" role="menu"><div className="console-user-summary"><strong>{displayName}</strong><small>{user?.email}</small></div><Link to="/profile" onClick={() => { setOpen(false); onNavigate(); }} role="menuitem"><Icon name="user" size={17} />{t("nav.profile")}</Link><Link to="/keys" onClick={() => { setOpen(false); onNavigate(); }} role="menuitem"><Icon name="key" size={17} />{t("nav.keys")}</Link>{settings?.contact_info && <div className="console-user-contact"><Icon name="chat" size={17} /><div><span>{t("common.contactSupport")}</span><p>{settings.contact_info}</p></div></div>}<button className="console-user-logout" onClick={handleLogout} role="menuitem"><Icon name="logout" size={17} />{t("nav.logout")}</button></div>}</div>;
}

function ConsoleHeader({ title, mobileOpen, setMobileOpen }) {
  const { t, locale, setLocale, formatCurrency } = useLocale();
  const { user, settings } = useConsole();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    subscriptionsApi.summary().then((value) => active && setSummary(value)).catch(() => active && setSummary(null));
    return () => { active = false; };
  }, []);

  return <header className="console-header"><div className="console-header-left"><IconButton className="console-mobile-menu" icon={mobileOpen ? "close" : "menu"} label="Menu" onClick={() => setMobileOpen((value) => !value)} /><div><span>{t("app.name")}</span><strong>{title}</strong></div></div><div className="console-header-actions">{summary?.active_count > 0 && <Link className="console-subscription-pill" to="/subscriptions"><Icon name="card" size={16} />{summary.active_count}</Link>}{safeExternalUrl(settings?.doc_url) && <a className="console-header-link" href={safeExternalUrl(settings.doc_url)} target="_blank" rel="noreferrer"><Icon name="book" size={17} /><span>{t("nav.docs")}</span></a>}<button className="console-language" onClick={() => setLocale(locale === "en" ? "zh" : "en")}><Icon name="globe" size={17} />{t("nav.language")}</button><AnnouncementMenu /><div className="console-balance"><span>{t("common.balance")}</span><strong>{formatCurrency(user?.balance || 0)}</strong></div><UserMenu onNavigate={() => setMobileOpen(false)} /></div></header>;
}

function pageTitle(pathname, items, t) {
  const exact = items.find((item) => item.path === pathname || pathname.startsWith(`${item.path}/`));
  if (exact) return exact.label || t(exact.key);
  return t("nav.dashboard");
}

export function ConsoleLayout({ children }) {
  const { t } = useLocale();
  const { user, authenticated, settings } = useConsole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
  const batchEnabled = useBatchNavigationAccess(authenticated);
  const simpleMode = user?.run_mode === "simple";
  const customItems = (settings?.custom_menu_items || []).filter((item) => item.visibility === "user").sort((a, b) => a.sort_order - b.sort_order).map((item) => ({ path: `/custom/${item.id}`, label: item.label, icon: "link" }));
  const workspaceItems = coreNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled)).map((item) => item.path === "/dashboard" && user?.role === "admin" ? { ...item, path: "/admin/dashboard" } : item);
  const personalItems = [...accountNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled)), ...customItems];
  const allItems = [...workspaceItems, ...personalItems];
  const title = pageTitle(location.pathname, allItems, t);
  const logo = safeImageUrl(settings?.site_logo) || "/assets/img/sentence-ai-icon.png";

  useEffect(() => {
    document.title = `${title} — ${settings?.site_name || "Sentence AI"}`;
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname, settings?.site_name, title]);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);
  useEffect(() => {
    if (!mobileOpen) return undefined;
    const close = (event) => event.key === "Escape" && setMobileOpen(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", close);
    };
  }, [mobileOpen]);

  const collapseLabel = sidebarCollapsed ? t("nav.expand") : t("nav.collapse");
  return <div className={`console-shell ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}><div className="console-scene" /><aside className={`console-sidebar ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}><Link className="console-brand" to="/" title={sidebarCollapsed ? settings?.site_name || "Sentence AI" : undefined}><img src={logo} alt="" /><div><strong>{settings?.site_name || "Sentence AI"}</strong><span>AI gateway</span></div></Link><nav><SidebarSection title={t("nav.overview")} items={workspaceItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /><SidebarSection title={t("nav.account")} items={personalItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /></nav><div className="console-sidebar-foot"><Link to="/" title={sidebarCollapsed ? t("nav.home") : undefined}><Icon name="home" size={18} /><span>{t("nav.home")}</span></Link><button type="button" className="console-sidebar-toggle" onClick={() => setSidebarCollapsed((value) => !value)} title={collapseLabel} aria-label={collapseLabel}><Icon name={sidebarCollapsed ? "chevronsRight" : "chevronsLeft"} size={18} /><span>{t("nav.collapse")}</span></button></div></aside>{mobileOpen && <button className="console-sidebar-overlay" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}<div className="console-workspace"><ConsoleHeader title={title} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><main>{children}</main></div><ToastViewport /></div>;
}

export function ProtectedRoute({ children, feature, mode = "opt-in", standardOnly = false }) {
  const location = useLocation();
  const { authenticated, user, settings, settingsLoading, settingsError } = useConsole();
  if (!authenticated) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (settings?.backend_mode_enabled && user?.role !== "admin") return <Navigate to="/login" replace />;
  if (standardOnly && user?.run_mode === "simple") return <Navigate to="/dashboard" replace />;
  if (feature && settingsLoading) return <div className="console-standalone"><Spinner /></div>;
  if (feature && !settingsError && !resolveFeature(settings, feature, mode)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { authenticated } = useConsole();
  return authenticated ? <Navigate to="/" replace /> : children;
}
