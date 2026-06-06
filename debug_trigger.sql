CREATE TABLE IF NOT EXISTS erp.department_insert_log (
    id SERIAL PRIMARY KEY,
    inserted_at TIMESTAMPTZ DEFAULT NOW(),
    query_text TEXT,
    application_name TEXT,
    client_addr TEXT
);

CREATE OR REPLACE FUNCTION log_department_insert() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO erp.department_insert_log (query_text, application_name, client_addr)
    VALUES (current_query(), current_setting('application_name'), inet_client_addr());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_department_insert ON erp.departments;
CREATE TRIGGER trg_log_department_insert AFTER INSERT ON erp.departments
FOR EACH ROW EXECUTE FUNCTION log_department_insert();