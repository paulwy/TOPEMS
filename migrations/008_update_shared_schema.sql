-- 更新 shared schema 的表结构

-- 添加缺失的列到 shared.employees
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'id_card_number') THEN
        ALTER TABLE shared.employees ADD COLUMN id_card_number VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'leave_date') THEN
        ALTER TABLE shared.employees ADD COLUMN leave_date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'education') THEN
        ALTER TABLE shared.employees ADD COLUMN education VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'marital_status') THEN
        ALTER TABLE shared.employees ADD COLUMN marital_status VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'nationality') THEN
        ALTER TABLE shared.employees ADD COLUMN nationality VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'bank_account') THEN
        ALTER TABLE shared.employees ADD COLUMN bank_account VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'bank_name') THEN
        ALTER TABLE shared.employees ADD COLUMN bank_name VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'created_by') THEN
        ALTER TABLE shared.employees ADD COLUMN created_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'updated_by') THEN
        ALTER TABLE shared.employees ADD COLUMN updated_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'employees' AND column_name = 'deleted_at') THEN
        ALTER TABLE shared.employees ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 添加缺失的列到 shared.companies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'companies' AND column_name = 'city') THEN
        ALTER TABLE shared.companies ADD COLUMN city VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'companies' AND column_name = 'country') THEN
        ALTER TABLE shared.companies ADD COLUMN country VARCHAR(100) DEFAULT '中国';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'companies' AND column_name = 'contact_person') THEN
        ALTER TABLE shared.companies ADD COLUMN contact_person VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'companies' AND column_name = 'created_by') THEN
        ALTER TABLE shared.companies ADD COLUMN created_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'companies' AND column_name = 'updated_by') THEN
        ALTER TABLE shared.companies ADD COLUMN updated_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'companies' AND column_name = 'deleted_at') THEN
        ALTER TABLE shared.companies ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 添加缺失的列到 shared.departments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'departments' AND column_name = 'created_by') THEN
        ALTER TABLE shared.departments ADD COLUMN created_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'departments' AND column_name = 'updated_by') THEN
        ALTER TABLE shared.departments ADD COLUMN updated_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'shared' AND table_name = 'departments' AND column_name = 'deleted_at') THEN
        ALTER TABLE shared.departments ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

SELECT 'Schema updated successfully!' as result;
