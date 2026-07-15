import { isValidElement, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getAccessToken } from "../../api/session";
import { pagesApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Page, Panel, Spinner } from "../UI";
import { useTheme } from "../theme";
import { safeExternalUrl } from "../utils";

const SAFE_HTML_TAGS = new Set([
  "a", "abbr", "article", "aside", "b", "blockquote", "br", "caption", "code", "col", "colgroup",
  "dd", "del", "details", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3", "h4",
  "h5", "h6", "hr", "i", "iframe", "img", "ins", "kbd", "li", "mark", "ol", "p", "pre", "q", "s",
  "samp", "section", "small", "span", "strong", "sub", "summary", "sup", "table", "tbody", "td", "tfoot",
  "th", "thead", "tr", "u", "ul", "var",
]);

const WRAPPER_HTML_TAGS = new Set([
  "a", "abbr", "article", "aside", "b", "blockquote", "code", "dd", "del", "details", "div", "dl", "dt",
  "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "h5", "h6", "i", "ins", "kbd", "li", "mark",
  "ol", "p", "pre", "q", "s", "samp", "section", "small", "span", "strong", "sub", "summary", "sup", "u",
  "ul", "var",
]);

const SAFE_GLOBAL_ATTRIBUTES = new Set(["dir", "lang", "role", "title"]);
const SAFE_TAG_ATTRIBUTES = {
  a: new Set(["href", "rel", "target"]),
  col: new Set(["span", "width"]),
  details: new Set(["open"]),
  iframe: new Set(["height", "src", "title", "width"]),
  img: new Set(["alt", "height", "loading", "src", "width"]),
  ol: new Set(["reversed", "start"]),
  td: new Set(["align", "colspan", "rowspan"]),
  th: new Set(["align", "colspan", "rowspan", "scope"]),
};

function allowedHtmlAttribute(tag, name) {
  if (name.startsWith("on")) return false;
  return SAFE_GLOBAL_ATTRIBUTES.has(name) || name.startsWith("aria-") || Boolean(SAFE_TAG_ATTRIBUTES[tag]?.has(name));
}

function allowedLinkUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? raw : "";
  } catch { return ""; }
}

function allowedHttpUrl(value, absolute = false) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = absolute ? new URL(raw) : new URL(raw, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? (absolute ? url.toString() : raw) : "";
  } catch { return ""; }
}

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

function isExternalLink(value) {
  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) && url.origin !== window.location.origin;
  } catch { return false; }
}

function cleanAnchor(element) {
  const href = allowedLinkUrl(element.getAttribute("href"));
  if (!href) { element.removeAttribute("href"); element.removeAttribute("target"); element.removeAttribute("rel"); return true; }
  element.setAttribute("href", href);
  if (!isExternalLink(href)) { element.removeAttribute("target"); element.removeAttribute("rel"); return true; }
  element.setAttribute("target", "_blank");
  element.setAttribute("rel", "noopener noreferrer");
  return true;
}

function cleanImage(element, slug) {
  const raw = element.getAttribute("src");
  const src = relativeAsset(raw) ? pageImageUrl(slug, raw) : allowedHttpUrl(raw);
  if (!src) return false;
  element.setAttribute("src", src);
  element.setAttribute("loading", "lazy");
  return true;
}

function cleanIframe(element) {
  const src = allowedHttpUrl(element.getAttribute("src"), true);
  if (!src) return false;
  element.setAttribute("src", src);
  element.setAttribute("sandbox", "allow-scripts allow-forms allow-popups");
  element.setAttribute("referrerpolicy", "no-referrer");
  element.setAttribute("loading", "lazy");
  element.setAttribute("allow", "fullscreen");
  element.setAttribute("allowfullscreen", "");
  return true;
}

const HTML_ELEMENT_CLEANERS = { a: cleanAnchor, iframe: cleanIframe, img: cleanImage };

function cleanElementAttributes(element, tag) {
  [...element.attributes].forEach((attribute) => {
    if (!allowedHtmlAttribute(tag, attribute.name.toLowerCase())) element.removeAttribute(attribute.name);
  });
}

function sanitizeHtmlNode(node, slug) {
  if (node.nodeType === 3) return;
  if (node.nodeType !== 1) { node.remove(); return; }
  const tag = node.localName.toLowerCase();
  if (!SAFE_HTML_TAGS.has(tag)) { node.remove(); return; }
  cleanElementAttributes(node, tag);
  const cleaner = HTML_ELEMENT_CLEANERS[tag];
  if (cleaner && !cleaner(node, slug)) { node.remove(); return; }
  [...node.childNodes].forEach((child) => sanitizeHtmlNode(child, slug));
}

function sanitizeEmbeddedHtml(value, slug) {
  if (!value || typeof DOMParser === "undefined") return "";
  const document = new DOMParser().parseFromString("<!doctype html><body></body>", "text/html");
  const template = document.createElement("template");
  template.innerHTML = String(value);
  [...template.content.childNodes].forEach((node) => sanitizeHtmlNode(node, slug));
  return template.innerHTML;
}

function rawTag(value) {
  const raw = String(value || "").trim();
  const match = /^<\s*(\/?)\s*([a-z][\w-]*)\b(?:[^'"<>]|"[^"]*"|'[^']*')*>$/.exec(raw);
  if (!match) return null;
  return { closing: Boolean(match[1]), selfClosing: /\/\s*>$/.test(raw), tag: match[2].toLowerCase() };
}

function elementProperties(element) {
  return Object.fromEntries([...element.attributes].map(({ name, value }) => [name, ["open", "reversed"].includes(name) || value]));
}

function sanitizedWrapper(value, slug) {
  if (typeof DOMParser === "undefined") return null;
  const info = rawTag(value);
  if (!info || info.closing || info.selfClosing || !WRAPPER_HTML_TAGS.has(info.tag)) return null;
  const document = new DOMParser().parseFromString("<!doctype html><body></body>", "text/html");
  const template = document.createElement("template");
  template.innerHTML = String(value);
  const nodes = [...template.content.childNodes].filter((node) => node.nodeType !== 3 || node.textContent.trim());
  if (nodes.length !== 1 || nodes[0].nodeType !== 1 || nodes[0].childNodes.length > 0) return null;
  sanitizeHtmlNode(nodes[0], slug);
  if (nodes[0].parentNode !== template.content || nodes[0].localName !== info.tag) return null;
  return { attributes: JSON.stringify(elementProperties(nodes[0])), tag: info.tag };
}

function closingTagIndex(children, start, tag) {
  let depth = 0;
  for (let index = start + 1; index < children.length; index += 1) {
    const info = children[index].type === "html" ? rawTag(children[index].value) : null;
    if (!info || info.tag !== tag) continue;
    if (info.selfClosing) continue;
    if (!info.closing) { depth += 1; continue; }
    if (depth === 0) return index;
    depth -= 1;
  }
  return -1;
}

function foldHtmlWrappers(children, slug) {
  const result = [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    const wrapper = child.type === "html" ? sanitizedWrapper(child.value, slug) : null;
    const end = wrapper ? closingTagIndex(children, index, wrapper.tag) : -1;
    if (!wrapper || end < 0) { result.push(child); continue; }
    result.push({ type: "safeWrapper", children: children.slice(index + 1, end), data: { hName: "safe-wrapper", hProperties: wrapper } });
    index = end;
  }
  return result;
}

function transformHtmlNodes(node, slug) {
  if (!Array.isArray(node.children)) return;
  node.children = foldHtmlWrappers(node.children, slug).map((child) => {
    if (child.type !== "html") { transformHtmlNodes(child, slug); return child; }
    const value = sanitizeEmbeddedHtml(child.value, slug);
    if (!value) return { type: "text", value: "" };
    return { type: "safeHtml", data: { hName: "safe-html", hProperties: { inline: node.type === "paragraph", value } } };
  });
}

function remarkSafeHtml(options = {}) {
  return (tree) => transformHtmlNodes(tree, options.slug || "");
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

function SafeHtml({ inline, value }) {
  const Tag = inline ? "span" : "div";
  return value ? <Tag dangerouslySetInnerHTML={{ __html: value }} /> : null;
}

function SafeWrapper({ attributes, children, tag }) {
  if (!WRAPPER_HTML_TAGS.has(tag)) return <>{children}</>;
  let props = {};
  try { props = JSON.parse(attributes || "{}"); } catch { props = {}; }
  const Tag = tag;
  return <Tag {...props}>{children}</Tag>;
}

function embeddedUrl(item, user, locale, theme) {
  const allowed = safeExternalUrl(item?.url);
  if (!allowed) return "";
  const url = new URL(allowed);
  if (user?.id) url.searchParams.set("user_id", String(user.id));
  const token = getAccessToken();
  if (token) url.searchParams.set("token", token);
  url.searchParams.set("theme", theme);
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
  const { resolved: theme } = useTheme();
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
  const remarkPlugins = useMemo(() => [[remarkSafeHtml, { slug }]], [slug]);
  const components = useMemo(() => {
    const byLine = new Map(toc.map((entry) => [entry.line, entry.id]));
    const heading = (level) => ({ children, node }) => { const Tag = `h${level}`; return <Tag id={byLine.get(node?.position?.start?.line) || headingSlug(textContent(children), node?.position?.start?.line || 0)}>{children}</Tag>; };
    return { "safe-html": SafeHtml, "safe-wrapper": SafeWrapper, h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), pre: MarkdownPre, img: ({ src, alt }) => <img src={relativeAsset(src) ? pageImageUrl(slug, src) : src} alt={alt || ""} loading="lazy" />, a: ({ href, children }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{children}</a> };
  }, [slug, toc]);
  const iframeUrl = embeddedUrl(item, user, locale, theme);

  if (!item) return <Page title={t("custom.notFound")}><Panel><EmptyState icon="link" title={t("custom.notFound")} /></Panel></Page>;
  if (state.loading) return <Page title={item.label}><Panel><Spinner /></Panel></Page>;
  if (state.error) return <Page title={item.label}><Panel><ErrorState message={state.error} /></Panel></Page>;
  if (slug) return <Page title={item.label} className="console-custom-page"><Panel className="console-markdown-shell"><div className="console-markdown-layout">{toc.length > 0 && <aside><strong>{t("custom.contents")}</strong>{toc.map((entry) => <a style={{ paddingLeft: `${8 + (entry.level - 1) * 12}px` }} href={`#${entry.id}`} key={entry.id}>{entry.text}</a>)}</aside>}<article className="console-markdown"><ReactMarkdown remarkPlugins={remarkPlugins} components={components}>{state.markdown}</ReactMarkdown></article></div></Panel></Page>;
  if (!iframeUrl) return <Page title={item.label}><Panel><EmptyState icon="link" title={t("custom.notFound")} /></Panel></Page>;
  return <Page title={item.label} actions={<a className="console-button console-button--secondary" href={iframeUrl} target="_blank" rel="noreferrer"><Icon name="external" size={16} />{t("custom.open")}</a>} className="console-custom-page"><Panel className="console-embed-panel"><iframe src={iframeUrl} title={item.label} sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" allow="clipboard-read; clipboard-write; fullscreen" referrerPolicy="strict-origin-when-cross-origin" /></Panel></Page>;
}
