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
        setSnapshot(schedule?.enabled && schedule?.show_announcement && Number.isFinite(serverNow) ? { ...schedule, serverNow } : null);
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
  const minute = new Date(now + 8 * 3600000).getUTCHours() * 60 + new Date(now + 8 * 3600000).getUTCMinutes();
  const startMinute = snapshot.start_minute ?? snapshot.start_hour * 60;
  const endMinute = snapshot.end_minute ?? snapshot.end_hour * 60;
  const active = startMinute < endMinute
    ? minute >= startMinute && minute < endMinute
    : minute >= startMinute || minute < endMinute;
  const shanghaiNow = now + 8 * 3600000;
  const targetMinute = active ? endMinute : startMinute;
  const remaining = (targetMinute * 60000 - shanghaiNow % 86400000 + 86400000) % 86400000;
  const seconds = Math.ceil(remaining / 1000);
  const countdown = [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map((value) => String(value).padStart(2, "0")).join(":");
  const copy = snapshot.countdown_copy?.[locale] || snapshot.countdown_copy?.zh;
  const label = copy?.[active ? "closing" : "opening"];
  if (!label) return null;
  const hours = `${String(Math.floor(startMinute / 60)).padStart(2, "0")}:${String(startMinute % 60).padStart(2, "0")}–${String(Math.floor(endMinute / 60)).padStart(2, "0")}:${String(endMinute % 60).padStart(2, "0")}`;
  return <div className="console-welfare-countdown" data-active={active} title={`${hours} · Asia/Shanghai`} role="timer" aria-label={`${label} ${countdown}`}>
    <span>{label}</span><strong>{countdown}</strong>
  </div>;
}
