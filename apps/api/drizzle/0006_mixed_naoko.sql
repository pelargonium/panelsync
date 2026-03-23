ALTER TYPE "bible_entry_type" RENAME TO "entity_type";
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'bible';
ALTER TYPE "entity_type" ADD VALUE IF NOT EXISTS 'folder';

ALTER TYPE "dossier_entity_type" RENAME VALUE 'bible_entry' TO 'entity';
