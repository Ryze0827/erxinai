import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router";
import { announcementsApi, keysApi, subscriptionsApi } from "../api";
import { getAccessToken } from "../api/session";
import { applyFavicon, DEFAULT_SITE_LOGO, DEFAULT_SITE_NAME } from "../branding";
import { useConsole, resolveFeature } from "./ConsoleContext";
import { Icon } from "./Icon";
import { useLocale } from "./i18n";
import { nativeCustomPageIcon, nativeCustomPageKind, nativeCustomPageRoute } from "./nativeCustomPages";
import { Button, EmptyState, IconButton, Modal, Spinner, ThemeToggle, ToastViewport } from "./UI";
import { useConsoleBackground, useGlassTransparency, useTheme } from "./theme";
import { safeExternalUrl, safeImageUrl } from "./utils";
import "./console.css";

const SIDEBAR_STORAGE_KEY = "sentence_console_sidebar_collapsed";
const SIDEBAR_MOTION = { duration: 220, easing: "cubic-bezier(.2, .76, .25, 1)" };

function canAnimateSidebar() {
  return window.matchMedia("(min-width: 981px)").matches && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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
  { path: "/image-studio", key: "imageStudio.title", icon: "image" },
  { path: "/image-api-docs", key: "imageDocs.title", icon: "book" },
  { path: "/video-workflow", key: "videoWorkflow.title", icon: "play" },
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

function GlassTransparencyControl() {
  const { t } = useLocale();
  const { transparency, setTransparency } = useGlassTransparency();
  return <label className="console-glass-control"><span><strong>{t("appearance.glassTransparency")}</strong><output>{transparency}%</output></span><input type="range" min="0" max="100" step="1" value={transparency} aria-label={t("appearance.glassTransparency")} onChange={(event) => setTransparency(event.target.value)} style={{ "--console-glass-slider-value": `${transparency}%` }} /></label>;
}

function BackgroundControl() {
  const { t } = useLocale();
  const { resolved } = useTheme();
  const { background, setBackground } = useConsoleBackground();
  const selectedBackground = resolved === "dark" ? "scene" : background;
  const options = resolved === "light"
    ? [{ value: "white", label: t("appearance.backgroundWhite") }, { value: "scene", label: t("appearance.backgroundScene") }]
    : [{ value: "scene", label: t("appearance.backgroundScene") }];
  return <div className="console-background-control" role="group" aria-label={t("appearance.background")}><strong>{t("appearance.background")}</strong><div>{options.map((option) => <button type="button" className={`console-background-option ${selectedBackground === option.value ? "is-selected" : ""}`} aria-pressed={selectedBackground === option.value} aria-label={option.label} onClick={() => setBackground(option.value)} key={option.value}><span className={`console-background-swatch is-${option.value}`} aria-hidden="true" />{selectedBackground === option.value && <span className="console-background-selection" aria-hidden="true"><Icon name="check" size={10} /></span>}</button>)}</div></div>;
}

function announcementContent(item) {
  return String(item?.content || item?.message || "").replace(/\\r\\n|\\n|\\r/g, "\n");
}

function SiteAnnouncementBar() {
  const { t } = useLocale();
  const message = "GPT分组按充值金额，调低倍率/开通专线，详情见历史公告";
  return <div className="console-site-announcement-slot"><aside className="console-site-announcement" role="status" aria-label={t("announcement.title")}><div className="console-site-announcement-viewport"><div className="console-site-announcement-track"><span>{message}</span><span aria-hidden="true">{message}</span></div></div></aside></div>;
}

function AnnouncementMenu() {
  const { t, formatDate } = useLocale();
  const { notify } = useConsole();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [popup, setPopup] = useState(null);
  const [popupQueue, setPopupQueue] = useState([]);
  const shownPopupIds = useRef(new Set());
  const mountedRef = useRef(true);
  const wrapperRef = useRef(null);

  const load = async () => {
    try {
      const nextItems = await announcementsApi.list(false);
      if (!mountedRef.current) return;
      setItems(nextItems);
      setLoaded(true);
      const pending = nextItems.filter((item) => item.notify_mode === "popup" && !item.is_read && !item.read_at && !shownPopupIds.current.has(item.id));
      pending.forEach((item) => shownPopupIds.current.add(item.id));
      if (pending.length) setPopupQueue((current) => [...current, ...pending]);
    } catch (error) {
      if (mountedRef.current) notify("error", error.message);
    }
  };

  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, []);
  useEffect(() => {
    const close = (event) => !wrapperRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  useEffect(() => {
    if (popup || !popupQueue.length) return;
    setPopup(popupQueue[0]);
    setPopupQueue((current) => current.slice(1));
  }, [popup, popupQueue]);
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

  const closePopup = async () => {
    const current = popup;
    setPopup(null);
    if (current) await markRead(current);
  };

  return <div className="console-popover-wrap" ref={wrapperRef}><IconButton icon="bell" label={t("announcement.title")} onClick={() => setOpen((value) => !value)} />{unread > 0 && <b className="console-notification-dot">{unread > 9 ? "9+" : unread}</b>}{open && <div className="console-popover console-announcements"><div className="console-popover-head"><strong>{t("announcement.title")}</strong><IconButton icon="refresh" label={t("common.refresh")} onClick={load} /></div>{!loaded ? <Spinner /> : !items.length ? <EmptyState title={t("announcement.empty")} /> : <div className="console-announcement-list">{items.map((item) => <button key={item.id} className={item.is_read || item.read_at ? "is-read" : ""} onClick={() => { shownPopupIds.current.add(item.id); setPopup(item); setOpen(false); }}><strong>{item.title}</strong><p>{announcementContent(item)}</p><small>{formatDate(item.created_at)}</small></button>)}</div>}</div>}<Modal open={Boolean(popup)} title={popup?.title || t("announcement.title")} description={popup?.created_at ? formatDate(popup.created_at) : ""} onClose={closePopup} footer={<Button variant="primary" icon="check" onClick={closePopup}>{t("common.confirm")}</Button>}><div className="console-markdown console-announcement-content">{announcementContent(popup)}</div></Modal></div>;
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

const walkthroughSteps = [
  { title: "walkthrough.recharge", description: "walkthrough.rechargeDescription", target: '.console-sidebar a[href="/purchase"]', fallback: ".console-walkthrough-trigger", icon: "wallet" },
  { title: "walkthrough.apiKeys", description: "walkthrough.apiKeysDescription", target: '.console-sidebar a[href="/keys"]', fallback: ".console-walkthrough-trigger", icon: "key" },
  { title: "walkthrough.createKey", description: "walkthrough.createKeyDescription", path: "/keys", target: '[data-walkthrough="create-key"]', fallback: '.console-sidebar a[href="/keys"], .console-walkthrough-trigger', icon: "plus" },
  { title: "walkthrough.useKey", description: "walkthrough.useKeyDescription", path: "/keys", target: '[data-walkthrough="use-key"]', fallback: '[data-walkthrough="create-key"], .console-sidebar a[href="/keys"], .console-walkthrough-trigger', icon: "terminal" },
];
let walkthroughSession = { active: false, step: 0 };

function visibleWalkthroughTarget(selector) {
  return [...document.querySelectorAll(selector)].find((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= window.innerWidth + 1 && style.display !== "none" && style.visibility !== "hidden";
  });
}

function walkthroughTargetRect(element) {
  const padding = 8;
  const rect = element.getBoundingClientRect();
  const top = Math.max(8, rect.top - padding);
  const left = Math.max(8, rect.left - padding);
  const right = Math.min(window.innerWidth - 8, rect.right + padding);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + padding);
  return { top, left, width: Math.max(1, right - left), height: Math.max(1, bottom - top), right, bottom };
}

function sameWalkthroughRect(current, next) {
  return current && current.fallback === next.fallback && ["top", "left", "width", "height"].every((key) => Math.abs(current[key] - next[key]) < .5);
}

function walkthroughCardPosition(target) {
  const margin = 12;
  const gap = 16;
  const width = Math.min(360, window.innerWidth - margin * 2);
  if (window.innerWidth <= 760 || !target) return { width, left: margin, right: "auto", top: "auto", bottom: margin };
  const estimatedHeight = 244;
  const left = Math.min(Math.max(margin, target.left + target.width / 2 - width / 2), window.innerWidth - width - margin);
  if (target.bottom + gap + estimatedHeight <= window.innerHeight - margin) return { width, left, right: "auto", top: target.bottom + gap, bottom: "auto" };
  if (target.top - gap - estimatedHeight >= margin) return { width, left, right: "auto", top: target.top - gap - estimatedHeight, bottom: "auto" };
  return { width, left, right: "auto", top: Math.max(margin, window.innerHeight - estimatedHeight - margin), bottom: "auto" };
}

function Walkthrough({ setMobileOpen }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);
  const [open, setOpen] = useState(walkthroughSession.active);
  const [step, setStep] = useState(walkthroughSession.step);
  const [target, setTarget] = useState(null);
  const current = walkthroughSteps[step];
  const close = () => {
    walkthroughSession = { active: false, step: 0 };
    if (window.innerWidth <= 980) setMobileOpen(false);
    setOpen(false);
    setTarget(null);
  };
  const showStep = (nextStep) => {
    const normalized = Math.max(0, Math.min(walkthroughSteps.length - 1, nextStep));
    const next = walkthroughSteps[normalized];
    walkthroughSession = { active: true, step: normalized };
    if (window.innerWidth <= 980) setMobileOpen(normalized < 2);
    setStep(normalized);
    setOpen(true);
    setTarget(null);
    if (next.path && location.pathname !== next.path) navigate(next.path);
  };

  useEffect(() => {
    if (!open) return undefined;
    let allowFallback = false;
    let previousElement = null;
    let frame;
    const locate = () => {
      const primary = visibleWalkthroughTarget(current.target);
      const element = primary || (allowFallback ? visibleWalkthroughTarget(current.fallback) : null);
      if (!element) { setTarget(null); return; }
      if (element !== previousElement) {
        previousElement = element;
        element.scrollIntoView({ block: "center", inline: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const next = { ...walkthroughTargetRect(element), fallback: !primary };
        setTarget((value) => sameWalkthroughRect(value, next) ? value : next);
      });
    };
    const fallbackTimer = window.setTimeout(() => { allowFallback = true; locate(); }, 1200);
    const interval = window.setInterval(locate, 180);
    const observer = new MutationObserver(locate);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", locate);
    window.addEventListener("scroll", locate, true);
    locate();
    return () => {
      window.clearTimeout(fallbackTimer);
      window.clearInterval(interval);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", locate);
      window.removeEventListener("scroll", locate, true);
    };
  }, [current.fallback, current.target, location.pathname, open]);

  const targetReady = Boolean(target);

  useEffect(() => {
    if (!open || !targetReady) return undefined;
    const focusTimer = window.requestAnimationFrame(() => cardRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") { close(); return; }
      if (event.key !== "Tab") return;
      const items = [...(cardRef.current?.querySelectorAll("button:not(:disabled)") || [])];
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !cardRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !cardRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { window.cancelAnimationFrame(focusTimer); document.removeEventListener("keydown", onKeyDown); };
  }, [open, targetReady]);

  const position = walkthroughCardPosition(target);
  const description = step === 3 && target?.fallback ? t("walkthrough.useKeyFallback") : t(current.description);
  const layer = open && targetReady ? createPortal(<div className="console-tour-layer"><div className="console-tour-capture" aria-hidden="true" /><div className="console-tour-spotlight" style={{ top: target.top, left: target.left, width: target.width, height: target.height }} aria-hidden="true" /><section ref={cardRef} className="console-tour-card" style={position} role="dialog" aria-modal="true" aria-label={t("walkthrough.title")} tabIndex="-1"><header><span>{t("walkthrough.step", { current: step + 1, total: walkthroughSteps.length })}</span><IconButton icon="close" label={t("common.close")} onClick={close} /></header><div className="console-tour-progress" aria-hidden="true">{walkthroughSteps.map((item, index) => <i className={`${index === step ? "is-active" : ""} ${index < step ? "is-complete" : ""}`} key={item.title} />)}</div><div className="console-tour-content"><i><Icon name={current.icon} size={23} /></i><div><h2>{t(current.title)}</h2><p>{description}</p></div></div><footer>{step > 0 ? <Button icon="chevronsLeft" onClick={() => showStep(step - 1)}>{t("walkthrough.previous")}</Button> : <Button onClick={close}>{t("walkthrough.skip")}</Button>}{step < walkthroughSteps.length - 1 ? <Button variant="primary" icon="chevronRight" onClick={() => showStep(step + 1)}>{t("walkthrough.next")}</Button> : <Button variant="primary" icon="check" onClick={close}>{t("walkthrough.finish")}</Button>}</footer></section></div>, document.body) : null;

  return <><button type="button" className="console-header-link console-walkthrough-trigger" onClick={() => showStep(0)} aria-haspopup="dialog" aria-expanded={open} title={t("walkthrough.trigger")}><Icon name="play" size={17} /><span>{t("walkthrough.trigger")}</span></button>{layer}</>;
}

function ConsoleHeader({ title, mobileOpen, setMobileOpen }) {
  const { t, locale, setLocale, formatUsd } = useLocale();
  const { user, settings } = useConsole();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    subscriptionsApi.summary().then((value) => active && setSummary(value)).catch(() => active && setSummary(null));
    return () => { active = false; };
  }, []);

  return <header className="console-header"><div className="console-header-left"><IconButton className="console-mobile-menu" icon={mobileOpen ? "close" : "menu"} label="Menu" onClick={() => setMobileOpen((value) => !value)} /><div><span>{t("app.name")}</span><strong>{title}</strong></div></div><SiteAnnouncementBar /><div className="console-header-actions">{summary?.active_count > 0 && <Link className="console-subscription-pill" to="/subscriptions"><Icon name="card" size={16} />{summary.active_count}</Link>}<Walkthrough setMobileOpen={setMobileOpen} />{safeExternalUrl(settings?.doc_url) && <a className="console-header-link" href={safeExternalUrl(settings.doc_url)} target="_blank" rel="noreferrer"><Icon name="book" size={17} /><span>{t("nav.docs")}</span></a>}<button className="console-language" onClick={() => setLocale(locale === "en" ? "zh" : "en")}><Icon name="globe" size={17} />{t("nav.language")}</button><ThemeToggle /><AnnouncementMenu /><div className="console-balance"><span>{t("common.balance")}</span><strong>{formatUsd(user?.balance || 0)}</strong></div><UserMenu onNavigate={() => setMobileOpen(false)} /></div></header>;
}

function pageTitle(pathname, items, t) {
  const currentPath = pathname === "/docs/batch-image" ? "/batch-image" : pathname;
  const exact = items.find((item) => item.path === currentPath || currentPath.startsWith(`${item.path}/`));
  if (exact) return exact.label || t(exact.key);
  return t("nav.dashboard");
}

export function ConsoleLayout({ children }) {
  const { t } = useLocale();
  const { user, authenticated, settings, branding, brandingReady } = useConsole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
  const workspaceRef = useRef(null);
  const workspaceMotionRef = useRef(null);
  const workspaceStartLeftRef = useRef(null);
  const batchEnabled = useBatchNavigationAccess(authenticated);
  const simpleMode = user?.run_mode === "simple";
  const customItems = (settings?.custom_menu_items || []).filter((item) => item.visibility === "user").sort((a, b) => a.sort_order - b.sort_order).flatMap((item) => { const kind = nativeCustomPageKind(item); const markdown = item.page_slug || String(item.url || "").startsWith("md:"); return nativeCustomPageRoute(kind) || !markdown ? [] : [{ path: `/custom/${item.id}`, label: item.label, icon: nativeCustomPageIcon(kind) }]; });
  const workspaceItems = coreNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled)).map((item) => item.path === "/dashboard" && user?.role === "admin" ? { ...item, path: "/admin/dashboard" } : item);
  const personalItems = [...accountNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled)), ...customItems];
  const allItems = [...workspaceItems, ...personalItems];
  const title = pageTitle(location.pathname, allItems, t);
  const logo = branding?.siteLogo || DEFAULT_SITE_LOGO;
  const siteName = branding?.siteName || DEFAULT_SITE_NAME;

  useEffect(() => {
    if (!brandingReady) return;
    document.title = `${title} — ${siteName}`;
    applyFavicon(logo);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [brandingReady, location.pathname, logo, siteName, title]);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);
  useLayoutEffect(() => {
    const workspace = workspaceRef.current;
    const startLeft = workspaceStartLeftRef.current;
    workspaceStartLeftRef.current = null;
    if (!workspace || startLeft == null || !canAnimateSidebar()) return;
    const offset = startLeft - workspace.getBoundingClientRect().left;
    if (Math.abs(offset) < 1) return;
    const animation = workspace.animate(
      [{ transform: `translate3d(${offset}px, 0, 0)` }, { transform: "translate3d(0, 0, 0)" }],
      SIDEBAR_MOTION,
    );
    workspaceMotionRef.current = animation;
    animation.onfinish = () => {
      animation.cancel();
      if (workspaceMotionRef.current === animation) workspaceMotionRef.current = null;
    };
  }, [sidebarCollapsed]);
  useEffect(() => () => workspaceMotionRef.current?.cancel(), []);
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
  const toggleSidebar = () => {
    const workspace = workspaceRef.current;
    workspaceStartLeftRef.current = workspace?.getBoundingClientRect().left ?? null;
    workspaceMotionRef.current?.cancel();
    setSidebarCollapsed((value) => !value);
  };
  return <div className={`console-shell ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}><div className="console-scene" /><aside className={`console-sidebar ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}><Link className={`console-brand ${brandingReady ? "" : "is-pending"}`} to="/" title={sidebarCollapsed && brandingReady ? siteName : undefined}>{brandingReady && <img key={logo} src={logo} alt="" />}{brandingReady && <div><strong>{siteName}</strong><span>AI gateway</span></div>}</Link><nav><SidebarSection title={t("nav.overview")} items={workspaceItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /><SidebarSection title={t("nav.account")} items={personalItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /></nav><BackgroundControl /><GlassTransparencyControl /><div className="console-sidebar-foot"><Link to="/" title={sidebarCollapsed ? t("nav.home") : undefined}><Icon name="home" size={18} /><span>{t("nav.home")}</span></Link><button type="button" className="console-sidebar-toggle" onClick={toggleSidebar} title={collapseLabel} aria-label={collapseLabel}><Icon name={sidebarCollapsed ? "chevronsRight" : "chevronsLeft"} size={18} /><span>{t("nav.collapse")}</span></button></div></aside>{mobileOpen && <button className="console-sidebar-overlay" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}<div className="console-workspace" ref={workspaceRef}><ConsoleHeader title={title} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><main>{children}</main></div><ToastViewport /></div>;
}

export function ProtectedRoute({ children, feature, mode = "opt-in", standardOnly = false }) {
  const location = useLocation();
  const { authenticated, user, settings, settingsLoading, settingsError } = useConsole();
  if (getAccessToken() && !user) return <div className="console-standalone"><Spinner /></div>;
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
