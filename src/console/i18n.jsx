import { createContext, createElement, Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "./locales/en";
import zh from "./locales/zh";
import { detectLocale, htmlLangFor, intlLocaleFor, LOCALE_STORAGE_KEY, normalizeLocale } from "./locale";

export { detectLocale, intlLocaleFor } from "./locale";

const dictionaries = { en, zh };
const pluralRules = new Map();
const formatters = new Map();

function interpolate(value, variables = {}) {
  return Object.entries(variables).reduce(
    (result, [key, replacement]) => result.replaceAll(`{${key}}`, String(replacement)),
    value,
  );
}

function pluralCategory(locale, count) {
  const intlLocale = intlLocaleFor(locale);
  if (!pluralRules.has(intlLocale)) pluralRules.set(intlLocale, new Intl.PluralRules(intlLocale));
  return pluralRules.get(intlLocale).select(Number(count));
}

function pluralCount(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  return Number(value.replace(/[^\d.-]/g, ""));
}

// A `count` variable (a number, or an already formatted number) selects
// "<key>.one" / "<key>.other" when the dictionary defines it, falling back to
// "<key>" for languages without plural forms.
export function translate(locale, key, variables) {
  const dictionary = dictionaries[locale] || dictionaries.en;
  const count = variables ? pluralCount(variables.count) : Number.NaN;
  const plural = Number.isFinite(count) ? `${key}.${pluralCategory(locale, count)}` : null;
  const value = (plural && dictionary[plural]) || dictionary[key] || (plural && dictionaries.en[plural]) || dictionaries.en[key] || key;
  return interpolate(value, variables);
}

// Replaces "{name}" placeholders with React nodes, for copy that embeds markup.
export function translateNodes(locale, key, nodes, variables) {
  return translate(locale, key, variables).split(/\{(\w+)\}/).map((part, index) => index % 2 ? createElement(Fragment, { key: index }, nodes[part] ?? `{${part}}`) : part);
}

const groups = new Map();

// Resolves "<prefix>.<key>" for each key into one object, for components that
// pass a whole copy bundle down as a prop.
export function translateGroup(locale, prefix, keys) {
  const cacheKey = `${locale}:${prefix}`;
  if (!groups.has(cacheKey)) groups.set(cacheKey, Object.fromEntries(keys.map((key) => [key, translate(locale, `${prefix}.${key}`)])));
  return groups.get(cacheKey);
}

function formatter(type, locale, options) {
  const intlLocale = intlLocaleFor(locale);
  const key = `${type}:${intlLocale}:${options ? JSON.stringify(options) : ""}`;
  if (!formatters.has(key)) formatters.set(key, type === "number" ? new Intl.NumberFormat(intlLocale, options) : new Intl.DateTimeFormat(intlLocale, options));
  return formatters.get(key);
}

export function formatNumberFor(locale, number, options) {
  return formatter("number", locale, options).format(Number(number) || 0);
}

export function formatCurrencyFor(locale, number, currency = "USD", options) {
  return formatter("number", locale, {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(Number(number) || 0);
}

export function currencySymbolFor(locale, currency = "USD") {
  return formatter("number", locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value || currency;
}

export function formatDateTimeFor(locale, date, options) {
  return formatter("date", locale, options).format(date);
}

const LocaleContext = createContext(null);

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale);
  const setLocale = useCallback((value) => setLocaleState(normalizeLocale(value) || "en"), []);

  useEffect(() => {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = htmlLangFor(locale);
    document.querySelector('meta[name="description"]')?.setAttribute("content", translate(locale, "app.metaDescription"));
  }, [locale]);

  const value = useMemo(() => {
    const t = (key, variables) => translate(locale, key, variables);
    const formatNumber = (number, options) => formatNumberFor(locale, number, options);
    const formatCurrency = (number, currency = "USD") => formatCurrencyFor(locale, number, currency);
    const formatUsd = (number) => formatCurrencyFor(locale, number, "USD");
    const formatDate = (date, options = {}) => {
      if (!date) return "—";
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) return "—";
      if (options.monthOnly) return formatDateTimeFor(locale, parsed, { month: "short" });
      return formatDateTimeFor(locale, parsed, {
        dateStyle: "medium",
        timeStyle: options.dateOnly ? undefined : "short",
      });
    };
    return { locale, intlLocale: intlLocaleFor(locale), setLocale, t, formatNumber, formatCurrency, formatUsd, formatDate };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
