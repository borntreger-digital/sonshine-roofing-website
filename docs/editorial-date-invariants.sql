-- Canonical editorial modification rules. Apply only after the approved additive
-- field/backfill stage; see docs/editorial-dates.md. No legacy columns referenced.
-- Directus audit dates remain independent. All related changes use the same
-- transaction timestamp, and a rollback rolls back the editorial date as well.
BEGIN;
CREATE OR REPLACE FUNCTION public.editorial_values(row_data jsonb, keys text[])
RETURNS jsonb LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $function$
  SELECT coalesce(jsonb_object_agg(key, row_data -> key), '{}'::jsonb)
  FROM unnest(keys) AS key;
$function$;

CREATE OR REPLACE FUNCTION public.set_editorial_modified_at()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'persons' THEN NEW.modified_at := transaction_timestamp();
    ELSE NEW.modified_at := NEW.published_at; END IF;
  ELSIF public.editorial_values(to_jsonb(NEW), TG_ARGV) IS DISTINCT FROM
        public.editorial_values(to_jsonb(OLD), TG_ARGV) THEN
    NEW.modified_at := transaction_timestamp();
  ELSIF pg_trigger_depth() = 1 THEN
    -- Ignore caller-supplied dates on no-op/private/admin updates. Nested
    -- dependency triggers may set a date without changing a scalar field.
    NEW.modified_at := OLD.modified_at;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS editorial_modified_at ON public.blog_posts;
CREATE TRIGGER editorial_modified_at BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.set_editorial_modified_at('client', 'title', 'slug', 'body', 'excerpt', 'author', 'featured_image', 'published_at', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', 'og_image_override');

DROP TRIGGER IF EXISTS editorial_modified_at ON public.roofing_projects;
CREATE TRIGGER editorial_modified_at BEFORE INSERT OR UPDATE ON public.roofing_projects
FOR EACH ROW EXECUTE FUNCTION public.set_editorial_modified_at('client', 'title', 'slug', 'description', 'featured_image', 'published_at', 'product_links', 'client_testimonial_name', 'client_testimonial_date', 'client_testimonial', 'review_source', 'review_url', 'material_type', 'roof_color', 'service_area', 'neighborhood', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', 'og_image_override');

DROP TRIGGER IF EXISTS editorial_modified_at ON public.persons;
CREATE TRIGGER editorial_modified_at BEFORE INSERT OR UPDATE ON public.persons
FOR EACH ROW EXECUTE FUNCTION public.set_editorial_modified_at('client', 'first_name', 'last_name', 'display_name', 'slug', 'title', 'bio', 'how_helps', 'profile_image', 'instagram_profile_url', 'linkedin_profile_url', 'website_url', 'github_profile_url', 'facebook_url', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', 'og_image_override');

CREATE OR REPLACE FUNCTION public.touch_editorial_dependents()
RETURNS trigger LANGUAGE plpgsql AS $function$
DECLARE previous jsonb; current_row jsonb;
BEGIN
  IF TG_OP <> 'INSERT' THEN previous := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN current_row := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' AND public.editorial_values(previous, TG_ARGV)
    IS NOT DISTINCT FROM public.editorial_values(current_row, TG_ARGV) THEN RETURN NULL; END IF;

  IF TG_TABLE_NAME = 'blog_posts_blog_topics' THEN
    UPDATE public.blog_posts SET modified_at = transaction_timestamp()
      WHERE id IN ((previous->>'blog_post')::uuid, (current_row->>'blog_post')::uuid);
  ELSIF TG_TABLE_NAME = 'blog_topics' THEN
    UPDATE public.blog_posts SET modified_at = transaction_timestamp()
      WHERE id IN (SELECT blog_post FROM public.blog_posts_blog_topics
        WHERE blog_topic IN ((previous->>'id')::uuid, (current_row->>'id')::uuid));
  ELSIF TG_TABLE_NAME = 'persons' THEN
    UPDATE public.blog_posts SET modified_at = transaction_timestamp()
      WHERE author IN ((previous->>'id')::uuid, (current_row->>'id')::uuid);
  ELSIF TG_TABLE_NAME = 'roofing_projects_files' THEN
    UPDATE public.roofing_projects SET modified_at = transaction_timestamp()
      WHERE id IN ((previous->>'roofing_project')::uuid, (current_row->>'roofing_project')::uuid);
  ELSIF TG_TABLE_NAME IN ('roofing_material_types', 'roofing_roof_colors', 'roofing_service_areas', 'roofing_neighborhoods') THEN
    UPDATE public.roofing_projects p SET modified_at = transaction_timestamp()
      WHERE (CASE TG_TABLE_NAME
        WHEN 'roofing_material_types' THEN p.material_type
        WHEN 'roofing_roof_colors' THEN p.roof_color
        WHEN 'roofing_service_areas' THEN p.service_area
        WHEN 'roofing_neighborhoods' THEN p.neighborhood END)
      IN ((previous->>'id')::uuid, (current_row->>'id')::uuid);
  ELSIF TG_TABLE_NAME = 'videos' THEN
    UPDATE public.roofing_projects SET modified_at = transaction_timestamp()
      WHERE id IN (
        CASE WHEN previous->>'status' = 'published' THEN (previous->>'project')::uuid END,
        CASE WHEN current_row->>'status' = 'published' THEN (current_row->>'project')::uuid END);
  ELSIF TG_TABLE_NAME = 'directus_files' THEN
    UPDATE public.blog_posts p SET modified_at = transaction_timestamp()
      WHERE p.featured_image IN ((previous->>'id')::uuid, (current_row->>'id')::uuid)
         OR p.og_image_override IN ((previous->>'id')::uuid, (current_row->>'id')::uuid)
         OR p.author IN (SELECT id FROM public.persons
           WHERE profile_image IN ((previous->>'id')::uuid, (current_row->>'id')::uuid));
    UPDATE public.roofing_projects p SET modified_at = transaction_timestamp()
      WHERE p.featured_image IN ((previous->>'id')::uuid, (current_row->>'id')::uuid)
         OR p.og_image_override IN ((previous->>'id')::uuid, (current_row->>'id')::uuid)
         OR p.id IN (SELECT roofing_project FROM public.roofing_projects_files
           WHERE directus_files_id IN ((previous->>'id')::uuid, (current_row->>'id')::uuid));
    UPDATE public.persons SET modified_at = transaction_timestamp()
      WHERE profile_image IN ((previous->>'id')::uuid, (current_row->>'id')::uuid)
         OR og_image_override IN ((previous->>'id')::uuid, (current_row->>'id')::uuid);
  END IF;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS editorial_dependents ON public.blog_posts_blog_topics;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts_blog_topics
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('blog_post', 'blog_topic', 'sort');

DROP TRIGGER IF EXISTS editorial_dependents ON public.blog_topics;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.blog_topics
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'name', 'slug', 'status');

DROP TRIGGER IF EXISTS editorial_dependents ON public.persons;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.persons
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'first_name', 'last_name', 'profile_image', 'title', 'bio', 'linkedin_profile_url', 'github_profile_url', 'website_url');

DROP TRIGGER IF EXISTS editorial_dependents ON public.roofing_projects_files;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.roofing_projects_files
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('roofing_project', 'directus_files_id', 'sort');

DROP TRIGGER IF EXISTS editorial_dependents ON public.roofing_material_types;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.roofing_material_types
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'status', 'name', 'slug');

DROP TRIGGER IF EXISTS editorial_dependents ON public.roofing_roof_colors;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.roofing_roof_colors
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'status', 'name', 'slug');

DROP TRIGGER IF EXISTS editorial_dependents ON public.roofing_service_areas;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.roofing_service_areas
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'status', 'name', 'slug');

DROP TRIGGER IF EXISTS editorial_dependents ON public.roofing_neighborhoods;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.roofing_neighborhoods
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'status', 'name', 'slug', 'service_area');

DROP TRIGGER IF EXISTS editorial_dependents ON public.videos;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('client', 'status', 'project', 'title', 'slug', 'description', 'youtube_id', 'youtube_url', 'published_at');

DROP TRIGGER IF EXISTS editorial_dependents ON public.directus_files;
CREATE TRIGGER editorial_dependents AFTER INSERT OR UPDATE OR DELETE ON public.directus_files
FOR EACH ROW EXECUTE FUNCTION public.touch_editorial_dependents('description', 'width', 'height', 'type');

COMMIT;
