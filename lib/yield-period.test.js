import test from "node:test";
import assert from "node:assert/strict";

import {
  extractAkershusPeriod,
  extractUnionPeriod,
  normaliseYieldPeriod,
  periodFromNewsecDocument,
} from "./yield-period.js";

test("normalises UNION month and adds the current year", () => {
  assert.equal(normaliseYieldPeriod("mai", new Date("2026-06-18T12:00:00Z")), "mai 2026");
});

test("uses the previous year for December when fetched in January", () => {
  assert.equal(normaliseYieldPeriod("desember", new Date("2027-01-05T12:00:00Z")), "desember 2026");
});

test("extracts the quarter from the Newsec document name", () => {
  assert.equal(periodFromNewsecDocument("Yieldtabell Q2-2026"), "Q2 2026");
});

test("extracts UNION's period when the source ends it with a period", () => {
  const source = "Prime yield 4,75 % Kilde: UNION per mai. Sekundær yield 6,50 %";
  assert.equal(extractUnionPeriod(source, new Date("2026-06-18T12:00:00Z")), "mai 2026");
});

test("extracts Akershus' as-of month from the page", () => {
  assert.equal(extractAkershusPeriod("Nokkeltall  Per juni 2026  Kontor"), "juni 2026");
});
