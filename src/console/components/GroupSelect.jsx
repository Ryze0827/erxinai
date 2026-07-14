import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GroupBadge } from "../GroupBadge";
import { Icon } from "../Icon";
import { TextInput } from "../UI";
import { useLocale } from "../i18n";

function rateFor(group, rates) {
  const custom = rates?.[group.id] ?? rates?.[String(group.id)];
  return custom?.rate_multiplier ?? custom ?? group.rate_multiplier ?? 1;
}

export function GroupOption({ group, selected, rates, onClick }) {
  const { locale } = useLocale();
  const rate = rateFor(group, rates);
  const original = Number(group.rate_multiplier || 1);
  return <button type="button" className={`console-group-option ${selected ? "is-selected" : ""}`} onClick={onClick}><div><GroupBadge name={group.name} platform={group.platform} /><p>{group.description || (locale === "zh" ? "用户 API 分组" : "User API group")}</p></div><div className="console-group-rates">{rate !== original && <del>{original}×</del>}<strong>{rate}×</strong>{group.peak_rate_multiplier && <small>{locale === "zh" ? "峰值" : "Peak"} {group.peak_rate_multiplier}×</small>}{group.subscription_type === "subscription" && <small>SUB</small>}</div>{selected && <Icon name="check" size={16} />}</button>;
}

export function GroupSelect({ value, groups = [], rates = {}, onChange, allowEmpty = false, compact = false }) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState(null);
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const selected = groups.find((group) => String(group.id) === String(value));
  const filtered = useMemo(() => groups.filter((group) => `${group.name} ${group.description || ""} ${group.platform || ""}`.toLowerCase().includes(search.toLowerCase())), [groups, search]);
  useEffect(() => {
    if (!open) return undefined;
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 345)), top: rect.bottom + 5, width: Math.min(Math.max(320, rect.width), window.innerWidth - 16) });
    const close = (event) => !rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const select = (next) => { onChange(next); setOpen(false); setSearch(""); };
  const menu = open && position ? <div className="console-group-menu" ref={menuRef} style={position}><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale === "zh" ? "搜索分组" : "Search groups"} autoFocus />{allowEmpty && <button type="button" className={`console-group-empty ${value === "" || value == null ? "is-selected" : ""}`} onClick={() => select("")}>{locale === "zh" ? "不指定分组" : "No group"}</button>}<div>{filtered.map((group) => <GroupOption key={group.id} group={group} rates={rates} selected={String(group.id) === String(value)} onClick={() => select(group.id)} />)}{!filtered.length && <p className="console-group-no-results">{locale === "zh" ? "没有匹配分组" : "No matching groups"}</p>}</div></div> : null;
  return <div className={`console-group-select ${compact ? "is-compact" : ""}`} ref={rootRef}><button type="button" className="console-group-trigger" onClick={() => setOpen((current) => !current)}>{selected ? <GroupBadge name={selected.name} platform={selected.platform} detail={`${rateFor(selected, rates)}×`} /> : <span className="console-muted">{locale === "zh" ? "选择分组" : "Select group"}</span>}<Icon name="chevronDown" size={14} /></button>{menu && createPortal(menu, document.body)}</div>;
}
