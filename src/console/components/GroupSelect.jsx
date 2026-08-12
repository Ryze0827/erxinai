import { useMemo, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@appica/ui-react/combobox";
import { GroupBadge } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";

function rateFor(group, rates) {
  const custom = rates?.[group.id] ?? rates?.[String(group.id)];
  return custom?.rate_multiplier ?? custom?.multiplier ?? custom ?? group.rate_multiplier ?? 1;
}

function optionValue(group) {
  return group ? String(group.id) : "";
}

function optionLabel(group, locale) {
  return group?.name || (locale === "zh" ? "不指定分组" : "No group");
}

function OptionContent({ group, selected, rates, locale }) {
  if (!group) return <span className="console-group-empty-label">{optionLabel(group, locale)}</span>;
  const rate = rateFor(group, rates);
  const original = Number(group.rate_multiplier || 1);
  return <><div className="console-group-option-copy"><GroupBadge name={group.name} platform={group.platform} />{group.description && <p>{group.description}</p>}</div><div className="console-group-rates">{selected && <Icon name="check" size={16} />}{rate !== original && <del>{original}×</del>}{group.subscription_type === "subscription" && <small>SUB</small>}<strong>{rate}×</strong></div></>;
}

export function GroupSelect({ value, groups = [], rates = {}, onChange, allowEmpty = false, compact = false }) {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const options = useMemo(() => allowEmpty ? [null, ...groups] : groups, [allowEmpty, groups]);
  const selected = groups.find((group) => optionValue(group) === String(value ?? "")) || null;
  const selectedValue = selected ? optionValue(selected) : allowEmpty ? "" : null;
  const searchableText = (group) => group ? `${group.name || ""} ${group.description || ""} ${group.platform || ""}` : optionLabel(group, locale);
  const triggerLabel = selected ? selected.name : locale === "zh" ? "选择分组" : "Select group";
  const select = (next) => {
    if (next === null || next === undefined) return;
    onChange(next);
    setQuery("");
  };
  return <div className={`console-group-select ${compact ? "is-compact" : ""}`}><Combobox items={options} value={selectedValue} onValueChange={select} inputValue={query} onInputValueChange={setQuery} itemToStringLabel={(group) => searchableText(group)} itemToStringValue={(group) => optionValue(group)} isItemEqualToValue={(group, next) => optionValue(group) === String(next ?? "")} filter={(group, search) => searchableText(group).toLowerCase().includes(String(search || "").toLowerCase())} size={compact ? "sm" : "md"} variant="outline" modal={false}><ComboboxInput className="console-group-trigger" aria-label={locale === "zh" ? "选择 API 分组" : "Choose API group"} placeholder={triggerLabel} startSlot={selected ? <GroupBadge name={selected.name} platform={selected.platform} detail={`${rateFor(selected, rates)}×`} originalDetail={Number(rateFor(selected, rates)) < Number(selected.original_rate_multiplier || selected.rate_multiplier || 1) ? `${Number(selected.original_rate_multiplier || selected.rate_multiplier || 1)}×` : undefined} /> : undefined} /><ComboboxContent className="console-group-menu"><ComboboxEmpty className="console-group-no-results">{locale === "zh" ? "没有匹配分组" : "No matching groups"}</ComboboxEmpty><ComboboxList>{(group) => <ComboboxItem value={group} className={`console-group-option ${optionValue(group) === String(selectedValue ?? "") ? "is-selected" : ""}`} key={optionValue(group) || "empty"}><OptionContent group={group} selected={optionValue(group) === String(selectedValue ?? "")} rates={rates} locale={locale} /></ComboboxItem>}</ComboboxList></ComboboxContent></Combobox></div>;
}
