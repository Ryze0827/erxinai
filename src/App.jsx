import { useEffect, useLayoutEffect, useRef } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import landingPageMarkup from "./landing-page.html?raw";
import { AUTH_SESSION_EVENT, getAccessToken, getStoredUser } from "./api/session";
import { EmailVerifyPage } from "./auth/EmailVerifyPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./auth/PasswordPages";
import { LoginPage } from "./auth/LoginPage";
import { OAuthCallbackPage } from "./auth/OAuthCallbackPage";
import { RegisterPage } from "./auth/RegisterPage";
import { SessionManager } from "./auth/SessionManager";
import { mountGatewayDemos } from "./gatewayDemos";
import { applyLandingTranslations, landingT, syncPriceAmount } from "./landingI18n";
import { ConsoleProvider } from "./console/ConsoleContext";
import { ConsoleLayout, ProtectedRoute } from "./console/ConsoleLayout";
import { LocaleProvider, useLocale } from "./console/i18n";
import { DashboardPage } from "./console/pages/DashboardPage";
import { KeysPage } from "./console/pages/KeysPage";
import { UsagePage } from "./console/pages/UsagePage";
import { SubscriptionsPage } from "./console/pages/SubscriptionsPage";
import { RedeemPage } from "./console/pages/RedeemPage";
import { ChannelsPage } from "./console/pages/ChannelsPage";
import { MonitorPage } from "./console/pages/MonitorPage";
import { AffiliatePage } from "./console/pages/AffiliatePage";
import { ProfilePage } from "./console/pages/ProfilePage";
import { BatchImagesPage } from "./console/pages/BatchImagesPage";
import { CustomPage } from "./console/pages/CustomPage";
import { ImageApiDocsPage } from "./console/pages/ImageApiDocsPage";
import { ImageStudioPage } from "./console/pages/ImageStudioPage";
import { KeyUsagePage } from "./console/pages/KeyUsagePage";
import { AirwallexPaymentPage, OrdersPage, PaymentQRCodePage, PaymentResultPage, PurchasePage, StripePaymentPage, StripePopupPage, WeChatPaymentCallbackPage } from "./console/pages/Payments";

const LANDING_PAGE_CONTENT = { __html: landingPageMarkup };

function setNavigationState({ header, drawer, toggle }, open) {
  header?.setAttribute("data-open", String(open));
  drawer?.setAttribute("data-open", String(open));
  toggle?.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
}

function mountNavigation(root, signal) {
  const header = root.querySelector(".site-header");
  const drawer = root.querySelector(".nav-drawer");
  const toggle = root.querySelector(".nav-toggle");
  const elements = { header, drawer, toggle };
  const close = () => setNavigationState(elements, false);
  const updateHeader = () => header?.setAttribute("data-scrolled", String(window.scrollY > 8));
  const handleToggle = () => setNavigationState(elements, header?.getAttribute("data-open") !== "true");
  const handleLink = (event) => {
    const href = event.target.closest("a")?.getAttribute("href");
    if (href === "/") {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (href) close();
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true, signal });
  toggle?.addEventListener("click", handleToggle, { signal });
  drawer?.addEventListener("click", handleLink, { signal });
  root.querySelector(".nav-brand")?.addEventListener("click", handleLink, { signal });
  return close;
}

function mountPricing(root, signal) {
  const tiers = [...root.querySelectorAll(".home-price-tier")];
  const handlePricing = (event) => {
    const selectedTier = event.target.closest(".home-price-tier");
    if (!selectedTier) return;
    tiers.forEach((tier) => {
      const selected = tier === selectedTier;
      tier.classList.toggle("selected", selected);
      tier.setAttribute("aria-checked", String(selected));
    });
    syncPriceAmount(root);
    const { authenticated } = getLandingAuthState();
    syncPricingAuth(root, authenticated, root.dataset.landingLocale || "zh");
  };

  root.querySelector(".home-price-tiers")?.addEventListener("click", handlePricing, { signal });
}

function mountFaq(root, signal) {
  const handleFaq = (event) => {
    const button = event.target.closest(".faq-q");
    if (!button) return;
    const item = button.closest(".faq-item");
    const open = item?.getAttribute("data-open") !== "true";
    item?.setAttribute("data-open", String(open));
    button.setAttribute("aria-expanded", String(open));
  };

  root.querySelector(".faq")?.addEventListener("click", handleFaq, { signal });
}

function mountLandingLocale(root, signal, setLocale) {
  const handleLocale = (event) => {
    const button = event.target.closest("[data-language-toggle]");
    if (!button) return;
    setLocale(button.dataset.languageTarget);
  };

  root.addEventListener("click", handleLocale, { signal });
}

function observeGatewayDemos(root) {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(({ isIntersecting, target }) => target.setAttribute("data-active", String(isIntersecting))),
    { rootMargin: "180px 0px", threshold: 0.05 },
  );
  root.querySelectorAll(".gateway-demo").forEach((demo) => observer.observe(demo));
  return observer;
}

function getDashboardPath(user) {
  if (user?.role === "admin") return "/admin/dashboard";
  if (import.meta.env.VITE_DASHBOARD_URL) return import.meta.env.VITE_DASHBOARD_URL;
  return "/dashboard";
}

function getUserInitial(user) {
  const source = user?.username || user?.email || "U";
  return source.trim().charAt(0).toUpperCase() || "U";
}

function getLandingAuthState() {
  const user = getStoredUser();
  return { user, authenticated: Boolean(getAccessToken() && user) };
}

function setPricingActionHref(action, authenticated) {
  const plan = action.dataset.plan || "usage";
  action.href = authenticated ? "/keys" : `/register?plan=${plan}`;
}

function syncPricingAuth(root, authenticated, locale) {
  const action = root.querySelector("[data-auth-pricing-action]");
  const label = root.querySelector("[data-auth-pricing-label]");
  const note = root.querySelector("[data-auth-pricing-note]");
  const loginPrompt = root.querySelector("[data-auth-login-prompt]");
  const selectedTier = root.querySelector(".home-price-tier.selected");
  const unavailable = selectedTier?.dataset.available === "false";

  if (action) {
    action.dataset.plan = selectedTier?.dataset.plan || "usage";
    action.classList.toggle("is-disabled", unavailable);
    if (unavailable) {
      action.removeAttribute("href");
      action.setAttribute("aria-disabled", "true");
      action.setAttribute("tabindex", "-1");
    } else {
      action.removeAttribute("aria-disabled");
      action.removeAttribute("tabindex");
      setPricingActionHref(action, authenticated);
    }
  }
  if (label) label.textContent = landingT(locale, unavailable ? "pricing.action.unavailable" : authenticated ? "pricing.action.authenticated" : "pricing.action.guest");
  if (note) note.textContent = landingT(locale, unavailable ? "pricing.note.subscription" : authenticated ? "pricing.note.authenticated" : "pricing.note.guest");
  if (loginPrompt) loginPrompt.hidden = authenticated;
}

function syncLandingAuth(root, locale = "zh") {
  const { user, authenticated } = getLandingAuthState();
  root.querySelectorAll("[data-auth-link]").forEach((link) => {
    link.href = authenticated ? getDashboardPath(user) : "/login";
    link.dataset.authenticated = String(authenticated);
    const label = link.querySelector("[data-auth-label]");
    const initial = link.querySelector("[data-auth-initial]");
    if (label) label.textContent = landingT(locale, authenticated ? "auth.dashboard" : "auth.login");
    if (initial) initial.textContent = getUserInitial(user);
  });
  root.querySelectorAll("[data-auth-dashboard]").forEach((link) => {
    link.href = authenticated ? "/keys" : "/register";
  });
  root.querySelectorAll("[data-auth-register]").forEach((link) => {
    link.hidden = authenticated;
  });
  syncPricingAuth(root, authenticated, locale);
}

function mountLandingAuth(root, signal) {
  const sync = () => syncLandingAuth(root, root.dataset.landingLocale);
  sync();
  window.addEventListener(AUTH_SESSION_EVENT, sync, { signal });
  window.addEventListener("storage", sync, { signal });
}

function LandingPage() {
  const { locale, setLocale } = useLocale();
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    mountGatewayDemos(root);
    applyLandingTranslations(root, locale);
    syncLandingAuth(root, locale);
  }, [locale]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    const closeNavigation = mountNavigation(root, signal);
    mountPricing(root, signal);
    mountFaq(root, signal);
    mountLandingLocale(root, signal, setLocale);
    mountLandingAuth(root, signal);
    const observer = observeGatewayDemos(root);
    document.documentElement.classList.add("reveal-on");

    return () => {
      controller.abort();
      observer.disconnect();
      closeNavigation();
      document.documentElement.classList.remove("reveal-on");
    };
  }, [setLocale]);

  return <div ref={rootRef} dangerouslySetInnerHTML={LANDING_PAGE_CONTENT} />;
}

function ConsoleRoute({ children, ...guard }) {
  return <ProtectedRoute {...guard}><ConsoleLayout>{children}</ConsoleLayout></ProtectedRoute>;
}

export function App() {
  return (
    <LocaleProvider>
      <ConsoleProvider>
        <SessionManager />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/email-verify" element={<EmailVerifyPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/success" element={<Navigate to="/keys" replace />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/linuxdo/callback" element={<OAuthCallbackPage provider="linuxdo" />} />
          <Route path="/auth/wechat/callback" element={<OAuthCallbackPage provider="wechat" />} />
          <Route path="/auth/dingtalk/callback" element={<OAuthCallbackPage provider="dingtalk" />} />
          <Route path="/auth/dingtalk/email-completion" element={<OAuthCallbackPage provider="dingtalk" initialPhase="create" />} />
          <Route path="/auth/oidc/callback" element={<OAuthCallbackPage provider="oidc" />} />
          <Route path="/auth/wechat/payment/callback" element={<WeChatPaymentCallbackPage />} />

          <Route path="/dashboard" element={<ConsoleRoute><DashboardPage /></ConsoleRoute>} />
          <Route path="/admin/dashboard" element={<ConsoleRoute><DashboardPage /></ConsoleRoute>} />
          <Route path="/keys" element={<ConsoleRoute><KeysPage /></ConsoleRoute>} />
          <Route path="/batch-image" element={<ConsoleRoute standardOnly><BatchImagesPage /></ConsoleRoute>} />
          <Route path="/docs/batch-image" element={<ConsoleRoute standardOnly><BatchImagesPage /></ConsoleRoute>} />
          <Route path="/usage" element={<ConsoleRoute standardOnly><UsagePage /></ConsoleRoute>} />
          <Route path="/redeem" element={<ConsoleRoute standardOnly><RedeemPage /></ConsoleRoute>} />
          <Route path="/affiliate" element={<ConsoleRoute standardOnly feature="affiliate_enabled"><AffiliatePage /></ConsoleRoute>} />
          <Route path="/available-channels" element={<ConsoleRoute standardOnly feature="available_channels_enabled"><ChannelsPage /></ConsoleRoute>} />
          <Route path="/monitor" element={<ConsoleRoute feature="channel_monitor_enabled" mode="opt-out"><MonitorPage /></ConsoleRoute>} />
          <Route path="/profile" element={<ConsoleRoute><ProfilePage /></ConsoleRoute>} />
          <Route path="/image-studio" element={<ConsoleRoute><ImageStudioPage /></ConsoleRoute>} />
          <Route path="/image-api-docs" element={<ConsoleRoute><ImageApiDocsPage /></ConsoleRoute>} />
          <Route path="/subscriptions" element={<ConsoleRoute standardOnly><SubscriptionsPage /></ConsoleRoute>} />
          <Route path="/purchase" element={<ConsoleRoute standardOnly feature="payment_enabled" mode="opt-out"><PurchasePage /></ConsoleRoute>} />
          <Route path="/orders" element={<ConsoleRoute standardOnly feature="payment_enabled" mode="opt-out"><OrdersPage /></ConsoleRoute>} />
          <Route path="/payment/qrcode" element={<ProtectedRoute standardOnly feature="payment_enabled" mode="opt-out"><PaymentQRCodePage /></ProtectedRoute>} />
          <Route path="/custom/:id" element={<ConsoleRoute><CustomPage /></ConsoleRoute>} />

          <Route path="/key-usage" element={<KeyUsagePage />} />
          <Route path="/payment/result" element={<PaymentResultPage />} />
          <Route path="/payment/stripe" element={<StripePaymentPage />} />
          <Route path="/payment/stripe-popup" element={<StripePopupPage />} />
          <Route path="/payment/airwallex" element={<AirwallexPaymentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ConsoleProvider>
    </LocaleProvider>
  );
}
