export const NATIVE_CUSTOM_PAGE = {
  imageStudio: "image-studio",
  imageDocs: "image-api-docs",
};

const nativePaths = {
  [NATIVE_CUSTOM_PAGE.imageStudio]: ["/image-studio", "/tools/image-studio-go.html", "/image-studio-go.html"],
  [NATIVE_CUSTOM_PAGE.imageDocs]: ["/image-api-docs", "/tools/image-studio/docs", "/image-studio/docs"],
};

const nativeRoutes = {
  [NATIVE_CUSTOM_PAGE.imageStudio]: "/image-studio",
  [NATIVE_CUSTOM_PAGE.imageDocs]: "/image-api-docs",
};

export function nativeCustomPageKind(item) {
  try {
    const pathname = new URL(String(item?.url || ""), "https://local.invalid").pathname.toLowerCase().replace(/\/+$/, "");
    return Object.entries(nativePaths).find(([, paths]) => paths.some((path) => pathname.endsWith(path)))?.[0] || "";
  } catch {
    return "";
  }
}

export function nativeCustomPageRoute(kind) {
  return nativeRoutes[kind] || "";
}

export function nativeCustomPageIcon(kind) {
  if (kind === NATIVE_CUSTOM_PAGE.imageStudio) return "image";
  if (kind === NATIVE_CUSTOM_PAGE.imageDocs) return "book";
  return "link";
}
