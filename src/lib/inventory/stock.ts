import type { ProductVariant, StockLevel } from "@/types";

export const LOW_STOCK_THRESHOLD = 3;

export function availableStock(
  variant: Pick<ProductVariant, "stock_quantity" | "reserved_stock">,
): number {
  return variant.stock_quantity - variant.reserved_stock;
}

export function stockLevel(available: number): StockLevel {
  if (available <= 0) return "out";
  if (available <= LOW_STOCK_THRESHOLD) return "low";
  return "available";
}

const SIZE_RANK = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export function compareSizes(left: string, right: string): number {
  const leftRank = SIZE_RANK.indexOf(left.toUpperCase());
  const rightRank = SIZE_RANK.indexOf(right.toUpperCase());

  if (leftRank !== -1 || rightRank !== -1) {
    return (leftRank === -1 ? 99 : leftRank) - (rightRank === -1 ? 99 : rightRank);
  }

  return left.localeCompare(right, "es", { numeric: true });
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}
