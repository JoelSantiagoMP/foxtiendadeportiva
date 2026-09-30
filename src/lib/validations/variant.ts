import { z } from "zod";

const moneySchema = z.union([z.number(), z.string()]).transform((value, ctx) => {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    ctx.addIssue({
      code: "custom",
      message: "El precio debe ser un número mayor o igual a cero",
    });
    return z.NEVER;
  }
  return amount;
});

export const variantFormSchema = z
  .object({
    product_id: z.uuid("El producto no es válido"),
    sku: z
      .string()
      .trim()
      .min(1, "El SKU es obligatorio")
      .max(64, "El SKU es demasiado largo"),
    size: z
      .string()
      .trim()
      .min(1, "La talla es obligatoria")
      .max(32, "La talla es demasiado larga"),
    color: z
      .string()
      .trim()
      .min(1, "El color es obligatorio")
      .max(32, "El color es demasiado largo"),
    stock_quantity: z.coerce
      .number()
      .int("El stock debe ser un entero")
      .min(0, "El stock no puede ser negativo"),
    reserved_stock: z.coerce
      .number()
      .int("El stock reservado debe ser un entero")
      .min(0, "El stock reservado no puede ser negativo")
      .default(0),
    price: z.coerce
      .number()
      .min(0, "El precio no puede ser negativo"),
  })
  .superRefine((value, ctx) => {
    if (value.reserved_stock > value.stock_quantity) {
      ctx.addIssue({
        code: "custom",
        message: "El stock reservado no puede superar el stock físico",
        path: ["reserved_stock"],
      });
    }
  });

export const adjustVariantStockSchema = z.object({
  variantId: z.uuid("La variante no es válida"),
  delta: z.union([z.literal(1), z.literal(-1)]),
});

export const variantRowSchema = z.object({
  id: z.uuid(),
  product_id: z.uuid(),
  sku: z.string(),
  size: z.string(),
  color: z.string(),
  stock_quantity: z.coerce.number().int(),
  reserved_stock: z.coerce.number().int(),
  price: moneySchema,
});

export type VariantFormInput = z.infer<typeof variantFormSchema>;
export type AdjustVariantStockInput = z.infer<typeof adjustVariantStockSchema>;
