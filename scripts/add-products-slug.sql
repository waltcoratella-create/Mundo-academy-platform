-- ─── Migration: add slug column to products ──────────────────────────────────
-- Run once in Supabase SQL Editor → safe to re-run (idempotent).

-- 1. Add the column (nullable so existing rows are unaffected)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. Back-fill slugs for existing products that don't have one yet.
--    Uses Postgres text functions: lower, regexp_replace, translate to strip accents.
UPDATE public.products
SET slug = lower(
  regexp_replace(
    regexp_replace(
      translate(
        name,
        'áéíóúàèìòùäëïöüâêîôûãõñÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛÃÕÑ',
        'aeiouaeiouaeiouaeiouaenAEIOUAEIOUAEIOUAEIOUAEN'
      ),
      '[^a-z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
)
WHERE slug IS NULL OR slug = '';

-- 3. Handle duplicates by appending the product's row number within same-slug groups.
--    This runs only when there are actual collisions.
WITH duplicates AS (
  SELECT id,
         slug,
         row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.products
  WHERE slug IS NOT NULL
)
UPDATE public.products p
SET slug = d.slug || '-' || d.rn
FROM duplicates d
WHERE p.id = d.id
  AND d.rn > 1;

-- 4. Unique index (partial — only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique_idx
  ON public.products (slug)
  WHERE slug IS NOT NULL;
