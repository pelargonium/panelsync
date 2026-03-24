ALTER TABLE "bible_entries" ADD COLUMN "position" real;
UPDATE bible_entries
SET position = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY universe_id ORDER BY created_at) AS rn
  FROM bible_entries
) sub
WHERE bible_entries.id = sub.id;
