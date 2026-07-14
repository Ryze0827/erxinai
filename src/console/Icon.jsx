const paths = {
  dashboard: "M4 13h6V4H4v9Zm10 7h6V11h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z",
  key: "M15.5 7.5a4.5 4.5 0 1 1-3.72 7.03L4 22H2v-3l7.47-7.78A4.5 4.5 0 0 1 15.5 7.5Zm0 3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  chart: "M4 20V10m5 10V4m6 16v-7m5 7V7",
  image: "M4 5h16v14H4V5Zm3 10 3-3 2.5 2.5L15 12l3 3M8 9h.01",
  channel: "M5 18a7 7 0 0 1 14 0M8 18a4 4 0 0 1 8 0m-4 0h.01M4 8a12 12 0 0 1 16 0",
  pulse: "M3 12h4l2.5-7 5 14 2.5-7h4",
  card: "M3 6h18v12H3V6Zm0 4h18",
  cart: "M4 5h2l2 10h9l2-7H7m3 11h.01M17 19h.01",
  order: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6",
  gift: "M4 10h16v10H4V10Zm-1-4h18v4H3V6Zm9 14V6m0 0H8.5A2.5 2.5 0 1 1 12 6Zm0 0h3.5A2.5 2.5 0 1 0 12 6Z",
  users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 0 1 3 3v1m-4-10a3 3 0 0 1 0 6",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  home: "m3 11 9-8 9 8v10h-6v-6H9v6H3V11Z",
  book: "M4 4h6a2 2 0 0 1 2 2v15a3 3 0 0 0-3-3H4V4Zm16 0h-6a2 2 0 0 0-2 2v15a3 3 0 0 1 3-3h5V4Z",
  logout: "M10 4H5v16h5m5-4 4-4-4-4m4 4H9",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "m6 6 12 12M18 6 6 18",
  chevronRight: "m9 5 7 7-7 7",
  chevronDown: "m5 9 7 7 7-7",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 13h4",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-20c3 3 3 17 0 20m0-20c-3 3-3 17 0 20M2 12h20",
  search: "m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  plus: "M12 5v14M5 12h14",
  edit: "m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20Zm9.5-13.5L17 10",
  trash: "M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6",
  copy: "M8 8h11v11H8V8Zm-3 8H4V4h12v1",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "m3 3 18 18M10.6 6.2A12 12 0 0 1 12 6c6.5 0 10 6 10 6a15 15 0 0 1-3.1 3.8M6.6 6.6C3.7 8.3 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3.4-.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  check: "m5 12 4 4L19 6",
  warning: "M12 3 2 21h20L12 3Zm0 6v5m0 3h.01",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-11v6m0-10h.01",
  external: "M14 4h6v6m0-6-9 9M19 13v7H4V5h7",
  download: "M12 3v12m-5-5 5 5 5-5M4 21h16",
  play: "m8 5 11 7-11 7V5Z",
  shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-10 2 2 4-5",
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  link: "M10 14a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.1 1.1m2.6 3.4a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  filter: "M4 5h16l-6 7v5l-4 2v-7L4 5Z",
  dollar: "M12 2v20m5-16H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-15v5l3 2",
};

export function Icon({ name, size = 20, className = "" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name] || paths.info} />
    </svg>
  );
}
