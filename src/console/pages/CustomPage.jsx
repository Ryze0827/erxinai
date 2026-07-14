import { isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getAccessToken } from "../../api/session";
import { pagesApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, Spinner } from "../UI";
import { safeExternalUrl } from "../utils";

function markdownSlug(item) {
  if (item?.page_slug) return item.page_slug;
  return item?.url?.startsWith("md:") ? item.url.slice(3) : "";
}

function headingSlug(value, index) {
  const base = String(value || "").toLowerCase().replace(/[^\w\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "");
  return `${base || "heading"}-${index}`;
}

function headings(markdown) {
  let index = 0;
  return String(markdown || "").split("\n").flatMap((line, lineIndex) => {
    const match = /^(#{1,4})\s+(.+)$/.exec(line.trim());
    if (!match) return [];
    return [{ level: match[1].length, text: match[2].replace(/[*_`~]/g, ""), id: headingSlug(match[2].replace(/[*_`~]/g, ""), index++), line: lineIndex + 1 }];
  });
}

function relativeAsset(value) {
  const url = String(value || "").trim();
  if (!url || url.startsWith("/") || url.startsWith("//") || /^[a-z][a-z\d+.-]*:/i.test(url)) return false;
  return url.split(/[?#]/)[0].split("/").every((part) => part !== ".." && !part.includes("\\"));
}

function pageImageUrl(slug, value) {
  const match = String(value).match(/^([^?#]+)(.*)$/);
  const path = match?.[1] || "";
  const suffix = match?.[2] || "";
  const encoded = path.split("/").filter((part) => part && part !== ".").map(encodeURIComponent).join("/");
  return `${pagesApi.imageUrl(slug, encoded)}${suffix}`;
}

function textContent(node) {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement(node)) return textContent(node.props.children);
  return "";
}

function MarkdownPre({ children }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  const copy = async () => {
    try { await navigator.clipboard.writeText(textContent(children)); setCopied(true); window.clearTimeout(timerRef.current); timerRef.current = window.setTimeout(() => setCopied(false), 1600); } catch { setCopied(false); }
  };
  return <pre><button type="button" onClick={copy}><Icon name={copied ? "check" : "copy"} size={14} />{copied ? t("common.copied") : t("common.copy")}</button>{children}</pre>;
}

function embeddedUrl(item, user, locale) {
  const allowed = safeExternalUrl(item?.url);
  if (!allowed) return "";
  const url = new URL(allowed);
  if (user?.id) url.searchParams.set("user_id", String(user.id));
  const token = getAccessToken();
  if (token) url.searchParams.set("token", token);
  url.searchParams.set("theme", "light");
  url.searchParams.set("lang", locale);
  url.searchParams.set("ui_mode", "embedded");
  url.searchParams.set("src_host", window.location.origin);
  url.searchParams.set("src_url", window.location.href);
  return url.toString();
}

export function CustomPage() {
  const { id } = useParams();
  const { settings, user } = useConsole();
  const { t, locale } = useLocale();
  const item = (settings?.custom_menu_items || []).find((entry) => String(entry.id) === String(id) && entry.visibility === "user");
  const slug = markdownSlug(item);
  const [state, setState] = useState({ loading: Boolean(slug), error: "", markdown: "" });
  useEffect(() => {
    if (!slug) { setState({ loading: false, error: "", markdown: "" }); return undefined; }
    const controller = new AbortController();
    setState({ loading: true, error: "", markdown: "" });
    pagesApi.markdown(slug, controller.signal).then((markdown) => setState({ loading: false, error: "", markdown })).catch((error) => { if (error.name !== "AbortError") setState({ loading: false, error: error.message, markdown: "" }); });
    return () => controller.abort();
  }, [slug]);
  const toc = useMemo(() => headings(state.markdown), [state.markdown]);
  const components = useMemo(() => {
    const byLine = new Map(toc.map((entry) => [entry.line, entry.id]));
    const heading = (level) => ({ children, node }) => { const Tag = `h${level}`; return <Tag id={byLine.get(node?.position?.start?.line) || headingSlug(textContent(children), node?.position?.start?.line || 0)}>{children}</Tag>; };
    return { h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), pre: MarkdownPre, img: ({ src, alt }) => <img src={relativeAsset(src) ? pageImageUrl(slug, src) : src} alt={alt || ""} loading="lazy" />, a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{children}</a> };
  }, [slug, toc]);
  const iframeUrl = embeddedUrl(item, user, locale);

  if (!item) return <Page title={t("custom.notFound")}><Panel><EmptyState icon="link" title={t("custom.notFound")} /></Panel></Page>;
  if (state.loading) return <Page title={item.label}><Panel><Spinner /></Panel></Page>;
  if (state.error) return <Page title={item.label}><Panel><ErrorState message={state.error} /></Panel></Page>;
  if (slug) return <Page title={item.label} className="console-custom-page"><Panel className="console-markdown-shell"><div className="console-markdown-layout">{toc.length > 0 && <aside><strong>{t("custom.contents")}</strong>{toc.map((entry) => <a style={{ paddingLeft: `${8 + (entry.level - 1) * 12}px` }} href={`#${entry.id}`} key={entry.id}>{entry.text}</a>)}</aside>}<article className="console-markdown"><ReactMarkdown components={components}>{state.markdown}</ReactMarkdown></article></div></Panel></Page>;
  if (!iframeUrl) return <Page title={item.label}><Panel><EmptyState icon="link" title={t("custom.notFound")} /></Panel></Page>;
  return <Page title={item.label} actions={<a className="console-button console-button--secondary" href={iframeUrl} target="_blank" rel="noreferrer"><Icon name="external" size={16} />{t("custom.open")}</a>} className="console-custom-page"><Panel className="console-embed-panel"><iframe src={iframeUrl} title={item.label} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" allow="clipboard-read; clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" /></Panel></Page>;
}
