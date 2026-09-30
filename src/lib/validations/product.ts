import { z } from "zod";

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre es demasiado largo"),
  description: z
    .string()
    .trim()
    .max(2000, "La descripción es demasiado larga")
    .optional()
    .or(z.literal("")),
  category: z
    .string()
    .trim()
    .min(1, "La categoría es obligatoria")
    .max(80, "La categoría es demasiado larga"),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
