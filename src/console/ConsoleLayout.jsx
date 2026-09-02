import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, NavLink, useLocation, useNavigate } from "react-router";
import { Avatar } from "@appica/ui-react/avatar";
import { AvatarFallback } from "@appica/ui-react/avatar";
import { AvatarImage } from "@appica/ui-react/avatar";
import { Alert } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { AlertTitle } from "@appica/ui-react/alert";
import { Button as AppicaButton } from "@appica/ui-react/button";
import { Dialog } from "@appica/ui-react/dialog";
import { DialogContent } from "@appica/ui-react/dialog";
import { DialogTitle } from "@appica/ui-react/dialog";
import { DropdownMenu } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuContent } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuItem } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuSeparator } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuTrigger } from "@appica/ui-react/dropdown-menu";
import { Navigation } from "@appica/ui-react/navigation";
import { NavigationItem } from "@appica/ui-react/navigation";
import { NavigationLink } from "@appica/ui-react/navigation";
import { NavigationList } from "@appica/ui-react/navigation";
import { Popover } from "@appica/ui-react/popover";
import { PopoverContent } from "@appica/ui-react/popover";
import { PopoverTrigger } from "@appica/ui-react/popover";
import { useReducedMotion } from "@appica/ui-react/hooks/use-reduced-motion";
import { MessageChatbot, X } from "@appica/icons-react";
import { announcementsApi, keysApi, subscriptionsApi } from "../api";
import { getAccessToken } from "../api/session";
import { AppicaAssistantCard } from "../AppicaAssistant";
import { BrandLogo } from "../BrandLogo";
import { DEFAULT_SITE_LOGO, DEFAULT_SITE_NAME } from "../branding";
import { TeamMembersCard } from "../TeamMembersCard";
import { useConsole, resolveFeature } from "./ConsoleContext";
import { ConsoleBackgroundPattern } from "./components/ConsoleBackgroundPattern";
import { Icon } from "./Icon";
import { useLocale } from "./i18n";
import { nativeCustomPageIcon, nativeCustomPageKind, nativeCustomPageRoute } from "./nativeCustomPages";
import { Button, buttonLinkClass, EmptyState, IconButton, InlineButton, Modal, Spinner, ThemeToggle, ToastViewport } from "./UI";
import { safeExternalUrl, safeImageUrl } from "./utils";

const SIDEBAR_STORAGE_KEY = "sentence_console_sidebar_collapsed";
const SIDEBAR_MOTION = { duration: 220, easing: "cubic-bezier(.2, .76, .25, 1)", fill: "both" };
const SIDEBAR_LAYOUT_DISPLAYS = new Set(["flex", "inline-flex", "grid", "inline-grid"]);
const SIDEBAR_MOTION_STATIC_SELECTOR = "[data-sidebar-motion-static]";
const LAYOUT_IDENTITY_TRANSFORMS = new Set([
  "none",
  "matrix(1, 0, 0, 1, 0, 0)",
  "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)",
]);
const STORE_URL = "https://shop.erxin.store";

function isDesktopSidebar() {
  return window.matchMedia("(min-width: 981px)").matches;
}

function sidebarAnchorPoint(element, rect) {
  const textNode = [...element.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (!textNode) return { left: rect.left, top: rect.top };
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const textRect = range.getBoundingClientRect();
  return textRect.width || textRect.height ? { left: textRect.left, top: textRect.top } : { left: rect.left, top: rect.top };
}

function captureSlidingLayout(root, activeElements = new Set()) {
  const candidates = new Set([...activeElements].filter((element) => element !== root && root.contains(element) && !element.closest(SIDEBAR_MOTION_STATIC_SELECTOR)));
  root.querySelectorAll("*").forEach((container) => {
    if (container.closest(SIDEBAR_MOTION_STATIC_SELECTOR)) return;
    if (!SIDEBAR_LAYOUT_DISPLAYS.has(getComputedStyle(container).display)) return;
    [...container.children].forEach((child) => {
      if (!child.closest(SIDEBAR_MOTION_STATIC_SELECTOR)) candidates.add(child);
    });
  });
  const anchors = new Map();
  candidates.forEach((element) => {
    if (!element.isConnected) return;
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || (!LAYOUT_IDENTITY_TRANSFORMS.has(style.transform) && !activeElements.has(element))) return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || rect.right <= 0 || rect.left >= window.innerWidth || rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    const point = sidebarAnchorPoint(element, rect);
    anchors.set(element, point);
  });
  return { anchors };
}

const overviewNav = [
  { path: "/admin/dashboard", key: "nav.dashboard", icon: "dashboardAnalytics" },
];

const workspaceNav = [
  { path: "/keys", key: "nav.keys", icon: "apiKey" },
  { path: "/batch-image", key: "nav.batch", icon: "batchImages", feature: "batch", standardOnly: true },
  { path: "/usage", key: "nav.usage", icon: "usageChart", standardOnly: true },
  { path: "/available-channels", key: "nav.channels", icon: "channelNetwork", feature: "available", standardOnly: true },
  { path: "/monitor", key: "nav.monitor", icon: "serverHealth", feature: "monitor" },
];

const accountNav = [
  { path: "/profile", key: "nav.profile", icon: "user", sidebarHidden: true },
  { path: "/subscriptions", key: "nav.subscriptions", icon: "card", standardOnly: true, sidebarHidden: true },
  { path: "/purchase", key: "nav.purchase", icon: "walletTopUp", feature: "payment", standardOnly: true },
  { path: "/orders", key: "nav.orders", icon: "orderReceipt", feature: "payment", standardOnly: true },
  { path: "/redeem", key: "nav.redeem", icon: "giftCard", standardOnly: true },
  { path: "/affiliate", key: "nav.affiliate", icon: "affiliate", feature: "affiliate", standardOnly: true },
];

const toolsNav = [
  { path: "/image-studio", key: "imageStudio.title", icon: "imageStudio" },
  { path: "/image-api-docs", key: "imageDocs.title", icon: "apiBook" },
  { path: "/invoice", key: "nav.invoice", icon: "orderReceipt", feature: "payment", standardOnly: true },
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

function SidebarSection({ title, items, onNavigate, collapsed, className = "" }) {
  const { t } = useLocale();
  const location = useLocation();
  return <section className={`console-nav-section ${className}`}>{title && <span className="console-nav-label">{title}</span>}<Navigation orientation="vertical" variant="pill" size="md"><NavigationList>{items.map((item) => { const label = item.label || t(item.key); const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`); return <NavigationItem key={item.path}><NavigationLink render={<NavLink to={item.path} />} active={active} className={`console-nav-link ${active ? "is-active" : ""}`} title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} onClick={onNavigate}><Icon name={item.icon} size={19} data-icon="start" /><span>{label}</span><Icon name="chevronRight" size={14} data-icon="end" /></NavigationLink></NavigationItem>; })}</NavigationList></Navigation></section>;
}

function StoreNavigation({ collapsed, onNavigate }) {
  const { t } = useLocale();
  const label = t("nav.store");
  return <section className="console-nav-section console-nav-section--store"><Navigation orientation="vertical" variant="pill" size="md"><NavigationList><NavigationItem><NavigationLink className="console-nav-link" href={STORE_URL} target="_blank" rel="noopener noreferrer" title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined} onClick={onNavigate}><Icon name="storefront" size={19} data-icon="start" /><span>{label}</span><Icon name="external" size={14} data-icon="end" /></NavigationLink></NavigationItem></NavigationList></Navigation></section>;
}

function SidebarUserMenu({ collapsed, onNavigate }) {
  const { t } = useLocale();
  const { user, logout, settings } = useConsole();
  const navigate = useNavigate();
  const [teamMembersOpen, setTeamMembersOpen] = useState(false);
  const teamMembersCardRef = useRef(null);
  const displayName = user?.username || user?.email?.split("@")[0] || "User";
  const initial = displayName.trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const avatar = safeImageUrl(user?.avatar_url);

  const handleLogout = async () => {
    onNavigate?.();
    await logout();
    navigate("/login", { replace: true });
  };

  const openAccountPage = (path) => {
    onNavigate?.();
    navigate(path);
  };

  return <><DropdownMenu size="md"><DropdownMenuTrigger className="console-sidebar-user" title={collapsed ? t("nav.accountMenu") : undefined} aria-label={collapsed ? t("nav.accountMenu") : undefined}><Avatar size={42} shape="rounded" className="console-sidebar-avatar">{avatar && <AvatarImage src={avatar} alt="" />}<AvatarFallback>{initial}</AvatarFallback></Avatar><div><strong>{displayName}</strong><small>{t("nav.workspaceOwner")}</small></div><Icon name="chevronDown" size={15} data-icon="end" /></DropdownMenuTrigger><DropdownMenuContent side="top" align="start" className="console-user-popover"><div className="console-user-summary"><Avatar size={40} shape="rounded" className="console-user-summary-avatar">{avatar && <AvatarImage src={avatar} alt="" />}<AvatarFallback>{initial}</AvatarFallback></Avatar><div><strong>{displayName}</strong>{user?.email && <small>{user.email}</small>}</div></div><DropdownMenuSeparator /><DropdownMenuItem onClick={() => openAccountPage("/profile")}><Icon name="user" size={17} data-icon="start" />{t("nav.profile")}</DropdownMenuItem><DropdownMenuItem onClick={() => openAccountPage("/keys")}><Icon name="apiKey" size={17} data-icon="start" />{t("nav.keys")}</DropdownMenuItem><DropdownMenuItem onClick={() => setTeamMembersOpen(true)}><Icon name="users" size={17} data-icon="start" />{t("nav.inviteMembers")}</DropdownMenuItem>{settings?.contact_info && <div className="console-user-contact"><Icon name="chat" size={17} /><div><span>{t("common.contactSupport")}</span><p>{settings.contact_info}</p></div></div>}<DropdownMenuSeparator /><DropdownMenuItem className="console-user-logout" onClick={handleLogout}><Icon name="logout" size={17} data-icon="start" />{t("nav.logout")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Dialog open={teamMembersOpen} onOpenChange={setTeamMembersOpen}><DialogContent frame={false} closeButton={false} initialFocus={teamMembersCardRef} className="console-team-members-dialog"><DialogTitle className="sr-only">{t("nav.inviteMembers")}</DialogTitle><TeamMembersCard ref={teamMembersCardRef} className="console-team-members-floating-card" ownerName={displayName} ownerEmail={user?.email || "—"} ownerLabel={t("teamMembers.you")} footer={<p className="bg-background-muted text-foreground-muted rounded-lg px-3 py-2 text-center text-xs">{t("teamMembers.comingSoon")}</p>} /></DialogContent></Dialog></>;
}

function SidebarAssistant() {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const label = locale === "zh" ? (open ? "关闭 WayX Assistant" : "打开 WayX Assistant") : (open ? "Close WayX Assistant" : "Open WayX Assistant");
  return <div className="console-sidebar-assistant"><Popover open={open} onOpenChange={setOpen}><PopoverTrigger render={<AppicaButton type="button" variant="soft" size="icon-lg" className="group/assistant" aria-label={label} title={label}><MessageChatbot aria-hidden="true" className="absolute transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.77,0,0.175,1)] group-data-[popup-open]/assistant:transform-[rotate(45deg)_scale(.85)] group-data-[popup-open]/assistant:opacity-0 motion-reduce:transform-none motion-reduce:transition-opacity" /><X aria-hidden="true" className="absolute transform-[rotate(-45deg)_scale(.85)] opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.77,0,0.175,1)] group-data-[popup-open]/assistant:transform-none group-data-[popup-open]/assistant:opacity-100 motion-reduce:transform-none motion-reduce:transition-opacity" /></AppicaButton>} /><PopoverContent arrow={false} side="right" align="end" className="w-108 max-w-[calc(100vw-2rem)] border-0 bg-transparent p-0 shadow-none"><AppicaAssistantCard className="w-full" /></PopoverContent></Popover></div>;
}

function announcementContent(item) {
  return String(item?.content ?? item?.message ?? "")
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(/\\r\\n|\\n|\\r/g, "\n");
}

function SiteAnnouncementBar() {
  const { t } = useLocale();
  const message = "GPT分组按充值金额，调低倍率/开通专线，详情见历史公告";
  return <div className="console-site-announcement-slot"><Alert layout="inline" role="status" aria-label={t("announcement.title")} className="console-site-announcement"><AlertIcon><Icon name="announcement" size={16} /></AlertIcon><AlertTitle as="p">{message}</AlertTitle></Alert></div>;
}

function AnnouncementMenu() {
  const { t, formatDate } = useLocale();
  const { notify } = useConsole();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [popupQueue, setPopupQueue] = useState([]);
  const shownPopupIds = useRef(new Set());
  const mountedRef = useRef(true);

  const load = async () => {
    setLoading(true);
    try {
      const response = await announcementsApi.list(false);
      const nextItems = Array.isArray(response) ? response : [];
      if (!mountedRef.current) return;
      setItems(nextItems);
      setLoaded(true);
      const pending = nextItems.filter((item) => item.notify_mode === "popup" && !item.is_read && !item.read_at && !shownPopupIds.current.has(item.id));
      pending.forEach((item) => shownPopupIds.current.add(item.id));
      if (pending.length) setPopupQueue((current) => [...current, ...pending]);
    } catch (error) {
      if (mountedRef.current) notify("error", error.message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, []);
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

  return <div className="console-popover-wrap"><Popover open={open} onOpenChange={setOpen}><PopoverTrigger render={<IconButton icon="bell" label={t("announcement.title")} />} />{unread > 0 && <b className="console-notification-dot">{unread > 9 ? "9+" : unread}</b>}<PopoverContent arrow={false} align="end" className="console-popover console-announcements"><div className="console-popover-head"><strong>{t("announcement.title")}</strong><IconButton icon="refresh" label={t("common.refresh")} onClick={load} loading={loading} /></div>{!loaded ? <Spinner /> : !items.length ? <EmptyState title={t("announcement.empty")} /> : <div className="console-announcement-list">{items.map((item) => <InlineButton key={item.id} className={item.is_read || item.read_at ? "is-read" : ""} onClick={() => { shownPopupIds.current.add(item.id); setPopup(item); setOpen(false); }}><span><strong>{item.title}</strong><p>{announcementContent(item)}</p><small>{formatDate(item.created_at)}</small></span></InlineButton>)}</div>}</PopoverContent></Popover><Modal open={Boolean(popup)} title={popup?.title || t("announcement.title")} description={popup?.created_at ? formatDate(popup.created_at) : ""} onClose={closePopup} footer={<Button variant="primary" icon="check" onClick={closePopup}>{t("common.confirm")}</Button>}><div className="console-markdown console-announcement-content">{announcementContent(popup)}</div></Modal></div>;
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

function walkthroughRootScale() {
  const scale = Number.parseFloat(window.getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function walkthroughTargetRect(element) {
  const scale = walkthroughRootScale();
  const padding = 8;
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth / scale;
  const viewportHeight = window.innerHeight / scale;
  const top = Math.max(8, rect.top / scale - padding);
  const left = Math.max(8, rect.left / scale - padding);
  const right = Math.min(viewportWidth - 8, rect.right / scale + padding);
  const bottom = Math.min(viewportHeight - 8, rect.bottom / scale + padding);
  return { top, left, width: Math.max(1, right - left), height: Math.max(1, bottom - top), right, bottom };
}

function sameWalkthroughRect(current, next) {
  return current && current.fallback === next.fallback && ["top", "left", "width", "height"].every((key) => Math.abs(current[key] - next[key]) < .5);
}

function walkthroughCardPosition(target) {
  const scale = walkthroughRootScale();
  const viewportWidth = window.innerWidth / scale;
  const viewportHeight = window.innerHeight / scale;
  const margin = 12;
  const gap = 16;
  const width = Math.min(360, viewportWidth - margin * 2);
  if (window.innerWidth <= 760 || !target) return { width, left: margin, right: "auto", top: "auto", bottom: margin };
  const estimatedHeight = 244;
  const left = Math.min(Math.max(margin, target.left + target.width / 2 - width / 2), viewportWidth - width - margin);
  if (target.bottom + gap + estimatedHeight <= viewportHeight - margin) return { width, left, right: "auto", top: target.bottom + gap, bottom: "auto" };
  if (target.top - gap - estimatedHeight >= margin) return { width, left, right: "auto", top: target.top - gap - estimatedHeight, bottom: "auto" };
  return { width, left, right: "auto", top: Math.max(margin, viewportHeight - estimatedHeight - margin), bottom: "auto" };
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
      if (!element) return;
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
  const layer = open ? createPortal(<div className={`console-tour-layer ${targetReady ? "is-ready" : "is-pending"}`}><div className="console-tour-capture" aria-hidden="true" />{targetReady && <div className="console-tour-spotlight" style={{ top: target.top, left: target.left, width: target.width, height: target.height }} aria-hidden="true" />}{targetReady && <section ref={cardRef} className="console-tour-card" style={position} role="dialog" aria-modal="true" aria-label={t("walkthrough.title")} tabIndex="-1"><header><span>{t("walkthrough.step", { current: step + 1, total: walkthroughSteps.length })}</span><IconButton icon="close" label={t("common.close")} onClick={close} /></header><div className="console-tour-progress" aria-hidden="true">{walkthroughSteps.map((item, index) => <i className={`${index === step ? "is-active" : ""} ${index < step ? "is-complete" : ""}`} key={item.title} />)}</div><div className="console-tour-content"><i><Icon name={current.icon} size={23} /></i><div><h2>{t(current.title)}</h2><p>{description}</p></div></div><footer>{step > 0 ? <Button icon="chevronsLeft" onClick={() => showStep(step - 1)}>{t("walkthrough.previous")}</Button> : <Button onClick={close}>{t("walkthrough.skip")}</Button>}{step < walkthroughSteps.length - 1 ? <Button variant="primary" icon="chevronRight" onClick={() => showStep(step + 1)}>{t("walkthrough.next")}</Button> : <Button variant="primary" icon="check" onClick={close}>{t("walkthrough.finish")}</Button>}</footer></section>}</div>, document.body) : null;

  return <><InlineButton className="console-header-link console-walkthrough-trigger" icon="walkthrough" onClick={() => showStep(0)} aria-haspopup="dialog" aria-expanded={open} title={t("walkthrough.trigger")}>{t("walkthrough.trigger")}</InlineButton>{layer}</>;
}

function ConsoleHeader({ title, mobileOpen, setMobileOpen }) {
  const { t, formatUsd, locale, setLocale } = useLocale();
  const { settings, user } = useConsole();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let active = true;
    subscriptionsApi.summary().then((value) => active && setSummary(value)).catch(() => active && setSummary(null));
    return () => { active = false; };
  }, []);

  return <><header className="console-header"><div className="console-header-left"><IconButton className="console-mobile-menu" icon={mobileOpen ? "close" : "menu"} label={t(mobileOpen ? "nav.closeMenu" : "nav.openMenu")} onClick={() => setMobileOpen((value) => !value)} /><strong>{title}</strong></div><div className="console-header-actions" data-sidebar-motion-static>{summary?.active_count > 0 && <Link className={buttonLinkClass({ variant: "secondary", size: "md", className: "console-subscription-pill" })} to="/subscriptions"><Icon name="card" size={16} />{summary.active_count}</Link>}<Walkthrough setMobileOpen={setMobileOpen} />{safeExternalUrl(settings?.doc_url) && <a className={buttonLinkClass({ variant: "secondary", size: "md", className: "console-header-link" })} href={safeExternalUrl(settings.doc_url)} target="_blank" rel="noreferrer"><Icon name="book" size={17} /><span>{t("nav.docs")}</span></a>}<InlineButton variant="outline" size="md" className="console-header-language" icon="language" aria-label={t("nav.switchLanguage")} title={t("nav.switchLanguage")} onClick={() => setLocale(locale === "en" ? "zh" : "en")}><span>{t("nav.language")}</span></InlineButton><ThemeToggle className="console-header-preference" /><AnnouncementMenu /><Link className={buttonLinkClass({ variant: "secondary", size: "md", className: "console-balance-link" })} to="/purchase" aria-label={`${t("nav.purchase")}: ${formatUsd(user?.balance || 0)}`}><Icon name="wallet" size={17} data-icon="start" /><strong className="console-balance-value">{formatUsd(user?.balance || 0)}</strong></Link></div></header><SiteAnnouncementBar /></>;
}

function pageTitle(pathname, items, t) {
  const currentPath = pathname === "/docs/batch-image" ? "/batch-image" : pathname;
  const exact = items.find((item) => item.path === currentPath || currentPath.startsWith(`${item.path}/`));
  if (exact) return exact.label || t(exact.key);
  const staticTitleKey = {
    "/batch-image": "batch.title",
    "/video-workflow": "videoWorkflow.title",
  }[currentPath];
  if (staticTitleKey) return t(staticTitleKey);
  return t("nav.dashboard");
}

export function ConsoleLayout({ children }) {
  const { t } = useLocale();
  const { user, authenticated, settings, branding, brandingReady } = useConsole();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
  const sidebarRef = useRef(null);
  const workspaceRef = useRef(null);
  const sidebarLayoutRef = useRef(null);
  const sidebarMotionsRef = useRef(new Map());
  const reduceMotion = useReducedMotion();
  const batchEnabled = useBatchNavigationAccess(authenticated);
  const simpleMode = user?.run_mode === "simple";
  const customItems = (settings?.custom_menu_items || []).filter((item) => item.visibility === "user").sort((a, b) => a.sort_order - b.sort_order).flatMap((item) => { const kind = nativeCustomPageKind(item); const markdown = item.page_slug || String(item.url || "").startsWith("md:"); return nativeCustomPageRoute(kind) || !markdown ? [] : [{ path: `/custom/${item.id}`, label: item.label, icon: nativeCustomPageIcon(kind) }]; });
  const overviewItems = overviewNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled));
  const workspaceItems = workspaceNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled));
  const personalItems = accountNav.filter((item) => !item.sidebarHidden && itemEnabled(item, settings, simpleMode, batchEnabled));
  const toolItems = [...toolsNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled)), ...customItems];
  const allItems = [...overviewItems, ...workspaceItems, ...accountNav.filter((item) => itemEnabled(item, settings, simpleMode, batchEnabled)), ...toolItems];
  const title = pageTitle(location.pathname, allItems, t);
  const logo = DEFAULT_SITE_LOGO;
  const siteName = branding?.siteName || DEFAULT_SITE_NAME;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.consolePage = "true";
    return () => {
      delete root.dataset.consolePage;
    };
  }, []);

  useEffect(() => {
    if (!brandingReady) return;
    document.title = `${title} — ${siteName}`;
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [brandingReady, location.pathname, siteName, title]);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    const workspace = workspaceRef.current;
    const snapshots = sidebarLayoutRef.current;
    sidebarLayoutRef.current = null;
    if (!workspace || !snapshots || reduceMotion || !isDesktopSidebar()) return;
    const motions = sidebarMotionsRef.current;
    const animate = (element, x, y) => {
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) return;
      const animation = element.animate(
        [{ transform: `translate3d(${x}px, ${y}px, 0)` }, { transform: "translate3d(0, 0, 0)" }],
        SIDEBAR_MOTION,
      );
      motions.set(element, animation);
      animation.onfinish = () => {
        if (motions.get(element) !== animation) return;
        animation.cancel();
        motions.delete(element);
      };
    };

    const animateLayout = (root, snapshot) => {
      if (!root || !snapshot) return;
      const changes = new Map();
      snapshot.anchors.forEach((start, element) => {
        const style = element.isConnected ? getComputedStyle(element) : null;
        if (!style || style.display === "none" || style.visibility === "hidden" || !LAYOUT_IDENTITY_TRANSFORMS.has(style.transform)) return;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const point = sidebarAnchorPoint(element, rect);
        const change = {
          x: start.left - point.left,
          y: start.top - point.top,
        };
        if (Math.abs(change.x) >= 0.5 || Math.abs(change.y) >= 0.5) changes.set(element, change);
      });
      changes.forEach((change, element) => {
        let ancestor = element.parentElement;
        let ancestorChange;
        while (ancestor && ancestor !== root) {
          ancestorChange = changes.get(ancestor);
          if (ancestorChange) break;
          ancestor = ancestor.parentElement;
        }
        animate(element, change.x - (ancestorChange?.x || 0), change.y - (ancestorChange?.y || 0));
      });
    };

    animateLayout(workspace, snapshots.workspace);
    animateLayout(sidebar, snapshots.sidebar);
  }, [reduceMotion, sidebarCollapsed]);
  useEffect(() => () => {
    sidebarMotionsRef.current.forEach((animation) => animation.cancel());
    sidebarMotionsRef.current.clear();
  }, []);
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
    const sidebar = sidebarRef.current;
    const workspace = workspaceRef.current;
    if (workspace && !reduceMotion && isDesktopSidebar()) {
      const activeElements = new Set(sidebarMotionsRef.current.keys());
      sidebarLayoutRef.current = {
        sidebar: sidebar ? captureSlidingLayout(sidebar, activeElements) : null,
        workspace: captureSlidingLayout(workspace, activeElements),
      };
    }
    sidebarMotionsRef.current.forEach((animation) => animation.cancel());
    sidebarMotionsRef.current.clear();
    setSidebarCollapsed((value) => !value);
  };
  return <ConsoleBackgroundPattern variant="dots" spotlight track="window" className={`console-shell ${sidebarCollapsed ? "is-sidebar-collapsed" : ""}`}><aside className={`console-sidebar ${sidebarCollapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`} ref={sidebarRef}><div className="console-brand-row"><Link className={`console-brand ${brandingReady ? "" : "is-pending"}`} to="/" title={sidebarCollapsed && brandingReady ? siteName : undefined}>{brandingReady && <BrandLogo key={logo} src={logo} alt="" width="31" height="31" decoding="sync" fetchPriority="high" />}{brandingReady && <strong>WayX</strong>}</Link><Button variant="ghost" className="console-sidebar-toggle" onClick={toggleSidebar} title={collapseLabel} aria-label={collapseLabel}><Icon name={sidebarCollapsed ? "chevronsRight" : "chevronsLeft"} size={18} /></Button></div><nav><SidebarSection items={overviewItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} className="console-nav-section--overview" /><SidebarSection title={t("nav.sectionWorkspace")} items={workspaceItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /><SidebarSection title={t("nav.sectionAccount")} items={personalItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /><SidebarSection title={t("nav.sectionTools")} items={toolItems} collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /><StoreNavigation collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /></nav><SidebarAssistant /><div className="console-sidebar-foot"><SidebarUserMenu collapsed={sidebarCollapsed} onNavigate={() => setMobileOpen(false)} /></div></aside>{mobileOpen && <Button variant="ghost" className="console-sidebar-overlay" aria-label={t("nav.closeMenu")} onClick={() => setMobileOpen(false)} />}<div className="console-workspace" ref={workspaceRef}><ConsoleHeader title={title} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><main>{children}</main></div><ToastViewport /></ConsoleBackgroundPattern>;
}

export function ProtectedRoute({ children, feature, mode = "opt-in", standardOnly = false }) {
  const location = useLocation();
  const { authenticated, user, settings, settingsLoading, settingsError } = useConsole();
  if (getAccessToken() && !user) return <div className="console-standalone"><Spinner /></div>;
  if (!authenticated) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (settings?.backend_mode_enabled && user?.role !== "admin") return <Navigate to="/login" replace />;
  if (standardOnly && user?.run_mode === "simple") return <Navigate to="/admin/dashboard" replace />;
  if (feature && settingsLoading && mode === "opt-in") return <div className="console-standalone"><Spinner /></div>;
  if (feature && !settingsLoading && !settingsError && !resolveFeature(settings, feature, mode)) return <Navigate to="/admin/dashboard" replace />;
  return children;
}

export function PublicOnlyRoute({ children }) {
  const { authenticated } = useConsole();
  return authenticated ? <Navigate to="/" replace /> : children;
}
