import { gatewayRequest } from "./client";

export const IMAGE_GATEWAY_BASE_URL = String(import.meta.env.VITE_IMAGE_GATEWAY_BASE_URL || "https://image.aiwayxx.com").replace(/\/+$/, "");

const IMAGE_TIMEOUT_MS = 300_000;

function imageEndpoint(path) {
  return `${IMAGE_GATEWAY_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function splitDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid reference image data.");
  return { mimeType: match[1], base64: match[2] };
}

function dataUrlToFile(dataUrl, fileName) {
  const { mimeType, base64 } = splitDataUrl(dataUrl);
  const bytes = atob(base64);
  const buffer = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) buffer[index] = bytes.charCodeAt(index);
  return new File([buffer], fileName, { type: mimeType });
}

function geminiRequest(prompt, size, aspectRatio, references) {
  const parts = [{ text: prompt }];
  for (const item of references) {
    const reference = splitDataUrl(item.dataUrl);
    parts.push({ inlineData: { mimeType: reference.mimeType, data: reference.base64 } });
  }
  return {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: aspectRatio && aspectRatio !== "auto" ? aspectRatio : "1:1", imageSize: size || "1K" },
    },
  };
}

function appendOpenAIReferences(formData, references) {
  const field = references.length > 1 ? "image[]" : "image";
  references.forEach((reference, index) => {
    const name = reference.file?.name || `reference-${index + 1}.png`;
    const file = reference.file || dataUrlToFile(reference.dataUrl, name);
    formData.append(field, file, name);
  });
}

function openAIResult(response) {
  const images = Array.isArray(response?.data) ? response.data.map((item) => {
    if (item?.b64_json) return { url: `data:image/png;base64,${item.b64_json}`, mimeType: "image/png" };
    if (item?.url) return { url: item.url, mimeType: "image/*" };
    return null;
  }).filter(Boolean) : [];
  return { text: "", images };
}

function geminiResult(response) {
  const images = [];
  const text = [];
  for (const candidate of Array.isArray(response?.candidates) ? response.candidates : []) {
    for (const part of Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []) {
      if (typeof part?.text === "string" && part.text.trim()) text.push(part.text.trim());
      if (part?.inlineData?.mimeType && part.inlineData?.data) {
        images.push({ url: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, mimeType: part.inlineData.mimeType });
      }
    }
  }
  return { text: text.join("\n"), images };
}

async function generateOpenAI(options) {
  const references = Array.isArray(options.references) ? options.references : [];
  if (references.length) {
    const formData = new FormData();
    formData.append("model", options.model);
    formData.append("prompt", options.prompt);
    formData.append("n", String(options.count));
    formData.append("size", options.size);
    appendOpenAIReferences(formData, references);
    const response = await gatewayRequest(imageEndpoint("/v1/images/edits"), { method: "POST", apiKey: options.apiKey, body: formData, signal: options.signal, timeoutMs: IMAGE_TIMEOUT_MS });
    return openAIResult(response);
  }
  const response = await gatewayRequest(imageEndpoint("/v1/images/generations"), {
    method: "POST",
    apiKey: options.apiKey,
    body: { model: options.model, prompt: options.prompt, n: options.count, size: options.size },
    signal: options.signal,
    timeoutMs: IMAGE_TIMEOUT_MS,
  });
  return openAIResult(response);
}

async function generateGemini(options) {
  const prefix = options.platform === "antigravity" ? "/antigravity/v1beta/models/" : "/v1beta/models/";
  const model = String(options.model || "").replace(/^models\//, "");
  const response = await gatewayRequest(imageEndpoint(`${prefix}${encodeURIComponent(model)}:generateContent`), {
    method: "POST",
    apiKey: options.apiKey,
    body: geminiRequest(options.prompt, options.size, options.aspectRatio, Array.isArray(options.references) ? options.references : []),
    signal: options.signal,
    timeoutMs: IMAGE_TIMEOUT_MS,
  });
  return geminiResult(response);
}

export const imageGenerationApi = {
  generate: (options) => options.platform === "openai" ? generateOpenAI(options) : generateGemini(options),
};
