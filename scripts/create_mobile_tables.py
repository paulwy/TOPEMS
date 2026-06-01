#!/usr/bin/env python3
import psycopg2

try:
    conn = psycopg2.connect("dbname=topems_mobile user=xingzhai host=localhost")
    cur = conn.cursor()

    tables = [
        """CREATE TABLE IF NOT EXISTS patrol_records (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            location_lat DOUBLE PRECISION NOT NULL,
            location_lng DOUBLE PRECISION NOT NULL,
            address VARCHAR(500),
            patrol_type VARCHAR(50) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'completed',
            checked_by VARCHAR(100) NOT NULL,
            checked_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS scan_records (
            id UUID PRIMARY KEY,
            barcode VARCHAR(255) NOT NULL,
            location_lat DOUBLE PRECISION NOT NULL,
            location_lng DOUBLE PRECISION NOT NULL,
            item_type VARCHAR(50) NOT NULL,
            quantity DOUBLE PRECISION,
            operator VARCHAR(100) NOT NULL,
            scanned_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS photo_evidences (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            location_lat DOUBLE PRECISION NOT NULL,
            location_lng DOUBLE PRECISION NOT NULL,
            address VARCHAR(500),
            file_url VARCHAR(500),
            recorded_by VARCHAR(100) NOT NULL,
            recorded_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS audio_recordings (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            location_lat DOUBLE PRECISION NOT NULL,
            location_lng DOUBLE PRECISION NOT NULL,
            address VARCHAR(500),
            duration_seconds INTEGER,
            file_url VARCHAR(500),
            recorded_by VARCHAR(100) NOT NULL,
            recorded_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS video_recordings (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            start_location_lat DOUBLE PRECISION NOT NULL,
            start_location_lng DOUBLE PRECISION NOT NULL,
            location_track JSONB,
            duration_seconds INTEGER,
            file_url VARCHAR(500),
            thumbnail_url VARCHAR(500),
            recorded_by VARCHAR(100) NOT NULL,
            recorded_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP NOT NULL
        )""",
        """CREATE TABLE IF NOT EXISTS mobile_tasks (
            id UUID PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            task_type VARCHAR(50) NOT NULL,
            priority VARCHAR(20) NOT NULL DEFAULT 'normal',
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            assignee VARCHAR(100),
            location_lat DOUBLE PRECISION,
            location_lng DOUBLE PRECISION,
            due_date DATE,
            completed_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )"""
    ]

    for sql in tables:
        cur.execute(sql)
        print(f"Table created successfully")

    conn.commit()
    cur.close()
    conn.close()
    print("All tables created successfully!")
except Exception as e:
    print(f"Error: {e}")
