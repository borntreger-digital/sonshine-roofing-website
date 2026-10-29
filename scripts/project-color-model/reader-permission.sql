-- Apply in the migration transaction. Existing live color access was '*'.
-- Keep its original columns, add material_type, omit the generated internal key.
-- Policy identity and current grant are verified; no policy assignment changes.
DO $reader$
DECLARE reader_policy uuid; old_fields text; wanted text := 'id,date_created,date_updated,user_created,user_updated,client,status,name,slug,sort,scope_key,material_type';
BEGIN
  SELECT id INTO STRICT reader_policy FROM directus_policies WHERE name='Client Access';
  SELECT fields INTO STRICT old_fields FROM directus_permissions
    WHERE policy=reader_policy AND collection='roofing_roof_colors' AND action='read';
  IF old_fields NOT IN ('*',wanted) THEN
    RAISE EXCEPTION 'Color reader grant changed; review before altering it' USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM directus_permissions WHERE collection='roofing_roof_colors'
    AND action='read' AND policy IS DISTINCT FROM reader_policy) THEN
    RAISE EXCEPTION 'Additional color reader appeared; review its scope' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM directus_permissions WHERE policy=reader_policy
    AND collection='roofing_projects' AND action='read') OR EXISTS (
    SELECT 1 FROM directus_permissions WHERE policy=reader_policy
    AND collection='roofing_projects' AND action='read'
    AND (fields IS NULL OR fields ~ '(^|,)([^,]*\*[^,]*|job_id|zip)(,|$)')) THEN
    RAISE EXCEPTION 'Website project reader must retain its private-field exclusions' USING ERRCODE='23514';
  END IF;
  UPDATE directus_permissions SET fields=wanted
    WHERE policy=reader_policy AND collection='roofing_roof_colors' AND action='read'
    AND fields IS DISTINCT FROM wanted;
END;
$reader$;
