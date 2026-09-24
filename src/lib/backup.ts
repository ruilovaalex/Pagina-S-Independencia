import { getSupabase } from "./supabase";
import { today } from "./finance";

export async function downloadBackup(userId: string) {
  const tables = ["products", "expenses", "incomes", "stores", "price_searches", "app_settings", "profiles"];
  const entries = await Promise.all(tables.map(async table => {
    const rows: Record<string, unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await getSupabase().from(table).select("*")
        .eq(table === "profiles" ? "id" : "user_id", userId).order("id").range(from, from + 999);
      if (error) throw error;
      rows.push(...data);
      if (data.length < 1000) break;
    }
    return [table, rows] as const;
  }));
  const blob = new Blob([JSON.stringify({
    version: 1, exported_at: new Date().toISOString(), tables: Object.fromEntries(entries),
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mi-independencia-${today()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
