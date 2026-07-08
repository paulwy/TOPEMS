# MES 模块前后端 API 对接情况报告

> 生成日期：2026-07-05

## 一、概览

| 指标 | 数值 |
|------|------|
| 前端 API 总数 | 149 |
| 后端 API 总数 | 26 |
| 已对接 API 数量 | 23 |
| 前端超前（有前端无后端） | 126 |
| 后端超前（有后端无前端） | 3 |
| 前端 API 对接率 | 15.4% |
| 后端 API 对接率 | 88.5% |
| 综合对接率 | 15.4% |

## 二、按模块统计

| 模块 | 前端 API 数 | 已对接数 | 对接率 |
|------|------------|----------|--------|
| equipment | 18 | 0 | 0% |
| material | 9 | 0 | 0% |
| materialRequirement | 8 | 3 | 38% |
| process | 10 | 0 | 0% |
| processFlow | 10 | 0 | 0% |
| productionKanban | 5 | 4 | 80% |
| productionOrder | 10 | 3 | 30% |
| productionProcess | 6 | 0 | 0% |
| productionRecord | 6 | 2 | 33% |
| productionSchedule | 7 | 2 | 29% |
| quality | 17 | 0 | 0% |
| team | 8 | 0 | 0% |
| traceability | 3 | 1 | 33% |
| wip | 8 | 4 | 50% |
| workOrder | 10 | 4 | 40% |
| workReport | 7 | 0 | 0% |
| workStation | 7 | 0 | 0% |

## 三、已对接的 API

共 23 个 API 前后端均已实现。

| 方法 | 路径 | 前端模块 | 前端函数 | 后端 Handler |
|------|------|----------|----------|-------------|
| GET | `/api/mes/kanban/dashboard` | productionKanban | getDashboard | get_dashboard |
| GET | `/api/mes/kanban/equipment-status` | productionKanban | getEquipmentStatus | get_equipment_status |
| GET | `/api/mes/kanban/order-progress` | productionKanban | getOrderProgress | get_order_progress |
| GET | `/api/mes/kanban/quality-trend` | productionKanban | getQualityTrend | get_quality_trend |
| POST | `/api/mes/material-requirements/calculate` | materialRequirement | calculate | calculate_requirements |
| PUT | `/api/mes/material-requirements/{param}/confirm` | materialRequirement | confirm | confirm_requirement |
| PUT | `/api/mes/material-requirements/{param}/release` | materialRequirement | release | release_requirement |
| POST | `/api/mes/orders/from-erp` | productionOrder | createFromErp | create_from_erp |
| PUT | `/api/mes/orders/{param}/cancel` | productionOrder | cancel | cancel_production_order |
| PUT | `/api/mes/orders/{param}/start` | productionOrder | start | start_production_order |
| GET | `/api/mes/records` | productionRecord | list | list_records |
| POST | `/api/mes/records` | productionRecord | create | create_record |
| GET | `/api/mes/schedules/gantt` | productionSchedule | getGanttData | get_gantt_data |
| PUT | `/api/mes/schedules/{param}/adjust` | productionSchedule | adjust | adjust_schedule |
| GET | `/api/mes/traceability/chain` | traceability | getTraceChain | get_trace_chain |
| GET | `/api/mes/wips` | wip | list | list_wips |
| POST | `/api/mes/wips` | wip | create | create_wip |
| GET | `/api/mes/wips/statistics` | wip | getStatistics | get_wip_statistics |
| POST | `/api/mes/wips/transfer` | wip | transfer | transfer_wip |
| PUT | `/api/mes/work-orders/{param}/cancel` | workOrder | cancel | cancel_work_order |
| PUT | `/api/mes/work-orders/{param}/pause` | workOrder | pause | pause_work_order |
| PUT | `/api/mes/work-orders/{param}/resume` | workOrder | resume | resume_work_order |
| PUT | `/api/mes/work-orders/{param}/start` | workOrder | start | start_work_order |

## 四、前端超前的 API（前端有，后端没有）

共 126 个 API 仅前端实现，后端尚未提供。

### equipment（18个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/equipment` | list |
| POST | `/api/mes/equipment` | create |
| GET | `/api/mes/equipment-oee` | list |
| POST | `/api/mes/equipment-oee` | create |
| GET | `/api/mes/equipment-oee/statistics` | getStatistics |
| DELETE | `/api/mes/equipment-oee/{param}` | delete |
| GET | `/api/mes/equipment-oee/{param}` | get |
| PUT | `/api/mes/equipment-oee/{param}` | update |
| GET | `/api/mes/equipment/statistics` | getStatistics |
| DELETE | `/api/mes/equipment/{param}` | delete |
| GET | `/api/mes/equipment/{param}` | get |
| PUT | `/api/mes/equipment/{param}` | update |
| POST | `/api/mes/equipment/{param}/maintenance` | maintenance |
| GET | `/api/mes/inspections` | listInspections |
| POST | `/api/mes/inspections` | createInspection |
| GET | `/api/mes/maintenances` | listMaintenances |
| POST | `/api/mes/maintenances` | createMaintenance |
| PUT | `/api/mes/maintenances/{param}/status` | updateMaintenanceStatus |

### material（9个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/boms` | list |
| POST | `/api/mes/boms` | create |
| DELETE | `/api/mes/boms/{param}` | delete |
| GET | `/api/mes/boms/{param}` | get |
| PUT | `/api/mes/boms/{param}` | update |
| GET | `/api/mes/material-issues` | list |
| POST | `/api/mes/material-issues` | create |
| GET | `/api/mes/material-returns` | list |
| POST | `/api/mes/material-returns` | create |

### materialRequirement（5个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/material-requirements` | list |
| POST | `/api/mes/material-requirements` | create |
| DELETE | `/api/mes/material-requirements/{param}` | delete |
| GET | `/api/mes/material-requirements/{param}` | get |
| PUT | `/api/mes/material-requirements/{param}` | update |

### process（10个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/process-routes` | list |
| POST | `/api/mes/process-routes` | create |
| DELETE | `/api/mes/process-routes/{param}` | delete |
| GET | `/api/mes/process-routes/{param}` | get |
| PUT | `/api/mes/process-routes/{param}` | update |
| GET | `/api/mes/process-routes/{param}/steps` | getSteps |
| POST | `/api/mes/process-routes/{param}/steps` | addStep |
| PUT | `/api/mes/process-routes/{param}/steps/reorder` | reorderSteps |
| DELETE | `/api/mes/process-routes/{param}/steps/{param}` | removeStep |
| PUT | `/api/mes/process-routes/{param}/steps/{param}` | updateStep |

### processFlow（10个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/process-flows` | list |
| POST | `/api/mes/process-flows` | create |
| DELETE | `/api/mes/process-flows/{param}` | delete |
| GET | `/api/mes/process-flows/{param}` | get |
| PUT | `/api/mes/process-flows/{param}` | update |
| GET | `/api/mes/process-flows/{param}/capacity` | analyzeCapacity |
| GET | `/api/mes/process-flows/{param}/steps` | getSteps |
| POST | `/api/mes/process-flows/{param}/steps` | addStep |
| DELETE | `/api/mes/process-flows/{param}/steps/{param}` | removeStep |
| PUT | `/api/mes/process-flows/{param}/steps/{param}` | updateStep |

### productionKanban（1个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/kanban/workstation-status` | getWorkstationStatus |

### productionOrder（7个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/orders` | list |
| POST | `/api/mes/orders` | create |
| DELETE | `/api/mes/orders/{param}` | delete |
| GET | `/api/mes/orders/{param}` | get |
| PUT | `/api/mes/orders/{param}` | update |
| PUT | `/api/mes/orders/{param}/complete` | complete |
| PUT | `/api/mes/orders/{param}/release` | release |

### productionProcess（6个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/processes` | list |
| POST | `/api/mes/processes` | create |
| DELETE | `/api/mes/processes/{param}` | delete |
| GET | `/api/mes/processes/{param}` | get |
| PUT | `/api/mes/processes/{param}` | update |
| PUT | `/api/mes/processes/{param}/deactivate` | deactivate |

### productionRecord（4个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| DELETE | `/api/mes/records/{param}` | delete |
| GET | `/api/mes/records/{param}` | get |
| PUT | `/api/mes/records/{param}` | update |
| PUT | `/api/mes/records/{param}/complete` | complete |

### productionSchedule（5个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/schedules` | list |
| POST | `/api/mes/schedules` | create |
| DELETE | `/api/mes/schedules/{param}` | delete |
| GET | `/api/mes/schedules/{param}` | get |
| PUT | `/api/mes/schedules/{param}` | update |

### quality（17个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/quality/inspections` | listInspections |
| POST | `/api/mes/quality/inspections` | createInspection |
| DELETE | `/api/mes/quality/inspections/{param}` | deleteInspection |
| GET | `/api/mes/quality/inspections/{param}` | getInspection |
| PUT | `/api/mes/quality/inspections/{param}` | updateInspection |
| GET | `/api/mes/quality/patrols` | listPatrolInspections |
| POST | `/api/mes/quality/patrols` | createPatrolInspection |
| DELETE | `/api/mes/quality/patrols/{param}` | deletePatrolInspection |
| GET | `/api/mes/quality/patrols/{param}` | getPatrolInspection |
| PUT | `/api/mes/quality/patrols/{param}` | updatePatrolInspection |
| GET | `/api/mes/quality/patrols/{param}/items` | getPatrolItems |
| POST | `/api/mes/quality/patrols/{param}/items` | addPatrolItem |
| GET | `/api/mes/quality/standards` | listStandards |
| POST | `/api/mes/quality/standards` | createStandard |
| DELETE | `/api/mes/quality/standards/{param}` | deleteStandard |
| GET | `/api/mes/quality/standards/{param}` | getStandard |
| PUT | `/api/mes/quality/standards/{param}` | updateStandard |

### team（8个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/teams` | list |
| POST | `/api/mes/teams` | create |
| DELETE | `/api/mes/teams/{param}` | delete |
| GET | `/api/mes/teams/{param}` | get |
| PUT | `/api/mes/teams/{param}` | update |
| GET | `/api/mes/teams/{param}/members` | getMembers |
| POST | `/api/mes/teams/{param}/members` | addMember |
| DELETE | `/api/mes/teams/{param}/members/{param}` | removeMember |

### traceability（2个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/traceability/backward/{param}` | backwardTraceability |
| GET | `/api/mes/traceability/forward/{param}` | forwardTraceability |

### wip（4个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/wips/transfers` | listTransfers |
| DELETE | `/api/mes/wips/{param}` | delete |
| GET | `/api/mes/wips/{param}` | get |
| PUT | `/api/mes/wips/{param}` | update |

### workOrder（6个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/work-orders` | list |
| POST | `/api/mes/work-orders` | create |
| DELETE | `/api/mes/work-orders/{param}` | delete |
| GET | `/api/mes/work-orders/{param}` | get |
| PUT | `/api/mes/work-orders/{param}` | update |
| PUT | `/api/mes/work-orders/{param}/complete` | complete |

### workReport（7个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/work-reports` | list |
| POST | `/api/mes/work-reports` | create |
| DELETE | `/api/mes/work-reports/{param}` | delete |
| GET | `/api/mes/work-reports/{param}` | get |
| PUT | `/api/mes/work-reports/{param}` | update |
| PUT | `/api/mes/work-reports/{param}/approve` | approve |
| PUT | `/api/mes/work-reports/{param}/reject` | reject |

### workStation（7个）

| 方法 | 路径 | 前端函数 |
|------|------|----------|
| GET | `/api/mes/workstations` | list |
| POST | `/api/mes/workstations` | create |
| DELETE | `/api/mes/workstations/{param}` | delete |
| GET | `/api/mes/workstations/{param}` | get |
| PUT | `/api/mes/workstations/{param}` | update |
| PUT | `/api/mes/workstations/{param}/activate` | activate |
| PUT | `/api/mes/workstations/{param}/deactivate` | deactivate |

## 五、后端超前的 API（后端有，前端没有）

共 3 个 API 仅后端实现，前端尚未对接。

| 方法 | 路径 | 后端 Handler | 后端模块 |
|------|------|-------------|----------|
| POST | `/api/mes/records/{id}/complete` | complete_record | production_record |
| GET | `/api/mes/traceability/quality-records` | list_quality_records | quality_traceability |
| GET | `/api/mes/wips/{wip_id}/transfers` | list_wip_transfers | wip |

## 六、前端 API 完整列表

### equipment（18个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/equipment` | list |
| POST | `/api/mes/equipment` | create |
| GET | `/api/mes/equipment-oee` | list |
| POST | `/api/mes/equipment-oee` | create |
| GET | `/api/mes/equipment-oee/statistics` | getStatistics |
| DELETE | `/api/mes/equipment-oee/{param}` | delete |
| GET | `/api/mes/equipment-oee/{param}` | get |
| PUT | `/api/mes/equipment-oee/{param}` | update |
| GET | `/api/mes/equipment/statistics` | getStatistics |
| DELETE | `/api/mes/equipment/{param}` | delete |
| GET | `/api/mes/equipment/{param}` | get |
| PUT | `/api/mes/equipment/{param}` | update |
| POST | `/api/mes/equipment/{param}/maintenance` | maintenance |
| GET | `/api/mes/inspections` | listInspections |
| POST | `/api/mes/inspections` | createInspection |
| GET | `/api/mes/maintenances` | listMaintenances |
| POST | `/api/mes/maintenances` | createMaintenance |
| PUT | `/api/mes/maintenances/{param}/status` | updateMaintenanceStatus |

### material（9个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/boms` | list |
| POST | `/api/mes/boms` | create |
| DELETE | `/api/mes/boms/{param}` | delete |
| GET | `/api/mes/boms/{param}` | get |
| PUT | `/api/mes/boms/{param}` | update |
| GET | `/api/mes/material-issues` | list |
| POST | `/api/mes/material-issues` | create |
| GET | `/api/mes/material-returns` | list |
| POST | `/api/mes/material-returns` | create |

### materialRequirement（8个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/material-requirements` | list |
| POST | `/api/mes/material-requirements` | create |
| POST | `/api/mes/material-requirements/calculate` | calculate |
| DELETE | `/api/mes/material-requirements/{param}` | delete |
| GET | `/api/mes/material-requirements/{param}` | get |
| PUT | `/api/mes/material-requirements/{param}` | update |
| PUT | `/api/mes/material-requirements/{param}/confirm` | confirm |
| PUT | `/api/mes/material-requirements/{param}/release` | release |

### process（10个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/process-routes` | list |
| POST | `/api/mes/process-routes` | create |
| DELETE | `/api/mes/process-routes/{param}` | delete |
| GET | `/api/mes/process-routes/{param}` | get |
| PUT | `/api/mes/process-routes/{param}` | update |
| GET | `/api/mes/process-routes/{param}/steps` | getSteps |
| POST | `/api/mes/process-routes/{param}/steps` | addStep |
| PUT | `/api/mes/process-routes/{param}/steps/reorder` | reorderSteps |
| DELETE | `/api/mes/process-routes/{param}/steps/{param}` | removeStep |
| PUT | `/api/mes/process-routes/{param}/steps/{param}` | updateStep |

### processFlow（10个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/process-flows` | list |
| POST | `/api/mes/process-flows` | create |
| DELETE | `/api/mes/process-flows/{param}` | delete |
| GET | `/api/mes/process-flows/{param}` | get |
| PUT | `/api/mes/process-flows/{param}` | update |
| GET | `/api/mes/process-flows/{param}/capacity` | analyzeCapacity |
| GET | `/api/mes/process-flows/{param}/steps` | getSteps |
| POST | `/api/mes/process-flows/{param}/steps` | addStep |
| DELETE | `/api/mes/process-flows/{param}/steps/{param}` | removeStep |
| PUT | `/api/mes/process-flows/{param}/steps/{param}` | updateStep |

### productionKanban（5个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/kanban/dashboard` | getDashboard |
| GET | `/api/mes/kanban/equipment-status` | getEquipmentStatus |
| GET | `/api/mes/kanban/order-progress` | getOrderProgress |
| GET | `/api/mes/kanban/quality-trend` | getQualityTrend |
| GET | `/api/mes/kanban/workstation-status` | getWorkstationStatus |

### productionOrder（10个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/orders` | list |
| POST | `/api/mes/orders` | create |
| POST | `/api/mes/orders/from-erp` | createFromErp |
| DELETE | `/api/mes/orders/{param}` | delete |
| GET | `/api/mes/orders/{param}` | get |
| PUT | `/api/mes/orders/{param}` | update |
| PUT | `/api/mes/orders/{param}/cancel` | cancel |
| PUT | `/api/mes/orders/{param}/complete` | complete |
| PUT | `/api/mes/orders/{param}/release` | release |
| PUT | `/api/mes/orders/{param}/start` | start |

### productionProcess（6个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/processes` | list |
| POST | `/api/mes/processes` | create |
| DELETE | `/api/mes/processes/{param}` | delete |
| GET | `/api/mes/processes/{param}` | get |
| PUT | `/api/mes/processes/{param}` | update |
| PUT | `/api/mes/processes/{param}/deactivate` | deactivate |

### productionRecord（6个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/records` | list |
| POST | `/api/mes/records` | create |
| DELETE | `/api/mes/records/{param}` | delete |
| GET | `/api/mes/records/{param}` | get |
| PUT | `/api/mes/records/{param}` | update |
| PUT | `/api/mes/records/{param}/complete` | complete |

### productionSchedule（7个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/schedules` | list |
| POST | `/api/mes/schedules` | create |
| GET | `/api/mes/schedules/gantt` | getGanttData |
| DELETE | `/api/mes/schedules/{param}` | delete |
| GET | `/api/mes/schedules/{param}` | get |
| PUT | `/api/mes/schedules/{param}` | update |
| PUT | `/api/mes/schedules/{param}/adjust` | adjust |

### quality（17个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/quality/inspections` | listInspections |
| POST | `/api/mes/quality/inspections` | createInspection |
| DELETE | `/api/mes/quality/inspections/{param}` | deleteInspection |
| GET | `/api/mes/quality/inspections/{param}` | getInspection |
| PUT | `/api/mes/quality/inspections/{param}` | updateInspection |
| GET | `/api/mes/quality/patrols` | listPatrolInspections |
| POST | `/api/mes/quality/patrols` | createPatrolInspection |
| DELETE | `/api/mes/quality/patrols/{param}` | deletePatrolInspection |
| GET | `/api/mes/quality/patrols/{param}` | getPatrolInspection |
| PUT | `/api/mes/quality/patrols/{param}` | updatePatrolInspection |
| GET | `/api/mes/quality/patrols/{param}/items` | getPatrolItems |
| POST | `/api/mes/quality/patrols/{param}/items` | addPatrolItem |
| GET | `/api/mes/quality/standards` | listStandards |
| POST | `/api/mes/quality/standards` | createStandard |
| DELETE | `/api/mes/quality/standards/{param}` | deleteStandard |
| GET | `/api/mes/quality/standards/{param}` | getStandard |
| PUT | `/api/mes/quality/standards/{param}` | updateStandard |

### team（8个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/teams` | list |
| POST | `/api/mes/teams` | create |
| DELETE | `/api/mes/teams/{param}` | delete |
| GET | `/api/mes/teams/{param}` | get |
| PUT | `/api/mes/teams/{param}` | update |
| GET | `/api/mes/teams/{param}/members` | getMembers |
| POST | `/api/mes/teams/{param}/members` | addMember |
| DELETE | `/api/mes/teams/{param}/members/{param}` | removeMember |

### traceability（3个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/traceability/backward/{param}` | backwardTraceability |
| GET | `/api/mes/traceability/chain` | getTraceChain |
| GET | `/api/mes/traceability/forward/{param}` | forwardTraceability |

### wip（8个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/wips` | list |
| POST | `/api/mes/wips` | create |
| GET | `/api/mes/wips/statistics` | getStatistics |
| POST | `/api/mes/wips/transfer` | transfer |
| GET | `/api/mes/wips/transfers` | listTransfers |
| DELETE | `/api/mes/wips/{param}` | delete |
| GET | `/api/mes/wips/{param}` | get |
| PUT | `/api/mes/wips/{param}` | update |

### workOrder（10个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/work-orders` | list |
| POST | `/api/mes/work-orders` | create |
| DELETE | `/api/mes/work-orders/{param}` | delete |
| GET | `/api/mes/work-orders/{param}` | get |
| PUT | `/api/mes/work-orders/{param}` | update |
| PUT | `/api/mes/work-orders/{param}/cancel` | cancel |
| PUT | `/api/mes/work-orders/{param}/complete` | complete |
| PUT | `/api/mes/work-orders/{param}/pause` | pause |
| PUT | `/api/mes/work-orders/{param}/resume` | resume |
| PUT | `/api/mes/work-orders/{param}/start` | start |

### workReport（7个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/work-reports` | list |
| POST | `/api/mes/work-reports` | create |
| DELETE | `/api/mes/work-reports/{param}` | delete |
| GET | `/api/mes/work-reports/{param}` | get |
| PUT | `/api/mes/work-reports/{param}` | update |
| PUT | `/api/mes/work-reports/{param}/approve` | approve |
| PUT | `/api/mes/work-reports/{param}/reject` | reject |

### workStation（7个）

| 方法 | 路径 | 函数名 |
|------|------|--------|
| GET | `/api/mes/workstations` | list |
| POST | `/api/mes/workstations` | create |
| DELETE | `/api/mes/workstations/{param}` | delete |
| GET | `/api/mes/workstations/{param}` | get |
| PUT | `/api/mes/workstations/{param}` | update |
| PUT | `/api/mes/workstations/{param}/activate` | activate |
| PUT | `/api/mes/workstations/{param}/deactivate` | deactivate |

## 七、后端 API 完整列表

共 26 个业务 API（排除系统路由）。

| 方法 | 路径 | Handler | 模块 |
|------|------|---------|------|
| GET | `/api/mes/kanban/dashboard` | get_dashboard | production_kanban |
| GET | `/api/mes/kanban/equipment-status` | get_equipment_status | production_kanban |
| GET | `/api/mes/kanban/order-progress` | get_order_progress | production_kanban |
| GET | `/api/mes/kanban/quality-trend` | get_quality_trend | production_kanban |
| POST | `/api/mes/material-requirements/calculate` | calculate_requirements | material_requirement |
| PUT | `/api/mes/material-requirements/{id}/confirm` | confirm_requirement | material_requirement |
| PUT | `/api/mes/material-requirements/{id}/release` | release_requirement | material_requirement |
| POST | `/api/mes/orders/from-erp` | create_from_erp | production_order |
| PUT | `/api/mes/orders/{id}/cancel` | cancel_production_order | production_order |
| PUT | `/api/mes/orders/{id}/start` | start_production_order | production_order |
| GET | `/api/mes/records` | list_records | production_record |
| POST | `/api/mes/records` | create_record | production_record |
| POST | `/api/mes/records/{id}/complete` | complete_record | production_record |
| GET | `/api/mes/schedules/gantt` | get_gantt_data | production_scheduling |
| PUT | `/api/mes/schedules/{id}/adjust` | adjust_schedule | production_scheduling |
| GET | `/api/mes/traceability/chain` | get_trace_chain | quality_traceability |
| GET | `/api/mes/traceability/quality-records` | list_quality_records | quality_traceability |
| GET | `/api/mes/wips` | list_wips | wip |
| POST | `/api/mes/wips` | create_wip | wip |
| GET | `/api/mes/wips/statistics` | get_wip_statistics | wip |
| POST | `/api/mes/wips/transfer` | transfer_wip | wip |
| GET | `/api/mes/wips/{wip_id}/transfers` | list_wip_transfers | wip |
| PUT | `/api/mes/work-orders/{id}/cancel` | cancel_work_order | work_order |
| PUT | `/api/mes/work-orders/{id}/pause` | pause_work_order | work_order |
| PUT | `/api/mes/work-orders/{id}/resume` | resume_work_order | work_order |
| PUT | `/api/mes/work-orders/{id}/start` | start_work_order | work_order |
