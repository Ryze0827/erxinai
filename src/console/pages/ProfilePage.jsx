import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi, getOAuthBindingUrl } from "../../api/auth";
import { totpApi, userApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, Field, IconButton, Modal, Page, Panel, Spinner, StatusBadge, TextInput, Toggle } from "../UI";
import { safeImageUrl } from "../utils";

const AVATAR_TARGET_BYTES = 20 * 1024;
const AVATAR_MAX_EDGE = 512;
const AVATAR_SCALE_STEPS = [1, 0.84, 0.68, 0.52, 0.4, 0.32];
const AVATAR_QUALITY_STEPS = [0.88, 0.74, 0.6, 0.48, 0.36];
const AVATAR_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const AVATAR_COPY = {
  en: {
    fallbackLabel: "Avatar URL (fallback)", fallbackHint: "The local image is active; you can fall back to this URL.",
    localLabel: "Local avatar", localHint: "Local images are prepared in your browser and are not uploaded until you save.",
    choose: "Choose image", preparing: "Preparing…", restore: "Use avatar URL", remove: "Remove avatar",
    removed: "Avatar removed.", joined: (date) => `Joined ${date}`,
  },
  zh: {
    fallbackLabel: "头像地址（回退）", fallbackHint: "当前预览使用本地图片；可恢复为此地址。",
    localLabel: "本地头像", localHint: "本地图片会在浏览器中预处理，保存前不会上传。",
    choose: "选择图片", preparing: "正在处理…", restore: "恢复地址头像", remove: "移除头像",
    removed: "头像已移除。", joined: (date) => `注册于 ${date}`,
  },
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error || new Error("avatar_read_failed"));
    reader.readAsDataURL(file);
  });
}

function loadAvatarImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("avatar_read_failed"));
    image.src = dataUrl;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("avatar_compress_failed")), "image/webp", quality);
  });
}

function avatarDimensions(image, scale) {
  const longest = Math.max(image.naturalWidth, image.naturalHeight, 1);
  const baseScale = Math.min(1, AVATAR_MAX_EDGE / longest);
  return {
    width: Math.max(1, Math.round(image.naturalWidth * baseScale * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * baseScale * scale)),
  };
}

async function compressAvatar(file) {
  const image = await loadAvatarImage(await readFileAsDataUrl(file));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("avatar_compress_failed");
  for (const scale of AVATAR_SCALE_STEPS) {
    const { width, height } = avatarDimensions(image, scale);
    canvas.width = width; canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    for (const quality of AVATAR_QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= AVATAR_TARGET_BYTES) return blob;
    }
  }
  throw new Error("avatar_too_large");
}

async function prepareAvatar(file) {
  if (!AVATAR_TYPES.has(file.type)) throw new Error("avatar_invalid_type");
  if (file.type === "image/gif" && file.size > AVATAR_TARGET_BYTES) throw new Error("avatar_gif_too_large");
  if (file.size <= AVATAR_TARGET_BYTES) return file;
  return compressAvatar(file);
}

function avatarErrorMessage(code, locale) {
  const messages = locale === "zh" ? {
    avatar_invalid_type: "请选择 PNG、JPEG、WebP 或 GIF 图片。",
    avatar_gif_too_large: "GIF 头像需小于 20 KB；较大的动图无法在保留动画的同时压缩。",
    avatar_too_large: "无法将这张图片压缩到 20 KB 以内，请尝试构图更简单的图片。",
    avatar_read_failed: "无法读取所选图片。",
    avatar_compress_failed: "浏览器无法处理所选图片。",
  } : {
    avatar_invalid_type: "Choose a PNG, JPEG, WebP, or GIF image.",
    avatar_gif_too_large: "GIF avatars must be under 20 KB to preserve animation.",
    avatar_too_large: "This image could not be compressed below 20 KB. Try a simpler image.",
    avatar_read_failed: "The selected image could not be read.",
    avatar_compress_failed: "The browser could not prepare the selected image.",
  };
  return messages[code] || (locale === "zh" ? "无法处理所选图片。" : "The selected image could not be prepared.");
}

function avatarSize(value) {
  const bytes = Number(value) || 0;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
}

function profileForm(user) {
  return { username: user?.username || "", avatar_url: user?.avatar_url || "" };
}

function ProfileAvatarRow({ avatar, email, username, status, joined, onError }) {
  const displayName = username || email || "U";
  return <div className="console-profile-avatar">{avatar ? <img src={avatar} alt={displayName} onError={onError} /> : <span>{String(displayName).slice(0, 1).toUpperCase()}</span>}<div><strong>{email}</strong><small>{joined}</small></div><StatusBadge status={status} /></div>;
}

function ProfileAvatarFields({ form, setForm, locale, usernameLabel, avatarDraft, avatarMeta, hasSavedAvatar, busy, preparing, fileInputRef, onChoose, onRestore, onRemove }) {
  const copy = AVATAR_COPY[locale] || AVATAR_COPY.en;
  const hint = avatarMeta ? `${avatarMeta.name} · ${avatarSize(avatarMeta.originalSize)} → ${avatarSize(avatarMeta.preparedSize)}` : copy.localHint;
  const chooseLabel = preparing ? copy.preparing : copy.choose;
  const unavailable = busy || preparing;
  const removeDisabled = unavailable || !(avatarDraft || form.avatar_url || hasSavedAvatar);
  return <div className="console-detail-stack"><div className="console-form-grid"><Field label={usernameLabel}><TextInput value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></Field><Field label={copy.fallbackLabel} hint={avatarDraft ? copy.fallbackHint : ""}><TextInput type="url" value={form.avatar_url} onChange={(event) => setForm((current) => ({ ...current, avatar_url: event.target.value }))} placeholder="https://…" /></Field></div><div className="console-field"><span>{copy.localLabel}</span><input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onChoose} /><div className="console-inline-actions"><Button icon="upload" onClick={() => fileInputRef.current?.click()} disabled={unavailable}>{chooseLabel}</Button>{avatarDraft && <Button icon="reset" onClick={onRestore} disabled={unavailable}>{copy.restore}</Button>}<Button icon="trash" variant="danger" onClick={onRemove} disabled={removeDisabled}>{copy.remove}</Button></div><small>{hint}</small></div></div>;
}

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
  const [form, setForm] = useState(() => profileForm(user));
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState("");
  const [avatarMeta, setAvatarMeta] = useState(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const fileInputRef = useRef(null);
  const previewSource = safeImageUrl(avatarDraft || form.avatar_url);
  useEffect(() => {
    setForm(profileForm(user));
    setAvatarDraft(""); setAvatarMeta(null);
  }, [user?.avatar_url, user?.username]);
  useEffect(() => setPreviewFailed(false), [previewSource]);
  const chooseAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreparing(true);
    try {
      const prepared = await prepareAvatar(file);
      const dataUrl = await readFileAsDataUrl(prepared);
      if (!safeImageUrl(dataUrl)) throw new Error("avatar_invalid_type");
      setAvatarDraft(dataUrl);
      setAvatarMeta({ name: file.name, originalSize: file.size, preparedSize: prepared.size });
    } catch (error) { notify("error", avatarErrorMessage(error.message, locale)); }
    finally { setPreparing(false); }
  };
  const restoreAvatarUrl = () => { setAvatarDraft(""); setAvatarMeta(null); };
  const removeAvatar = async () => {
    if (busy) return;
    if (!user?.avatar_url) { setForm((current) => ({ ...current, avatar_url: "" })); restoreAvatarUrl(); return; }
    setBusy(true);
    try {
      const next = await userApi.update({ avatar_url: "" });
      updateUser(next); setForm((current) => ({ ...current, avatar_url: "" })); restoreAvatarUrl();
      notify("success", (AVATAR_COPY[locale] || AVATAR_COPY.en).removed);
    } catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      const next = await userApi.update({ username: form.username.trim(), avatar_url: avatarDraft || form.avatar_url.trim() });
      updateUser(next); restoreAvatarUrl(); notify("success", t("common.saved"));
    }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  const copy = AVATAR_COPY[locale] || AVATAR_COPY.en;
  return <Panel title={t("profile.account")}><form className="console-panel-body console-profile-form" onSubmit={save}><ProfileAvatarRow avatar={previewFailed ? "" : previewSource} email={user?.email} username={form.username} status={user?.status} joined={copy.joined(formatDate(user?.created_at))} onError={() => setPreviewFailed(true)} /><ProfileAvatarFields form={form} setForm={setForm} locale={locale} usernameLabel={t("profile.username")} avatarDraft={avatarDraft} avatarMeta={avatarMeta} hasSavedAvatar={Boolean(user?.avatar_url)} busy={busy} preparing={preparing} fileInputRef={fileInputRef} onChoose={chooseAvatar} onRestore={restoreAvatarUrl} onRemove={removeAvatar} /><div className="console-form-actions"><Button type="submit" variant="primary" disabled={busy || preparing}>{busy ? t("common.loading") : t("common.save")}</Button></div></form></Panel>;
}

function passwordCopy(locale) {
  if (locale === "zh") return { hint: "至少 8 个字符", confirm: "确认新密码", mismatch: "两次输入的密码不一致。" };
  return { hint: "Use at least 8 characters.", confirm: "Confirm new password", mismatch: "Passwords do not match." };
}

function passwordIsValid(form) {
  return Boolean(form.old && form.next.length >= 8 && form.next === form.confirm);
}

function passwordSubmitDisabled(form, busy) {
  return busy || form.next.length < 8 || form.next !== form.confirm;
}

function PasswordFields({ form, setForm, visible, setVisible, copy, t }) {
  const type = visible ? "text" : "password";
  const mismatch = Boolean(form.confirm && form.next !== form.confirm);
  return <div className="console-form-grid"><Field label={t("profile.currentPassword")}><div className="console-input-wrap"><TextInput type={type} value={form.old} onChange={(event) => setForm((current) => ({ ...current, old: event.target.value }))} autoComplete="current-password" /><IconButton icon={visible ? "eyeOff" : "eye"} label={visible ? "Hide" : "Show"} onClick={() => setVisible((value) => !value)} /></div></Field><Field label={t("profile.newPassword")} hint={copy.hint}><TextInput type={type} minLength="8" value={form.next} onChange={(event) => setForm((current) => ({ ...current, next: event.target.value }))} autoComplete="new-password" /></Field><Field label={copy.confirm} error={mismatch ? copy.mismatch : ""}><TextInput type={type} minLength="8" value={form.confirm} onChange={(event) => setForm((current) => ({ ...current, confirm: event.target.value }))} autoComplete="new-password" /></Field></div>;
}

function PasswordCard() {
  const { t, locale } = useLocale();
  const { notify } = useConsole();
  const [form, setForm] = useState({ old: "", next: "", confirm: "" });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async (event) => {
    event.preventDefault();
    if (!passwordIsValid(form)) return;
    setBusy(true);
    try { await userApi.changePassword(form.old, form.next); setForm({ old: "", next: "", confirm: "" }); notify("success", t("common.saved")); }
    catch (error) { notify("error", error.message); } finally { setBusy(false); }
  };
  return <Panel title={t("profile.password")}><form className="console-panel-body" onSubmit={save}><PasswordFields form={form} setForm={setForm} visible={visible} setVisible={setVisible} copy={passwordCopy(locale)} t={t} /><div className="console-form-actions"><Button type="submit" variant="primary" disabled={passwordSubmitDisabled(form, busy)}>{busy ? t("common.loading") : t("common.save")}</Button></div></form></Panel>;
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
  return <Panel title={t("profile.notifications")}><div className="console-panel-body console-detail-stack"><Toggle checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} label={t("profile.notifyEnabled")} /><div className="console-form-grid"><Field label={t("profile.threshold")} hint={`${locale === "zh" ? "当前" : "Current"}: ${formatCurrency(form.threshold)}`}><TextInput type="number" min="0" step="0.01" value={form.threshold} onChange={(event) => setForm((current) => ({ ...current, threshold: event.target.value }))} disabled={!form.enabled} /></Field><div className="console-form-actions is-inline"><Button variant="primary" onClick={save} disabled={busy}>{t("common.save")}</Button></div></div><div className="console-divider" /><strong>{t("profile.notifyEmails")}</strong><div className="console-notify-emails">{(user?.balance_notify_extra_emails || []).map((entry) => <div key={entry.email}><Icon name="mail" size={18} /><span><strong>{entry.email}</strong><small>{entry.disabled ? t("common.disabled") : t("common.enabled")}</small></span><Toggle checked={!entry.disabled} onChange={() => changeEntry(entry, "toggle")} label="" ariaLabel={`${entry.email}: ${entry.disabled ? t("common.disabled") : t("common.enabled")}`} /><IconButton icon="trash" label={t("common.delete")} onClick={() => changeEntry(entry, "remove")} /></div>)}</div><div className="console-form-grid"><Field label={t("profile.addEmail")}><TextInput type="email" value={email.value} onChange={(event) => setEmail((current) => ({ ...current, value: event.target.value }))} /></Field>{email.sent && <Field label={t("profile.code")}><TextInput inputMode="numeric" value={email.code} onChange={(event) => setEmail((current) => ({ ...current, code: event.target.value }))} /></Field>}<div className="console-form-actions is-inline"><Button onClick={email.sent ? verify : send} disabled={!email.value || (email.sent && !email.code)}>{email.sent ? t("profile.verify") : t("profile.sendCode")}</Button></div></div></div></Panel>;
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

function TotpSummary({ status, locale, t, onBegin }) {
  const heading = status.enabled ? (locale === "zh" ? "两步验证已启用" : "Two-factor authentication is on") : (locale === "zh" ? "保护你的账号" : "Protect your account");
  const description = locale === "zh" ? "登录时使用身份验证器生成的动态代码。" : "Use a rotating authenticator code when you sign in.";
  return <Panel title={t("profile.twoFactor")}><div className="console-panel-body console-security-card"><span><Icon name="shield" size={25} /></span><div><strong>{heading}</strong><p>{description}</p></div><Button variant={status.enabled ? "danger" : "primary"} onClick={() => onBegin(status.enabled ? "disable" : "setup")}>{status.enabled ? t("profile.disable2fa") : t("profile.setup2fa")}</Button></div></Panel>;
}

function TotpVerification({ flow, form, setForm, onSendCode, t }) {
  const email = flow.method === "email";
  return <div className="console-detail-stack"><Field label={email ? t("profile.code") : t("profile.currentPassword")}><TextInput type={email ? "text" : "password"} value={form.verification} onChange={(event) => setForm((current) => ({ ...current, verification: event.target.value }))} /></Field>{email && <Button onClick={onSendCode}>{t("profile.sendCode")}</Button>}</div>;
}

function TotpSetup({ flow, form, setForm, t }) {
  return <div className="console-totp-setup">{flow.setup.qr_code_url && <img src={flow.setup.qr_code_url} alt="TOTP QR code" />}<Field label={t("profile.secret")}><div className="console-code"><span>{flow.setup.secret}</span></div></Field><Field label={t("profile.totpCode")}><TextInput inputMode="numeric" maxLength="6" value={form.totp} onChange={(event) => setForm((current) => ({ ...current, totp: event.target.value }))} /></Field></div>;
}

function TotpDialog({ flow, form, setForm, busy, onClose, onVerify, onEnable, onSendCode, t }) {
  const setup = flow?.phase === "setup";
  const title = flow?.action === "disable" ? t("profile.disable2fa") : t("profile.setup2fa");
  const footer = <><Button onClick={onClose}>{t("common.cancel")}</Button><Button variant="primary" onClick={setup ? onEnable : onVerify} disabled={busy}>{busy ? t("common.loading") : setup ? t("profile.verify") : t("common.confirm")}</Button></>;
  return <Modal open={Boolean(flow)} title={title} onClose={onClose} size="small" footer={footer}>{flow?.phase === "verify" && <TotpVerification flow={flow} form={form} setForm={setForm} onSendCode={onSendCode} t={t} />}{setup && <TotpSetup flow={flow} form={form} setForm={setForm} t={t} />}</Modal>;
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
  return <><TotpSummary status={status} locale={locale} t={t} onBegin={begin} /><TotpDialog flow={flow} form={form} setForm={setForm} busy={busy} onClose={() => setFlow(null)} onVerify={verify} onEnable={enable} onSendCode={sendCode} t={t} /></>;
}

export function ProfilePage() {
  const { t } = useLocale();
  const { settings } = useConsole();
  return <Page title={t("profile.title")} subtitle={t("profile.subtitle")} className="console-profile-page"><div className="console-grid console-grid--2 console-profile-grid"><ProfileCard /><IdentityCard /><PasswordCard />{settings?.balance_low_notify_enabled === true && <NotificationsCard />}<TotpCard />{settings?.contact_info && <Panel title={t("common.description")}><div className="console-panel-body console-contact-card"><Icon name="mail" size={22} /><span>{settings.contact_info}</span></div></Panel>}</div></Page>;
}
