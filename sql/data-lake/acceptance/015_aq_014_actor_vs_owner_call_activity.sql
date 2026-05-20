-- AQ-014: Compare caller activity by actor userId even when the opportunity owner is someone else.
-- Assumptions: calls are attributed to calls.actor_user_id; opportunity owner is shown only for comparison.
WITH call_opportunity_candidates AS (
    SELECT
        c.call_message_id,
        c.contact_id,
        c.actor_user_id,
        c.direction,
        c.status,
        c.call_status,
        c.duration_seconds,
        c.date_added,
        o.opportunity_id,
        o.assigned_to_user_id AS opportunity_owner_user_id,
        o.source,
        o.pipeline_name,
        row_number() OVER (
            PARTITION BY c.call_message_id
            ORDER BY
                CASE WHEN o.created_at IS NOT NULL AND c.date_added IS NOT NULL AND o.created_at <= c.date_added THEN 0 ELSE 1 END,
                o.created_at DESC
        ) AS opportunity_rank
    FROM gold_coast.calls c
    LEFT JOIN gold_coast.opportunities_latest o
        ON o.contact_id = c.contact_id
),
ranked_calls AS (
    SELECT *
    FROM call_opportunity_candidates
    WHERE opportunity_rank = 1
),
classified AS (
    SELECT
        coalesce(nullif(actor_user_id, ''), 'unknown') AS actor_user_id,
        coalesce(nullif(opportunity_owner_user_id, ''), 'unknown') AS opportunity_owner_user_id,
        coalesce(nullif(source, ''), 'unknown') AS lead_source,
        coalesce(nullif(pipeline_name, ''), 'unknown') AS pipeline_name,
        CASE
            WHEN actor_user_id IS NULL OR actor_user_id = '' THEN 'actor_unknown'
            WHEN opportunity_owner_user_id IS NULL OR opportunity_owner_user_id = '' THEN 'owner_unknown'
            WHEN actor_user_id = opportunity_owner_user_id THEN 'actor_is_owner'
            ELSE 'actor_differs_from_owner'
        END AS ownership_alignment,
        call_message_id,
        contact_id,
        direction,
        coalesce(nullif(call_status, ''), nullif(status, ''), 'unknown') AS outcome_status,
        duration_seconds
    FROM ranked_calls
)
SELECT
    actor_user_id,
    opportunity_owner_user_id,
    ownership_alignment,
    lead_source,
    pipeline_name,
    count(*) AS calls_total,
    sum(CASE WHEN lower(coalesce(direction, '')) = 'outbound' THEN 1 ELSE 0 END) AS outbound_calls,
    sum(CASE WHEN lower(outcome_status) = 'completed' THEN 1 ELSE 0 END) AS completed_calls,
    count(DISTINCT contact_id) AS unique_contacts_called,
    round(avg(duration_seconds), 2) AS avg_duration_seconds
FROM classified
GROUP BY 1, 2, 3, 4, 5
ORDER BY ownership_alignment, calls_total DESC, actor_user_id, opportunity_owner_user_id
