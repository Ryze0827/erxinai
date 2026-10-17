import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

const INITIAL_ROWS = 30;

// The console applies `zoom` to <html>; client rects are scaled, CSS lengths are not.
function rootScale() {
  const scale = Number.parseFloat(window.getComputedStyle(document.documentElement).zoom);
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

// Index of the row containing `position`, given prefix-sum offsets.
function rowAt(offsets, position) {
  let low = 0;
  let high = offsets.length - 2;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (offsets[middle] <= position) low = middle;
    else high = middle - 1;
  }
  return Math.max(low, 0);
}

/**
 * Windowed rendering for table rows scrolled by the page itself. Only rows near
 * the viewport are rendered; the rest are represented by top/bottom padding.
 * Row heights are measured after render and cached by row key.
 */
export function useWindowVirtualRows({ count, getKey, estimateSize = 68, overscan = 10 }) {
  const bodyRef = useRef(null);
  const sizesRef = useRef(new Map());
  const offsetsRef = useRef(null);
  const [measured, setMeasured] = useState(0);
  const [range, setRange] = useState(() => ({ start: 0, end: Math.min(count, INITIAL_ROWS) }));

  const offsets = useMemo(() => {
    const result = new Float64Array(count + 1);
    for (let index = 0; index < count; index += 1) result[index + 1] = result[index] + (sizesRef.current.get(getKey(index)) ?? estimateSize);
    return result;
  }, [count, estimateSize, getKey, measured]); // `measured` invalidates sizes read through the ref.

  const update = useCallback(() => {
    const body = bodyRef.current;
    const list = offsetsRef.current;
    if (!body || !list) return;
    const total = list.length - 1;
    if (!total) return;
    const scale = rootScale();
    const top = body.getBoundingClientRect().top / scale;
    const viewport = window.innerHeight / scale;
    const first = rowAt(list, Math.max(0, -top));
    const last = Math.min(total, rowAt(list, Math.max(0, viewport - top)) + 1);
    setRange((current) => {
      // Keep the current window while it still covers the viewport with half the
      // overscan to spare, so rows mount in batches instead of on every frame.
      const margin = overscan >> 1;
      const covered = current.start <= Math.max(0, first - margin) && current.end >= Math.min(total, last + margin);
      const compact = current.end - current.start <= last - first + overscan * 3;
      if (covered && compact && current.end <= total) return current;
      const next = { start: Math.max(0, first - overscan), end: Math.min(total, last + overscan) };
      return next.start === current.start && next.end === current.end ? current : next;
    });
  }, [overscan]);

  useLayoutEffect(() => {
    offsetsRef.current = offsets;
    update();
  }, [offsets, update]);

  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; update(); });
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [update]);

  const getKeyRef = useRef(getKey);
  const observerRef = useRef(null);

  // Cache row heights; only re-layout when a height differs from what the offsets assumed.
  const measure = useCallback((rows) => {
    const scale = rootScale();
    let changed = false;
    for (const row of rows) {
      if (!row.isConnected || row.dataset.index === undefined) continue;
      const key = getKeyRef.current(Number(row.dataset.index));
      const height = row.getBoundingClientRect().height / scale;
      const assumed = sizesRef.current.get(key) ?? estimateSize;
      const differs = Math.abs(assumed - height) > 0.5;
      if (differs || !sizesRef.current.has(key)) sizesRef.current.set(key, height);
      if (differs) changed = true;
    }
    if (changed) setMeasured((value) => value + 1);
  }, [estimateSize]);

  const measureRef = useRef(measure);
  useEffect(() => () => observerRef.current?.disconnect(), []);

  useLayoutEffect(() => {
    getKeyRef.current = getKey;
    measureRef.current = measure;
    const body = bodyRef.current;
    if (!body) return;
    const rows = [...body.children].filter((row) => row.dataset.index !== undefined);
    measure(rows);
    // Rows can also resize on their own (async cell content) outside these renders.
    if (!observerRef.current && typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver((entries) => measureRef.current(entries.map((entry) => entry.target)));
    }
    // Observe only mounted rows so unmounted ones are released.
    observerRef.current?.disconnect();
    rows.forEach((row) => observerRef.current?.observe(row));
  });

  const start = Math.min(range.start, count);
  const end = Math.min(range.end, count);
  return { bodyRef, start, end, paddingTop: offsets[start], paddingBottom: offsets[count] - offsets[end] };
}
