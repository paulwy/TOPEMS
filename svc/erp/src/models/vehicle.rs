use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Vehicle {
    pub id: Uuid,
    pub plate_number: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub status: String,
    pub driver: Option<String>,
    pub last_service: Option<DateTime<Utc>>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVehicleRequest {
    pub plate_number: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub driver: Option<String>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVehicleRequest {
    pub plate_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub status: Option<String>,
    pub driver: Option<String>,
    pub last_service: Option<DateTime<Utc>>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct VehicleRequest {
    pub id: Uuid,
    pub vehicle_id: Uuid,
    pub vehicle_plate: String,
    pub requester: String,
    pub purpose: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub driver_required: bool,
    pub status: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVehicleRequestRequest {
    pub vehicle_id: Uuid,
    pub requester: String,
    pub purpose: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub driver_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVehicleRequestRequest {
    pub status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;
    use uuid::Uuid;

    fn sample_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    // ========== Vehicle ==========
    #[test]
    fn test_vehicle_serde_full() {
        let v = Vehicle {
            id: sample_uuid(),
            plate_number: "京A12345".into(),
            brand: Some("丰田".into()),
            model: Some("凯美瑞".into()),
            vehicle_type: Some("轿车".into()),
            status: "available".into(),
            driver: Some("王师傅".into()),
            last_service: Some(Utc::now()),
            mileage: Some(50000),
            fuel_type: Some("汽油".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let j = serde_json::to_value(&v).unwrap();
        let v2: Vehicle = serde_json::from_value(j).unwrap();
        assert_eq!(v.plate_number, v2.plate_number);
        assert_eq!(v.brand, v2.brand);
        assert_eq!(v.mileage, v2.mileage);
        assert_eq!(v.status, v2.status);
    }

    #[test]
    fn test_vehicle_minimal() {
        let v = Vehicle {
            id: sample_uuid(),
            plate_number: "沪B-00000".into(),
            brand: None,
            model: None,
            vehicle_type: None,
            status: "maintenance".into(),
            driver: None,
            last_service: None,
            mileage: None,
            fuel_type: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&v).unwrap();
        let v2: Vehicle = serde_json::from_str(&s).unwrap();
        assert_eq!(v2.plate_number, "沪B-00000");
        assert!(v2.brand.is_none());
        assert!(v2.mileage.is_none());
    }

    #[test]
    fn test_vehicle_negative_mileage() {
        let v = Vehicle {
            id: sample_uuid(),
            plate_number: "X".into(),
            brand: None,
            model: None,
            vehicle_type: None,
            status: "retired".into(),
            driver: None,
            last_service: None,
            mileage: Some(-100),
            fuel_type: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let j = serde_json::to_value(&v).unwrap();
        let v2: Vehicle = serde_json::from_value(j).unwrap();
        assert_eq!(v2.mileage, Some(-100));
    }

    #[test]
    fn test_create_vehicle_request_full() {
        let r = CreateVehicleRequest {
            plate_number: "粤Z-99999".into(),
            brand: Some("比亚迪".into()),
            model: Some("汉EV".into()),
            vehicle_type: Some("新能源".into()),
            driver: Some("赵司机".into()),
            mileage: Some(100),
            fuel_type: Some("纯电".into()),
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateVehicleRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.plate_number, "粤Z-99999");
        assert_eq!(r2.fuel_type, Some("纯电".into()));
    }

    #[test]
    fn test_update_vehicle_request() {
        let r = UpdateVehicleRequest {
            plate_number: Some("换牌了".into()),
            brand: None,
            model: Some("新车型".into()),
            vehicle_type: None,
            status: Some("in_use".into()),
            driver: Some("新司机".into()),
            last_service: Some(Utc::now()),
            mileage: Some(i32::MAX),
            fuel_type: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateVehicleRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.status, Some("in_use".into()));
        assert_eq!(r2.mileage, Some(i32::MAX));
    }

    // ========== VehicleRequest ==========
    #[test]
    fn test_vehicle_request_full() {
        let vr = VehicleRequest {
            id: sample_uuid(),
            vehicle_id: sample_uuid(),
            vehicle_plate: "京A12345".into(),
            requester: "员工甲".into(),
            purpose: "商务拜访客户".into(),
            start_time: Utc::now(),
            end_time: Utc::now(),
            driver_required: true,
            status: "pending".into(),
            approved_by: None,
            approved_at: None,
            rejected_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&vr).unwrap();
        let vr2: VehicleRequest = serde_json::from_value(v).unwrap();
        assert_eq!(vr.vehicle_plate, vr2.vehicle_plate);
        assert_eq!(vr.purpose, vr2.purpose);
        assert!(vr2.driver_required);
        assert_eq!(vr.status, vr2.status);
    }

    #[test]
    fn test_vehicle_request_no_driver_approved() {
        let vr = VehicleRequest {
            id: sample_uuid(),
            vehicle_id: sample_uuid(),
            vehicle_plate: "P".into(),
            requester: "乙".into(),
            purpose: "取快递".into(),
            start_time: Utc::now(),
            end_time: Utc::now(),
            driver_required: false,
            status: "approved".into(),
            approved_by: Some("主管".into()),
            approved_at: Some(Utc::now()),
            rejected_reason: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let s = serde_json::to_string(&vr).unwrap();
        let vr2: VehicleRequest = serde_json::from_str(&s).unwrap();
        assert!(!vr2.driver_required);
        assert_eq!(vr2.approved_by, Some("主管".into()));
    }

    #[test]
    fn test_vehicle_request_rejected() {
        let vr = VehicleRequest {
            id: sample_uuid(),
            vehicle_id: sample_uuid(),
            vehicle_plate: "R".into(),
            requester: "丙".into(),
            purpose: "私事".into(),
            start_time: Utc::now(),
            end_time: Utc::now(),
            driver_required: false,
            status: "rejected".into(),
            approved_by: Some("经理".into()),
            approved_at: None,
            rejected_reason: Some("不允许私用公车".into()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        let v = serde_json::to_value(&vr).unwrap();
        let vr2: VehicleRequest = serde_json::from_value(v).unwrap();
        assert_eq!(vr2.status, "rejected");
        assert_eq!(vr2.rejected_reason, Some("不允许私用公车".into()));
    }

    #[test]
    fn test_create_vehicle_request_request() {
        let r = CreateVehicleRequestRequest {
            vehicle_id: sample_uuid(),
            requester: "申请人".into(),
            purpose: "出差".into(),
            start_time: Utc::now(),
            end_time: Utc::now(),
            driver_required: true,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: CreateVehicleRequestRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.purpose, "出差");
        assert!(r2.driver_required);
    }

    #[test]
    fn test_update_vehicle_request_request() {
        let r = UpdateVehicleRequestRequest {
            status: Some("completed".into()),
            approved_by: Some("完成".into()),
            approved_at: Some(Utc::now()),
            rejected_reason: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        let r2: UpdateVehicleRequestRequest = serde_json::from_value(v).unwrap();
        assert_eq!(r2.status, Some("completed".into()));
        assert!(r2.rejected_reason.is_none());
    }
}
