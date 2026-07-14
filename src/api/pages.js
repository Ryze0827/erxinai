import { apiRequest, buildApiUrl } from "./client";

export const pagesApi = {
  markdown: (slug, signal) => apiRequest(`/pages/${encodeURIComponent(slug)}`, { responseType: "text", signal }),
  imageUrl: (slug, path) => buildApiUrl(`/pages/${encodeURIComponent(slug)}/images/${path}`),
};
