import { gatewayRequest } from "./client";

export const batchImagesApi = {
  submit: (apiKey, body, idempotencyKey) => gatewayRequest("/v1/images/batches", {
    method: "POST",
    apiKey,
    body,
    headers: { "Idempotency-Key": idempotencyKey },
  }),
  list: (apiKey, query = {}, signal) => gatewayRequest("/v1/images/batches", { apiKey, query, signal }),
  models: (apiKey) => gatewayRequest("/v1/images/batches/models", { apiKey }),
  get: (apiKey, id) => gatewayRequest(`/v1/images/batches/${encodeURIComponent(id)}`, { apiKey }),
  items: (apiKey, id, status = "") => gatewayRequest(`/v1/images/batches/${encodeURIComponent(id)}/items`, {
    apiKey,
    query: { status },
  }),
  itemContent: (apiKey, id, customId, imageIndex = 0) => gatewayRequest(`/v1/images/batches/${encodeURIComponent(id)}/items/${encodeURIComponent(customId)}/content`, {
    apiKey,
    query: { image_index: imageIndex },
    responseType: "blob",
  }),
  cancel: (apiKey, id) => gatewayRequest(`/v1/images/batches/${encodeURIComponent(id)}/cancel`, { method: "POST", apiKey }),
  download: (apiKey, id) => gatewayRequest(`/v1/images/batches/${encodeURIComponent(id)}/download`, { apiKey, responseType: "blob" }),
  remove: (apiKey, id) => gatewayRequest(`/v1/images/batches/${encodeURIComponent(id)}`, { method: "DELETE", apiKey }),
};
