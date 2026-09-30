import { z } from "zod";
import { demoCatalog } from "@/lib/inventory/demo-catalog";
import { compareSizes } from "@/lib/inventory/stock";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { variantRowSchema } from "@/lib/validations/variant";
import type { CatalogSource, ProductWithVariants } from "@/types";

const catalogRowSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  created_at: z.string(),
  product_variants: z.array(variantRowSchema),
});

const catalogResponseSchema = z.array(catalogRowSchema);

export interface CatalogSnapshot {
  products: ProductWithVariants[];
  source: CatalogSource;
  error?: string;
}

export async function getCatalog(): Promise<CatalogSnapshot> {
  if (!isSupabaseConfigured()) {
    return { products: demoCatalog, source: "demo" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, description, category, created_at, product_variants(id, product_id, sku, size, color, stock_quantity, reserved_stock, price)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return { products: [], source: "live", error: error.message };
  }

  const parsed = catalogResponseSchema.safeParse(data);
  if (!parsed.success) {
    return {
      products: [],
      source: "live",
      error: "La respuesta del catálogo no tiene el formato esperado.",
    };
  }

  const products = parsed.data.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    category: product.category,
    created_at: product.created_at,
    variants: [...product.product_variants].sort((left, right) =>
      compareSizes(left.size, right.size),
    ),
  }));

  return { products, source: "live" };
}
