use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

use topems_shared_auth::security::{DataMasking, EncryptionResult, FieldEncryptionService};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "org_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "position_id": "550e8400-e29b-41d4-a716-446655440003",
    "employee_number": "EMP001",
    "name": "张三",
    "gender": "男",
    "hire_date": "2020-06-01",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
}))]
pub struct Employee {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub id: Uuid,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440000")]
    pub tenant_id: Uuid,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub org_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440003")]
    pub position_id: Option<Uuid>,
    #[serde(alias = "employee_no")]
    #[schema(example = "EMP001")]
    pub employee_number: String,
    #[schema(example = "张三")]
    pub name: String,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "2020-06-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[serde(alias = "id_number")]
    #[schema(example = "110101199001011234")]
    pub id_card_number: Option<String>,
    #[schema(example = "北京市朝阳区建国路88号")]
    pub address: Option<String>,
    #[schema(example = "1990-01-01")]
    pub birth_date: Option<NaiveDate>,
    #[schema(example = "2020-07-01")]
    pub regular_date: Option<NaiveDate>,
    #[schema(example = 3)]
    pub probation_period: Option<i32>,
    #[sqlx(default)]
    #[schema(example = "研发部")]
    pub department_name: Option<String>,
    #[schema(example = "高级工程师")]
    pub position: Option<String>,
    #[schema(example = "P6")]
    pub joblevel: Option<String>,
    #[schema(example = "北京")]
    pub work_location: Option<String>,
    #[schema(example = "李经理")]
    pub report_to_name: Option<String>,
    #[schema(example = "本科")]
    pub education: Option<String>,
    #[sqlx(rename = "emergency_contact_name")]
    #[schema(example = "张父")]
    pub emergency_contact: Option<String>,
    #[sqlx(rename = "emergency_contact_phone")]
    #[schema(example = "13900139000")]
    pub emergency_phone: Option<String>,
    #[schema(example = "父亲")]
    pub emergency_relation: Option<String>,
    #[schema(example = "北京市海淀区")]
    pub hukou_location: Option<String>,
    #[schema(example = "表现优秀")]
    pub remark: Option<String>,
    #[schema(example = "full-time")]
    pub employee_type: Option<String>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440099")]
    pub user_id: Option<Uuid>,
    #[schema(example = "active")]
    pub status: String,
    #[schema(example = "2024-01-01T00:00:00Z")]
    pub created_at: DateTime<Utc>,
    #[schema(example = "2024-01-15T12:00:00Z")]
    pub updated_at: DateTime<Utc>,
}

impl Employee {
    pub fn encrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if let Some(id_card) = &self.id_card_number {
            self.id_card_number = Some(service.encrypt_to_string(id_card)?);
        }
        if let Some(phone) = &self.phone {
            self.phone = Some(service.encrypt_to_string(phone)?);
        }
        if let Some(email) = &self.email {
            self.email = Some(service.encrypt_to_string(email)?);
        }
        if let Some(addr) = &self.address {
            self.address = Some(service.encrypt_to_string(addr)?);
        }
        Ok(())
    }

    pub fn decrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if let Some(id_card) = &self.id_card_number {
            if id_card.starts_with('{') {
                self.id_card_number = Some(service.decrypt_string(id_card)?);
            }
        }
        if let Some(phone) = &self.phone {
            if phone.starts_with('{') {
                self.phone = Some(service.decrypt_string(phone)?);
            }
        }
        if let Some(email) = &self.email {
            if email.starts_with('{') {
                self.email = Some(service.decrypt_string(email)?);
            }
        }
        if let Some(addr) = &self.address {
            if addr.starts_with('{') {
                self.address = Some(service.decrypt_string(addr)?);
            }
        }
        Ok(())
    }

    pub fn mask_sensitive_fields(&mut self) {
        if let Some(phone) = &self.phone {
            self.phone = Some(DataMasking::phone(phone));
        }
        if let Some(email) = &self.email {
            self.email = Some(DataMasking::email(email));
        }
        if let Some(id_card) = &self.id_card_number {
            self.id_card_number = Some(DataMasking::id_card(id_card));
        }
        if let Some(addr) = &self.address {
            self.address = Some(DataMasking::address(addr));
        }
    }
}

#[allow(dead_code)]
pub struct EmployeeFinance {
    pub employee_id: Uuid,
    pub base_salary: Option<Decimal>,
    pub bonus: Option<Decimal>,
    pub allowance: Option<Decimal>,
    pub social_security: Option<Decimal>,
    pub housing_fund: Option<Decimal>,
    pub personal_income_tax: Option<Decimal>,
    pub net_salary: Option<Decimal>,
    pub bank_account: Option<String>,
    pub bank_name: Option<String>,
    pub cost_center: Option<String>,
    pub payroll_bank_account: Option<String>,
    pub salary_payment_status: String,
    pub annual_salary: Option<Decimal>,
    pub hourly_rate: Option<Decimal>,
    pub tax_exempt_allowance: Option<Decimal>,
    pub social_security_company: Option<Decimal>,
    pub housing_fund_company: Option<Decimal>,
    pub total_compensation: Option<Decimal>,
}

#[allow(dead_code)]
impl EmployeeFinance {
    pub fn encrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if let Some(account) = &self.bank_account {
            self.bank_account = Some(service.encrypt_to_string(account)?);
        }
        if let Some(account) = &self.payroll_bank_account {
            self.payroll_bank_account = Some(service.encrypt_to_string(account)?);
        }
        Ok(())
    }

    pub fn decrypt_fields(&mut self, service: &FieldEncryptionService) -> EncryptionResult<()> {
        if let Some(account) = &self.bank_account {
            if account.starts_with('{') {
                self.bank_account = Some(service.decrypt_string(account)?);
            }
        }
        if let Some(account) = &self.payroll_bank_account {
            if account.starts_with('{') {
                self.payroll_bank_account = Some(service.decrypt_string(account)?);
            }
        }
        Ok(())
    }

    pub fn mask_sensitive_fields(&mut self) {
        if let Some(account) = &self.bank_account {
            self.bank_account = Some(DataMasking::bank_card(account));
        }
        if let Some(account) = &self.payroll_bank_account {
            self.payroll_bank_account = Some(DataMasking::bank_card(account));
        }
    }
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
#[schema(example = json!({
    "org_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440002",
    "position_id": "550e8400-e29b-41d4-a716-446655440003",
    "employee_number": "EMP001",
    "name": "张三",
    "gender": "男",
    "hire_date": "2024-01-01",
    "email": "zhangsan@example.com",
    "phone": "13800138000"
}))]
pub struct CreateEmployeeRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub org_id: Uuid,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440002")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440003")]
    pub position_id: Option<Uuid>,
    #[serde(alias = "employee_no")]
    #[schema(example = "EMP001")]
    pub employee_number: String,
    #[schema(example = "张三")]
    pub name: String,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "2024-01-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[serde(alias = "id_number")]
    #[schema(example = "110101199001011234")]
    pub id_card_number: Option<String>,
    #[schema(example = "北京市朝阳区建国路88号")]
    pub address: Option<String>,
    #[schema(example = "1990-01-01")]
    pub birth_date: Option<NaiveDate>,
    #[schema(example = "2024-07-01")]
    pub regular_date: Option<NaiveDate>,
    #[schema(example = 3)]
    pub probation_period: Option<i32>,
    #[schema(example = "高级工程师")]
    pub position: Option<String>,
    #[schema(example = "P6")]
    pub joblevel: Option<String>,
    #[schema(example = "北京")]
    pub work_location: Option<String>,
    #[schema(example = "李经理")]
    pub report_to_name: Option<String>,
    #[schema(example = "本科")]
    pub education: Option<String>,
    #[schema(example = "张父")]
    pub emergency_contact: Option<String>,
    #[schema(example = "13900139000")]
    pub emergency_phone: Option<String>,
    #[schema(example = "父亲")]
    pub emergency_relation: Option<String>,
    #[schema(example = "北京市海淀区")]
    pub hukou_location: Option<String>,
    #[schema(example = "表现优秀")]
    pub remark: Option<String>,
    #[schema(example = "full-time")]
    pub employee_type: Option<String>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440099")]
    pub user_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
#[schema(example = json!({
    "org_id": "550e8400-e29b-41d4-a716-446655440001",
    "department_id": "550e8400-e29b-41d4-a716-446655440004",
    "position_id": "550e8400-e29b-41d4-a716-446655440005",
    "name": "张三",
    "gender": "男",
    "hire_date": "2020-06-01",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "status": "active"
}))]
pub struct UpdateEmployeeRequest {
    #[schema(example = "550e8400-e29b-41d4-a716-446655440001")]
    pub org_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440004")]
    pub department_id: Option<Uuid>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440005")]
    pub position_id: Option<Uuid>,
    #[schema(example = "张三")]
    pub name: Option<String>,
    #[schema(example = "男")]
    pub gender: Option<String>,
    #[schema(example = "2020-06-01")]
    pub hire_date: Option<NaiveDate>,
    #[schema(example = "zhangsan@example.com")]
    pub email: Option<String>,
    #[schema(example = "13800138000")]
    pub phone: Option<String>,
    #[serde(alias = "id_number")]
    #[schema(example = "110101199001011234")]
    pub id_card_number: Option<String>,
    #[schema(example = "北京市朝阳区建国路88号")]
    pub address: Option<String>,
    #[schema(example = "1990-01-01")]
    pub birth_date: Option<NaiveDate>,
    #[schema(example = "2024-07-01")]
    pub regular_date: Option<NaiveDate>,
    #[schema(example = 3)]
    pub probation_period: Option<i32>,
    #[schema(example = "高级工程师")]
    pub position: Option<String>,
    #[schema(example = "P6")]
    pub joblevel: Option<String>,
    #[schema(example = "北京")]
    pub work_location: Option<String>,
    #[schema(example = "李经理")]
    pub report_to_name: Option<String>,
    #[schema(example = "本科")]
    pub education: Option<String>,
    #[schema(example = "张父")]
    pub emergency_contact: Option<String>,
    #[schema(example = "13900139000")]
    pub emergency_phone: Option<String>,
    #[schema(example = "父亲")]
    pub emergency_relation: Option<String>,
    #[schema(example = "北京市海淀区")]
    pub hukou_location: Option<String>,
    #[schema(example = "表现优秀")]
    pub remark: Option<String>,
    #[schema(example = "full-time")]
    pub employee_type: Option<String>,
    #[schema(example = "550e8400-e29b-41d4-a716-446655440099")]
    pub user_id: Option<Uuid>,
    #[schema(example = "active")]
    pub status: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use topems_shared_auth::security::KeyManager;

    fn test_encryption_service() -> FieldEncryptionService {
        let key = [0x42u8; 32];
        let key_manager = KeyManager::new(&key);
        FieldEncryptionService::new(key_manager)
    }

    #[test]
    fn test_employee_struct() {
        let id = Uuid::new_v4();
        let org_id = Uuid::new_v4();
        let created_at = Utc::now();
        let updated_at = Utc::now();

        let employee = Employee {
            id,
            tenant_id: Uuid::new_v4(),
            org_id: Some(org_id),
            department_id: None,
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "John Doe".to_string(),
            gender: Some("male".to_string()),
            hire_date: Some(NaiveDate::from_ymd_opt(2024, 1, 15).expect("invalid date")),
            email: Some("john@example.com".to_string()),
            phone: Some("1234567890".to_string()),
            id_card_number: Some("110101199001011234".to_string()),
            address: Some("123 Main St".to_string()),
            birth_date: None,
            regular_date: None,
            probation_period: None,
            department_name: None,
            position: None,
            joblevel: None,
            work_location: None,
            report_to_name: None,
            education: None,
            emergency_contact: None,
            emergency_phone: None,
            emergency_relation: None,
            hukou_location: None,
            remark: None,
            employee_type: None,
            user_id: None,
            status: "active".to_string(),
            created_at,
            updated_at,
        };

        assert_eq!(employee.id, id);
        assert_eq!(employee.employee_number, "EMP001");
        assert_eq!(employee.name, "John Doe");
        assert_eq!(employee.status, "active");
        assert!(employee.email.is_some());
    }

    #[test]
    fn test_create_employee_request() {
        let org_id = Uuid::new_v4();
        let request = CreateEmployeeRequest {
            org_id,
            department_id: None,
            position_id: None,
            employee_number: "EMP002".to_string(),
            name: "Jane Smith".to_string(),
            gender: Some("female".to_string()),
            hire_date: None,
            email: Some("jane@example.com".to_string()),
            phone: None,
            id_card_number: None,
            address: None,
            birth_date: None,
            regular_date: None,
            probation_period: None,
            position: None,
            joblevel: None,
            work_location: None,
            report_to_name: None,
            education: None,
            emergency_contact: None,
            emergency_phone: None,
            emergency_relation: None,
            hukou_location: None,
            remark: None,
            employee_type: None,
            user_id: None,
        };

        assert_eq!(request.employee_number, "EMP002");
        assert_eq!(request.name, "Jane Smith");
    }

    #[test]
    fn test_update_employee_request() {
        let request = UpdateEmployeeRequest {
            org_id: None,
            department_id: None,
            position_id: None,
            name: Some("Jane Updated".to_string()),
            gender: None,
            hire_date: None,
            email: None,
            phone: None,
            id_card_number: None,
            address: None,
            birth_date: None,
            regular_date: None,
            probation_period: None,
            position: None,
            joblevel: None,
            work_location: None,
            report_to_name: None,
            education: None,
            emergency_contact: None,
            emergency_phone: None,
            emergency_relation: None,
            hukou_location: None,
            remark: None,
            employee_type: None,
            user_id: None,
            status: Some("inactive".to_string()),
        };

        assert_eq!(request.name, Some("Jane Updated".to_string()));
        assert_eq!(request.status, Some("inactive".to_string()));
    }

    #[test]
    fn test_employee_encryption_roundtrip() {
        let service = test_encryption_service();
        let id = Uuid::new_v4();
        let now = Utc::now();

        let mut employee = Employee {
            id,
            tenant_id: Uuid::new_v4(),
            org_id: None,
            department_id: None,
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "张三".to_string(),
            gender: Some("男".to_string()),
            hire_date: None,
            email: Some("zhangsan@example.com".to_string()),
            phone: Some("13800138000".to_string()),
            id_card_number: Some("110101199001011234".to_string()),
            address: Some("北京市朝阳区建国路88号".to_string()),
            birth_date: None,
            regular_date: None,
            probation_period: None,
            department_name: None,
            position: None,
            joblevel: None,
            work_location: None,
            report_to_name: None,
            education: None,
            emergency_contact: None,
            emergency_phone: None,
            emergency_relation: None,
            hukou_location: None,
            remark: None,
            employee_type: None,
            user_id: None,
            status: "active".to_string(),
            created_at: now,
            updated_at: now,
        };

        let original_email = employee.email.clone();
        let original_phone = employee.phone.clone();
        let original_id_card = employee.id_card_number.clone();
        let original_address = employee.address.clone();

        employee
            .encrypt_fields(&service)
            .expect("encryption failed");

        assert_ne!(employee.email, original_email);
        assert_ne!(employee.phone, original_phone);
        assert_ne!(employee.id_card_number, original_id_card);
        assert_ne!(employee.address, original_address);

        assert!(employee
            .email
            .as_ref()
            .expect("email should exist")
            .starts_with('{'));
        assert!(employee
            .phone
            .as_ref()
            .expect("phone should exist")
            .starts_with('{'));
        assert!(employee
            .id_card_number
            .as_ref()
            .expect("id_card_number should exist")
            .starts_with('{'));
        assert!(employee
            .address
            .as_ref()
            .expect("address should exist")
            .starts_with('{'));

        employee
            .decrypt_fields(&service)
            .expect("decryption failed");

        assert_eq!(employee.email, original_email);
        assert_eq!(employee.phone, original_phone);
        assert_eq!(employee.id_card_number, original_id_card);
        assert_eq!(employee.address, original_address);
    }

    #[test]
    fn test_employee_masking() {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let mut employee = Employee {
            id,
            tenant_id: Uuid::new_v4(),
            org_id: None,
            department_id: None,
            position_id: None,
            employee_number: "EMP001".to_string(),
            name: "张三".to_string(),
            gender: Some("男".to_string()),
            hire_date: None,
            email: Some("zhangsan@example.com".to_string()),
            phone: Some("13800138000".to_string()),
            id_card_number: Some("110101199001011234".to_string()),
            address: Some("北京市朝阳区建国路88号".to_string()),
            birth_date: None,
            regular_date: None,
            probation_period: None,
            department_name: None,
            position: None,
            joblevel: None,
            work_location: None,
            report_to_name: None,
            education: None,
            emergency_contact: None,
            emergency_phone: None,
            emergency_relation: None,
            hukou_location: None,
            remark: None,
            employee_type: None,
            user_id: None,
            status: "active".to_string(),
            created_at: now,
            updated_at: now,
        };

        employee.mask_sensitive_fields();

        assert!(employee
            .phone
            .as_ref()
            .expect("phone should exist")
            .contains("****"));
        assert!(employee
            .email
            .as_ref()
            .expect("email should exist")
            .contains("***"));
        assert!(employee
            .id_card_number
            .as_ref()
            .expect("id_card_number should exist")
            .contains("********"));
        assert!(employee
            .address
            .as_ref()
            .expect("address should exist")
            .contains("******"));
    }
}
