import { useEffect } from "react";
import pageMarkup from "./agentpeek-fragment.html?raw";
import { AuthPage } from "./AuthPage";
import { mountGatewayDemos } from "./gatewayDemos";

const renderedPageMarkup = pageMarkup
  .replace("Download for Free", "Get Started")
  .replace(
    /<a class="btn btn-download btn-sm" href="[^"]+" data-dl="1"><span class="btn-content"><svg class="apple-logo"[\s\S]*?<\/svg>Download<\/span><\/a>/,
    '<a class="btn btn-download btn-sm" href="/login"><span class="btn-content">Log in</span></a>',
  );

const featureComposerMarkup = `
  <form class="feature-composer">
    <label class="feature-composer-label" for="feature-request-input">What should Sentence AI do next?</label>
    <textarea id="feature-request-input" class="feature-composer-input" placeholder="Describe the feature you'd love to see…" maxlength="1000" rows="3"></textarea>
    <input class="feature-honeypot" tabindex="-1" autocomplete="off" aria-hidden="true" type="text" name="botcheck">
    <div class="feature-composer-row">
      <span class="feature-composer-status feature-composer-status--idle" role="status" aria-live="polite"></span>
      <div class="feature-composer-actions">
        <button type="button" class="feature-composer-cancel">Close</button>
        <button type="submit" class="feature-composer-send">Send request</button>
      </div>
    </div>
  </form>
`;

export function App() {
  const authMode = window.location.pathname === "/login" ? "login" : window.location.pathname === "/register" ? "register" : "";

  useEffect(() => {
    if (authMode) return undefined;
    const controller = new AbortController();
    const { signal } = controller;
    const root = document.querySelector(".app-shell");
    mountGatewayDemos(root);
    const header = root?.querySelector(".site-header");
    const drawer = root?.querySelector(".nav-drawer");
    const navToggle = root?.querySelector(".nav-toggle");
    const featureWrap = root?.querySelector(".feature-pill-wrap");
    const featureButton = root?.querySelector(".feature-pill");
    const videos = [...(root?.querySelectorAll("video") ?? [])];
    const demos = [...(root?.querySelectorAll(".gateway-demo") ?? [])];

    document.documentElement.classList.add("reveal-on");

    const updateHeader = () => {
      header?.setAttribute("data-scrolled", String(window.scrollY > 8));
    };

    const closeNavigation = () => {
      header?.setAttribute("data-open", "false");
      drawer?.setAttribute("data-open", "false");
      navToggle?.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
    };

    const toggleNavigation = () => {
      const willOpen = header?.getAttribute("data-open") !== "true";
      header?.setAttribute("data-open", String(willOpen));
      drawer?.setAttribute("data-open", String(willOpen));
      navToggle?.setAttribute("aria-expanded", String(willOpen));
      document.body.style.overflow = willOpen ? "hidden" : "";
    };

    const closeComposer = () => {
      featureWrap?.removeAttribute("data-open");
      featureButton?.setAttribute("aria-expanded", "false");
      featureWrap?.querySelector(".feature-composer")?.remove();
    };

    const openComposer = () => {
      if (!featureWrap || !featureButton) return;
      if (featureWrap.hasAttribute("data-open")) {
        closeComposer();
        return;
      }
      featureWrap.setAttribute("data-open", "true");
      featureButton.setAttribute("aria-expanded", "true");
      featureWrap.insertAdjacentHTML("beforeend", featureComposerMarkup);
      featureWrap.querySelector(".feature-composer-input")?.focus();
    };

    const handleComposerClick = (event) => {
      if (event.target.closest(".feature-composer-cancel")) closeComposer();
    };

    const handleComposerSubmit = (event) => {
      event.preventDefault();
    };

    const handlePricing = (event) => {
      const tier = event.target.closest(".home-price-tier");
      if (!tier) return;
      const tiers = [...root.querySelectorAll(".home-price-tier")];
      const selectedIndex = tiers.indexOf(tier);
      if (selectedIndex < 0) return;
      const prices = [19, 35, 49];
      tiers.forEach((item, index) => {
        const selected = index === selectedIndex;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-checked", String(selected));
      });
      const amount = root.querySelector(".home-price-amount");
      const checkout = root.querySelector('.home-price-card a[href*="checkout"]');
      if (amount) amount.innerHTML = `$${prices[selectedIndex]}<span class="home-price-per">/once</span>`;
      if (checkout) checkout.href = `https://agentpeek.app/checkout?machines=${selectedIndex + 1}`;
    };

    const handleFaq = (event) => {
      const button = event.target.closest(".faq-q");
      if (!button) return;
      const item = button.closest(".faq-item");
      const willOpen = item?.getAttribute("data-open") !== "true";
      item?.setAttribute("data-open", String(willOpen));
      button.setAttribute("aria-expanded", String(willOpen));
    };

    const handleLocalLink = (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (href === "/") {
        event.preventDefault();
        closeNavigation();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (href?.startsWith("#")) {
        closeNavigation();
      }
    };

    root?.querySelectorAll('a[href^="/"]:not([href="/"])').forEach((link) => {
      link.href = `https://agentpeek.app${link.getAttribute("href")}`;
    });

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true, signal });
    navToggle?.addEventListener("click", toggleNavigation, { signal });
    drawer?.addEventListener("click", handleLocalLink, { signal });
    root?.querySelector(".nav-brand")?.addEventListener("click", handleLocalLink, { signal });
    featureButton?.addEventListener("click", openComposer, { signal });
    featureWrap?.addEventListener("click", handleComposerClick, { signal });
    featureWrap?.addEventListener("submit", handleComposerSubmit, { signal });
    root?.querySelector(".home-price-tiers")?.addEventListener("click", handlePricing, { signal });
    root?.querySelector(".faq")?.addEventListener("click", handleFaq, { signal });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (target.matches(".gateway-demo")) {
            target.setAttribute("data-active", String(isIntersecting));
          } else if (isIntersecting) {
            target.play().catch(() => {});
          } else {
            target.pause();
          }
        });
      },
      { rootMargin: "180px 0px", threshold: 0.05 },
    );
    videos.forEach((video) => observer.observe(video));
    demos.forEach((demo) => observer.observe(demo));

    return () => {
      controller.abort();
      observer.disconnect();
      closeNavigation();
      document.documentElement.classList.remove("reveal-on");
    };
  }, []);

  if (authMode) return <AuthPage initialMode={authMode} />;
  return <div dangerouslySetInnerHTML={{ __html: renderedPageMarkup }} />;
}
