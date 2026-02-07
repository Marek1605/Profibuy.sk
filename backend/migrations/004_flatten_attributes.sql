-- Migration 004: Flatten product attributes
-- Converts nested technical_specs format to flat [{name, value}] array
-- This fixes attributes that were copied raw from supplier_products.technical_specs

-- Create a function to flatten the nested format
CREATE OR REPLACE FUNCTION flatten_tech_specs(specs jsonb) RETURNS jsonb AS $$
DECLARE
    result jsonb := '[]'::jsonb;
    section_key text;
    section_val jsonb;
    attr_name text;
    attr_values jsonb;
    val_arr text[];
    val_text text;
    param_name text;
    param_value text;
    seen text[] := '{}';
BEGIN
    -- If already an array, return as-is
    IF jsonb_typeof(specs) = 'array' THEN
        RETURN specs;
    END IF;
    
    -- If not an object, return empty array
    IF jsonb_typeof(specs) != 'object' THEN
        RETURN '[]'::jsonb;
    END IF;
    
    -- Iterate sections
    FOR section_key, section_val IN SELECT * FROM jsonb_each(specs) LOOP
        -- Process attributes: {"Name": ["Value1", "Value2"]}
        IF section_val ? 'attributes' AND jsonb_typeof(section_val->'attributes') = 'object' THEN
            FOR attr_name, attr_values IN SELECT * FROM jsonb_each(section_val->'attributes') LOOP
                IF attr_name = '' OR attr_name = ANY(seen) THEN
                    CONTINUE;
                END IF;
                
                -- Collect non-empty values
                val_text := '';
                IF jsonb_typeof(attr_values) = 'array' THEN
                    SELECT string_agg(v.value::text, ', ') INTO val_text
                    FROM jsonb_array_elements_text(attr_values) AS v(value)
                    WHERE TRIM(v.value) != '';
                END IF;
                
                IF val_text IS NOT NULL AND val_text != '' THEN
                    -- Remove surrounding quotes if present
                    val_text := TRIM(BOTH '"' FROM val_text);
                    result := result || jsonb_build_array(jsonb_build_object('name', attr_name, 'value', val_text));
                    seen := array_append(seen, attr_name);
                END IF;
            END LOOP;
        END IF;
        
        -- Process parameters: {"Key": "Value"}
        IF section_val ? 'parameters' AND jsonb_typeof(section_val->'parameters') = 'object' THEN
            FOR param_name, param_value IN SELECT k, v::text FROM jsonb_each_text(section_val->'parameters') AS x(k, v) LOOP
                IF param_name = '' OR TRIM(param_value) = '' OR param_name = ANY(seen) THEN
                    CONTINUE;
                END IF;
                result := result || jsonb_build_array(jsonb_build_object('name', param_name, 'value', param_value));
                seen := array_append(seen, param_name);
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Flatten all product attributes that are in nested format
UPDATE products 
SET attributes = flatten_tech_specs(attributes)
WHERE jsonb_typeof(attributes) = 'object' 
  AND attributes::text LIKE '%"attributes"%';

-- Clean up function (optional - keep for future re-imports)
-- DROP FUNCTION IF EXISTS flatten_tech_specs(jsonb);
