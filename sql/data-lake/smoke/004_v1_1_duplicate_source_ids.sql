-- Smoke check: V1.1 default query tables do not duplicate stable source IDs.
WITH duplicate_checks AS (
    SELECT
        'contacts_latest.contact_id' AS check_name,
        'gold_coast.contacts_latest' AS table_name,
        'contact_id' AS key_column,
        CAST(sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) AS bigint) AS duplicate_count,
        CAST(max(null_key_count) AS bigint) AS null_key_count
    FROM (
        SELECT contact_id AS stable_id, count(*) AS key_count, 0 AS null_key_count
        FROM gold_coast.contacts_latest
        WHERE contact_id IS NOT NULL
        GROUP BY contact_id
        UNION ALL
        SELECT '__null_keys__', 0, count(*)
        FROM gold_coast.contacts_latest
        WHERE contact_id IS NULL
    )

    UNION ALL
    SELECT
        'opportunities_latest.opportunity_id',
        'gold_coast.opportunities_latest',
        'opportunity_id',
        CAST(sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) AS bigint),
        CAST(max(null_key_count) AS bigint)
    FROM (
        SELECT opportunity_id AS stable_id, count(*) AS key_count, 0 AS null_key_count
        FROM gold_coast.opportunities_latest
        WHERE opportunity_id IS NOT NULL
        GROUP BY opportunity_id
        UNION ALL
        SELECT '__null_keys__', 0, count(*)
        FROM gold_coast.opportunities_latest
        WHERE opportunity_id IS NULL
    )

    UNION ALL
    SELECT
        'messages.message_id',
        'gold_coast.messages',
        'message_id',
        CAST(sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) AS bigint),
        CAST(max(null_key_count) AS bigint)
    FROM (
        SELECT message_id AS stable_id, count(*) AS key_count, 0 AS null_key_count
        FROM gold_coast.messages
        WHERE message_id IS NOT NULL
        GROUP BY message_id
        UNION ALL
        SELECT '__null_keys__', 0, count(*)
        FROM gold_coast.messages
        WHERE message_id IS NULL
    )

    UNION ALL
    SELECT
        'calls.call_message_id',
        'gold_coast.calls',
        'call_message_id',
        CAST(sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) AS bigint),
        CAST(max(null_key_count) AS bigint)
    FROM (
        SELECT call_message_id AS stable_id, count(*) AS key_count, 0 AS null_key_count
        FROM gold_coast.calls
        WHERE call_message_id IS NOT NULL
        GROUP BY call_message_id
        UNION ALL
        SELECT '__null_keys__', 0, count(*)
        FROM gold_coast.calls
        WHERE call_message_id IS NULL
    )

    UNION ALL
    SELECT
        'call_recordings.message_id',
        'gold_coast.call_recordings',
        'message_id',
        CAST(sum(CASE WHEN key_count > 1 THEN key_count - 1 ELSE 0 END) AS bigint),
        CAST(max(null_key_count) AS bigint)
    FROM (
        SELECT message_id AS stable_id, count(*) AS key_count, 0 AS null_key_count
        FROM gold_coast.call_recordings
        WHERE message_id IS NOT NULL
        GROUP BY message_id
        UNION ALL
        SELECT '__null_keys__', 0, count(*)
        FROM gold_coast.call_recordings
        WHERE message_id IS NULL
    )
)
SELECT
    'v1_1_duplicate_source_ids' AS smoke_check,
    check_name,
    table_name,
    key_column,
    duplicate_count,
    null_key_count,
    CASE WHEN duplicate_count = 0 AND null_key_count = 0 THEN 'passed' ELSE 'failed' END AS result
FROM duplicate_checks
ORDER BY table_name, key_column;
