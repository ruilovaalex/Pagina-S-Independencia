import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import AuthScreen from "./components/AuthScreen";
import { today, currentMonth, monthRange, recentMonthsRange, isInMonth, sumMoney, productTotals, validMoney, safeUrl, errorMessage } from "../lib/finance";
import { downloadBackup } from "../lib/backup";
import {
  LayoutDashboard, Package, Store, Search, Plus, Pencil, Trash2,
  ExternalLink, X, ChevronUp, ChevronDown, ChevronsUpDown,
  MapPin, Globe, LogOut, DollarSign, TrendingUp, TrendingDown,
  ShoppingBag, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
  Wallet, PiggyBank, BarChart3, Calendar, Heart, Download,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
import type { Priority, AppTab, SortDir, Product, StoreRecord, Expense, Income, PriceSearch } from "./types";

// ─── Constants ────────────────────────────────────────────────────────────────
const INITIAL_PRODUCTS: Omit<Product, "id" | "user_id" | "created_at">[] = [
  { name: "Refrigeradora",    category: "Cocina",          priority: "P1", quantity: 1, estimated_price: 400, paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Mini horno",       category: "Cocina",          priority: "P1", quantity: 1, estimated_price: 45,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Cocina 1 hornilla",category: "Cocina",          priority: "P1", quantity: 1, estimated_price: 30,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Licuadora",        category: "Cocina",          priority: "P1", quantity: 1, estimated_price: 35,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Lavadora",         category: "Ropa",            priority: "P2", quantity: 1, estimated_price: 350, paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Ventilador",       category: "Clima",           priority: "P2", quantity: 1, estimated_price: 40,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Microondas",       category: "Cocina",          priority: "P3", quantity: 1, estimated_price: 100, paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Freidora de aire", category: "Cocina",          priority: "P3", quantity: 1, estimated_price: 80,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Arrocera",         category: "Cocina",          priority: "P3", quantity: 1, estimated_price: 40,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Cafetera",         category: "Cocina",          priority: "P3", quantity: 1, estimated_price: 40,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Hervidor",         category: "Cocina",          priority: "P3", quantity: 1, estimated_price: 30,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "Aspiradora",       category: "Limpieza",        priority: "P3", quantity: 1, estimated_price: 80,  paid_price: null, bought: false, store: "", link: "", notes: "" },
  { name: "TV",               category: "Entretenimiento", priority: "P3", quantity: 1, estimated_price: 200, paid_price: null, bought: false, store: "", link: "", notes: "" },
];

const PRODUCT_CATEGORIES = ["Cocina", "Ropa", "Clima", "Limpieza", "Entretenimiento", "Baño", "Muebles", "Tecnología", "Otro"];
const EXPENSE_CATEGORIES = ["Alimentación", "Transporte", "Arriendo", "Servicios", "Salud", "Educación", "Entretenimiento", "Ropa", "Otro"];
const INCOME_SOURCES = ["Salario", "Freelance", "Bono", "Regalo", "Inversión", "Otro"];

const P_CFG: Record<Priority, { label: string; emoji: string; pill: string }> = {
  P1: { label: "Indispensable", emoji: "🔴", pill: "text-red-700 bg-red-50 border-red-200" },
  P2: { label: "Importante",    emoji: "🟡", pill: "text-amber-700 bg-amber-50 border-amber-200" },
  P3: { label: "Postergable",   emoji: "🟢", pill: "text-emerald-700 bg-emerald-50 border-emerald-200" },
};

// ─── Utils ────────────────────────────────────────────────────────────────────
const $$ = (n: number) => "$" + n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: Priority }) {
  const c = P_CFG[p];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border font-mono leading-none ${c.pill}`}>
      {c.emoji} {p}
    </span>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
        {icon && <span className="text-muted-foreground/40">{icon}</span>}
      </div>
      <span className={`text-xl sm:text-2xl font-semibold font-mono tracking-tight leading-none ${color ?? "text-foreground"}`}>{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-sm font-mono font-semibold text-primary">{value.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{msg}</span>
    </div>
  );
}

function DeleteModal({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-1">Confirmar eliminación</h3>
            <p className="text-sm text-muted-foreground">¿Eliminar <span className="font-medium text-foreground">&ldquo;{name}&rdquo;</span>? Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow";
const monoInputCls = inputCls + " font-mono";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardView({ userId }: { userId: string }) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [incomes, setIncomes]     = useState<Income[]>([]);
  const [budget, setBudget]       = useState(1500);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { start, end } = monthRange(currentMonth());
      const [pr, ex, inc, cfg] = await Promise.all([
        getSupabase().from("products").select("*").eq("user_id", userId).order("priority"),
        getSupabase().from("expenses").select("*").eq("user_id", userId).gte("date", start).lt("date", end),
        getSupabase().from("incomes").select("*").eq("user_id", userId).gte("date", start).lt("date", end),
        getSupabase().from("app_settings").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      const loadError = pr.error ?? ex.error ?? inc.error ?? cfg.error;
      setError(loadError ? errorMessage(loadError) : "");
      setProducts((pr.data as Product[]) ?? []);
      setExpenses((ex.data as Expense[]) ?? []);
      setIncomes((inc.data as Income[]) ?? []);
      if (cfg.data?.total_budget != null) setBudget(cfg.data.total_budget);
      setLoading(false);
    }
    load();
  }, [userId]);

  const { estimated: totalEstimated, spent: totalSpent, pending: totalPending } = productTotals(products);
  const boughtCount     = products.filter(p => p.bought).length;
  const progress        = products.length > 0 ? (boughtCount / products.length) * 100 : 0;
  const totalExpenses   = sumMoney(expenses, e => e.amount);
  const totalIncomes    = sumMoney(incomes, i => i.amount);
  const balance         = Math.round((totalIncomes - totalExpenses) * 100) / 100;

  const byPriority = (["P1", "P2", "P3"] as Priority[]).map(pr => {
    const ps = products.filter(p => p.priority === pr);
    return {
      priority: pr,
      count: ps.length,
      bought: ps.filter(p => p.bought).length,
      estimated: ps.reduce((s, p) => s + p.quantity * p.estimated_price, 0),
      spent: ps.filter(p => p.bought).reduce((s, p) => s + p.quantity * (p.paid_price ?? p.estimated_price), 0),
      pending: ps.filter(p => !p.bought).reduce((s, p) => s + p.quantity * p.estimated_price, 0),
    };
  });

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {error && <ErrBox msg={error} />}

      {/* Electrodomésticos stats */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Electrodomésticos</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label="Presupuesto total" value={$$(totalEstimated)} sub="Suma estimada" icon={<ShoppingBag className="w-4 h-4" />} />
          <StatCard label="Total gastado" value={$$(totalSpent)} sub="Productos comprados" color="text-emerald-600" icon={<CheckCircle2 className="w-4 h-4" />} />
          <StatCard label="Pendiente" value={$$(totalPending)} sub="Por adquirir" color="text-amber-600" icon={<Package className="w-4 h-4" />} />
          <StatCard label="Comprados" value={`${boughtCount} / ${products.length}`} sub="electrodomésticos" color="text-emerald-600" />
          <StatCard label="Pendientes" value={`${products.length - boughtCount}`} sub="sin comprar" color="text-amber-600" />
          <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            <ProgressBar value={progress} label="Progreso" />
            <span className="text-xs text-muted-foreground font-mono">{boughtCount} de {products.length} adquiridos</span>
          </div>
        </div>
      </div>

      {/* Finanzas del mes */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Finanzas — {new Date().toLocaleDateString("es-EC", { month: "long", year: "numeric" })}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Ingresos del mes" value={$$(totalIncomes)} color="text-emerald-600" icon={<TrendingUp className="w-4 h-4" />} />
          <StatCard label="Gastos del mes" value={$$(totalExpenses)} color="text-red-500" icon={<TrendingDown className="w-4 h-4" />} />
          <StatCard label="Balance" value={$$(balance)} color={balance >= 0 ? "text-emerald-600" : "text-red-500"} sub={balance >= 0 ? "Superávit" : "Déficit"} icon={<Wallet className="w-4 h-4" />} />
        </div>
      </div>

      {/* Priority table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Desglose por prioridad</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Prioridad", "Items", "Comprados", "Estimado", "Gastado", "Pendiente"].map(h => (
                  <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${["Estimado","Gastado","Pendiente"].includes(h) ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {byPriority.map(row => (
                <tr key={row.priority} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5"><PriorityBadge p={row.priority as Priority} /><span className="ml-2 text-xs text-muted-foreground hidden sm:inline">{P_CFG[row.priority as Priority].label}</span></td>
                  <td className="px-5 py-3.5 font-mono text-foreground">{row.count}</td>
                  <td className="px-5 py-3.5 font-mono text-emerald-600">{row.bought}</td>
                  <td className="px-5 py-3.5 text-right font-mono">{$$(row.estimated)}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-emerald-600">{$$(row.spent)}</td>
                  <td className="px-5 py-3.5 text-right font-mono text-amber-600">{$$(row.pending)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/30">
              <tr>
                <td className="px-5 py-3 font-semibold">Total</td>
                <td className="px-5 py-3 font-mono font-semibold">{products.length}</td>
                <td className="px-5 py-3 font-mono font-semibold text-emerald-600">{boughtCount}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold">{$$(totalEstimated)}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold text-emerald-600">{$$(totalSpent)}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold text-amber-600">{$$(totalPending)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Products View ────────────────────────────────────────────────────────────
const EMPTY_PRODUCT: Omit<Product, "id" | "user_id" | "created_at"> = {
  name: "", category: "Cocina", priority: "P1", quantity: 1,
  estimated_price: 0, paid_price: null, bought: false, store: "", link: "", notes: "",
};

function ProductModal({ initial, onSave, onClose }: {
  initial?: Product; onSave: (p: typeof EMPTY_PRODUCT) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) { setErr("Escribe el nombre del producto."); return; }
    if (!Number.isInteger(form.quantity) || form.quantity < 1 || !validMoney(form.estimated_price)
      || (form.bought && form.paid_price !== null && !validMoney(form.paid_price))) {
      setErr("Revisa la cantidad y los precios: deben ser números válidos, sin valores negativos."); return;
    }
    if (form.link.trim() && !safeUrl(form.link)) { setErr("El enlace debe comenzar con https:// o http://."); return; }
    setSaving(true); setErr("");
    const data = { ...form, name: form.name.trim(), link: form.link.trim() };
    data.paid_price = data.bought ? (data.paid_price ?? data.estimated_price) : null;
    try { await onSave(data); } catch (e: any) { setErr(errorMessage(e)); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-semibold">{initial ? "Editar producto" : "Nuevo electrodoméstico"}</h2>
          <button onClick={onClose} aria-label="Cerrar formulario" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Field label="Prioridad">
                <select value={form.priority} onChange={e => set("priority", e.target.value as Priority)} className={inputCls}>
                  <option value="P1">🔴 P1 – Indispensable</option>
                  <option value="P2">🟡 P2 – Importante</option>
                  <option value="P3">🟢 P3 – Postergable</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none pb-2 flex-shrink-0">
              <input type="checkbox" checked={form.bought} onChange={e => set("bought", e.target.checked)} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-medium">Comprado</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Field label="Producto *">
                <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Refrigeradora" className={inputCls} />
              </Field>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Field label="Categoría">
                <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls}>
                  {PRODUCT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Cantidad">
              <input type="number" min="1" value={form.quantity} onChange={e => set("quantity", Math.max(1, parseInt(e.target.value) || 1))} className={monoInputCls} />
            </Field>
            <Field label="P. Estimado ($)">
              <input type="number" min="0" step="0.01" value={form.estimated_price} onChange={e => set("estimated_price", parseFloat(e.target.value) || 0)} className={monoInputCls} />
            </Field>
            <Field label="P. Pagado ($)">
              <input type="number" min="0" step="0.01" value={form.paid_price ?? ""} disabled={!form.bought} onChange={e => set("paid_price", e.target.value ? parseFloat(e.target.value) : null)} placeholder="–" className={monoInputCls + " disabled:opacity-40 disabled:cursor-not-allowed"} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tienda">
              <input value={form.store} onChange={e => set("store", e.target.value)} placeholder="Coral, Supermaxi..." className={inputCls} />
            </Field>
            <Field label="Enlace">
              <input value={form.link} onChange={e => set("link", e.target.value)} placeholder="https://..." className={inputCls} />
            </Field>
          </div>
          <Field label="Notas">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </Field>
          <div className="bg-muted rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Subtotal estimado</span>
            <span className="font-mono font-semibold">{$$(form.quantity * form.estimated_price)}</span>
          </div>
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {initial ? "Guardar cambios" : "Agregar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductsView({ userId }: { userId: string }) {
  const [addingExamples, setAddingExamples] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [filterP, setFilterP]   = useState<Priority | "ALL">("ALL");
  const [filterS, setFilterS]   = useState<"ALL" | "bought" | "pending">("ALL");
  const [sortKey, setSortKey]   = useState<keyof Product>("priority");
  const [sortDir, setSortDir]   = useState<SortDir>("asc");
  const [showModal, setShowModal] = useState(false);
  const [editProd, setEditProd]   = useState<Product | undefined>();
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase().from("products").select("*").eq("user_id", userId).order("priority").order("name");
    if (error) { setError(errorMessage(error)); setLoading(false); return; }
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const addExamples = async () => {
    if (addingExamples || products.length) return;
    setAddingExamples(true); setError("");
    try {
      const { data, error } = await getSupabase().from("products")
        .insert(INITIAL_PRODUCTS.map(p => ({ ...p, user_id: userId }))).select();
      if (error) throw error;
      setProducts((data as Product[]) ?? []);
    } catch (error) { setError(errorMessage(error)); }
    finally { setAddingExamples(false); }
  };

  const doAdd = async (form: typeof EMPTY_PRODUCT) => {
    const { data, error } = await getSupabase().from("products").insert({ ...form, user_id: userId }).select().single();
    if (error) throw error;
    setProducts(prev => [...prev, data as Product]);
    setShowModal(false);
  };

  const doUpdate = async (id: string, changes: Partial<Product>) => {
    const { error } = await getSupabase().from("products").update(changes).eq("id", id).eq("user_id", userId);
    if (error) { setError(errorMessage(error)); return; }
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  const doDelete = async (id: string) => {
    const { error } = await getSupabase().from("products").delete().eq("id", id).eq("user_id", userId);
    if (error) { setError(errorMessage(error)); return; }
    setProducts(prev => prev.filter(p => p.id !== id));
    setDeleteId(null);
  };

  const doEdit = async (form: typeof EMPTY_PRODUCT) => {
    if (!editProd) return;
    const { error } = await getSupabase().from("products").update(form).eq("id", editProd.id).eq("user_id", userId);
    if (error) throw error;
    setProducts(prev => prev.map(p => p.id === editProd.id ? { ...p, ...form } : p));
    setShowModal(false); setEditProd(undefined);
  };

  const filtered = useMemo(() => {
    let list = [...products];
    if (search) { const q = search.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.store?.toLowerCase().includes(q)); }
    if (filterP !== "ALL") list = list.filter(p => p.priority === filterP);
    if (filterS === "bought") list = list.filter(p => p.bought);
    if (filterS === "pending") list = list.filter(p => !p.bought);
    list.sort((a, b) => {
      const av = String(a[sortKey] ?? ""); const bv = String(b[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv, "es", { numeric: true }) : bv.localeCompare(av, "es", { numeric: true });
    });
    return list;
  }, [products, search, filterP, filterS, sortKey, sortDir]);

  const toggleSort = (k: keyof Product) => { if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } };

  function SortBtn({ k, label }: { k: keyof Product; label: string }) {
    const active = sortKey === k;
    return (
      <button onClick={() => toggleSort(k)} className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
        {label}{active ? (sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />) : <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />}
      </button>
    );
  }

  const sel = "text-sm border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30 text-foreground";
  const totalEst  = filtered.reduce((s, p) => s + p.quantity * p.estimated_price, 0);
  const totalPaid = filtered.filter(p => p.bought).reduce((s, p) => s + p.quantity * (p.paid_price ?? p.estimated_price), 0);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {error && <ErrBox msg={error} />}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <select value={filterP} onChange={e => setFilterP(e.target.value as any)} className={sel}>
          <option value="ALL">Todas las prioridades</option>
          <option value="P1">🔴 P1</option><option value="P2">🟡 P2</option><option value="P3">🟢 P3</option>
        </select>
        <select value={filterS} onChange={e => setFilterS(e.target.value as any)} className={sel}>
          <option value="ALL">Todos</option><option value="bought">✅ Comprados</option><option value="pending">🕐 Pendientes</option>
        </select>
        <button onClick={() => { setEditProd(undefined); setShowModal(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium flex-shrink-0">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {products.length === 0 && !error && <div className="rounded-2xl border border-dashed border-primary/30 bg-accent/40 p-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-medium text-sm">Tu hogar empieza con una lista</p><p className="text-xs text-muted-foreground mt-1">Agrega tus productos o parte de nuestra lista sugerida.</p></div>
        <button onClick={addExamples} disabled={addingExamples} className="rounded-xl border border-primary/30 text-primary px-4 py-2 text-sm font-medium disabled:opacity-50">{addingExamples ? "Agregando…" : "Usar lista sugerida"}</button>
      </div>}
      <p className="text-xs text-muted-foreground">Marcar una compra actualiza esta lista. Registra también su pago en Gastos para incluirlo en tu balance.</p>
      <div className="md:hidden space-y-3">
        {filtered.length === 0 && products.length > 0 && <p className="p-5 text-sm text-muted-foreground text-center">Sin productos que coincidan.</p>}
        {filtered.map(p => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><h3 className={`text-sm font-semibold break-words ${p.bought ? "line-through text-muted-foreground" : ""}`}>{p.name}</h3><p className="text-xs text-muted-foreground mt-1">{p.category} · {p.quantity} unidad{p.quantity > 1 ? "es" : ""}</p></div>
              <PriorityBadge p={p.priority} />
            </div>
            <div className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">Estimado <strong className="font-mono text-foreground">{$$(p.quantity * p.estimated_price)}</strong></span>{p.bought && <span className="text-emerald-700">Pagado <strong className="font-mono">{$$(p.quantity * (p.paid_price ?? p.estimated_price))}</strong></span>}</div>
            {(p.store || p.notes) && <p className="text-xs text-muted-foreground break-words">{[p.store, p.notes].filter(Boolean).join(" · ")}</p>}
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button aria-pressed={p.bought} onClick={() => doUpdate(p.id, { bought: !p.bought, paid_price: !p.bought ? (p.paid_price ?? p.estimated_price) : null })} className={`mr-auto text-xs font-medium rounded-lg px-3 py-2 ${p.bought ? "bg-emerald-50 text-emerald-700" : "bg-accent text-primary"}`}>{p.bought ? "✓ Comprado" : "Marcar comprado"}</button>
              {safeUrl(p.link) && <a href={safeUrl(p.link)} target="_blank" rel="noopener noreferrer" aria-label={`Ver enlace de ${p.name}`} className="p-2 text-primary"><ExternalLink className="w-4 h-4" /></a>}
              <button onClick={() => { setEditProd(p); setShowModal(true); }} aria-label={`Editar ${p.name}`} className="p-2 text-muted-foreground"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => setDeleteId(p.id)} aria-label={`Eliminar ${p.name}`} className="p-2 text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </article>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm min-w-[920px]">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="w-10 px-3 py-3" />
                <th className="px-3 py-3 text-left"><SortBtn k="priority" label="Prior." /></th>
                <th className="px-3 py-3 text-left"><SortBtn k="name" label="Producto" /></th>
                <th className="px-3 py-3 text-left"><SortBtn k="category" label="Categoría" /></th>
                <th className="px-3 py-3 text-center"><SortBtn k="quantity" label="Cant." /></th>
                <th className="px-3 py-3 text-right"><SortBtn k="estimated_price" label="P. Estimado" /></th>
                <th className="px-3 py-3 text-right"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">P. Pagado</span></th>
                <th className="px-3 py-3 text-left"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tienda</span></th>
                <th className="px-3 py-3 text-center"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Link</span></th>
                <th className="px-3 py-3 text-left"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notas</span></th>
                <th className="px-3 py-3 text-center"><span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 && <tr><td colSpan={11} className="px-6 py-14 text-center text-muted-foreground text-sm">Sin productos que coincidan.</td></tr>}
              {filtered.map(p => (
                <tr key={p.id} className={`group hover:bg-muted/20 transition-colors ${p.bought ? "opacity-55" : ""}`}>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => doUpdate(p.id, { bought: !p.bought, paid_price: !p.bought ? (p.paid_price ?? p.estimated_price) : null })}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mx-auto transition-all ${p.bought ? "bg-emerald-500 border-emerald-500 text-white" : "border-border hover:border-emerald-400 hover:bg-emerald-50"}`}>
                      {p.bought && <span className="text-[10px] font-bold leading-none">✓</span>}
                    </button>
                  </td>
                  <td className="px-3 py-3"><PriorityBadge p={p.priority} /></td>
                  <td className="px-3 py-3 font-medium whitespace-nowrap max-w-[180px] truncate">
                    {p.bought ? <span className="line-through text-muted-foreground">{p.name}</span> : p.name}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">{p.category}</td>
                  <td className="px-3 py-3 text-center font-mono">{p.quantity}</td>
                  <td className="px-3 py-3 text-right font-mono whitespace-nowrap">{$$(p.quantity * p.estimated_price)}</td>
                  <td className="px-3 py-3 text-right font-mono whitespace-nowrap">
                    {p.bought && p.paid_price != null ? <span className="text-emerald-600 font-medium">{$$(p.quantity * p.paid_price)}</span> : <span className="text-muted-foreground/30">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap max-w-[96px] truncate">{p.store || <span className="opacity-30">—</span>}</td>
                  <td className="px-3 py-3 text-center">
                    {safeUrl(p.link) ? <a href={safeUrl(p.link)} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70" aria-label="Abrir enlace"><ExternalLink className="w-3.5 h-3.5 inline" /></a> : <span className="text-muted-foreground/25">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground max-w-[140px] truncate" title={p.notes}>{p.notes || <span className="opacity-25">—</span>}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button aria-label="Editar producto" onClick={() => { setEditProd(p); setShowModal(true); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button aria-label="Eliminar registro" onClick={() => setDeleteId(p.id)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td colSpan={5} className="px-3 py-3 text-xs text-muted-foreground font-medium">{filtered.length} producto{filtered.length !== 1 ? "s" : ""}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold">{$$(totalEst)}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-emerald-600">{totalPaid > 0 ? $$(totalPaid) : <span className="text-muted-foreground/30">—</span>}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showModal && <ProductModal initial={editProd} onSave={editProd ? doEdit : doAdd} onClose={() => { setShowModal(false); setEditProd(undefined); }} />}
      {deleteId && <DeleteModal name={products.find(p => p.id === deleteId)?.name ?? ""} onConfirm={() => doDelete(deleteId!)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

// ─── Expenses View ────────────────────────────────────────────────────────────
const EMPTY_EXPENSE: Omit<Expense, "id" | "user_id" | "created_at"> = {
  amount: 0, description: "", category: "Alimentación", date: today(), notes: "",
};

function ExpenseModal({ initial, onSave, onClose }: { initial?: Expense; onSave: (e: typeof EMPTY_EXPENSE) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_EXPENSE, date: today() });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!validMoney(form.amount, true) || !form.description.trim() || !form.date) {
      setErr("Completa la fecha, la descripción y un monto mayor a cero."); return;
    }
    setSaving(true); setErr("");
    try { await onSave({ ...form, description: form.description.trim() }); }
    catch (error) { setErr(errorMessage(error)); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{initial ? "Editar gasto" : "Nuevo gasto"}</h2>
          <button onClick={onClose} aria-label="Cerrar formulario" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto ($) *">
              <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set("amount", parseFloat(e.target.value) || 0)} className={monoInputCls} />
            </Field>
            <Field label="Fecha">
              <input required type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="Descripción *">
            <input required value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ej: Mercado semanal" className={inputCls} />
          </Field>
          <Field label="Categoría">
            <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls}>
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Notas">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} />
          </Field>
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{initial ? "Guardar" : "Agregar gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExpensesView({ userId }: { userId: string }) {
  const [items, setItems]         = useState<Expense[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [filterMonth, setFilterMonth] = useState(currentMonth());
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<Expense | undefined>();
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const requestId = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true); setError("");
    const { start, end } = monthRange(filterMonth);
    const { data, error } = await getSupabase().from("expenses").select("*").eq("user_id", userId)
      .gte("date", start).lt("date", end).order("date", { ascending: false });
    if (request !== requestId.current) return;
    if (error) { setError(errorMessage(error)); setItems([]); } else setItems((data as Expense[]) ?? []);
    setLoading(false);
  }, [filterMonth, userId]);

  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);

  const doAdd = async (form: typeof EMPTY_EXPENSE) => {
    const { data, error } = await getSupabase().from("expenses").insert({ ...form, user_id: userId }).select().single();
    if (error) throw error;
    setItems(prev => [data as Expense, ...prev].filter(i => isInMonth(i.date, filterMonth)).sort((a, b) => b.date.localeCompare(a.date)));
    setShowModal(false);
  };

  const doEdit = async (form: typeof EMPTY_EXPENSE) => {
    if (!editItem) return;
    const { error } = await getSupabase().from("expenses").update(form).eq("id", editItem.id).eq("user_id", userId);
    if (error) throw error;
    setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i).filter(i => isInMonth(i.date, filterMonth)).sort((a, b) => b.date.localeCompare(a.date)));
    setShowModal(false); setEditItem(undefined);
  };

  const doDelete = async (id: string) => {
    const { error } = await getSupabase().from("expenses").delete().eq("id", id).eq("user_id", userId);
    if (error) { setError(errorMessage(error)); return; }
    setItems(prev => prev.filter(i => i.id !== id)); setDeleteId(null);
  };

  const total = sumMoney(items, i => i.amount);
  const byCat = EXPENSE_CATEGORIES.map(c => ({ cat: c, total: items.filter(i => i.category === c).reduce((s, i) => s + i.amount, 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {error && <ErrBox msg={error} />}
      <div className="flex flex-wrap gap-2 items-center">
        <input type="month" value={filterMonth} onChange={e => { if (e.target.value) setFilterMonth(e.target.value); }} className="text-sm border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-2 font-mono font-semibold text-sm">
          <TrendingDown className="w-4 h-4" /> Total: {$$(total)}
        </div>
        <button onClick={() => { setEditItem(undefined); setShowModal(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">
          <Plus className="w-4 h-4" /> Agregar gasto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {byCat.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por categoría</h3>
            {byCat.map(c => (
              <div key={c.cat}>
                <div className="flex justify-between text-xs mb-1"><span className="text-foreground">{c.cat}</span><span className="font-mono text-muted-foreground">{$$(c.total)}</span></div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-red-400 rounded-full" style={{ width: `${total > 0 ? (c.total / total) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        )}
        <div className={`${byCat.length > 0 ? "lg:col-span-3" : "lg:col-span-4"} bg-card border border-border rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/40 border-b border-border">
                {["Fecha", "Descripción", "Categoría", "Monto", "Notas", ""].map(h => <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Monto" ? "text-right" : ""}`}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Sin gastos en este período.</td></tr>}
                {items.map(item => (
                  <tr key={item.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">{fmtDate(item.date)}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{item.description}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded font-medium">{item.category}</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{$$(item.amount)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{item.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button aria-label="Editar registro" onClick={() => { setEditItem(item); setShowModal(true); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
                        <button aria-label="Eliminar registro" onClick={() => setDeleteId(item.id)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {items.length > 0 && <tfoot><tr className="bg-muted/30 border-t-2 border-border"><td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground">{items.length} registros</td><td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{$$(total)}</td><td colSpan={2} /></tr></tfoot>}
            </table>
          </div>
        </div>
      </div>

      {showModal && <ExpenseModal initial={editItem} onSave={editItem ? doEdit : doAdd} onClose={() => { setShowModal(false); setEditItem(undefined); }} />}
      {deleteId && <DeleteModal name={items.find(i => i.id === deleteId)?.description ?? ""} onConfirm={() => doDelete(deleteId!)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

// ─── Incomes View ─────────────────────────────────────────────────────────────
const EMPTY_INCOME: Omit<Income, "id" | "user_id" | "created_at"> = {
  amount: 0, description: "", source: "Salario", date: today(), notes: "",
};

function IncomeModal({ initial, onSave, onClose }: { initial?: Income; onSave: (i: typeof EMPTY_INCOME) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_INCOME, date: today() });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!validMoney(form.amount, true) || !form.description.trim() || !form.date) {
      setErr("Completa la fecha, la descripción y un monto mayor a cero."); return;
    }
    setSaving(true); setErr("");
    try { await onSave({ ...form, description: form.description.trim() }); }
    catch (error) { setErr(errorMessage(error)); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{initial ? "Editar ingreso" : "Nuevo ingreso"}</h2>
          <button onClick={onClose} aria-label="Cerrar formulario" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Monto ($) *"><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => set("amount", parseFloat(e.target.value) || 0)} className={monoInputCls} /></Field>
            <Field label="Fecha"><input required type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} /></Field>
          </div>
          <Field label="Descripción *"><input required value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ej: Sueldo enero" className={inputCls} /></Field>
          <Field label="Fuente"><select value={form.source} onChange={e => set("source", e.target.value)} className={inputCls}>{INCOME_SOURCES.map(s => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Notas"><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} /></Field>
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{initial ? "Guardar" : "Agregar ingreso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IncomesView({ userId }: { userId: string }) {
  const [items, setItems]         = useState<Income[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [filterMonth, setFilterMonth] = useState(currentMonth());
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<Income | undefined>();
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const requestId = useRef(0);
  const load = useCallback(async () => {
    const request = ++requestId.current;
    setLoading(true); setError("");
    const { start, end } = monthRange(filterMonth);
    const { data, error } = await getSupabase().from("incomes").select("*").eq("user_id", userId)
      .gte("date", start).lt("date", end).order("date", { ascending: false });
    if (request !== requestId.current) return;
    if (error) { setError(errorMessage(error)); setItems([]); } else setItems((data as Income[]) ?? []);
    setLoading(false);
  }, [filterMonth, userId]);

  useEffect(() => { void load(); return () => { requestId.current++; }; }, [load]);

  const doAdd = async (form: typeof EMPTY_INCOME) => {
    const { data, error } = await getSupabase().from("incomes").insert({ ...form, user_id: userId }).select().single();
    if (error) throw error;
    setItems(prev => [data as Income, ...prev].filter(i => isInMonth(i.date, filterMonth)).sort((a, b) => b.date.localeCompare(a.date)));
    setShowModal(false);
  };

  const doEdit = async (form: typeof EMPTY_INCOME) => {
    if (!editItem) return;
    const { error } = await getSupabase().from("incomes").update(form).eq("id", editItem.id).eq("user_id", userId);
    if (error) throw error;
    setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i).filter(i => isInMonth(i.date, filterMonth)).sort((a, b) => b.date.localeCompare(a.date)));
    setShowModal(false); setEditItem(undefined);
  };

  const doDelete = async (id: string) => {
    const { error } = await getSupabase().from("incomes").delete().eq("id", id).eq("user_id", userId);
    if (error) { setError(errorMessage(error)); return; }
    setItems(prev => prev.filter(i => i.id !== id)); setDeleteId(null);
  };

  const total = sumMoney(items, i => i.amount);
  const bySrc = INCOME_SOURCES.map(s => ({ src: s, total: items.filter(i => i.source === s).reduce((s, i) => s + i.amount, 0) })).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {error && <ErrBox msg={error} />}
      <div className="flex flex-wrap gap-2 items-center">
        <input type="month" value={filterMonth} onChange={e => { if (e.target.value) setFilterMonth(e.target.value); }} className="text-sm border border-border rounded-lg px-3 py-2 bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-4 py-2 font-mono font-semibold text-sm">
          <TrendingUp className="w-4 h-4" /> Total: {$$(total)}
        </div>
        <button onClick={() => { setEditItem(undefined); setShowModal(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">
          <Plus className="w-4 h-4" /> Agregar ingreso
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {bySrc.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por fuente</h3>
            {bySrc.map(s => (
              <div key={s.src}>
                <div className="flex justify-between text-xs mb-1"><span className="text-foreground">{s.src}</span><span className="font-mono text-muted-foreground">{$$(s.total)}</span></div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${total > 0 ? (s.total / total) * 100 : 0}%` }} /></div>
              </div>
            ))}
          </div>
        )}
        <div className={`${bySrc.length > 0 ? "lg:col-span-3" : "lg:col-span-4"} bg-card border border-border rounded-xl overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted/40 border-b border-border">
                {["Fecha","Descripción","Fuente","Monto","Notas",""].map(h => <th key={h} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${h === "Monto" ? "text-right" : ""}`}>{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-border">
                {items.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">Sin ingresos en este período.</td></tr>}
                {items.map(item => (
                  <tr key={item.id} className="group hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">{fmtDate(item.date)}</td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{item.description}</td>
                    <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">{item.source}</span></td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">{$$(item.amount)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">{item.notes || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button aria-label="Editar registro" onClick={() => { setEditItem(item); setShowModal(true); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
                        <button aria-label="Eliminar registro" onClick={() => setDeleteId(item.id)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              {items.length > 0 && <tfoot><tr className="bg-muted/30 border-t-2 border-border"><td colSpan={3} className="px-4 py-3 text-xs text-muted-foreground">{items.length} registros</td><td className="px-4 py-3 text-right font-mono font-semibold text-emerald-600">{$$(total)}</td><td colSpan={2} /></tr></tfoot>}
            </table>
          </div>
        </div>
      </div>

      {showModal && <IncomeModal initial={editItem} onSave={editItem ? doEdit : doAdd} onClose={() => { setShowModal(false); setEditItem(undefined); }} />}
      {deleteId && <DeleteModal name={items.find(i => i.id === deleteId)?.description ?? ""} onConfirm={() => doDelete(deleteId!)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

// ─── Finances View ────────────────────────────────────────────────────────────
function FinancesView({ userId }: { userId: string }) {
  const [products, setProducts]   = useState<Product[]>([]);
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [incomes, setIncomes]     = useState<Income[]>([]);
  const [budget, setBudget]       = useState(1500);
  const [editBudget, setEditBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("1500");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [months, setMonths]       = useState(6);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { start, end } = recentMonthsRange(months);

      const [pr, ex, inc, cfg] = await Promise.all([
        getSupabase().from("products").select("*").eq("user_id", userId),
        getSupabase().from("expenses").select("*").eq("user_id", userId).gte("date", start).lt("date", end),
        getSupabase().from("incomes").select("*").eq("user_id", userId).gte("date", start).lt("date", end),
        getSupabase().from("app_settings").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      const loadError = pr.error ?? ex.error ?? inc.error ?? cfg.error;
      setError(loadError ? errorMessage(loadError) : "");
      setProducts((pr.data as Product[]) ?? []);
      setExpenses((ex.data as Expense[]) ?? []);
      setIncomes((inc.data as Income[]) ?? []);
      if (cfg.data?.total_budget != null) { setBudget(cfg.data.total_budget); setBudgetInput(String(cfg.data.total_budget)); }
      setLoading(false);
    }
    load();
  }, [userId, months]);

  const saveBudget = async () => {
    const val = Number(budgetInput);
    if (!budgetInput.trim() || !validMoney(val)) { setError("Escribe un presupuesto válido, mayor o igual a cero."); return; }
    setError("");
    const { error } = await getSupabase().from("app_settings").upsert({ user_id: userId, total_budget: val }, { onConflict: "user_id" });
    if (error) { setError(errorMessage(error)); return; }
    setBudget(val); setEditBudget(false);
  };

  const { estimated: totalEstimated, spent: totalSpent, pending: totalPending } = productTotals(products);
  const totalExpenses   = sumMoney(expenses, e => e.amount);
  const totalIncomes    = sumMoney(incomes, i => i.amount);
  const balance         = Math.round((totalIncomes - totalExpenses) * 100) / 100;
  const savings         = Math.max(0, balance);
  const savingsPct      = budget > 0 ? (savings / budget) * 100 : 0;
  const productPct      = budget > 0 ? (totalSpent / budget) * 100 : 0;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {error && <ErrBox msg={error} />}

      {/* Budget setting */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-foreground">Meta de presupuesto</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Dinero objetivo para tu independencia</p>
          </div>
          {editBudget ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">$</span>
              <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} className="w-28 border border-border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={saveBudget} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90">Guardar</button>
              <button onClick={() => { setEditBudget(false); setBudgetInput(String(budget)); }} className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold text-foreground">{$$(budget)}</span>
              <button onClick={() => setEditBudget(true)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"><Pencil className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Electrodomésticos comprados</span><span className="font-mono font-semibold text-primary">{$$(totalSpent)} ({productPct.toFixed(0)}%)</span></div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min(productPct, 100)}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1.5"><span className="text-muted-foreground">Ahorro acumulado (últimos {months} meses)</span><span className="font-mono font-semibold text-emerald-600">{$$(savings)} ({savingsPct.toFixed(0)}%)</span></div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(savingsPct, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total ingresos" value={$$(totalIncomes)} color="text-emerald-600" icon={<TrendingUp className="w-4 h-4" />} sub={`últimos ${months} meses`} />
        <StatCard label="Total gastos" value={$$(totalExpenses)} color="text-red-500" icon={<TrendingDown className="w-4 h-4" />} sub={`últimos ${months} meses`} />
        <StatCard label="Balance neto" value={$$(balance)} color={balance >= 0 ? "text-emerald-600" : "text-red-500"} sub={balance >= 0 ? "Superávit" : "Déficit"} icon={<Wallet className="w-4 h-4" />} />
        <StatCard label="Ahorro estimado" value={$$(savings)} color="text-primary" icon={<PiggyBank className="w-4 h-4" />} sub="ingresos − gastos" />
      </div>

      {/* Electrodomésticos summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Electrodomésticos" value={$$(totalEstimated)} sub="presupuesto total estimado" icon={<ShoppingBag className="w-4 h-4" />} />
        <StatCard label="Ya comprado" value={$$(totalSpent)} color="text-emerald-600" sub="pagado en productos" icon={<CheckCircle2 className="w-4 h-4" />} />
        <StatCard label="Por comprar" value={$$(totalPending)} color="text-amber-600" sub="electrodomésticos pendientes" icon={<Package className="w-4 h-4" />} />
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Período de análisis:</span>
        {[3, 6, 12].map(m => (
          <button key={m} onClick={() => setMonths(m)} className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${months === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>
            {m} meses
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Stores View ──────────────────────────────────────────────────────────────
const EMPTY_STORE: Omit<StoreRecord, "id" | "user_id" | "created_at"> = {
  name: "", city: "Cuenca", address: "", website: "", notes: "",
};

function StoreModal({ initial, onSave, onClose }: { initial?: StoreRecord; onSave: (s: typeof EMPTY_STORE) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_STORE });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name.trim()) { setErr("Escribe el nombre de la tienda."); return; }
    if (form.website.trim() && !safeUrl(form.website)) { setErr("El sitio web debe comenzar con https:// o http://."); return; }
    setSaving(true); setErr("");
    try { await onSave({ ...form, name: form.name.trim(), website: form.website.trim() }); }
    catch (error) { setErr(errorMessage(error)); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{initial ? "Editar tienda" : "Nueva tienda"}</h2>
          <button onClick={onClose} aria-label="Cerrar formulario" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <Field label="Nombre *"><input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Ej: Coral Centro" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad"><input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Cuenca" className={inputCls} /></Field>
            <Field label="Sitio web"><input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://..." className={inputCls} /></Field>
          </div>
          <Field label="Dirección"><input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Av. Huayna Capac y Solano" className={inputCls} /></Field>
          <Field label="Notas"><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} /></Field>
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{initial ? "Guardar" : "Agregar tienda"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StoresView({ userId }: { userId: string }) {
  const [stores, setStores]       = useState<StoreRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editStore, setEditStore] = useState<StoreRecord | undefined>();
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase().from("stores").select("*").eq("user_id", userId).order("name");
    if (error) setError(errorMessage(error)); else setStores((data as StoreRecord[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAdd = async (form: typeof EMPTY_STORE) => {
    const { data, error } = await getSupabase().from("stores").insert({ ...form, user_id: userId }).select().single();
    if (error) throw error;
    setStores(prev => [...prev, data as StoreRecord].sort((a, b) => a.name.localeCompare(b.name)));
    setShowModal(false);
  };

  const doEdit = async (form: typeof EMPTY_STORE) => {
    if (!editStore) return;
    const { error } = await getSupabase().from("stores").update(form).eq("id", editStore.id).eq("user_id", userId);
    if (error) throw error;
    setStores(prev => prev.map(s => s.id === editStore.id ? { ...s, ...form } : s));
    setShowModal(false); setEditStore(undefined);
  };

  const doDelete = async (id: string) => {
    const { error } = await getSupabase().from("stores").delete().eq("id", id).eq("user_id", userId);
    if (error) { setError(errorMessage(error)); return; }
    setStores(prev => prev.filter(s => s.id !== id)); setDeleteId(null);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {error && <ErrBox msg={error} />}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{stores.length} tienda{stores.length !== 1 ? "s" : ""} en Cuenca</p>
        <button onClick={() => { setEditStore(undefined); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium">
          <Plus className="w-4 h-4" /> Agregar tienda
        </button>
      </div>

      {stores.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4"><Store className="w-6 h-6 text-muted-foreground/40" /></div>
          <p className="text-sm font-medium mb-1">Sin tiendas registradas</p>
          <p className="text-xs text-muted-foreground">Agrega tiendas de electrodomésticos en Cuenca.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stores.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5 space-y-2.5 group hover:border-primary/30 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{s.name}</h3>
                  {s.city && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{s.city}</p>}
                </div>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
                  <button aria-label="Editar tienda" onClick={() => { setEditStore(s); setShowModal(true); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
                  <button aria-label="Eliminar registro" onClick={() => setDeleteId(s.id)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
              {s.website && <a href={safeUrl(s.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline truncate"><Globe className="w-3 h-3 flex-shrink-0" />{s.website.replace(/^https?:\/\//, "")}</a>}
              {s.notes && <p className="text-xs text-muted-foreground/70 border-t border-border pt-2.5">{s.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && <StoreModal initial={editStore} onSave={editStore ? doEdit : doAdd} onClose={() => { setShowModal(false); setEditStore(undefined); }} />}
      {deleteId && <DeleteModal name={stores.find(s => s.id === deleteId)?.name ?? ""} onConfirm={() => doDelete(deleteId!)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

// ─── Price Searches View ──────────────────────────────────────────────────────
const EMPTY_SEARCH: Omit<PriceSearch, "id" | "user_id" | "created_at"> = {
  product_name: "", store_name: "", price: 0, url: "", notes: "",
};

function SearchModal({ initial, onSave, onClose }: { initial?: PriceSearch; onSave: (s: typeof EMPTY_SEARCH) => Promise<void>; onClose: () => void }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_SEARCH });
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm(prev => ({ ...prev, [k]: v }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!form.product_name.trim() || !validMoney(form.price)) { setErr("Completa el producto y un precio válido."); return; }
    if (form.url.trim() && !safeUrl(form.url)) { setErr("El enlace debe comenzar con https:// o http://."); return; }
    setSaving(true); setErr("");
    try { await onSave({ ...form, product_name: form.product_name.trim(), url: form.url.trim() }); }
    catch (error) { setErr(errorMessage(error)); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">{initial ? "Editar precio" : "Guardar precio encontrado"}</h2>
          <button onClick={onClose} aria-label="Cerrar formulario" className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <Field label="Producto *"><input required value={form.product_name} onChange={e => set("product_name", e.target.value)} placeholder="Ej: Refrigeradora Samsung" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tienda"><input value={form.store_name} onChange={e => set("store_name", e.target.value)} placeholder="Coral, Supermaxi..." className={inputCls} /></Field>
            <Field label="Precio ($)"><input type="number" min="0" step="0.01" value={form.price} onChange={e => set("price", parseFloat(e.target.value) || 0)} className={monoInputCls} /></Field>
          </div>
          <Field label="URL del producto"><input value={form.url} onChange={e => set("url", e.target.value)} placeholder="https://..." className={inputCls} /></Field>
          <Field label="Notas"><textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} className={inputCls + " resize-none"} /></Field>
          {err && <ErrBox msg={err} />}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted">Cancelar</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{initial ? "Guardar" : "Guardar precio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SearchesView({ userId }: { userId: string }) {
  const [items, setItems]         = useState<PriceSearch[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<PriceSearch | undefined>();
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await getSupabase().from("price_searches").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (error) setError(errorMessage(error)); else setItems((data as PriceSearch[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const doAdd = async (form: typeof EMPTY_SEARCH) => {
    const { data, error } = await getSupabase().from("price_searches").insert({ ...form, user_id: userId }).select().single();
    if (error) throw error;
    setItems(prev => [data as PriceSearch, ...prev]);
    setShowModal(false);
  };

  const doEdit = async (form: typeof EMPTY_SEARCH) => {
    if (!editItem) return;
    const { error } = await getSupabase().from("price_searches").update(form).eq("id", editItem.id).eq("user_id", userId);
    if (error) throw error;
    setItems(prev => prev.map(i => i.id === editItem.id ? { ...i, ...form } : i));
    setShowModal(false); setEditItem(undefined);
  };

  const doDelete = async (id: string) => {
    const { error } = await getSupabase().from("price_searches").delete().eq("id", id).eq("user_id", userId);
    if (error) { setError(errorMessage(error)); return; }
    setItems(prev => prev.filter(i => i.id !== id)); setDeleteId(null);
  };

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i => i.product_name.toLowerCase().includes(q) || i.store_name?.toLowerCase().includes(q));
  }, [items, search]);

  // Group by product name for comparison
  const grouped = useMemo(() => {
    const map = new Map<string, PriceSearch[]>();
    filtered.forEach(i => {
      const key = i.product_name.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return Array.from(map.entries()).map(([, items]) => ({ name: items[0].product_name, items: items.sort((a, b) => a.price - b.price) }));
  }, [filtered]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {error && <ErrBox msg={error} />}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto o tienda..." className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <button onClick={() => { setEditItem(undefined); setShowModal(true); }} className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium flex-shrink-0">
          <Plus className="w-4 h-4" /> Guardar precio
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4"><BarChart3 className="w-6 h-6 text-muted-foreground/40" /></div>
          <p className="text-sm font-medium mb-1">Sin precios guardados</p>
          <p className="text-xs text-muted-foreground">Guarda precios que encuentres en tiendas de Cuenca para comparar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(group => (
            <div key={group.name} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 bg-muted/30 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">{group.name}</h3>
                {group.items.length > 1 && (
                  <span className="text-xs text-muted-foreground font-mono">
                    Rango: {$$(group.items[0].price)} – {$$(group.items[group.items.length - 1].price)}
                  </span>
                )}
              </div>
              <div className="divide-y divide-border">
                {group.items.map((item, idx) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-4 hover:bg-muted/20 transition-colors group">
                    {group.items.length > 1 && <span className={`text-xs font-bold w-5 text-center ${idx === 0 ? "text-emerald-600" : "text-muted-foreground/50"}`}>{idx === 0 ? "↓" : `${idx+1}`}</span>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.store_name || <span className="text-muted-foreground/50">Sin tienda</span>}</p>
                      {item.notes && <p className="text-xs text-muted-foreground truncate">{item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-semibold text-sm ${idx === 0 && group.items.length > 1 ? "text-emerald-600" : "text-foreground"}`}>{$$(item.price)}</span>
                      {safeUrl(item.url) && <a href={safeUrl(item.url)} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70" aria-label="Abrir enlace"><ExternalLink className="w-3.5 h-3.5" /></a>}
                      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button aria-label="Editar registro" onClick={() => { setEditItem(item); setShowModal(true); }} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"><Pencil className="w-3.5 h-3.5" /></button>
                        <button aria-label="Eliminar registro" onClick={() => setDeleteId(item.id)} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <SearchModal initial={editItem} onSave={editItem ? doEdit : doAdd} onClose={() => { setShowModal(false); setEditItem(undefined); }} />}
      {deleteId && <DeleteModal name={items.find(i => i.id === deleteId)?.product_name ?? ""} onConfirm={() => doDelete(deleteId!)} onCancel={() => setDeleteId(null)} />}
    </div>
  );
}

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex items-center gap-3 text-muted-foreground text-sm">
        <Loader2 className="w-5 h-5 animate-spin text-primary" /> Cargando...
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
const TABS: { id: AppTab; label: string; short: string; icon: React.ReactNode }[] = [
  { id: "dashboard",  label: "Dashboard",       short: "Dashboard",  icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: "products",   label: "Electrodomésticos", short: "Electrod.", icon: <Package className="w-4 h-4" /> },
  { id: "expenses",   label: "Gastos",           short: "Gastos",     icon: <TrendingDown className="w-4 h-4" /> },
  { id: "incomes",    label: "Ingresos",         short: "Ingresos",   icon: <TrendingUp className="w-4 h-4" /> },
  { id: "finances",   label: "Finanzas",         short: "Finanzas",   icon: <PiggyBank className="w-4 h-4" /> },
  { id: "stores",     label: "Tiendas",          short: "Tiendas",    icon: <Store className="w-4 h-4" /> },
  { id: "searches",   label: "Búsqueda precios", short: "Precios",    icon: <Search className="w-4 h-4" /> },
];

const TAB_TITLES: Record<AppTab, string> = {
  dashboard: "Dashboard", products: "Electrodomésticos", expenses: "Gastos diarios",
  incomes: "Ingresos", finances: "Finanzas & Ahorros", stores: "Tiendas en Cuenca",
  searches: "Búsqueda de precios",
};

export default function App() {
  const [user, setUser]   = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]     = useState<AppTab>("dashboard");
  const [sessionError, setSessionError] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    let active = true;
    getSupabase().auth.getSession().then(({ data: { session }, error }) => {
      if (!active) return;
      if (error) setSessionError(errorMessage(error));
      setUser(session?.user ?? null); setLoading(false);
    }).catch(error => {
      if (active) { setSessionError(errorMessage(error)); setLoading(false); }
    });
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const logout = async () => {
    setSessionError("");
    const { error } = await getSupabase().auth.signOut({ scope: "local" });
    if (error) { setSessionError(errorMessage(error)); return; }
    setUser(null); setTab("dashboard");
  };

  const exportData = async () => {
    if (!user || exporting) return;
    setExporting(true); setSessionError("");
    try { await downloadBackup(user.id); }
    catch (error) { setSessionError(errorMessage(error)); }
    finally { setExporting(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-lg font-bold">MI</span>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) return <><AuthScreen />{sessionError && <div className="fixed bottom-4 inset-x-4 mx-auto max-w-sm"><ErrBox msg={sessionError} /></div>}</>;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex flex-wrap items-center min-h-16 gap-3 py-3 md:py-0">
            {/* Logo */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-sm">
                <Heart className="text-primary-foreground w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-none">Mi Independencia</p>
                <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Cuenca, Ecuador</p>
              </div>
            </div>

            {/* Tabs */}
            <nav aria-label="Secciones" className="flex items-center gap-1 order-3 w-full md:order-none md:w-auto md:flex-1 overflow-x-auto pb-1 md:pb-0">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                  {t.icon}
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="inline md:hidden">{t.short}</span>
                </button>
              ))}
            </nav>

            {/* User */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
              <button onClick={exportData} disabled={exporting} title="Descargar respaldo" aria-label="Descargar respaldo" className="p-2 rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50">{exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}</button>
              <span className="hidden sm:inline text-xs text-muted-foreground max-w-[140px] truncate">{user.email}</span>
              <button onClick={logout} className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors" title="Cerrar sesión">
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page title */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">{TAB_TITLES[tab]}</h1>
        </div>
      </div>

      {/* Content */}
      <main key={user.id} className="max-w-screen-xl mx-auto px-4 py-6">
        {sessionError && <div className="mb-4"><ErrBox msg={sessionError} /></div>}
        {tab === "dashboard"  && <DashboardView  userId={user.id} />}
        {tab === "products"   && <ProductsView   userId={user.id} />}
        {tab === "expenses"   && <ExpensesView   userId={user.id} />}
        {tab === "incomes"    && <IncomesView    userId={user.id} />}
        {tab === "finances"   && <FinancesView   userId={user.id} />}
        {tab === "stores"     && <StoresView     userId={user.id} />}
        {tab === "searches"   && <SearchesView   userId={user.id} />}
      </main>
    </div>
  );
}
