//! MES 业务逻辑 - 内存数据存储

use std::sync::Mutex;
use std::sync::OnceLock;

use super::models::*;

/// MES 服务
pub struct MesService {
    equipment: Vec<Equipment>,
    work_orders: Vec<WorkOrder>,
    quality_inspections: Vec<QualityInspection>,
    production_orders: Vec<ProductionOrder>,
    workstations: Vec<WorkStation>,
    production_records: Vec<ProductionRecord>,
    production_schedules: Vec<ProductionSchedule>,
}

static MES_SERVICE: OnceLock<Mutex<MesService>> = OnceLock::new();

impl MesService {
    fn new() -> Self {
        Self {
            equipment: vec![
                Equipment {
                    id: "1".to_string(),
                    name: "CNC加工中心01".to_string(),
                    code: "CNC-001".to_string(),
                    status: "running".to_string(),
                    location: "一号车间".to_string(),
                    product_line: "生产线A".to_string(),
                    temperature: Some(45.5),
                    vibration: Some(2.3),
                    running_hours: Some(1250.5),
                    last_maintenance: Some("2024-08-01".to_string()),
                    next_maintenance: Some("2024-10-01".to_string()),
                },
                Equipment {
                    id: "2".to_string(),
                    name: "注塑机02".to_string(),
                    code: "INJ-002".to_string(),
                    status: "idle".to_string(),
                    location: "二号车间".to_string(),
                    product_line: "生产线B".to_string(),
                    temperature: Some(32.0),
                    vibration: Some(1.2),
                    running_hours: Some(890.0),
                    last_maintenance: Some("2024-08-15".to_string()),
                    next_maintenance: Some("2024-10-15".to_string()),
                },
                Equipment {
                    id: "3".to_string(),
                    name: "焊接机器人03".to_string(),
                    code: "WLD-003".to_string(),
                    status: "maintenance".to_string(),
                    location: "一号车间".to_string(),
                    product_line: "生产线A".to_string(),
                    temperature: None,
                    vibration: None,
                    running_hours: Some(2100.0),
                    last_maintenance: Some("2024-09-10".to_string()),
                    next_maintenance: Some("2024-12-10".to_string()),
                },
                Equipment {
                    id: "4".to_string(),
                    name: "组装线04".to_string(),
                    code: "ASM-004".to_string(),
                    status: "running".to_string(),
                    location: "三号车间".to_string(),
                    product_line: "生产线C".to_string(),
                    temperature: Some(28.5),
                    vibration: Some(0.8),
                    running_hours: Some(560.0),
                    last_maintenance: Some("2024-09-01".to_string()),
                    next_maintenance: Some("2024-11-01".to_string()),
                },
                Equipment {
                    id: "5".to_string(),
                    name: "检测设备05".to_string(),
                    code: "QCS-005".to_string(),
                    status: "fault".to_string(),
                    location: "质检中心".to_string(),
                    product_line: "质检线".to_string(),
                    temperature: None,
                    vibration: None,
                    running_hours: Some(3400.0),
                    last_maintenance: Some("2024-07-01".to_string()),
                    next_maintenance: Some("2024-09-20".to_string()),
                },
            ],
            work_orders: vec![
                WorkOrder {
                    id: "1".to_string(),
                    order_no: "WO202409001".to_string(),
                    product_name: "智能手表外壳".to_string(),
                    quantity: 5000,
                    completed: 3200,
                    status: "in_progress".to_string(),
                    start_time: Some("2024-09-10T08:00:00Z".to_string()),
                    end_time: None,
                    priority: "high".to_string(),
                    assignee: Some("张三".to_string()),
                },
                WorkOrder {
                    id: "2".to_string(),
                    order_no: "WO202409002".to_string(),
                    product_name: "手机后盖".to_string(),
                    quantity: 10000,
                    completed: 10000,
                    status: "completed".to_string(),
                    start_time: Some("2024-09-05T08:00:00Z".to_string()),
                    end_time: Some("2024-09-09T17:00:00Z".to_string()),
                    priority: "medium".to_string(),
                    assignee: Some("李四".to_string()),
                },
                WorkOrder {
                    id: "3".to_string(),
                    order_no: "WO202409003".to_string(),
                    product_name: "蓝牙耳机充电盒".to_string(),
                    quantity: 3000,
                    completed: 0,
                    status: "pending".to_string(),
                    start_time: None,
                    end_time: None,
                    priority: "low".to_string(),
                    assignee: Some("王五".to_string()),
                },
            ],
            quality_inspections: vec![
                QualityInspection {
                    id: "1".to_string(),
                    inspection_no: "QI202409001".to_string(),
                    product_name: "智能手表外壳".to_string(),
                    batch_no: "B202409001".to_string(),
                    inspector: "赵六".to_string(),
                    result: "pass".to_string(),
                    defects: vec![],
                    inspected_at: "2024-09-12T10:00:00Z".to_string(),
                },
                QualityInspection {
                    id: "2".to_string(),
                    inspection_no: "QI202409002".to_string(),
                    product_name: "手机后盖".to_string(),
                    batch_no: "B202409002".to_string(),
                    inspector: "赵六".to_string(),
                    result: "fail".to_string(),
                    defects: vec!["表面划痕".to_string(), "尺寸偏差".to_string()],
                    inspected_at: "2024-09-11T14:30:00Z".to_string(),
                },
            ],
            production_orders: vec![
                ProductionOrder {
                    id: "1".to_string(),
                    order_no: "PO202409001".to_string(),
                    product_name: "智能手表外壳".to_string(),
                    quantity: 5000,
                    completed: 3200,
                    status: "in_progress".to_string(),
                    priority: "high".to_string(),
                    start_date: Some("2024-09-10".to_string()),
                    due_date: Some("2024-09-20".to_string()),
                    assignee: Some("张三".to_string()),
                    workstation: Some("CNC-001".to_string()),
                },
                ProductionOrder {
                    id: "2".to_string(),
                    order_no: "PO202409002".to_string(),
                    product_name: "手机后盖".to_string(),
                    quantity: 10000,
                    completed: 10000,
                    status: "completed".to_string(),
                    priority: "medium".to_string(),
                    start_date: Some("2024-09-05".to_string()),
                    due_date: Some("2024-09-10".to_string()),
                    assignee: Some("李四".to_string()),
                    workstation: Some("INJ-002".to_string()),
                },
                ProductionOrder {
                    id: "3".to_string(),
                    order_no: "PO202409003".to_string(),
                    product_name: "蓝牙耳机充电盒".to_string(),
                    quantity: 3000,
                    completed: 0,
                    status: "pending".to_string(),
                    priority: "low".to_string(),
                    start_date: Some("2024-09-15".to_string()),
                    due_date: Some("2024-09-25".to_string()),
                    assignee: Some("王五".to_string()),
                    workstation: Some("ASM-004".to_string()),
                },
            ],
            workstations: vec![
                WorkStation {
                    id: "1".to_string(),
                    name: "CNC加工工位".to_string(),
                    code: "WS-CNC-01".to_string(),
                    status: "running".to_string(),
                    line: "生产线A".to_string(),
                    operator: Some("张三".to_string()),
                    current_order: Some("PO202409001".to_string()),
                },
                WorkStation {
                    id: "2".to_string(),
                    name: "注塑工位".to_string(),
                    code: "WS-INJ-02".to_string(),
                    status: "idle".to_string(),
                    line: "生产线B".to_string(),
                    operator: Some("李四".to_string()),
                    current_order: None,
                },
                WorkStation {
                    id: "3".to_string(),
                    name: "焊接工位".to_string(),
                    code: "WS-WLD-03".to_string(),
                    status: "maintenance".to_string(),
                    line: "生产线A".to_string(),
                    operator: None,
                    current_order: None,
                },
                WorkStation {
                    id: "4".to_string(),
                    name: "组装工位".to_string(),
                    code: "WS-ASM-04".to_string(),
                    status: "running".to_string(),
                    line: "生产线C".to_string(),
                    operator: Some("王五".to_string()),
                    current_order: Some("PO202409003".to_string()),
                },
            ],
            production_records: vec![
                ProductionRecord {
                    id: "1".to_string(),
                    record_no: "PR202409001".to_string(),
                    order_no: "PO202409001".to_string(),
                    product_name: "智能手表外壳".to_string(),
                    quantity: 500,
                    good_quantity: 495,
                    defect_quantity: 5,
                    operator: "张三".to_string(),
                    workstation: "CNC-001".to_string(),
                    recorded_at: "2024-09-12T10:00:00Z".to_string(),
                },
                ProductionRecord {
                    id: "2".to_string(),
                    record_no: "PR202409002".to_string(),
                    order_no: "PO202409002".to_string(),
                    product_name: "手机后盖".to_string(),
                    quantity: 1000,
                    good_quantity: 990,
                    defect_quantity: 10,
                    operator: "李四".to_string(),
                    workstation: "INJ-002".to_string(),
                    recorded_at: "2024-09-11T14:30:00Z".to_string(),
                },
            ],
            production_schedules: vec![
                ProductionSchedule {
                    id: "1".to_string(),
                    schedule_no: "PS202409001".to_string(),
                    order_no: "PO202409001".to_string(),
                    product_name: "智能手表外壳".to_string(),
                    workstation: "CNC-001".to_string(),
                    planned_start: "2024-09-10T08:00:00Z".to_string(),
                    planned_end: "2024-09-15T17:00:00Z".to_string(),
                    status: "in_progress".to_string(),
                    priority: "high".to_string(),
                },
                ProductionSchedule {
                    id: "2".to_string(),
                    schedule_no: "PS202409002".to_string(),
                    order_no: "PO202409003".to_string(),
                    product_name: "蓝牙耳机充电盒".to_string(),
                    workstation: "ASM-004".to_string(),
                    planned_start: "2024-09-15T08:00:00Z".to_string(),
                    planned_end: "2024-09-20T17:00:00Z".to_string(),
                    status: "pending".to_string(),
                    priority: "low".to_string(),
                },
            ],
        }
    }

    pub fn instance() -> &'static Mutex<MesService> {
        MES_SERVICE.get_or_init(|| Mutex::new(Self::new()))
    }

    pub fn list_equipment(&self, page: i32, page_size: i32) -> PaginatedResponse<Equipment> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.equipment.len());
        let items = if start < self.equipment.len() {
            self.equipment[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.equipment.len() as i64,
            page,
            page_size,
        }
    }

    pub fn list_work_orders(&self, page: i32, page_size: i32) -> PaginatedResponse<WorkOrder> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.work_orders.len());
        let items = if start < self.work_orders.len() {
            self.work_orders[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.work_orders.len() as i64,
            page,
            page_size,
        }
    }

    pub fn get_wip_statistics(&self) -> WipStatistics {
        let total_wip: i32 = self
            .work_orders
            .iter()
            .map(|wo| wo.quantity - wo.completed)
            .sum();

        let mut status_map: std::collections::HashMap<String, i32> =
            std::collections::HashMap::new();
        for wo in &self.work_orders {
            *status_map.entry(wo.status.clone()).or_insert(0) += 1;
        }
        let by_status: Vec<StatusCount> = status_map
            .into_iter()
            .map(|(status, count)| StatusCount { status, count })
            .collect();

        let mut line_map: std::collections::HashMap<String, i32> = std::collections::HashMap::new();
        for eq in &self.equipment {
            *line_map.entry(eq.product_line.clone()).or_insert(0) += 1;
        }
        let by_line: Vec<LineCount> = line_map
            .into_iter()
            .map(|(line, count)| LineCount { line, count })
            .collect();

        WipStatistics {
            total_wip,
            by_status,
            by_line,
            average_cycle_time: Some(48.5),
            on_time_rate: Some(92.3),
        }
    }

    pub fn list_quality_inspections(
        &self,
        page: i32,
        page_size: i32,
    ) -> PaginatedResponse<QualityInspection> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.quality_inspections.len());
        let items = if start < self.quality_inspections.len() {
            self.quality_inspections[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.quality_inspections.len() as i64,
            page,
            page_size,
        }
    }

    pub fn list_production_orders(
        &self,
        page: i32,
        page_size: i32,
    ) -> PaginatedResponse<ProductionOrder> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.production_orders.len());
        let items = if start < self.production_orders.len() {
            self.production_orders[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.production_orders.len() as i64,
            page,
            page_size,
        }
    }

    pub fn list_workstations(&self, page: i32, page_size: i32) -> PaginatedResponse<WorkStation> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.workstations.len());
        let items = if start < self.workstations.len() {
            self.workstations[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.workstations.len() as i64,
            page,
            page_size,
        }
    }

    pub fn list_production_records(
        &self,
        page: i32,
        page_size: i32,
    ) -> PaginatedResponse<ProductionRecord> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.production_records.len());
        let items = if start < self.production_records.len() {
            self.production_records[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.production_records.len() as i64,
            page,
            page_size,
        }
    }

    pub fn list_production_schedules(
        &self,
        page: i32,
        page_size: i32,
    ) -> PaginatedResponse<ProductionSchedule> {
        let start = ((page - 1) * page_size) as usize;
        let end = std::cmp::min(start + page_size as usize, self.production_schedules.len());
        let items = if start < self.production_schedules.len() {
            self.production_schedules[start..end].to_vec()
        } else {
            vec![]
        };
        PaginatedResponse {
            items,
            total: self.production_schedules.len() as i64,
            page,
            page_size,
        }
    }

    pub fn get_equipment_statistics(&self) -> serde_json::Value {
        let running = self
            .equipment
            .iter()
            .filter(|e| e.status == "running")
            .count();
        let idle = self.equipment.iter().filter(|e| e.status == "idle").count();
        let maintenance = self
            .equipment
            .iter()
            .filter(|e| e.status == "maintenance")
            .count();
        let fault = self
            .equipment
            .iter()
            .filter(|e| e.status == "fault")
            .count();

        serde_json::json!({
            "total": self.equipment.len(),
            "running": running,
            "idle": idle,
            "maintenance": maintenance,
            "fault": fault,
            "utilization_rate": (running as f64 / self.equipment.len() as f64) * 100.0,
        })
    }

    pub fn get_dashboard_stats(&self) -> serde_json::Value {
        let equipment_running = self
            .equipment
            .iter()
            .filter(|e| e.status == "running")
            .count() as i32;
        let equipment_idle = self.equipment.iter().filter(|e| e.status == "idle").count() as i32;
        let equipment_maintenance = self
            .equipment
            .iter()
            .filter(|e| e.status == "maintenance")
            .count() as i32;
        let equipment_fault = self
            .equipment
            .iter()
            .filter(|e| e.status == "fault")
            .count() as i32;

        let orders_in_progress = self
            .work_orders
            .iter()
            .filter(|wo| wo.status == "in_progress")
            .count() as i32;
        let orders_completed = self
            .work_orders
            .iter()
            .filter(|wo| wo.status == "completed")
            .count() as i32;
        let orders_pending = self
            .work_orders
            .iter()
            .filter(|wo| wo.status == "pending")
            .count() as i32;

        serde_json::json!({
            "total_equipment": self.equipment.len(),
            "equipment_running": equipment_running,
            "equipment_idle": equipment_idle,
            "equipment_maintenance": equipment_maintenance,
            "equipment_fault": equipment_fault,
            "total_work_orders": self.work_orders.len(),
            "orders_in_progress": orders_in_progress,
            "orders_completed": orders_completed,
            "orders_pending": orders_pending,
            "total_inspections": self.quality_inspections.len(),
            "pass_rate": 85.5,
            "oee": 78.3,
        })
    }
}
