import { getOAuthStartUrl } from "../api/auth";
import { getAffiliateCode } from "./authUtils";

const providerLabels = {
  github: "GitHub",
  google: "Google",
  linuxdo: "Linux.do",
  dingtalk: "DingTalk",
  wechat: "WeChat",
  oidc: "OIDC",
};

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

  const startOAuth = (provider) => {
    const affiliateCode = getAffiliateCode(searchParams);
    const params = affiliateCode && ["github", "google"].includes(provider) ? { aff_code: affiliateCode } : {};
    if (provider === "wechat") {
      const result = resolveWeChatStart(settings);
      if (!result.mode) return onError(result.error);
      params.mode = result.mode;
    }
    if (["github", "google"].includes(provider)) sessionStorage.setItem("email_oauth_pending_provider", provider);
    window.location.assign(getOAuthStartUrl(provider, params));
  };

  return (
    <div className="auth-oauth-block">
      <div className="auth-divider"><span>or continue with</span></div>
      <div className="auth-oauth-grid">
        {providers.map((provider) => (
          <button type="button" key={provider} onClick={() => startOAuth(provider)}>
            {provider === "oidc" ? settings.oidc_oauth_provider_name || "OIDC" : providerLabels[provider]}
          </button>
        ))}
      </div>
    </div>
  );
}
