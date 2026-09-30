import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { InventoryBoard } from "@/components/inventory/inventory-board";
import { getCatalog } from "@/lib/inventory/catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (!data?.claims) {
      redirect("/admin/login");
    }
  }

  const catalog = await getCatalog();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Fox Tienda Deportiva
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Inventario
          </h1>
          <p className="text-sm text-zinc-600">
            Stock por talla y color. Verde disponible, amarillo poco stock, rojo agotado.
          </p>
        </div>
        {catalog.source === "live" ? (
          <form action={signOut}>
            <button
              type="submit"
              className="h-11 rounded-full px-3 text-sm font-medium text-zinc-700"
            >
              Salir
            </button>
          </form>
        ) : null}
      </header>

      {catalog.source === "demo" ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          Modo demostración. Los botones cambian el stock en esta pantalla, pero
          no se guarda hasta conectar Supabase.
        </p>
      ) : null}

      {catalog.error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900 ring-1 ring-red-200">
          {catalog.error}
        </p>
      ) : null}

      <InventoryBoard
        key={catalog.products
          .map((product) =>
            product.variants
              .map((variant) => `${variant.id}:${variant.stock_quantity}`)
              .join(","),
          )
          .join("|")}
        products={catalog.products}
        source={catalog.source}
      />
    </main>
  );
}
