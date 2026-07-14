import { useEffect } from "react";
import landingPageMarkup from "./landing-page.html?raw";
import { AuthPage } from "./AuthPage";
import { mountGatewayDemos } from "./gatewayDemos";

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
  const amount = root.querySelector(".home-price-amount");
  const action = root.querySelector(".home-price-action");
  const handlePricing = (event) => {
    const selectedTier = event.target.closest(".home-price-tier");
    if (!selectedTier) return;
    tiers.forEach((tier) => {
      const selected = tier === selectedTier;
      tier.classList.toggle("selected", selected);
      tier.setAttribute("aria-checked", String(selected));
    });
    if (amount) amount.innerHTML = `${selectedTier.dataset.price}<span class="home-price-per">${selectedTier.dataset.period}</span>`;
    action?.setAttribute("href", `/register?plan=${selectedTier.dataset.plan}`);
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

function observeGatewayDemos(root) {
  const observer = new IntersectionObserver(
    (entries) => entries.forEach(({ isIntersecting, target }) => target.setAttribute("data-active", String(isIntersecting))),
    { rootMargin: "180px 0px", threshold: 0.05 },
  );
  root.querySelectorAll(".gateway-demo").forEach((demo) => observer.observe(demo));
  return observer;
}

function getAuthMode() {
  if (window.location.pathname === "/login") return "login";
  if (window.location.pathname === "/register") return "register";
  return "";
}

export function App() {
  const authMode = getAuthMode();

  useEffect(() => {
    if (authMode) return undefined;
    const root = document.querySelector(".app-shell");
    if (!root) return undefined;
    const controller = new AbortController();
    const { signal } = controller;

    mountGatewayDemos(root);
    const closeNavigation = mountNavigation(root, signal);
    mountPricing(root, signal);
    mountFaq(root, signal);
    const observer = observeGatewayDemos(root);
    document.documentElement.classList.add("reveal-on");

    return () => {
      controller.abort();
      observer.disconnect();
      closeNavigation();
      document.documentElement.classList.remove("reveal-on");
    };
  }, [authMode]);

  if (authMode) return <AuthPage initialMode={authMode} />;
  return <div dangerouslySetInnerHTML={{ __html: landingPageMarkup }} />;
}
