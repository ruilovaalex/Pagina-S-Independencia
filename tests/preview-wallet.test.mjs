import test from 'node:test';
import assert from 'node:assert/strict';
import { availableCash, homeExpenses } from '../src/lib/preview-wallet.ts';

const wallet = { opening: 100, budget: 1500, incomes: [{amount: 25.10}], expenses: [{amount: 10.05}] };
const product = { id: 'fridge', bought: false, estimated_price: 80, paid_price: null, quantity: 2, name: 'Refrigeradora', category: 'Electrodomésticos', notes: '', created_at: '2026-10-06T12:00:00' };
test('añadir un pendiente no resta saldo; comprar descuenta el precio real por cantidad una sola vez', () => {
  assert.equal(availableCash(wallet, [product]), 115.05);
  const bought = { ...product, bought: true, paid_price: 75.50 };
  assert.equal(availableCash(wallet, [bought]), -35.95);
  assert.equal(homeExpenses([bought]).length, 1);
  assert.equal(homeExpenses([bought])[0].amount, 151);
});
test('editar o anular una compra recalcula el mismo saldo y la meta no mueve dinero', () => {
  assert.equal(availableCash(wallet, [{ ...product, bought: true, paid_price: 20 }]), 75.05);
  assert.equal(availableCash({ ...wallet, budget: 9000 }, [product]), 115.05);
  assert.equal(availableCash({ ...wallet, opening: 0 }, [product]), 15.05);
});
