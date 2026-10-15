import { useEffect, useState } from "react";
import { promotionsApi } from "../../api";
import { useLocale } from "../i18n";

export function WelfareScheduleCountdown() {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    let nextQuery = 0;
    let transition = Infinity;
    let receivedAt = performance.now();
    const load = async () => {
      if (loading || controller.signal.aborted) return;
      loading = true;
      try {
        const { schedule } = await promotionsApi.welfareSchedule(controller.signal);
        if (controller.signal.aborted) return;
        receivedAt = performance.now();
        const serverNow = Date.parse(schedule?.server_now);
        transition = Date.parse(schedule?.next_transition_at) - serverNow;
        setSnapshot(schedule?.enabled && Number.isFinite(serverNow) ? { ...schedule, serverNow } : null);
        setElapsed(0);
      } catch {
        if (!controller.signal.aborted) setSnapshot(null);
      } finally {
        loading = false;
        nextQuery = performance.now() + 60000;
      }
    };
    void load();
    const timer = window.setInterval(() => {
      const sinceReceived = performance.now() - receivedAt;
      setElapsed(sinceReceived);
      if (performance.now() >= nextQuery || sinceReceived >= transition) {
        transition = Infinity;
        void load();
      }
    }, 1000);
    const refresh = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  if (!snapshot) return null;
  const now = snapshot.serverNow + elapsed;
  const hour = new Date(now + 8 * 3600000).getUTCHours();
  const active = snapshot.start_hour < snapshot.end_hour
    ? hour >= snapshot.start_hour && hour < snapshot.end_hour
    : hour >= snapshot.start_hour || hour < snapshot.end_hour;
  const opening = Date.parse(snapshot.next_open_at);
  if (!Number.isFinite(opening)) return null;
  const seconds = Math.ceil(((opening - now) % 86400000 + 86400000) % 86400000 / 1000);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
  const english = locale === "en";
  const label = active ? (english ? "Welfare groups open" : "福利分组已开启") : (english ? "Welfare opens in" : "福利分组开启倒计时");
  const hours = `${String(snapshot.start_hour).padStart(2, "0")}:00–${String(snapshot.end_hour).padStart(2, "0")}:00`;
  return <div className="console-welfare-countdown" data-active={active} title={`${hours} · Asia/Shanghai`} role="timer" aria-label={active ? label : `${label} ${countdown}`}>
    <span>{label}</span>{!active && <strong>{countdown}</strong>}
  </div>;
}
