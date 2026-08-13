import { Button } from "@appica/ui-react/button";
import { Separator } from "@appica/ui-react/separator";
import {
  BrandDingtalk,
  BrandGithub,
  BrandGoogleFilled,
  BrandWechat,
  World,
} from "@appica/icons-react";
import { getOAuthStartUrl } from "../api/auth";
import { getAffiliateCode, safeAuthRedirect } from "./authUtils";

const providerLabels = {
  github: "GitHub",
  google: "Google",
  linuxdo: "Linux.do",
  dingtalk: "DingTalk",
  wechat: "WeChat",
  oidc: "OIDC",
};

function ProviderMark({ provider, label }) {
  const Icon = {
    google: BrandGoogleFilled,
    github: BrandGithub,
    dingtalk: BrandDingtalk,
    wechat: BrandWechat,
  }[provider] || World;
  return <Icon className="size-5" aria-label={label} />;
}

function resolveWeChatStart(settings) {
  const inWeChat = /MicroMessenger/i.test(navigator.userAgent);
  const openEnabled = settings.wechat_oauth_open_enabled ?? settings.wechat_oauth_enabled;
  const mpEnabled = settings.wechat_oauth_mp_enabled ?? settings.wechat_oauth_enabled;
  if (inWeChat && mpEnabled) return { mode: "mp" };
  if (inWeChat && openEnabled) return { error: "Open this page in your system browser to use WeChat sign-in." };
  if (!inWeChat && openEnabled) return { mode: "open" };
  if (!inWeChat && mpEnabled) return { error: "Open this page inside WeChat to use WeChat sign-in." };
  return { error: "WeChat web sign-in is not configured." };
}

function getProviders(settings) {
  return [
    settings.github_oauth_enabled && "github",
    settings.google_oauth_enabled && "google",
    settings.linuxdo_oauth_enabled && "linuxdo",
    settings.dingtalk_oauth_enabled && "dingtalk",
    (settings.wechat_oauth_enabled || settings.wechat_oauth_open_enabled || settings.wechat_oauth_mp_enabled) && "wechat",
    settings.oidc_oauth_enabled && "oidc",
  ].filter(Boolean);
}

export function OAuthButtons({ settings, searchParams, onError }) {
  const providers = getProviders(settings || {});
  if (!providers.length) return null;
  const singleProvider = providers.length === 1;

  const startOAuth = (provider) => {
    const affiliateCode = getAffiliateCode(searchParams);
    const params = { redirect: safeAuthRedirect(searchParams.get("redirect")) };
    if (affiliateCode && ["github", "google"].includes(provider)) params.aff_code = affiliateCode;
    if (provider === "wechat") {
      const result = resolveWeChatStart(settings);
      if (!result.mode) return onError(result.error);
      params.mode = result.mode;
    }
    if (["github", "google"].includes(provider)) sessionStorage.setItem("email_oauth_pending_provider", provider);
    window.location.assign(getOAuthStartUrl(provider, params));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-foreground-subtle flex items-center gap-3 text-xs"><Separator className="flex-1" /><span>or continue with</span><Separator className="flex-1" /></div>
      <div className={`grid gap-2 ${providers.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {providers.map((provider) => {
          const label = provider === "oidc" ? settings.oidc_oauth_provider_name || "OIDC" : providerLabels[provider];
          return (
            <Button className="w-full" variant="outline" type="button" key={provider} onClick={() => startOAuth(provider)}>
              <ProviderMark provider={provider} label={label} />
              <span>{singleProvider ? `Sign in with ${label}` : label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
