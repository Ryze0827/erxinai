import assert from "node:assert/strict";
import { test } from "node:test";
import { invoiceShortfall, MIN_INVOICE_AMOUNT } from "../invoiceRules.js";

test("invoiceShortfall reports how much is still needed", () => {
  assert.equal(MIN_INVOICE_AMOUNT, 300);
  assert.equal(invoiceShortfall(0), 300);
  assert.equal(invoiceShortfall(undefined), 300);
  assert.equal(invoiceShortfall(299.99), 0.01);
});

test("invoiceShortfall is zero at or above the minimum", () => {
  assert.equal(invoiceShortfall(300), 0);
  assert.equal(invoiceShortfall(450.5), 0);
});

test("invoiceShortfall ignores floating-point drift in order sums", () => {
  assert.equal(invoiceShortfall(299.7 + 0.1 + 0.2), 0);
});
