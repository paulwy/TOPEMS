import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
} from '@mui/material';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Network,
  Briefcase,
  UserCog,
  Flag,
  Home,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WizardPageTemplate, type WizardStep } from '@/components/templates/WizardPageTemplate';
import { hrmSetupApi, type DepartmentResult, type PositionResult } from '@/api/hrm/hrmSetup';
import { userApi } from '@/api/iam/user';
import { departmentApi, positionApi } from '@/api/hrm';
import { useNotificationStore } from '@/store';

// ============ 本地表单模型 ============

interface CompanyForm {
  name: string;
  short_name: string;
  registration_number: string;
  tax_number: string;
  address: string;
  contact_phone: string;
  email: string;
  website: string;
  description: string;
}

interface DeptRow {
  name: string;
  code: string;
  parent_id: string;
  description: string;
}

interface PosRow {
  name: string;
  code: string;
  department_id: string;
  level: string;
  description: string;
}

interface AdminForm {
  name: string;
  employee_number: string;
  username: string;
  email: string;
  password: string;
  gender: string;
  birth_date: string;
  hire_date: string;
  department_id: string;
  position_id: string;
  phone: string;
}

interface OptionItem {
  id: string;
  name: string;
}

interface SetupSummary {
  companyName: string;
  deptCount: number;
  posCount: number;
  adminLabel: string;
}

const EMPTY_COMPANY: CompanyForm = {
  name: '',
  short_name: '',
  registration_number: '',
  tax_number: '',
  address: '',
  contact_phone: '',
  email: '',
  website: '',
  description: '',
};

const EMPTY_DEPT_ROW: DeptRow = { name: '', code: '', parent_id: '', description: '' };
const EMPTY_POS_ROW: PosRow = { name: '', code: '', department_id: '', level: '', description: '' };

const EMPTY_ADMIN: AdminForm = {
  name: '',
  employee_number: '',
  username: '',
  email: '',
  password: '',
  gender: '',
  birth_date: '',
  hire_date: '',
  department_id: '',
  position_id: '',
  phone: '',
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 统一从 axios/AppError 中提取可读错误信息 */
function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    message?: string;
    response?: { data?: { message?: string; error?: string; detail?: string } };
  };
  const data = err?.response?.data;
  return data?.message || data?.error || data?.detail || err?.message || fallback;
}

const clean = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const HrmSetupWizardPage: React.FC = () => {
  const { t } = useTranslation('hrm');
  const navigate = useNavigate();
  const { addNotification } = useNotificationStore();

  // ---- 进度 / 完成态 ----
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ---- 各步表单 ----
  const [company, setCompany] = useState<CompanyForm>(EMPTY_COMPANY);
  const [deptRows, setDeptRows] = useState<DeptRow[]>([{ ...EMPTY_DEPT_ROW }]);
  const [posRows, setPosRows] = useState<PosRow[]>([{ ...EMPTY_POS_ROW }]);
  const [admin, setAdmin] = useState<AdminForm>(EMPTY_ADMIN);
  const [confirmed, setConfirmed] = useState(false);

  // ---- 选项（既有部门/岗位 + 本步已建）----
  const [existingDepts, setExistingDepts] = useState<OptionItem[]>([]);
  const [existingPositions, setExistingPositions] = useState<OptionItem[]>([]);
  const [createdDepts, setCreatedDepts] = useState<DepartmentResult[]>([]);
  const [createdPositions, setCreatedPositions] = useState<PositionResult[]>([]);

  // ---- 摘要 & 建号连续性（方案B 重试时复用已建 IAM user_id）----
  const [summary, setSummary] = useState<SetupSummary>({
    companyName: '',
    deptCount: 0,
    posCount: 0,
    adminLabel: '',
  });
  const createdUserIdRef = useRef<string | null>(null);

  // 进入页面先拉取进度，按 current_step（1-based）定位；失败则默认第 1 步，不阻塞
  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [progressRes, deptRes, posRes] = await Promise.all([
          hrmSetupApi.getInitProgress(),
          departmentApi.list({ page_size: 500 }).catch(() => null),
          positionApi.list({ page_size: 500 }).catch(() => null),
        ]);
        if (cancelled) return;
        if (progressRes.success && progressRes.data) {
          setIsCompleted(progressRes.data.is_completed);
          const step = Math.min(Math.max(progressRes.data.current_step - 1, 0), 4);
          setActiveStep(step);
        }
        if (deptRes?.success && deptRes.data) {
          setExistingDepts((deptRes.data.items || []).map((d) => ({ id: d.id, name: d.name })));
        }
        if (posRes?.success && posRes.data) {
          setExistingPositions((posRes.data.items || []).map((p) => ({ id: p.id, name: p.name })));
        }
      } catch {
        // 进度查询失败（未登录/接口暂缺）时按默认第 1 步继续，不硬阻塞
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const deptOptions: OptionItem[] = [
    ...existingDepts,
    ...createdDepts.map((d) => ({ id: d.id, name: d.name })),
  ];
  const positionOptions: OptionItem[] = [
    ...existingPositions,
    ...createdPositions.map((p) => ({ id: p.id, name: p.name })),
  ];

  // ============ 第 1 步：公司信息 ============

  const submitCompany = async (): Promise<boolean> => {
    if (!company.name.trim()) {
      throw new Error(t('hrm.setup_wizard.company.name_required'));
    }
    setSubmitting(true);
    try {
      const res = await hrmSetupApi.setupCompanyInfo({
        name: company.name.trim(),
        short_name: clean(company.short_name),
        registration_number: clean(company.registration_number),
        tax_number: clean(company.tax_number),
        address: clean(company.address),
        contact_phone: clean(company.contact_phone),
        email: clean(company.email),
        website: clean(company.website),
        description: clean(company.description),
      });
      if (!res.success) {
        throw new Error(res.message || t('hrm.setup_wizard.company.save_failed'));
      }
      addNotification({
        type: 'success',
        title: t('hrm.setup_wizard.company.save_success'),
        message: res.message || company.name.trim(),
      });
      setSummary((prev) => ({ ...prev, companyName: company.name.trim() }));
      return true;
    } catch (error) {
      throw new Error(extractErrorMessage(error, t('hrm.setup_wizard.company.save_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  // ============ 第 2 步：部门批量录入 ============

  const updateDeptRow = (index: number, patch: Partial<DeptRow>) => {
    setDeptRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const submitDepartments = async (): Promise<boolean> => {
    const filled = deptRows.filter((r) => r.name.trim());
    if (filled.length === 0) {
      throw new Error(t('hrm.setup_wizard.dept.at_least_one'));
    }
    const seen = new Set<string>();
    for (const row of filled) {
      const key = row.name.trim();
      if (seen.has(key)) {
        throw new Error(t('hrm.setup_wizard.dept.duplicate_name', { name: key }));
      }
      seen.add(key);
    }
    setSubmitting(true);
    try {
      const res = await hrmSetupApi.setupDepartments({
        departments: filled.map((r) => ({
          name: r.name.trim(),
          code: clean(r.code),
          parent_id: clean(r.parent_id),
          description: clean(r.description),
        })),
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || t('hrm.setup_wizard.dept.create_failed'));
      }
      addNotification({
        type: 'success',
        title: t('hrm.setup_wizard.dept.create_success', { count: res.data.created_count }),
        message: res.message || '',
      });
      setCreatedDepts((prev) => [...prev, ...(res.data?.departments || [])]);
      setSummary((prev) => ({ ...prev, deptCount: res.data?.created_count ?? filled.length }));
      return true;
    } catch (error) {
      throw new Error(extractErrorMessage(error, t('hrm.setup_wizard.dept.create_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  // ============ 第 3 步：岗位批量录入 ============

  const updatePosRow = (index: number, patch: Partial<PosRow>) => {
    setPosRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const submitPositions = async (): Promise<boolean> => {
    const filled = posRows.filter((r) => r.name.trim());
    if (filled.length === 0) {
      throw new Error(t('hrm.setup_wizard.pos.at_least_one'));
    }
    const seen = new Set<string>();
    const seenCodes = new Set<string>();
    for (const row of filled) {
      const key = row.name.trim().toLowerCase();
      if (seen.has(key)) {
        throw new Error(t('hrm.setup_wizard.pos.duplicate_name', { name: row.name.trim() }));
      }
      seen.add(key);
      const code = row.code.trim();
      if (code) {
        const ckey = code.toLowerCase();
        if (seenCodes.has(ckey)) {
          throw new Error(t('hrm.setup_wizard.pos.duplicate_code', { code }));
        }
        seenCodes.add(ckey);
      }
    }
    setSubmitting(true);
    try {
      const res = await hrmSetupApi.setupPositions({
        positions: filled.map((r) => ({
          name: r.name.trim(),
          code: clean(r.code),
          department_id: clean(r.department_id),
          level: r.level.trim() ? Number(r.level.trim()) : undefined,
          description: clean(r.description),
        })),
      });
      if (!res.success || !res.data) {
        throw new Error(res.message || t('hrm.setup_wizard.pos.create_failed'));
      }
      addNotification({
        type: 'success',
        title: t('hrm.setup_wizard.pos.create_success', { count: res.data.created_count }),
        message: res.message || '',
      });
      setCreatedPositions((prev) => [...prev, ...(res.data?.positions || [])]);
      setSummary((prev) => ({ ...prev, posCount: res.data?.created_count ?? filled.length }));
      return true;
    } catch (error) {
      throw new Error(extractErrorMessage(error, t('hrm.setup_wizard.pos.create_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  // ============ 第 4 步：管理员账号（方案B：先 IAM 建号，再回绑）============

  const validateAdminFields = () => {
    if (!admin.name.trim()) throw new Error(t('hrm.setup_wizard.admin.name_required'));
    if (!admin.employee_number.trim())
      throw new Error(t('hrm.setup_wizard.admin.employee_number_required'));
    if (!admin.email.trim()) throw new Error(t('hrm.setup_wizard.admin.email_required'));
    if (!EMAIL_PATTERN.test(admin.email.trim()))
      throw new Error(t('hrm.setup_wizard.admin.email_invalid'));
    if (!admin.password) throw new Error(t('hrm.setup_wizard.admin.password_required'));
    if (admin.password.length < 6) throw new Error(t('hrm.setup_wizard.admin.password_too_short'));
    const resolvedUsername = admin.username.trim() || admin.employee_number.trim();
    if (!USERNAME_PATTERN.test(resolvedUsername)) {
      throw new Error(t('hrm.setup_wizard.admin.username_invalid'));
    }
    return resolvedUsername;
  };

  const submitAdmin = async (): Promise<boolean> => {
    const resolvedUsername = validateAdminFields();
    setSubmitting(true);
    try {
      // 阶段一：IAM 建号（重试时复用已建 user_id，避免 409 重复建号）
      let userId = createdUserIdRef.current;
      if (!userId) {
        const createRes = await userApi.createUser({
          username: resolvedUsername,
          email: admin.email.trim(),
          password: admin.password,
          full_name: admin.name.trim(),
        });
        if (!createRes.success || !createRes.data?.id) {
          throw new Error(createRes.message || t('hrm.setup_wizard.admin.create_iam_failed'));
        }
        userId = createRes.data.id;
        createdUserIdRef.current = userId;
      }

      // 阶段二：HRM 建档并回绑 user_id
      const bindRes = await hrmSetupApi.setupAdminUser({
        name: admin.name.trim(),
        employee_number: admin.employee_number.trim(),
        username: resolvedUsername,
        user_id: userId,
        gender: clean(admin.gender),
        birth_date: clean(admin.birth_date),
        hire_date: clean(admin.hire_date),
        department_id: clean(admin.department_id),
        position_id: clean(admin.position_id),
        email: clean(admin.email),
        phone: clean(admin.phone),
        password: admin.password,
      });
      if (!bindRes.success || !bindRes.data) {
        throw new Error(bindRes.message || t('hrm.setup_wizard.admin.bind_failed'));
      }
      addNotification({
        type: 'success',
        title: t('hrm.setup_wizard.admin.success'),
        message: bindRes.data.message || bindRes.message || '',
      });
      setSummary((prev) => ({
        ...prev,
        adminLabel: `${admin.name.trim()}（${resolvedUsername}）`,
      }));
      return true;
    } catch (error) {
      throw new Error(extractErrorMessage(error, t('hrm.setup_wizard.admin.bind_failed')));
    } finally {
      setSubmitting(false);
    }
  };

  // ============ 第 5 步：确认完成 ============

  const submitComplete = async (): Promise<boolean> => {
    if (!confirmed) {
      throw new Error(t('hrm.setup_wizard.confirm.checkbox_required'));
    }
    setSubmitting(true);
    try {
      const res = await hrmSetupApi.completeInitialization({ confirm: true });
      if (!res.success) {
        throw new Error(res.message || t('hrm.setup_wizard.confirm.failed'));
      }
      addNotification({
        type: 'success',
        title: t('hrm.setup_wizard.confirm.success'),
        message: res.message || '',
      });
      return true;
    } catch (error) {
      throw new Error(extractErrorMessage(error, t('hrm.setup_wizard.confirm.failed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = () => {
    navigate('/hrm/dashboard');
  };

  // ============ 步骤定义 ============

  const steps: WizardStep[] = [
    {
      id: 'company',
      label: t('hrm.setup_wizard.step1.label'),
      description: t('hrm.setup_wizard.step1.desc'),
      icon: <Building2 style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            required
            fullWidth
            label={t('hrm.setup_wizard.company.name')}
            value={company.name}
            onChange={(e) => setCompany({ ...company, name: e.target.value })}
          />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              fullWidth
              label={t('hrm.setup_wizard.company.short_name')}
              value={company.short_name}
              onChange={(e) => setCompany({ ...company, short_name: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('hrm.setup_wizard.company.registration_number')}
              value={company.registration_number}
              onChange={(e) => setCompany({ ...company, registration_number: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('hrm.setup_wizard.company.tax_number')}
              value={company.tax_number}
              onChange={(e) => setCompany({ ...company, tax_number: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('hrm.setup_wizard.company.contact_phone')}
              value={company.contact_phone}
              onChange={(e) => setCompany({ ...company, contact_phone: e.target.value })}
            />
            <TextField
              fullWidth
              type='email'
              label={t('hrm.setup_wizard.company.email')}
              value={company.email}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
            <TextField
              fullWidth
              label={t('hrm.setup_wizard.company.website')}
              value={company.website}
              onChange={(e) => setCompany({ ...company, website: e.target.value })}
            />
          </Box>
          <TextField
            fullWidth
            label={t('hrm.setup_wizard.company.address')}
            value={company.address}
            onChange={(e) => setCompany({ ...company, address: e.target.value })}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('hrm.setup_wizard.company.description')}
            value={company.description}
            onChange={(e) => setCompany({ ...company, description: e.target.value })}
          />
        </Box>
      ),
      validation: submitCompany,
    },
    {
      id: 'departments',
      label: t('hrm.setup_wizard.step2.label'),
      description: t('hrm.setup_wizard.step2.desc'),
      icon: <Network style={{ width: 18, height: 18 }} />,
      component: (
        <Box>
          {deptRows.map((row, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                p: 1.5,
                mb: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <TextField
                required
                sx={{ flex: '2 1 160px' }}
                label={t('hrm.setup_wizard.dept.name')}
                value={row.name}
                onChange={(e) => updateDeptRow(index, { name: e.target.value })}
              />
              <TextField
                sx={{ flex: '1 1 120px' }}
                label={t('hrm.setup_wizard.dept.code')}
                value={row.code}
                onChange={(e) => updateDeptRow(index, { code: e.target.value })}
              />
              <FormControl sx={{ flex: '1.4 1 160px' }}>
                <InputLabel>{t('hrm.setup_wizard.dept.parent')}</InputLabel>
                <Select
                  label={t('hrm.setup_wizard.dept.parent')}
                  value={row.parent_id}
                  onChange={(e) => updateDeptRow(index, { parent_id: e.target.value })}
                >
                  <MenuItem value=''>{t('hrm.setup_wizard.dept.empty_option')}</MenuItem>
                  {deptOptions.map((opt) => (
                    <MenuItem
                      key={opt.id}
                      value={opt.id}
                    >
                      {opt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                sx={{ flex: '1.5 1 180px' }}
                label={t('hrm.setup_wizard.dept.description')}
                value={row.description}
                onChange={(e) => updateDeptRow(index, { description: e.target.value })}
              />
              <IconButton
                color='error'
                aria-label={t('hrm.setup_wizard.dept.remove_row')}
                onClick={() =>
                  setDeptRows((prev) =>
                    prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
                  )
                }
              >
                <Trash2 size={18} />
              </IconButton>
            </Box>
          ))}
          <Button
            variant='outlined'
            startIcon={<Plus size={16} />}
            onClick={() => setDeptRows((prev) => [...prev, { ...EMPTY_DEPT_ROW }])}
          >
            {t('hrm.setup_wizard.dept.add_row')}
          </Button>
        </Box>
      ),
      validation: submitDepartments,
    },
    {
      id: 'positions',
      label: t('hrm.setup_wizard.step3.label'),
      description: t('hrm.setup_wizard.step3.desc'),
      icon: <Briefcase style={{ width: 18, height: 18 }} />,
      component: (
        <Box>
          {posRows.map((row, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                p: 1.5,
                mb: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <TextField
                required
                sx={{ flex: '2 1 160px' }}
                label={t('hrm.setup_wizard.pos.name')}
                value={row.name}
                onChange={(e) => updatePosRow(index, { name: e.target.value })}
              />
              <TextField
                sx={{ flex: '1 1 120px' }}
                label={t('hrm.setup_wizard.pos.code')}
                value={row.code}
                onChange={(e) => updatePosRow(index, { code: e.target.value })}
              />
              <FormControl sx={{ flex: '1.4 1 160px' }}>
                <InputLabel>{t('hrm.setup_wizard.pos.department')}</InputLabel>
                <Select
                  label={t('hrm.setup_wizard.pos.department')}
                  value={row.department_id}
                  onChange={(e) => updatePosRow(index, { department_id: e.target.value })}
                >
                  <MenuItem value=''>{t('hrm.setup_wizard.pos.empty_option')}</MenuItem>
                  {deptOptions.map((opt) => (
                    <MenuItem
                      key={opt.id}
                      value={opt.id}
                    >
                      {opt.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                type='number'
                sx={{ flex: '1 1 110px' }}
                label={t('hrm.setup_wizard.pos.level')}
                value={row.level}
                onChange={(e) => updatePosRow(index, { level: e.target.value })}
              />
              <TextField
                sx={{ flex: '1.5 1 180px' }}
                label={t('hrm.setup_wizard.pos.description')}
                value={row.description}
                onChange={(e) => updatePosRow(index, { description: e.target.value })}
              />
              <IconButton
                color='error'
                aria-label={t('hrm.setup_wizard.pos.remove_row')}
                onClick={() =>
                  setPosRows((prev) =>
                    prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
                  )
                }
              >
                <Trash2 size={18} />
              </IconButton>
            </Box>
          ))}
          <Button
            variant='outlined'
            startIcon={<Plus size={16} />}
            onClick={() => setPosRows((prev) => [...prev, { ...EMPTY_POS_ROW }])}
          >
            {t('hrm.setup_wizard.pos.add_row')}
          </Button>
        </Box>
      ),
      validation: submitPositions,
    },
    {
      id: 'admin',
      label: t('hrm.setup_wizard.step4.label'),
      description: t('hrm.setup_wizard.step4.desc'),
      icon: <UserCog style={{ width: 18, height: 18 }} />,
      component: (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              required
              label={t('hrm.setup_wizard.admin.name')}
              value={admin.name}
              onChange={(e) => setAdmin({ ...admin, name: e.target.value })}
            />
            <TextField
              required
              label={t('hrm.setup_wizard.admin.employee_number')}
              value={admin.employee_number}
              onChange={(e) => setAdmin({ ...admin, employee_number: e.target.value })}
            />
            <TextField
              label={t('hrm.setup_wizard.admin.username')}
              helperText={t('hrm.setup_wizard.admin.username_hint')}
              value={admin.username}
              onChange={(e) => setAdmin({ ...admin, username: e.target.value })}
            />
            <TextField
              required
              type='email'
              label={t('hrm.setup_wizard.admin.email')}
              value={admin.email}
              onChange={(e) => setAdmin({ ...admin, email: e.target.value })}
            />
            <TextField
              required
              type='password'
              label={t('hrm.setup_wizard.admin.password')}
              value={admin.password}
              onChange={(e) => setAdmin({ ...admin, password: e.target.value })}
            />
            <FormControl>
              <InputLabel>{t('hrm.setup_wizard.admin.gender')}</InputLabel>
              <Select
                label={t('hrm.setup_wizard.admin.gender')}
                value={admin.gender}
                onChange={(e) => setAdmin({ ...admin, gender: e.target.value })}
              >
                <MenuItem value=''>{t('hrm.setup_wizard.admin.gender_unspecified')}</MenuItem>
                <MenuItem value='male'>{t('hrm.setup_wizard.admin.gender_male')}</MenuItem>
                <MenuItem value='female'>{t('hrm.setup_wizard.admin.gender_female')}</MenuItem>
                <MenuItem value='other'>{t('hrm.setup_wizard.admin.gender_other')}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              type='date'
              label={t('hrm.setup_wizard.admin.birth_date')}
              value={admin.birth_date}
              onChange={(e) => setAdmin({ ...admin, birth_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              type='date'
              label={t('hrm.setup_wizard.admin.hire_date')}
              value={admin.hire_date}
              onChange={(e) => setAdmin({ ...admin, hire_date: e.target.value })}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <FormControl>
              <InputLabel>{t('hrm.setup_wizard.admin.department')}</InputLabel>
              <Select
                label={t('hrm.setup_wizard.admin.department')}
                value={admin.department_id}
                onChange={(e) => setAdmin({ ...admin, department_id: e.target.value })}
              >
                <MenuItem value=''>{t('hrm.setup_wizard.pos.empty_option')}</MenuItem>
                {deptOptions.map((opt) => (
                  <MenuItem
                    key={opt.id}
                    value={opt.id}
                  >
                    {opt.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>{t('hrm.setup_wizard.admin.position')}</InputLabel>
              <Select
                label={t('hrm.setup_wizard.admin.position')}
                value={admin.position_id}
                onChange={(e) => setAdmin({ ...admin, position_id: e.target.value })}
              >
                <MenuItem value=''>{t('hrm.setup_wizard.pos.empty_option')}</MenuItem>
                {positionOptions.map((opt) => (
                  <MenuItem
                    key={opt.id}
                    value={opt.id}
                  >
                    {opt.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={t('hrm.setup_wizard.admin.phone')}
              value={admin.phone}
              onChange={(e) => setAdmin({ ...admin, phone: e.target.value })}
            />
          </Box>
        </Box>
      ),
      validation: submitAdmin,
    },
    {
      id: 'confirm',
      label: t('hrm.setup_wizard.step5.label'),
      description: t('hrm.setup_wizard.step5.desc'),
      icon: <Flag style={{ width: 18, height: 18 }} />,
      component: (
        <Box>
          <Typography
            variant='h6'
            sx={{ mb: 2, fontWeight: 600 }}
          >
            {t('hrm.setup_wizard.confirm.summary_title')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Paper
              variant='outlined'
              sx={{ p: 2 }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('hrm.setup_wizard.confirm.company_label')}
              </Typography>
              <Typography variant='body1'>
                {summary.companyName || t('hrm.setup_wizard.confirm.none')}
              </Typography>
            </Paper>
            <Paper
              variant='outlined'
              sx={{ p: 2 }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('hrm.setup_wizard.confirm.departments_label')}
              </Typography>
              <Typography variant='body1'>
                {summary.deptCount > 0
                  ? t('hrm.setup_wizard.confirm.count_value', { count: summary.deptCount })
                  : t('hrm.setup_wizard.confirm.none')}
              </Typography>
            </Paper>
            <Paper
              variant='outlined'
              sx={{ p: 2 }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('hrm.setup_wizard.confirm.positions_label')}
              </Typography>
              <Typography variant='body1'>
                {summary.posCount > 0
                  ? t('hrm.setup_wizard.confirm.count_value', { count: summary.posCount })
                  : t('hrm.setup_wizard.confirm.none')}
              </Typography>
            </Paper>
            <Paper
              variant='outlined'
              sx={{ p: 2 }}
            >
              <Typography
                variant='caption'
                color='text.secondary'
              >
                {t('hrm.setup_wizard.confirm.admin_label')}
              </Typography>
              <Typography variant='body1'>
                {summary.adminLabel || t('hrm.setup_wizard.confirm.none')}
              </Typography>
            </Paper>
          </Box>
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
            }
            label={t('hrm.setup_wizard.confirm.checkbox')}
          />
        </Box>
      ),
      validation: submitComplete,
    },
  ];

  // ============ 渲染 ============

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isCompleted) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', mt: 6 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircle2
            size={48}
            color='success'
            style={{ margin: '0 auto 16px' }}
          />
          <Typography
            variant='h5'
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {t('hrm.setup_wizard.done.title')}
          </Typography>
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{ mb: 3 }}
          >
            {t('hrm.setup_wizard.done.message')}
          </Typography>
          <Button
            variant='contained'
            startIcon={<Home size={16} />}
            onClick={() => navigate('/dashboard')}
          >
            {t('hrm.setup_wizard.done.go_home')}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <WizardPageTemplate
      title={t('hrm.setup_wizard.title')}
      subtitle={t('hrm.setup_wizard.subtitle')}
      steps={steps}
      currentStep={activeStep}
      onStepChange={(index) => setActiveStep(index)}
      onComplete={handleComplete}
      submitting={submitting}
      finishButtonText={t('hrm.setup_wizard.confirm.submit')}
    />
  );
};

export { HrmSetupWizardPage };
export default HrmSetupWizardPage;
