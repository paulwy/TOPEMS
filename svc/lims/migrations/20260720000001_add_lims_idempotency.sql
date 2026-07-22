CREATE UNIQUE INDEX IF NOT EXISTS idx_lims_inspection_records_source_unique
ON lims_inspection_records(source_type, source_inspection_id)
WHERE source_type IS NOT NULL AND source_inspection_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lims_safety_tasks_source_unique
ON lims_safety_tasks(source_type, source_hazard_id)
WHERE source_type IS NOT NULL AND source_hazard_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_documents_source_unique
ON doc_documents(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
