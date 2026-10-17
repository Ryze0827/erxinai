import { useState } from "react";
import { promotionsApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale, translate } from "../i18n";
import { InlineButton } from "../UI";

export function CheckInButton() {
  const { locale, formatCurrency } = useLocale();
  const { notify, refreshUser } = useConsole();
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await promotionsApi.submitCheckIn();
      const streak = Number(result.streak) || 0;
      const rewarded = result.rewarded === true && Number(result.reward_amount) > 0;
      const reward = rewarded ? formatCurrency(result.reward_amount) : "";
      const messageKey = rewarded ? (result.created ? "checkIn.message.rewarded" : "checkIn.message.rewardCredited") : result.created ? "checkIn.message.noReward" : "checkIn.message.already";
      const message = translate(locale, messageKey, { count: streak, reward });
      notify("success", message);
      await Promise.allSettled([refreshUser()]);
    } catch (error) {
      notify("error", error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return <InlineButton variant="outline" className="console-header-link console-checkin-trigger" icon={submitting ? "refresh" : "calendar"} onClick={submit} disabled={submitting} aria-busy={submitting} title={translate(locale, "checkIn.dailyCheck")}>
    {(submitting ? translate(locale, "checkIn.checking") : translate(locale, "checkIn.check"))}
  </InlineButton>;
}
