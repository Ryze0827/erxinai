import assert from "node:assert/strict";
import { test } from "node:test";
import { priceEntries } from "../modelPlazaPricing.js";

const pricing = { input_price: 3, output_price: 15, cache_read_price: 0.3 };

test("a discounted rate keeps the pre-rate price as the struck-through original", () => {
  const entries = priceEntries(pricing, { rate: 0.5 });
  assert.deepEqual(entries.map(({ field, value, original }) => [field, value, original]), [
    ["input_price", 1.5, 3],
    ["output_price", 7.5, 15],
    ["cache_read_price", 0.15, 0.3],
  ]);
});

test("rates of 1 or above do not strike anything through", () => {
  for (const rate of [1, 1.5]) {
    for (const entry of priceEntries(pricing, { rate })) assert.equal(entry.original, null);
  }
  assert.equal(priceEntries(pricing, { rate: 1.5 })[0].value, 4.5);
});

test("a zero rate is a full discount, not a missing price", () => {
  const [input] = priceEntries(pricing, { rate: 0 });
  assert.equal(input.value, 0);
  assert.equal(input.original, 3);
});

test("rate defaults to 1 and tier multipliers apply before the rate", () => {
  assert.equal(priceEntries(pricing)[0].original, null);
  const [input] = priceEntries(pricing, { rate: 0.5, tier: { input_multiplier: 2 } });
  assert.equal(input.value, 3);
  assert.equal(input.original, 6);
});

test("absent price fields are skipped", () => {
  assert.deepEqual(priceEntries({ per_request_price: 0.04 }, { rate: 0.5 }).map((entry) => entry.field), ["per_request_price"]);
});
