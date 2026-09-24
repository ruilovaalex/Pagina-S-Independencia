import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("la migración impide leer o modificar datos ajenos y bloquea visitantes", async () => {
  const db = new PGlite();
  const owner = "00000000-0000-0000-0000-000000000001";
  const other = "00000000-0000-0000-0000-000000000002";
  try {
    // Reproduce los roles y auth.uid() de Supabase sin conectar a datos reales.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to authenticated;
      insert into auth.users values ('${owner}'), ('${other}');
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/202609240001_initial_schema.sql", import.meta.url), "utf8"));
    const fixtures = {
      products: { name: "Refrigeradora", estimated_price: 100 },
      expenses: { description: "Mercado", amount: 20 },
      incomes: { description: "Salario", amount: 100 },
      stores: { name: "Tienda" },
      price_searches: { product_name: "Horno", price: 40 },
      app_settings: { total_budget: 1500 },
      profiles: { full_name: "Cuenta de prueba" },
    };
    for (const [table, values] of Object.entries(fixtures)) {
      const column = table === "profiles" ? "id" : "user_id";
      const fields = [column, ...Object.keys(values)];
      const params = fields.map((_, i) => `$${i + 1}`).join(", ");
      for (const user of [owner, other]) {
        await db.query(`insert into public.${table} (${fields.join(", ")}) values (${params})`, [user, ...Object.values(values)]);
      }
    }
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);
    await db.exec("set role authenticated");
    for (const table of Object.keys(fixtures)) {
      const column = table === "profiles" ? "id" : "user_id";
      const { rows } = await db.query(`select ${column} from public.${table}`);
      assert.deepEqual(rows, [{ [column]: owner }], `${table}: solo se ve la fila propia`);
      const deleted = await db.query(`delete from public.${table} where ${column} = $1 returning *`, [other]);
      assert.equal(deleted.rows.length, 0, `${table}: no se elimina la fila ajena`);
    }
    await assert.rejects(db.query("insert into public.expenses(user_id, description, amount) values ($1, 'Ajeno', 10)", [other]), error => error.code === "42501");
    await assert.rejects(db.query("update public.products set user_id = $1", [other]), error => error.code === "42501");
    assert.equal((await db.query("update public.products set name = 'Mío' returning name")).rows[0].name, "Mío");
    await assert.rejects(db.query("insert into public.expenses(description, amount) values ('Inválido', -1)"), error => error.code === "23514");
    await assert.rejects(db.query("insert into public.products(name, quantity) values ('Inválido', 0)"), error => error.code === "23514");
    await db.exec("reset role; set role anon");
    for (const table of Object.keys(fixtures)) {
      await assert.rejects(db.query(`select * from public.${table}`), error => error.code === "42501");
    }
  } finally { await db.close(); }
});
