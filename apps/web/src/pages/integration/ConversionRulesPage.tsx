import React, { useEffect, useState } from "react";
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button as MuiButton, Select, MenuItem, Switch, IconButton } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { integrationApi } from "@/api/integration";
import type { ConversionRule, CreateConversionRuleRequest, UpdateConversionRuleRequest, FieldMapping, RuleStatus, TriggerType } from "@/api/integration";
import { logger } from "@/utils/logger";
const SYSTEMS = ["erp", "hrm", "mes", "pm", "iam", "srm", "wms", "scm", "qms", "lims"];
const ENTITIES: Record<string, string[]> = {
 erp: ["sales_order", "purchase_order", "customer", "supplier"],
 hrm: ["employee", "department", "position", "payroll"],
 mes: ["production_order", "workstation", "operation"],
 pm: ["project", "task", "milestone"],
 iam: ["account", "role", "permission"],
 srm: ["supplier", "supplier_contract", "supplier_evaluation"],
 wms: ["inventory", "warehouse", "location"],
 scm: ["supply", "purchase_request", "delivery"],
 qms: ["inspection", "nonconformance", "audit"],
 lims: ["sample", "test", "instrument"],
};
const ConversionRulesPage: React.FC = () => {
 const [rules, setRules] = useState<ConversionRule[]>([]);
 const [loading, setLoading] = useState(true);
 const [openDialog, setOpenDialog] = useState(false);
 const [editingRule, setEditingRule] = useState<ConversionRule | null>(null);
 const [formData, setFormData] = useState<CreateConversionRuleRequest>({
 code: "",
 name: "",
 description: undefined,
 source_system: "erp",
 source_entity: "sales_order",
 target_system: "mes",
 target_entity: "production_order",
 trigger_type: "event",
 field_mappings: [{ source_field: "", target_field: "" }],
 });
 const [showExecutions, setShowExecutions] = useState<string | null>(null);
 const [executions, setExecutions] = useState<{
 [key: string]: any[];
 }>({});
 const loadData = async () => {
 try {
 setLoading(true);
 const res = await integrationApi.listConversionRules();
 if (res.success && res.data !== undefined) {
 setRules(res.data);
 }
 }
 catch (error) {
 logger.error("Error loading conversion rules:", error);
 }
 finally {
 setLoading(false);
 }
 };
 useEffect(() => {
 loadData();
 }, []);
 const handleOpenCreateDialog = () => {
 setEditingRule(null);
 setFormData({
 code: "",
 name: "",
 description: undefined,
 source_system: "erp",
 source_entity: ENTITIES["erp"][0],
 target_system: "mes",
 target_entity: ENTITIES["mes"][0],
 trigger_type: "event",
 field_mappings: [{ source_field: "", target_field: "" }],
 });
 setOpenDialog(true);
 };
 const handleOpenEditDialog = (rule: ConversionRule) => {
 setEditingRule(rule);
 setFormData({
 code: rule.code,
 name: rule.name,
 description: rule.description,
 source_system: rule.source_system,
 source_entity: rule.source_entity,
 target_system: rule.target_system,
 target_entity: rule.target_entity,
 trigger_type: rule.trigger_type,
 field_mappings: rule.field_mappings,
 transform_script: rule.transform_script,
 priority: rule.priority,
 max_retries: rule.max_retries,
 retry_interval_secs: rule.retry_interval_secs,
 stop_on_failure: rule.stop_on_failure,
 });
 setOpenDialog(true);
 };
 const handleCloseDialog = () => {
 setOpenDialog(false);
 setEditingRule(null);
 };
 const handleSubmit = async () => {
 try {
 if (editingRule) {
 const updateData: UpdateConversionRuleRequest = {
 name: formData.name || undefined,
 description: formData.description,
 trigger_type: formData.trigger_type,
 field_mappings: formData.field_mappings,
 transform_script: formData.transform_script,
 priority: formData.priority,
 max_retries: formData.max_retries,
 retry_interval_secs: formData.retry_interval_secs,
 stop_on_failure: formData.stop_on_failure,
 };
 await integrationApi.updateConversionRule(editingRule.id, updateData);
 }
 else {
 await integrationApi.createConversionRule(formData);
 }
 handleCloseDialog();
 loadData();
 }
 catch (error) {
 logger.error("Error saving conversion rule:", error);
 alert("保存失败，请稍后重试");
 }
 };
 const handleEnableRule = async (rule: ConversionRule) => {
 try {
 await integrationApi.enableConversionRule(rule.id);
 loadData();
 }
 catch (error) {
 logger.error("Error enabling rule:", error);
 alert("启用失败");
 }
 };
 const handleDisableRule = async (rule: ConversionRule) => {
 try {
 await integrationApi.disableConversionRule(rule.id);
 loadData();
 }
 catch (error) {
 logger.error("Error disabling rule:", error);
 alert("禁用失败");
 }
 };
 const handleDeleteRule = async (rule: ConversionRule) => {
 if (!confirm(`确定要删除规则 "${rule.name}" 吗？`))
 return;
 try {
 await integrationApi.deleteConversionRule(rule.id);
 loadData();
 }
 catch (error) {
 logger.error("Error deleting rule:", error);
 alert("删除失败");
 }
 };
 const handleViewExecutions = async (ruleId: string) => {
 if (showExecutions === ruleId) {
 setShowExecutions(null);
 return;
 }
 try {
 const res = await integrationApi.getRuleExecutions(ruleId);
 if (res.success && res.data !== undefined) {
 setExecutions({ ...executions, [ruleId]: res.data });
 }
 setShowExecutions(ruleId);
 }
 catch (error) {
 logger.error("Error loading executions:", error);
 }
 };
 const handleFieldMappingChange = (index: number, field: keyof FieldMapping, value: string) => {
 const newMappings = [...formData.field_mappings];
 newMappings[index] = { ...newMappings[index], [field]: value };
 setFormData({ ...formData, field_mappings: newMappings });
 };
 const handleAddFieldMapping = () => {
 setFormData({
 ...formData,
 field_mappings: [...formData.field_mappings, { source_field: "", target_field: "" }],
 });
 };
 const handleRemoveFieldMapping = (index: number) => {
 if (formData.field_mappings.length <= 1)
 return;
 const newMappings = formData.field_mappings.filter((_, i) => i !== index);
 setFormData({ ...formData, field_mappings: newMappings });
 };
 const getStatusColor = (status: RuleStatus) => {
 switch (status) {
 case "active":
 return { backgroundColor: "#dcfce7", color: "#166534", label: "已启用" };
 case "inactive":
 return { backgroundColor: "#fee2e2", color: "#991b1b", label: "已禁用" };
 case "draft":
 return { backgroundColor: "#fef9c3", color: "#854d0e", label: "草稿" };
 }
 };
 const getTriggerTypeLabel = (type: TriggerType) => {
 switch (type) {
 case "event": return "事件触发";
 case "scheduled": return "定时触发";
 case "manual": return "手动触发";
 }
 };
 if (loading) {
 return (<Box sx={{
 minHeight: "100vh",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 backgroundColor: "#f9fafb",
 }}>
 <Typography sx={{ color: "#4b5563" }}>加载中...</Typography>
 </Box>);
 }
 return (<Box sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", p: 3 }}>
 <Box sx={{ maxWidth: 1400, mx: "auto" }}>
 <Box sx={{
 display: "flex",
 justifyContent: "space-between",
 alignItems: "center",
 mb: 3,
 }}>
 <Typography variant="h5" sx={{ fontWeight: 700, color: "#111827" }}>
 ⚙️ 转换规则配置
 </Typography>
 <Button onClick={handleOpenCreateDialog} sx={{
 px: 2,
 py: 1,
 backgroundColor: "#2563eb",
 color: "#ffffff",
 borderRadius: 2,
 "&:hover": { backgroundColor: "#1d4ed8" },
 }}>
 + 新建规则
 </Button>
 </Box>

 <Box sx={{
 backgroundColor: "#ffffff",
 p: 3,
 borderRadius: 2,
 boxShadow: 1,
 }}>
 <Box sx={{ overflowX: "auto" }}>
 <table style={{ width: "100%", borderCollapse: "collapse" }}>
 <thead>
 <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
 <th style={{
 textAlign: "left",
 padding: "12px 16px",
 fontWeight: 600,
 color: "#374151",
 }}>
 规则名称
 </th>
 <th style={{
 textAlign: "left",
 padding: "12px 16px",
 fontWeight: 600,
 color: "#374151",
 }}>
 转换路径
 </th>
 <th style={{
 textAlign: "left",
 padding: "12px 16px",
 fontWeight: 600,
 color: "#374151",
 }}>
 触发方式
 </th>
 <th style={{
 textAlign: "left",
 padding: "12px 16px",
 fontWeight: 600,
 color: "#374151",
 }}>
 优先级
 </th>
 <th style={{
 textAlign: "left",
 padding: "12px 16px",
 fontWeight: 600,
 color: "#374151",
 }}>
 状态
 </th>
 <th style={{
 textAlign: "left",
 padding: "12px 16px",
 fontWeight: 600,
 color: "#374151",
 }}>
 操作
 </th>
 </tr>
 </thead>
 <tbody>
 {rules.map((rule) => (<React.Fragment key={rule.id}>
 <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
 <td style={{ padding: "12px 16px" }}>
 <div>
 <Typography sx={{ fontWeight: 500, color: "#1f2937" }}>
 {rule.name}
 </Typography>
 <Typography sx={{ fontSize: "0.8rem", color: "#6b7280" }}>
 {rule.code}
 </Typography>
 </div>
 </td>
 <td style={{ padding: "12px 16px" }}>
 <Typography sx={{ color: "#374151" }}>
 {rule.source_system}.{rule.source_entity}
 </Typography>
 <Typography sx={{ fontSize: "0.8rem", color: "#2563eb" }}>
 → {rule.target_system}.{rule.target_entity}
 </Typography>
 </td>
 <td style={{ padding: "12px 16px" }}>
 <span style={{
 padding: "4px 8px",
 backgroundColor: "#f3f4f6",
 borderRadius: "4px",
 fontSize: "0.875rem",
 color: "#374151",
 }}>
 {getTriggerTypeLabel(rule.trigger_type)}
 </span>
 </td>
 <td style={{ padding: "12px 16px" }}>
 <Typography sx={{ color: "#374151" }}>{rule.priority}</Typography>
 </td>
 <td style={{ padding: "12px 16px" }}>
 <span style={{
 padding: "4px 12px",
 borderRadius: "12px",
 fontSize: "0.875rem",
 ...getStatusColor(rule.status),
 }}>
 {getStatusColor(rule.status).label}
 </span>
 </td>
 <td style={{ padding: "12px 16px" }}>
 <div style={{ display: "flex", gap: 8 }}>
 <button onClick={() => handleViewExecutions(rule.id)} style={{
 padding: "4px 10px",
 border: "none",
 backgroundColor: "#f3f4f6",
 color: "#374151",
 borderRadius: 4,
 fontSize: "0.875rem",
 cursor: "pointer",
 "&:hover": { backgroundColor: "#e5e7eb" },
 }}>
 执行记录
 </button>
 <button onClick={() => handleOpenEditDialog(rule)} style={{
 padding: "4px 10px",
 border: "none",
 backgroundColor: "#2563eb",
 color: "#ffffff",
 borderRadius: 4,
 fontSize: "0.875rem",
 cursor: "pointer",
 "&:hover": { backgroundColor: "#1d4ed8" },
 }}>
 编辑
 </button>
 {rule.is_enabled ? (<button onClick={() => handleDisableRule(rule)} style={{
 padding: "4px 10px",
 border: "none",
 backgroundColor: "#f59e0b",
 color: "#ffffff",
 borderRadius: 4,
 fontSize: "0.875rem",
 cursor: "pointer",
 "&:hover": { backgroundColor: "#d97706" },
 }}>
 禁用
 </button>) : (<button onClick={() => handleEnableRule(rule)} style={{
 padding: "4px 10px",
 border: "none",
 backgroundColor: "#10b981",
 color: "#ffffff",
 borderRadius: 4,
 fontSize: "0.875rem",
 cursor: "pointer",
 "&:hover": { backgroundColor: "#059669" },
 }}>
 启用
 </button>)}
 <button onClick={() => handleDeleteRule(rule)} style={{
 padding: "4px 10px",
 border: "none",
 backgroundColor: "#ef4444",
 color: "#ffffff",
 borderRadius: 4,
 fontSize: "0.875rem",
 cursor: "pointer",
 "&:hover": { backgroundColor: "#dc2626" },
 }}>
 删除
 </button>
 </div>
 </td>
 </tr>
 {showExecutions === rule.id && (<tr>
 <td colSpan={6} style={{ padding: 0 }}>
 <Box sx={{
 margin: "0 16px 16px",
 padding: 2,
 backgroundColor: "#f9fafb",
 borderRadius: 1,
 }}>
 <Typography sx={{ mb: 2, fontWeight: 500, color: "#374151" }}>
 执行记录列表
 </Typography>
 {executions[rule.id] && executions[rule.id].length > 0 ? (<table style={{ width: "100%", borderCollapse: "collapse" }}>
 <thead>
 <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
 <th style={{
 textAlign: "left",
 padding: "8px 12px",
 fontWeight: 500,
 fontSize: "0.875rem",
 color: "#6b7280",
 }}>
 源记录ID
 </th>
 <th style={{
 textAlign: "left",
 padding: "8px 12px",
 fontWeight: 500,
 fontSize: "0.875rem",
 color: "#6b7280",
 }}>
 目标记录ID
 </th>
 <th style={{
 textAlign: "left",
 padding: "8px 12px",
 fontWeight: 500,
 fontSize: "0.875rem",
 color: "#6b7280",
 }}>
 状态
 </th>
 <th style={{
 textAlign: "left",
 padding: "8px 12px",
 fontWeight: 500,
 fontSize: "0.875rem",
 color: "#6b7280",
 }}>
 创建时间
 </th>
 </tr>
 </thead>
 <tbody>
 {executions[rule.id].map((exec: any) => (<tr key={exec.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
 <td style={{ padding: "8px 12px", fontSize: "0.875rem" }}>
 {exec.source_record_id?.slice(0, 12) || "-"}
 </td>
 <td style={{ padding: "8px 12px", fontSize: "0.875rem" }}>
 {exec.target_record_id?.slice(0, 12) || "-"}
 </td>
 <td style={{ padding: "8px 12px" }}>
 <span style={{
 padding: "2px 6px",
 borderRadius: 2,
 fontSize: "0.75rem",
 backgroundColor: exec.status === "completed" ? "#dcfce7" :
 exec.status === "failed" ? "#fee2e2" : "#fef9c3",
 color: exec.status === "completed" ? "#166534" :
 exec.status === "failed" ? "#991b1b" : "#854d0e",
 }}>
 {exec.status}
 </span>
 </td>
 <td style={{ padding: "8px 12px", fontSize: "0.875rem", color: "#6b7280" }}>
 {new Date(exec.created_at).toLocaleString()}
 </td>
 </tr>))}
 </tbody>
 </table>) : (<Typography sx={{ color: "#9ca3af", fontSize: "0.875rem" }}>
 暂无执行记录
 </Typography>)}
 </Box>
 </td>
 </tr>)}
 </React.Fragment>))}
 </tbody>
 </table>
 </Box>
 </Box>
 </Box>

 <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
 <DialogTitle>
 {editingRule ? "编辑转换规则" : "新建转换规则"}
 </DialogTitle>
 <DialogContent>
 <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
 <TextField label="规则编码" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} disabled={!!editingRule} fullWidth/>
 <TextField label="规则名称" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} fullWidth/>
 <TextField label="源系统" select value={formData.source_system} onChange={(e) => {
 const newSystem = e.target.value as string;
 setFormData({
 ...formData,
 source_system: newSystem,
 source_entity: ENTITIES[newSystem]?.[0] || "",
 });
 }} fullWidth>
 {SYSTEMS.map((sys) => (<MenuItem key={sys} value={sys}>
 {sys}
 </MenuItem>))}
 </TextField>
 <TextField label="源实体" select value={formData.source_entity} onChange={(e) => setFormData({ ...formData, source_entity: e.target.value })} fullWidth>
 {ENTITIES[formData.source_system]?.map((entity) => (<MenuItem key={entity} value={entity}>
 {entity}
 </MenuItem>))}
 </TextField>
 <TextField label="目标系统" select value={formData.target_system} onChange={(e) => {
 const newSystem = e.target.value as string;
 setFormData({
 ...formData,
 target_system: newSystem,
 target_entity: ENTITIES[newSystem]?.[0] || "",
 });
 }} fullWidth>
 {SYSTEMS.map((sys) => (<MenuItem key={sys} value={sys}>
 {sys}
 </MenuItem>))}
 </TextField>
 <TextField label="目标实体" select value={formData.target_entity} onChange={(e) => setFormData({ ...formData, target_entity: e.target.value })} fullWidth>
 {ENTITIES[formData.target_system]?.map((entity) => (<MenuItem key={entity} value={entity}>
 {entity}
 </MenuItem>))}
 </TextField>
 <TextField label="触发方式" select value={formData.trigger_type} onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as TriggerType })} fullWidth>
 <MenuItem value="event">事件触发</MenuItem>
 <MenuItem value="scheduled">定时触发</MenuItem>
 <MenuItem value="manual">手动触发</MenuItem>
 </TextField>
 <TextField label="优先级" type="number" value={formData.priority || ""} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || undefined })} fullWidth/>
 </Box>

 <Box sx={{ mt: 3 }}>
 <Typography sx={{ fontWeight: 500, mb: 2 }}>字段映射</Typography>
 {formData.field_mappings.map((mapping, index) => (<Box key={index} sx={{ display: "flex", gap: 2, mb: 2 }}>
 <TextField label="源字段" value={mapping.source_field} onChange={(e) => handleFieldMappingChange(index, "source_field", e.target.value)} sx={{ flex: 1 }}/>
 <TextField label="目标字段" value={mapping.target_field} onChange={(e) => handleFieldMappingChange(index, "target_field", e.target.value)} sx={{ flex: 1 }}/>
 <IconButton onClick={() => handleRemoveFieldMapping(index)} disabled={formData.field_mappings.length <= 1} sx={{ mt: 1 }}>
 ✕
 </IconButton>
 </Box>))}
 <Button onClick={handleAddFieldMapping} variant="outline" sx={{ mt: 2 }}>
 + 添加字段映射
 </Button>
 </Box>

 <Box sx={{ mt: 3 }}>
 <TextField label="转换脚本 (可选)" multiline rows={4} value={formData.transform_script || ""} onChange={(e) => setFormData({ ...formData, transform_script: e.target.value })} fullWidth placeholder="JavaScript 转换表达式"/>
 </Box>

 <Box sx={{ mt: 3 }}>
 <TextField label="描述" multiline rows={2} value={formData.description || ""} onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })} fullWidth/>
 </Box>

 <Box sx={{ mt: 3, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
 <TextField label="最大重试次数" type="number" value={formData.max_retries || ""} onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) || undefined })} fullWidth/>
 <TextField label="重试间隔(秒)" type="number" value={formData.retry_interval_secs || ""} onChange={(e) => setFormData({ ...formData, retry_interval_secs: parseInt(e.target.value) || undefined })} fullWidth/>
 <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
 <Typography>失败后停止</Typography>
 <Switch checked={formData.stop_on_failure || false} onChange={(e) => setFormData({ ...formData, stop_on_failure: e.target.checked })}/>
 </Box>
 </Box>
 </DialogContent>
 <DialogActions>
 <MuiButton onClick={handleCloseDialog}>取消</MuiButton>
 <MuiButton onClick={handleSubmit} color="primary">
 {editingRule ? "保存修改" : "创建规则"}
 </MuiButton>
 </DialogActions>
 </Dialog>
 </Box>);
};
export default ConversionRulesPage;