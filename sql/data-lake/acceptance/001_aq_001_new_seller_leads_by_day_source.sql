-- AQ-001: Count new seller leads by day and source.
-- Assumptions: lead = GHL opportunity; opportunities_latest is the default current-state table.
WITH seller_leads AS (
    SELECT
        CAST(created_at AS date) AS lead_created_date,
        coalesce(nullif(source, ''), 'unknown') AS lead_source,
        coalesce(nullif(pipeline_name, ''), 'unknown') AS pipeline_name,
        opportunity_id
    FROM gold_coast.opportunities_latest
    WHERE created_at IS NOT NULL
)
SELECT
    lead_created_date,
    lead_source,
    pipeline_name,
    count(*) AS new_seller_leads
FROM seller_leads
GROUP BY 1, 2, 3
ORDER BY lead_created_date DESC, new_seller_leads DESC, lead_source
