import { useEffect, useRef } from "react";
import { BackgroundPattern } from "@appica/ui-react/background-pattern";

export function ConsoleBackgroundPattern({ track = "self", ...props }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const highlight = host?.querySelector(':scope > [data-slot="background-pattern-highlight"]');
    if (!host || !highlight) return undefined;

    const target = track === "window" ? window : host;
    let frame = 0;
    let clientX = 0;
    let clientY = 0;

    const updatePosition = () => {
      frame = 0;
      const rect = host.getBoundingClientRect();
      const scale = Number.parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
      highlight.style.setProperty("--pattern-x", `${(clientX - rect.left) / scale}px`);
      highlight.style.setProperty("--pattern-y", `${(clientY - rect.top) / scale}px`);
    };

    const handlePointerMove = (event) => {
      clientX = event.clientX;
      clientY = event.clientY;
      if (!frame) frame = requestAnimationFrame(updatePosition);
    };

    target.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      target.removeEventListener("pointermove", handlePointerMove);
    };
  }, [track]);

  return <BackgroundPattern {...props} ref={hostRef} track={track} />;
}
