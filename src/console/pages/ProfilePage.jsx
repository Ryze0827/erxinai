import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi, getOAuthBindingUrl } from "../../api/auth";
import { totpApi, userApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, Field, IconButton, Modal, Page, Panel, Spinner, StatusBadge, TextInput, Toggle } from "../UI";
import { safeImageUrl } from "../utils";

function bindingStatus(user, provider) {
  const direct = user?.[`${provider}_bound`];
  if (typeof direct === "boolean") return direct;
  const nested = user?.auth_bindings?.[provider] ?? user?.identity_bindings?.[provider];
  if (typeof nested === "boolean") return nested;
  return Boolean(nested?.bound || nested?.provider_subject || nested?.issuer || nested?.provider_key);
}

function bindingDetails(user, provider) {
  const value = user?.auth_bindings?.[provider] ?? user?.identity_bindings?.[provider];
  return value && typeof value === "object" ? value : {};
}

function ProfileCard() {
  const { t, locale, formatDate } = useLocale();
  const { user, updateUser, notify } = useConsole();
  const [form, setForm] = useState({ username: user?.username || "", avatar_url: user?.avatar_url || "" });
  const [busy, setBusy] = useState(false);
  const avatar = safeImageUrl(form.avatar_url);
  useEffect(() => setForm({ username: user?.username || "", avatar_url: user?.avatar_url || "" }), [user?.avatar_url, user?.username]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try { const next = await userApi.update({ username: form.username.trim(), avatar_url: form.avatar_url.trim() }); updateUser(next); notify("success", t("common.saved")); }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  return <Panel title={t("profile.account")}><form className="console-panel-body console-profile-form" onSubmit={save}><div className="console-profile-avatar">{avatar ? <img src={avatar} alt="" /> : <span>{String(form.username || user?.email || "U").slice(0, 1).toUpperCase()}</span>}<div><strong>{user?.email}</strong><small>{locale === "zh" ? `注册于 ${formatDate(user?.created_at)}` : `Joined ${formatDate(user?.created_at)}`}</small></div><StatusBadge status={user?.status} /></div><div className="console-form-grid"><Field label={t("profile.username")}><TextInput value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></Field><Field label={t("profile.avatar")}><TextInput type="url" value={form.avatar_url} onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))} placeholder="https://…" /></Field></div><div className="console-form-actions"><Button type="submit" variant="primary" disabled={busy}>{busy ? t("common.loading") : t("common.save")}</Button></div></form></Panel>;
}

function PasswordCard() {
  const { t, locale } = useLocale();
  const { notify } = useConsole();
  const [form, setForm] = useState({ old: "", next: "", confirm: "" });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    if (!form.old || form.next.length < 8 || form.next !== form.confirm) return;
    setBusy(true);
    try { await userApi.changePassword(form.old, form.next); setForm({ old: "", next: "", confirm: "" }); notify("success", t("common.saved")); }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  return <Panel title={t("profile.password")}><form className="console-panel-body" onSubmit={save}><div className="console-form-grid"><Field label={t("profile.currentPassword")}><div className="console-input-wrap"><TextInput type={visible ? "text" : "password"} value={form.old} onChange={(event) => setForm((current) => ({ ...current, old: event.target.value }))} autoComplete="current-password" /><IconButton icon={visible ? "eyeOff" : "eye"} label={visible ? "Hide" : "Show"} onClick={() => setVisible((value) => !value)} /></div></Field><Field label={t("profile.newPassword")} hint={locale === "zh" ? "至少 8 个字符" : "Use at least 8 characters."}><TextInput type={visible ? "text" : "password"} minLength="8" value={form.next} onChange={(event) => setForm((current) => ({ ...current, next: event.target.value }))} autoComplete="new-password" /></Field><Field label={locale === "zh" ? "确认新密码" : "Confirm new password"} error={form.confirm && form.next !== form.confirm ? (locale === "zh" ? "两次输入的密码不一致。" : "Passwords do not match.") : ""}><TextInput type={visible ? "text" : "password"} minLength="8" value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} autoComplete="new-password" /></Field></div><div className="console-form-actions"><Button type="submit" variant="primary" disabled={busy || form.next.length < 8 || form.next !== form.confirm}>{busy ? t("common.loading") : t("common.save")}</Button></div></form></Panel>;
}

function NotificationsCard() {
  const { t, locale, formatCurrency } = useLocale();
  const { user, updateUser, refreshUser, notify, settings } = useConsole();
  const [form, setForm] = useState({ enabled: user?.balance_notify_enabled ?? true, threshold: user?.balance_notify_threshold ?? settings?.balance_low_notify_threshold ?? 0 });
  const [email, setEmail] = useState({ value: "", code: "", sent: false });
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm({ enabled: user?.balance_notify_enabled ?? true, threshold: user?.balance_notify_threshold ?? settings?.balance_low_notify_threshold ?? 0 }), [settings?.balance_low_notify_threshold, user?.balance_notify_enabled, user?.balance_notify_threshold]);
  const save = async () => {
    setBusy(true);
    try { const next = await userApi.update({ balance_notify_enabled: form.enabled, balance_notify_threshold: Number(form.threshold) || 0 }); updateUser(next); notify("success", t("common.saved")); }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const send = async () => { try { await userApi.sendNotifyEmailCode(email.value); setEmail((current) => ({ ...current, sent: true })); notify("success", locale === "zh" ? "验证码已发送。" : "Verification code sent."); } catch (error) { notify("error", error.message); } };
  const verify = async () => { try { await userApi.verifyNotifyEmail(email.value, email.code); await refreshUser(); setEmail({ value: "", code: "", sent: false }); notify("success", t("common.saved")); } catch (error) { notify("error", error.message); } };
  const changeEntry = async (entry, action) => {
    try { const next = action === "remove" ? await userApi.removeNotifyEmail(entry.email) : await userApi.toggleNotifyEmail(entry.email, !entry.disabled); if (next) updateUser(next); else await refreshUser(); }
    catch (error) { notify("error", error.message); }
  };
  return <Panel title={t("profile.notifications")}><div className="console-panel-body console-detail-stack"><Toggle checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} label={t("profile.notifyEnabled")} /><div className="console-form-grid"><Field label={t("profile.threshold")} hint={`${locale === "zh" ? "当前" : "Current"}: ${formatCurrency(form.threshold)}`}><TextInput type="number" min="0" step="0.01" value={form.threshold} onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))} disabled={!form.enabled} /></Field><div className="console-form-actions is-inline"><Button variant="primary" onClick={save} disabled={busy}>{t("common.save")}</Button></div></div><div className="console-divider" /><strong>{t("profile.notifyEmails")}</strong><div className="console-notify-emails">{(user?.balance_notify_extra_emails || []).map((entry) => <div key={entry.email}><Icon name="mail" size={18} /><span><strong>{entry.email}</strong><small>{entry.disabled ? t("common.disabled") : t("common.enabled")}</small></span><Toggle checked={!entry.disabled} onChange={() => changeEntry(entry, "toggle")} label="" /><IconButton icon="trash" label={t("common.delete")} onClick={() => changeEntry(entry, "remove")} /></div>)}</div><div className="console-form-grid"><Field label={t("profile.addEmail")}><TextInput type="email" value={email.value} onChange={(event) => setEmail((current) => ({ ...current, value: event.target.value }))} /></Field>{email.sent && <Field label={t("profile.code")}><TextInput inputMode="numeric" value={email.code} onChange={(event) => setEmail((current) => ({ ...current, code: event.target.value }))} /></Field>}<div className="console-form-actions is-inline"><Button onClick={email.sent ? verify : send} disabled={!email.value || (email.sent && !email.code)}>{email.sent ? t("profile.verify") : t("profile.sendCode")}</Button></div></div></div></Panel>;
}

function wechatBindingMode(settings) {
  const legacyEnabled = settings?.wechat_oauth_enabled === true;
  const openEnabled = typeof settings?.wechat_oauth_open_enabled === "boolean" ? settings.wechat_oauth_open_enabled : legacyEnabled;
  const mpEnabled = typeof settings?.wechat_oauth_mp_enabled === "boolean" ? settings.wechat_oauth_mp_enabled : legacyEnabled;
  return /MicroMessenger/i.test(navigator.userAgent) ? (mpEnabled ? "mp" : null) : (openEnabled ? "open" : null);
}

function enabledProviders(settings) {
  return [
    { id: "linuxdo", label: "LinuxDo", enabled: settings?.linuxdo_oauth_enabled === true },
    { id: "dingtalk", label: "DingTalk", enabled: settings?.dingtalk_oauth_enabled === true },
    { id: "oidc", label: settings?.oidc_oauth_provider_name || "OIDC", enabled: settings?.oidc_oauth_enabled === true },
    { id: "wechat", label: "WeChat", enabled: Boolean(wechatBindingMode(settings)) },
  ].filter((provider) => provider.enabled);
}

function IdentityCard() {
  const { t, locale } = useLocale();
  const { user, settings, updateUser, refreshUser, notify } = useConsole();
  const [emailModal, setEmailModal] = useState(false);
  const [email, setEmail] = useState({ value: "", code: "", password: "", sent: false });
  const [unbind, setUnbind] = useState(null);
  const providers = useMemo(() => enabledProviders(settings), [settings]);
  const beginBind = async (provider) => {
    try {
      await authApi.prepareOAuthBind();
      sessionStorage.setItem("oauth_bind_intent", provider);
      const wechatMode = wechatBindingMode(settings);
      window.location.assign(getOAuthBindingUrl(provider, { mode: provider === "wechat" ? wechatMode : undefined }));
    } catch (error) { notify("error", error.message); }
  };
  const remove = async () => {
    try { const next = await userApi.unbindIdentity(unbind); updateUser(next); setUnbind(null); notify("success", t("common.saved")); }
    catch (error) { notify("error", error.message); }
  };
  const sendEmail = async () => { try { await userApi.sendEmailBindingCode(email.value); setEmail((current) => ({ ...current, sent: true })); } catch (error) { notify("error", error.message); } };
  const bindEmail = async () => { try { const next = await userApi.bindEmail({ email: email.value, verify_code: email.code, password: email.password }); updateUser(next); setEmailModal(false); setEmail({ value: "", code: "", password: "", sent: false }); notify("success", t("common.saved")); } catch (error) { notify("error", error.message); } };
  const rows = [{ id: "email", label: "Email", enabled: true }, ...providers];
  return <Panel title={t("profile.identities")}><div className="console-panel-body console-identity-list">{rows.map((provider) => {
    const bound = bindingStatus(user, provider.id);
    const details = bindingDetails(user, provider.id);
    const canUnbind = provider.id !== "email" && bound && details.can_unbind === true;
    return <div key={provider.id}><span>{provider.label.slice(0, 1)}</span><div><strong>{provider.label}</strong><small>{provider.id === "email" && bound ? user.email : bound ? (locale === "zh" ? "已绑定" : "Connected") : (locale === "zh" ? "未绑定" : "Not connected")}</small></div><StatusBadge status={bound ? "active" : "inactive"} label={bound ? t("common.enabled") : t("common.disabled")} />{provider.id === "email" && <Button onClick={() => setEmailModal(true)}>{bound ? (locale === "zh" ? "管理" : "Manage") : t("profile.bind")}</Button>}{!bound && provider.id !== "email" && <Button onClick={() => beginBind(provider.id)}>{t("profile.bind")}</Button>}{canUnbind && <Button variant="danger" onClick={() => setUnbind(provider.id)}>{t("profile.unbind")}</Button>}</div>;
  })}<Button icon="refresh" onClick={refreshUser}>{t("common.refresh")}</Button></div><Modal open={emailModal} title={t("profile.bind")} onClose={() => setEmailModal(false)} size="small" footer={<><Button onClick={() => setEmailModal(false)}>{t("common.cancel")}</Button><Button variant="primary" onClick={email.sent ? bindEmail : sendEmail}>{email.sent ? t("profile.verify") : t("profile.sendCode")}</Button></>}><div className="console-form-grid"><Field label={t("profile.email")} className="is-full"><TextInput type="email" value={email.value} onChange={(event) => setEmail((current) => ({ ...current, value: event.target.value }))} /></Field>{email.sent && <><Field label={t("profile.code")}><TextInput value={email.code} onChange={(event) => setEmail((current) => ({ ...current, code: event.target.value }))} /></Field><Field label={t("profile.currentPassword")}><TextInput type="password" value={email.password} onChange={(event) => setEmail((current) => ({ ...current, password: event.target.value }))} /></Field></>}</div></Modal><ConfirmDialog open={Boolean(unbind)} title={t("profile.unbind")} description={locale === "zh" ? "解绑后将无法继续使用该方式登录。" : "You will no longer be able to sign in with this provider."} onClose={() => setUnbind(null)} onConfirm={remove} /></Panel>;
}

function TotpCard() {
  const { t, locale } = useLocale();
  const { notify } = useConsole();
  const [status, setStatus] = useState(null);
  const [flow, setFlow] = useState(null);
  const [form, setForm] = useState({ verification: "", totp: "" });
  const [busy, setBusy] = useState(false);
  const mountedRef = useRef(true);
  const load = useCallback(() => totpApi.getStatus().then((value) => mountedRef.current && setStatus(value)).catch(() => mountedRef.current && setStatus({ feature_enabled: false, enabled: false })), []);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);
  const begin = async (action) => {
    try { const method = await totpApi.getVerificationMethod(); setForm({ verification: "", totp: "" }); setFlow({ action, method: method.method, phase: "verify" }); }
    catch (error) { notify("error", error.message); }
  };
  const sendCode = async () => { try { await totpApi.sendCode(); notify("success", locale === "zh" ? "验证码已发送。" : "Verification code sent."); } catch (error) { notify("error", error.message); } };
  const verify = async () => {
    setBusy(true);
    const verification = flow.method === "email" ? { email_code: form.verification } : { password: form.verification };
    try {
      if (flow.action === "disable") { await totpApi.disable(verification); setFlow(null); await load(); notify("success", t("common.saved")); }
      else { const setup = await totpApi.setup(verification); setFlow((current) => ({ ...current, phase: "setup", setup })); }
    } catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const enable = async () => {
    setBusy(true);
    try { await totpApi.enable({ totp_code: form.totp, setup_token: flow.setup.setup_token }); setFlow(null); await load(); notify("success", t("common.saved")); }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  if (!status?.feature_enabled) return null;
  return <Panel title={t("profile.twoFactor")}><div className="console-panel-body console-security-card"><span><Icon name="shield" size={25} /></span><div><strong>{status.enabled ? (locale === "zh" ? "两步验证已启用" : "Two-factor authentication is on") : (locale === "zh" ? "保护你的账号" : "Protect your account")}</strong><p>{locale === "zh" ? "登录时使用身份验证器生成的动态代码。" : "Use a rotating authenticator code when you sign in."}</p></div><Button variant={status.enabled ? "danger" : "primary"} onClick={() => begin(status.enabled ? "disable" : "setup")}>{status.enabled ? t("profile.disable2fa") : t("profile.setup2fa")}</Button></div><Modal open={Boolean(flow)} title={flow?.action === "disable" ? t("profile.disable2fa") : t("profile.setup2fa")} onClose={() => setFlow(null)} size="small" footer={<><Button onClick={() => setFlow(null)}>{t("common.cancel")}</Button><Button variant="primary" onClick={flow?.phase === "setup" ? enable : verify} disabled={busy}>{busy ? t("common.loading") : flow?.phase === "setup" ? t("profile.verify") : t("common.confirm")}</Button></>}>
    {flow?.phase === "verify" && <div className="console-detail-stack"><Field label={flow.method === "email" ? t("profile.code") : t("profile.currentPassword")}><TextInput type={flow.method === "email" ? "text" : "password"} value={form.verification} onChange={(event) => setForm((current) => ({ ...current, verification: event.target.value }))} /></Field>{flow.method === "email" && <Button onClick={sendCode}>{t("profile.sendCode")}</Button>}</div>}
    {flow?.phase === "setup" && <div className="console-totp-setup">{flow.setup.qr_code_url && <img src={flow.setup.qr_code_url} alt="TOTP QR code" />}<Field label={t("profile.secret")}><div className="console-code"><span>{flow.setup.secret}</span></div></Field><Field label={t("profile.totpCode")}><TextInput inputMode="numeric" maxLength="6" value={form.totp} onChange={(event) => setForm((current) => ({ ...current, totp: event.target.value }))} /></Field></div>}
  </Modal></Panel>;
}

export function ProfilePage() {
  const { t } = useLocale();
  const { settings } = useConsole();
  return <Page title={t("profile.title")} subtitle={t("profile.subtitle")} className="console-profile-page"><div className="console-grid console-grid--2 console-profile-grid"><ProfileCard /><IdentityCard /><PasswordCard />{settings?.balance_low_notify_enabled === true && <NotificationsCard />}<TotpCard />{settings?.contact_info && <Panel title={t("common.description")}><div className="console-panel-body console-contact-card"><Icon name="mail" size={22} /><span>{settings.contact_info}</span></div></Panel>}</div></Page>;
}
