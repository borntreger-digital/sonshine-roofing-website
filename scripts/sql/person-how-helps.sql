-- Add how_helps to person modification tracking after the Directus field exists.
-- Applies only to the person trigger; no content or other trigger is changed.
BEGIN;
DO $guard$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='persons' AND column_name='how_helps' AND data_type IN ('json','jsonb')) THEN
    RAISE EXCEPTION 'Create persons.how_helps JSON field through Directus first';
  END IF;
END;
$guard$;
DROP TRIGGER IF EXISTS editorial_modified_at ON public.persons;
CREATE TRIGGER editorial_modified_at BEFORE INSERT OR UPDATE ON public.persons
FOR EACH ROW EXECUTE FUNCTION public.set_editorial_modified_at('client', 'first_name', 'last_name', 'display_name', 'slug', 'title', 'bio', 'how_helps', 'profile_image', 'instagram_profile_url', 'linkedin_profile_url', 'website_url', 'github_profile_url', 'facebook_url', 'noindex', 'meta_title', 'meta_description', 'primary_focus_keyword', 'focus_keywords', 'og_title', 'og_description', 'og_image_override');
COMMIT;
