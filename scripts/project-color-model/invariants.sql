-- PostgreSQL integrity after the reviewed material backfill. No synthetic rows.
-- Apply with ON_ERROR_STOP, following the private recovery capture and tests.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE public.roofing_material_types, public.roofing_roof_colors,
  public.roofing_projects IN SHARE ROW EXCLUSIVE MODE;

CREATE UNIQUE INDEX IF NOT EXISTS project_colors_material_client_id
  ON public.roofing_material_types(client,id);
CREATE UNIQUE INDEX IF NOT EXISTS project_colors_material_client_id_status
  ON public.roofing_material_types(client,id,status);
CREATE UNIQUE INDEX IF NOT EXISTS project_colors_color_client_id_material
  ON public.roofing_roof_colors(client,id,material_type);

-- A generated status key lets native foreign keys enforce publication in both
-- directions, including concurrent writes, without a race-prone lookup trigger.
-- Capture the tenant ID so changing the client's slug cannot disable the rule.
DO $publication$
DECLARE target_client uuid;
BEGIN
  SELECT id INTO STRICT target_client FROM public.clients WHERE slug='sonshine-roofing';
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid='public.roofing_roof_colors'::regclass
    AND attname='material_publication_status' AND NOT attisdropped) THEN
    EXECUTE format('ALTER TABLE public.roofing_roof_colors ADD COLUMN material_publication_status text GENERATED ALWAYS AS (CASE WHEN client=%L::uuid AND status=''published'' THEN ''published''::text ELSE NULL::text END) STORED',target_client);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.roofing_roof_colors'::regclass
    AND conname='project_colors_published_parent_required') THEN
    EXECUTE format('ALTER TABLE public.roofing_roof_colors ADD CONSTRAINT project_colors_published_parent_required CHECK (client<>%L::uuid OR status<>''published'' OR material_type IS NOT NULL)',target_client);
  END IF;
END;
$publication$;

DO $constraints$
DECLARE entry record;
BEGIN
  FOR entry IN SELECT * FROM (VALUES
    ('roofing_roof_colors','project_colors_parent_client','FOREIGN KEY (client,material_type) REFERENCES public.roofing_material_types(client,id) ON DELETE RESTRICT ON UPDATE RESTRICT'),
    ('roofing_roof_colors','project_colors_published_parent','FOREIGN KEY (client,material_type,material_publication_status) REFERENCES public.roofing_material_types(client,id,status) ON DELETE RESTRICT ON UPDATE RESTRICT'),
    ('roofing_projects','project_colors_project_material_client','FOREIGN KEY (client,material_type) REFERENCES public.roofing_material_types(client,id) ON DELETE RESTRICT ON UPDATE RESTRICT'),
    ('roofing_projects','project_colors_project_color_material','FOREIGN KEY (client,roof_color,material_type) REFERENCES public.roofing_roof_colors(client,id,material_type) ON DELETE RESTRICT ON UPDATE RESTRICT')
  ) AS definitions(table_name,constraint_name,definition) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=format('public.%I',entry.table_name)::regclass
      AND conname=entry.constraint_name) THEN
      EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I %s',entry.table_name,entry.constraint_name,entry.definition);
    END IF;
  END LOOP;
END;
$constraints$;

-- The previous single-column FK used SET NULL. Restrict it too: otherwise its
-- action could erase project colors before the composite FK checks deletion.
ALTER TABLE public.roofing_projects DROP CONSTRAINT IF EXISTS roofing_projects_roof_color_foreign;
ALTER TABLE public.roofing_projects ADD CONSTRAINT roofing_projects_roof_color_foreign
  FOREIGN KEY (roof_color) REFERENCES public.roofing_roof_colors(id)
  ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Directus metadata is deliberately maintained through its API, after this SQL.
COMMIT;
