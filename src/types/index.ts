export type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";

export type StockLevel = "available" | "low" | "out";

export type CatalogSource = "live" | "demo";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  created_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  color: string;
  stock_quantity: number;
  reserved_stock: number;
  price: number;
};

export interface ProductWithVariants extends Product {
  variants: ProductVariant[];
}

export type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
};

export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          category: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          category?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["product_id"];
          },
        ];
      };
      product_variants: {
        Row: ProductVariant;
        Insert: {
          id?: string;
          product_id: string;
          sku: string;
          size: string;
          color: string;
          stock_quantity?: number;
          reserved_stock?: number;
          price: number;
        };
        Update: {
          id?: string;
          product_id?: string;
          sku?: string;
          size?: string;
          color?: string;
          stock_quantity?: number;
          reserved_stock?: number;
          price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: Order;
        Insert: {
          id?: string;
          customer_name: string;
          customer_phone: string;
          total_amount: number;
          status?: OrderStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          customer_phone?: string;
          total_amount?: number;
          status?: OrderStatus;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["order_id"];
          },
        ];
      };
      order_items: {
        Row: OrderItem;
        Insert: {
          id?: string;
          order_id: string;
          variant_id: string;
          quantity: number;
          unit_price: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          variant_id?: string;
          quantity?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      adjust_variant_stock: {
        Args: {
          p_variant_id: string;
          p_delta: number;
        };
        Returns: ProductVariant;
      };
    };
    Enums: {
      order_status: OrderStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
