"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { adjustVariantStock } from "@/lib/actions/inventory";
import { availableStock, formatPrice, stockLevel } from "@/lib/inventory/stock";
import type { CatalogSource, ProductVariant, ProductWithVariants, StockLevel } from "@/types";

const LEVEL_STYLES: Record<StockLevel, string> = {
  available: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  low: "bg-amber-100 text-amber-950 ring-amber-200",
  out: "bg-red-100 text-red-900 ring-red-200",
};

const LEVEL_LABEL: Record<StockLevel, string> = {
  available: "Disponible",
  low: "Poco stock",
  out: "Agotado",
};

interface InventoryBoardProps {
  products: ProductWithVariants[];
  source: CatalogSource;
}

export function InventoryBoard({ products, source }: InventoryBoardProps) {
  const [catalog, setCatalog] = useState(products);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function applyLocalDelta(variantId: string, delta: 1 | -1): string | null {
    let rejection: string | null = null;

    setCatalog((current) =>
      current.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => {
          if (variant.id !== variantId) return variant;
          const nextStock = variant.stock_quantity + delta;
          if (nextStock < variant.reserved_stock) {
            rejection = "No puedes bajar el stock por debajo de las unidades reservadas.";
            return variant;
          }
          return { ...variant, stock_quantity: nextStock };
        }),
      })),
    );

    return rejection;
  }

  function adjust(variant: ProductVariant, delta: 1 | -1) {
    setNotice(null);

    if (source === "demo") {
      const rejection = applyLocalDelta(variant.id, delta);
      setNotice(
        rejection ??
          "Cambio local de demostración. Configura Supabase para guardarlo.",
      );
      return;
    }

    setPendingId(variant.id);
    startTransition(async () => {
      const result = await adjustVariantStock({
        variantId: variant.id,
        delta,
      });
      setPendingId(null);

      if (!result.success || !result.data) {
        setNotice(result.error ?? "No se pudo actualizar el stock.");
        return;
      }

      setCatalog((current) =>
        current.map((product) => ({
          ...product,
          variants: product.variants.map((item) =>
            item.id === result.data?.id ? result.data : item,
          ),
        })),
      );
      setNotice("Stock actualizado.");
    });
  }

  const variantCount = catalog.reduce(
    (total, product) => total + product.variants.length,
    0,
  );
  const lowStock = catalog.reduce(
    (total, product) =>
      total +
      product.variants.filter((variant) => stockLevel(availableStock(variant)) === "low")
        .length,
    0,
  );
  const outOfStock = catalog.reduce(
    (total, product) =>
      total +
      product.variants.filter((variant) => stockLevel(availableStock(variant)) === "out")
        .length,
    0,
  );

  if (catalog.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-600">
        No hay productos en el catálogo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600">
        {catalog.length} productos · {variantCount} variantes
        {lowStock > 0 ? ` · ${lowStock} con poco stock` : ""}
        {outOfStock > 0
          ? ` · ${outOfStock} ${outOfStock === 1 ? "agotada" : "agotadas"}`
          : ""}
      </p>
      {notice ? (
        <p
          role="status"
          className="rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white"
        >
          {notice}
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {catalog.map((product) => (
          <li
            key={product.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {product.category}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                  {product.name}
                </h2>
                {product.description ? (
                  <p className="mt-1 text-sm text-zinc-600">{product.description}</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-semibold text-zinc-950">
                {formatPrice(product.variants[0]?.price ?? 0)}
              </p>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {product.variants.map((variant) => {
                const available = availableStock(variant);
                const level = stockLevel(available);
                const busy = isPending && pendingId === variant.id;
                const cannotDecrease = variant.stock_quantity <= variant.reserved_stock;

                return (
                  <li
                    key={variant.id}
                    className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-zinc-950 ring-1 ring-zinc-200">
                          {variant.size}
                        </span>
                        <span className="text-sm text-zinc-700">{variant.color}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${LEVEL_STYLES[level]}`}
                        >
                          {LEVEL_LABEL[level]}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        SKU {variant.sku}
                        {variant.reserved_stock > 0
                          ? ` · ${variant.reserved_stock} ${variant.reserved_stock === 1 ? "reservada" : "reservadas"}`
                          : ""}
                        {` · ${available} ${available === 1 ? "disponible" : "disponibles"}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Restar stock de talla ${variant.size}, ${variant.color}`}
                        disabled={busy || cannotDecrease}
                        onClick={() => adjust(variant, -1)}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-zinc-900 ring-1 ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-center text-base font-semibold tabular-nums text-zinc-950">
                        {variant.stock_quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Sumar stock de talla ${variant.size}, ${variant.color}`}
                        disabled={busy}
                        onClick={() => adjust(variant, 1)}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950 text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
