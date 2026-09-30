"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { variantRowSchema, adjustVariantStockSchema } from "@/lib/validations/variant";
import type { ActionResult, ProductVariant } from "@/types";

export async function adjustVariantStock(
  input: unknown,
): Promise<ActionResult<ProductVariant>> {
  const parsedInput = adjustVariantStockSchema.safeParse(input);
  if (!parsedInput.success) {
    return { success: false, error: "El ajuste de stock no es válido." };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase no está configurado. El cambio solo vive en esta pantalla.",
    };
  }

  const supabase = await createClient();
  const { data: claims, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claims) {
    return {
      success: false,
      error: "Inicia sesión para guardar cambios de inventario.",
    };
  }

  const { variantId, delta } = parsedInput.data;
  const { data, error } = await supabase.rpc("adjust_variant_stock", {
    p_variant_id: variantId,
    p_delta: delta,
  });

  if (error) {
    return {
      success: false,
      error: "No se pudo actualizar el stock. Revisa unidades reservadas o la conexión.",
    };
  }

  const parsedRow = variantRowSchema.safeParse(data);
  if (!parsedRow.success) {
    return {
      success: false,
      error: "El stock cambió, pero la respuesta no se pudo leer.",
    };
  }

  revalidatePath("/admin/dashboard");
  return { success: true, data: parsedRow.data };
}
