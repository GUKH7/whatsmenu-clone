-- WhatsMenu - Schema inicial multi-tenant
-- Execute no SQL Editor do Supabase ou via Supabase CLI

-- Extensão UUID (já habilitada por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: restaurants
-- Um restaurante = um tenant (conta isolada)
-- ============================================
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  whatsapp_number TEXT NOT NULL,
  logo_url TEXT,
  color_theme TEXT DEFAULT '#25D366',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca por slug (rota do cardápio)
CREATE UNIQUE INDEX idx_restaurants_slug ON public.restaurants (slug);

-- ============================================
-- TABELA: categories
-- Categorias do cardápio por restaurante (ex: Bebidas, Lanches)
-- ============================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_restaurant ON public.categories (restaurant_id);

-- ============================================
-- TABELA: products
-- Produtos/itens do cardápio
-- ============================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_restaurant ON public.products (restaurant_id);
CREATE INDEX idx_products_category ON public.products (category_id);

-- ============================================
-- TABELA: customers
-- Clientes cadastrados por restaurante (tenant isolation)
-- ============================================
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants (id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  address_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (restaurant_id, phone)
);

CREATE INDEX idx_customers_restaurant ON public.customers (restaurant_id);
CREATE INDEX idx_customers_restaurant_phone ON public.customers (restaurant_id, phone);

-- ============================================
-- RLS (Row Level Security) - Tenant Isolation
-- Cada restaurante só acessa seus próprios dados
-- ============================================
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Política: leitura pública para cardápio (slug) - clientes finais veem produtos
-- Ajuste conforme seu modelo de auth (ex: role 'restaurant_owner' para edição)
CREATE POLICY "Restaurants are viewable by everyone"
  ON public.restaurants FOR SELECT
  USING (true);

CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT
  USING (true);

-- Customers: apenas o próprio restaurante (quando tiver auth) ou insert para cadastro
CREATE POLICY "Customers are viewable by everyone for now"
  ON public.customers FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert customer for a restaurant"
  ON public.customers FOR INSERT
  WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER restaurants_updated_at
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
