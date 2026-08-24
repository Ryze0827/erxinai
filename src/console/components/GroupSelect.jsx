import { Select } from "@appica/ui-react/select";
import { SelectContent } from "@appica/ui-react/select";
import { SelectItem } from "@appica/ui-react/select";
import { SelectTrigger } from "@appica/ui-react/select";
import { SelectValue } from "@appica/ui-react/select";
import { GroupBadge } from "../GroupBadge";
import { useLocale } from "../i18n";

function rateFor(group, rates) {
  const custom = rates?.[group.id] ?? rates?.[String(group.id)];
  return custom?.rate_multiplier ?? custom?.multiplier ?? custom ?? group.rate_multiplier ?? 1;
}

function optionValue(group) {
  return group ? String(group.id) : "";
}

const EMPTY_OPTION_VALUE = "__empty_group__";

function selectValue(group) {
  return group ? optionValue(group) : EMPTY_OPTION_VALUE;
}

function optionLabel(group, locale) {
  return group?.name || (locale === "zh" ? "不指定分组" : "No group");
}

function OptionContent({ group, rates, locale }) {
  if (!group) return <span>{optionLabel(group, locale)}</span>;
  const rate = rateFor(group, rates);
  const original = Number(group.rate_multiplier || 1);
  return <div className="console-group-option-content"><div className="console-group-option-identity"><GroupBadge name={group.name} platform={group.platform} />{group.description && <p>{group.description}</p>}</div><div className="console-group-rates">{rate !== original && <del>{original}×</del>}{group.subscription_type === "subscription" && <small>SUB</small>}<strong>{rate}×</strong></div></div>;
}

export function GroupSelect({ value, groups = [], rates = {}, onChange, allowEmpty = false, compact = false }) {
  const { locale } = useLocale();
  const options = allowEmpty ? [null, ...groups] : groups;
  const selected = groups.find((group) => optionValue(group) === String(value ?? "")) || null;
  const triggerLabel = selected ? selected.name : locale === "zh" ? "选择分组" : "Select group";
  const select = (next) => {
    if (next === null || next === undefined) return;
    onChange(next === EMPTY_OPTION_VALUE ? "" : String(next));
  };
  const selectedValue = selected ? optionValue(selected) : allowEmpty && String(value ?? "") === "" ? EMPTY_OPTION_VALUE : null;
  return <div className={`console-group-select ${compact ? "is-compact" : ""}`}><Select value={selectedValue} onValueChange={select} size={compact ? "sm" : "md"} variant="outline" alignItemWithTrigger={false}><SelectTrigger className="console-group-trigger" aria-label={locale === "zh" ? "选择 API 分组" : "Choose API group"}><SelectValue placeholder={triggerLabel}>{selected ? <GroupBadge name={selected.name} platform={selected.platform} detail={`${rateFor(selected, rates)}×`} originalDetail={Number(rateFor(selected, rates)) < Number(selected.original_rate_multiplier || selected.rate_multiplier || 1) ? `${Number(selected.original_rate_multiplier || selected.rate_multiplier || 1)}×` : undefined} /> : allowEmpty && selectedValue === EMPTY_OPTION_VALUE ? optionLabel(null, locale) : triggerLabel}</SelectValue></SelectTrigger><SelectContent>{options.map((group) => <SelectItem className="console-group-option" value={selectValue(group)} key={optionValue(group) || "empty"}><OptionContent group={group} rates={rates} locale={locale} /></SelectItem>)}</SelectContent></Select></div>;
}
