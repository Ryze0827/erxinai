import React, { useLayoutEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { QuietDashboard } from "./QuietDashboard.jsx";
import { DenseDashboard } from "./DenseDashboard.jsx";
import { EditorialDashboard } from "./EditorialDashboard.jsx";
import "./prototype.css";

const variants = [
  { name: "Quiet", component: QuietDashboard },
  { name: "Dense", component: DenseDashboard },
  { name: "Editorial", component: EditorialDashboard },
];

function initialVariant() {
  const selected = Number.parseInt(new URLSearchParams(window.location.search).get("v"), 10) || 1;
  return Math.max(0, Math.min(variants.length - 1, selected - 1));
}

function PrototypeHarness() {
  const [current, setCurrent] = useState(initialVariant);
  const [mountKey, setMountKey] = useState(0);
  const pickerRef = useRef(null);
  const itemRefs = useRef([]);
  const highlightRef = useRef(null);
  const Variant = variants[current].component;

  const moveHighlight = () => {
    const item = itemRefs.current[current];
    const highlight = highlightRef.current;
    if (!item || !highlight) return;
    highlight.style.width = `${item.offsetWidth}px`;
    highlight.style.transform = `translateX(${item.offsetLeft}px)`;
  };

  useLayoutEffect(() => {
    moveHighlight();
    const readyFrame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => pickerRef.current?.setAttribute("data-ready", ""));
    });
    window.addEventListener("resize", moveHighlight);
    return () => {
      window.cancelAnimationFrame(readyFrame);
      window.removeEventListener("resize", moveHighlight);
    };
  }, [current]);

  const setActive = (index) => {
    if (index < 0 || index >= variants.length) return;
    setCurrent(index);
    setMountKey((key) => key + 1);
    const url = new URL(window.location.href);
    url.searchParams.set("v", String(index + 1));
    window.history.replaceState(null, "", url);
  };

  React.useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = event.target?.tagName;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tagName) || event.target?.isContentEditable) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const number = Number.parseInt(event.key, 10);
      if (number >= 1 && number <= variants.length) setActive(number - 1);
      else if (event.key === "ArrowRight") setActive((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") setActive((current - 1 + variants.length) % variants.length);
      else if (event.key === "r" || event.key === "R") setMountKey((key) => key + 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [current]);

  return (
    <>
      <div id="stage"><Variant key={`${current}-${mountKey}`} /></div>
      <nav className="proto-picker" aria-label="Prototype variants" ref={pickerRef}>
        <span className="proto-picker-highlight" aria-hidden="true" ref={highlightRef} />
        {variants.map((variant, index) => (
          <button
            className="proto-picker-item"
            data-active={index === current || undefined}
            aria-current={index === current ? "true" : undefined}
            type="button"
            key={variant.name}
            ref={(node) => { itemRefs.current[index] = node; }}
            onClick={() => setActive(index)}
          >
            {variant.name}
          </button>
        ))}
      </nav>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PrototypeHarness />
  </React.StrictMode>,
);
