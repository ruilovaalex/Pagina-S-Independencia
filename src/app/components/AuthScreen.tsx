import { useState } from "react";
import { Eye, EyeOff, Heart, Loader2, LockKeyhole } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import { errorMessage } from "../../lib/finance";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading || !isSupabaseConfigured) return;
    setLoading(true); setError("");
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
    } catch (error) { setError(errorMessage(error)); }
    finally { setLoading(false); }
  };

  return (
    <main className="auth-shell min-h-screen flex items-center justify-center p-5">
      <div className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 w-16 h-16 bg-primary text-white rounded-3xl flex items-center justify-center shadow-lg shadow-primary/20"><Heart className="w-8 h-8" /></div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-2">Un paso a la vez</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Mi Independencia</h1>
          <p className="text-sm text-muted-foreground mt-3">Tu hogar, tus planes, a tu ritmo.</p>
        </div>
        <section className="bg-card border border-border rounded-3xl p-7 shadow-xl shadow-primary/5">
          <h2 className="font-semibold text-lg">Qué bueno tenerte aquí</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-6">Entra a tu espacio personal.</p>
          {!isSupabaseConfigured && <p role="status" className="mb-5 rounded-xl bg-accent p-4 text-sm text-accent-foreground">El diseño está listo. Falta conectar tu proyecto de Supabase para poder iniciar sesión y guardar tus datos.</p>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Correo electrónico</label>
              <input id="email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5">Contraseña</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3 pr-12 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1.5 p-2 text-muted-foreground">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">{error}</p>}
            <button type="submit" disabled={loading || !isSupabaseConfigured} className="w-full flex justify-center items-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-semibold text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className="w-4 h-4" />} Entrar a mi espacio
            </button>
          </form>
        </section>
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-6"><LockKeyhole className="w-3.5 h-3.5" /> Un espacio privado, solo para ti.</p>
      </div>
    </main>
  );
}
