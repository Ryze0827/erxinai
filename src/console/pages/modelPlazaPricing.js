export function modelRate(group, model) {
  const mode = model.pricing?.billing_mode;
  if (mode === "image" && group.image_rate_independent) return group.image_rate_multiplier ?? 1;
  if (mode === "video" && group.video_rate_independent) return group.video_rate_multiplier ?? 1;
  return group.user_rate_multiplier ?? group.rate_multiplier ?? 1;
}

export function pricingRows(pricing, tier = null) {
  const fields = ["input_price", "output_price", "cache_write_price", "cache_write_1h_price", "cache_read_price", "image_input_price", "image_output_price", "per_request_price"];
  return fields.flatMap((field) => {
    const multiplier = tier?.[field.replace("_price", "_multiplier")];
    const value = tier?.[field] ?? (multiplier != null && pricing[field] != null ? pricing[field] * multiplier : pricing[field]);
    return value == null ? [] : [[field, value]];
  });
}
