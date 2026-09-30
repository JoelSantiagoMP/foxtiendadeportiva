import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) {
      redirect("/admin/dashboard");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
          Fox Tienda Deportiva
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
          Entrar al inventario
        </h1>
        <p className="text-sm text-zinc-600">
          Solo la cuenta del dueño puede ver y cambiar el stock.
        </p>
      </header>
      <LoginForm />
    </main>
  );
}
