-- Inventario Fox Tienda Deportiva (fase 1)
-- PostgreSQL / Supabase
--
-- Cómo ejecutarlo:
--   1. Dashboard de Supabase → SQL Editor → pegar este archivo → Run
--   2. CLI (proyecto enlazado): supabase db query --linked -f schema.sql
--
-- El stock vive en product_variants, nunca en products.
-- Disponible = stock_quantity - reserved_stock.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum ('pending', 'paid', 'shipped', 'cancelled');
  end if;
end
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  created_at timestamptz not null default now(),
  constraint products_name_not_blank check (char_length(btrim(name)) > 0),
  constraint products_category_not_blank check (char_length(btrim(category)) > 0)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null,
  size text not null,
  color text not null,
  stock_quantity integer not null default 0,
  reserved_stock integer not null default 0,
  price numeric(12, 2) not null,
  constraint product_variants_sku_unique unique (sku),
  constraint product_variants_size_color_unique unique (product_id, size, color),
  constraint product_variants_sku_not_blank check (char_length(btrim(sku)) > 0),
  constraint product_variants_size_not_blank check (char_length(btrim(size)) > 0),
  constraint product_variants_color_not_blank check (char_length(btrim(color)) > 0),
  constraint product_variants_stock_non_negative check (stock_quantity >= 0),
  constraint product_variants_reserved_non_negative check (reserved_stock >= 0),
  constraint product_variants_reserved_lte_stock check (reserved_stock <= stock_quantity),
  constraint product_variants_price_non_negative check (price >= 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  total_amount numeric(12, 2) not null,
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint orders_customer_name_not_blank check (char_length(btrim(customer_name)) > 0),
  constraint orders_customer_phone_not_blank check (char_length(btrim(customer_phone)) > 0),
  constraint orders_total_non_negative check (total_amount >= 0)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity integer not null,
  unit_price numeric(12, 2) not null,
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_unit_price_non_negative check (unit_price >= 0)
);

create index if not exists products_category_idx
  on public.products (category);

create index if not exists orders_status_created_at_idx
  on public.orders (status, created_at desc);

create index if not exists order_items_order_id_idx
  on public.order_items (order_id);

create index if not exists order_items_variant_id_idx
  on public.order_items (variant_id);

-- Ajuste atómico de stock físico.
-- Una sola sentencia UPDATE toma el lock de fila, así dos pedidos
-- concurrentes no pueden dejar el stock en negativo ni por debajo
-- de las unidades ya reservadas.
-- SECURITY INVOKER: respeta RLS del rol que llama (no usar definer en public).
create or replace function public.adjust_variant_stock(
  p_variant_id uuid,
  p_delta integer
)
returns public.product_variants
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated_row public.product_variants;
begin
  if p_variant_id is null or p_delta is null or p_delta = 0 then
    raise exception 'variant_id y un delta distinto de cero son obligatorios'
      using errcode = '22023';
  end if;

  update public.product_variants
  set stock_quantity = stock_quantity + p_delta
  where id = p_variant_id
    and stock_quantity + p_delta >= 0
    and stock_quantity + p_delta >= reserved_stock
  returning * into updated_row;

  if not found then
    raise exception 'stock insuficiente o variante inexistente'
      using errcode = 'P0001';
  end if;

  return updated_row;
end;
$$;

revoke all on function public.adjust_variant_stock(uuid, integer) from public;
revoke all on function public.adjust_variant_stock(uuid, integer) from anon;
grant execute on function public.adjust_variant_stock(uuid, integer) to authenticated;
grant execute on function public.adjust_variant_stock(uuid, integer) to service_role;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Tienda de un solo dueño: cualquier usuario autenticado administra el inventario.
-- anon no tiene políticas, así que la API pública no lee ni escribe estas tablas.
drop policy if exists products_authenticated_all on public.products;
create policy products_authenticated_all
  on public.products
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists product_variants_authenticated_all on public.product_variants;
create policy product_variants_authenticated_all
  on public.product_variants
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists orders_authenticated_all on public.orders;
create policy orders_authenticated_all
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists order_items_authenticated_all on public.order_items;
create policy order_items_authenticated_all
  on public.order_items
  for all
  to authenticated
  using (true)
  with check (true);

-- Datos de ejemplo para probar el tablero. Puedes borrar este bloque
-- si vas a cargar el catálogo real.
insert into public.products (id, name, description, category)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'Camiseta Dry-Fit Running',
    'Tela ligera de secado rápido para entrenar.',
    'Camisetas'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'Short Training 7"',
    'Short con bolsillo interno y tiro medio.',
    'Shorts'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'Zapatilla Pace Road',
    'Amortiguación diaria para asfalto.',
    'Calzado'
  )
on conflict (id) do nothing;

insert into public.product_variants (
  id, product_id, sku, size, color, stock_quantity, reserved_stock, price
)
values
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'DRY-NEG-S', 'S', 'Negro', 12, 0, 89900),
  ('a2222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'DRY-NEG-M', 'M', 'Negro', 4, 1, 89900),
  ('a3333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'DRY-NEG-L', 'L', 'Negro', 0, 0, 89900),
  ('b1111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'SHT-AZU-M', 'M', 'Azul', 9, 0, 75900),
  ('b2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'SHT-AZU-L', 'L', 'Azul', 2, 0, 75900),
  ('c1111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'PACE-GRI-40', '40', 'Gris', 1, 0, 249900),
  ('c2222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'PACE-GRI-42', '42', 'Gris', 6, 2, 249900)
on conflict (id) do nothing;
