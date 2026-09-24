import test from "node:test";
import assert from "node:assert/strict";
import { today, currentMonth, monthRange, recentMonthsRange, isInMonth, productTotals, sumMoney, validMoney, safeUrl } from "../src/lib/finance.ts";

test("la fecha usa Ecuador aunque UTC ya esté en el día o mes siguiente", () => {
  const instant = new Date("2026-10-01T02:30:00Z");
  assert.equal(today(instant), "2026-09-30");
  assert.equal(currentMonth(instant), "2026-09");
});

test("rangos mensuales válidos para febrero, septiembre y cambio de año", () => {
  assert.deepEqual(monthRange("2024-02"), { start: "2024-02-01", end: "2024-03-01" });
  assert.deepEqual(monthRange("2026-09"), { start: "2026-09-01", end: "2026-10-01" });
  assert.deepEqual(monthRange("2026-12"), { start: "2026-12-01", end: "2027-01-01" });
  assert.throws(() => monthRange(""));
  assert.throws(() => monthRange("2026-13"));
});

test("el resumen mensual excluye meses posteriores y acepta el día bisiesto", () => {
  assert.equal(isInMonth("2024-02-29", "2024-02"), true);
  assert.equal(isInMonth("2024-03-01", "2024-02"), false);
  assert.equal(isInMonth("2024-01-31", "2024-02"), false);
});

test("el historial usa meses completos e incluye el mes actual una sola vez", () => {
  assert.deepEqual(recentMonthsRange(3, new Date("2026-01-31T15:00:00Z")), { start: "2025-11-01", end: "2026-02-01" });
  assert.deepEqual(recentMonthsRange(6, new Date("2026-09-24T15:00:00Z")), { start: "2026-04-01", end: "2026-10-01" });
  assert.throws(() => recentMonthsRange(0));
});

test("el descuento o sobreprecio de una compra no cambia lo pendiente", () => {
  const products = [
    { quantity: 1, estimated_price: 100, paid_price: 80, bought: true },
    { quantity: 2, estimated_price: 30, paid_price: null, bought: false },
  ];
  assert.deepEqual(productTotals(products), { estimated: 160, spent: 80, pending: 60 });
  products[0].paid_price = 200;
  assert.equal(productTotals(products).pending, 60);
});

test("productos gratuitos y sin productos conservan totales correctos", () => {
  assert.deepEqual(productTotals([]), { estimated: 0, spent: 0, pending: 0 });
  assert.equal(productTotals([{ quantity: 2, estimated_price: 15, paid_price: 0, bought: true }]).spent, 0);
});

test("sumas monetarias en centavos y validación de montos", () => {
  assert.equal(sumMoney([0.1, 0.2], n => n), 0.3);
  assert.equal(validMoney(0), true);
  assert.equal(validMoney(0, true), false);
  assert.equal(validMoney(-1), false);
  assert.equal(validMoney(NaN), false);
  assert.equal(validMoney(Infinity), false);
});

test("los enlaces externos solo permiten HTTP y HTTPS", () => {
  assert.equal(safeUrl("https://example.com/producto"), "https://example.com/producto");
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("data:text/html,test"), undefined);
  assert.equal(safeUrl(""), undefined);
});
