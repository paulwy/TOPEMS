import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  Tabs,
  Tab,
  TextField,
  InputLabel,
  FormControl,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Container,
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import React, { useState, useEffect, useMemo } from 'react';
import { apiLogger } from '@/utils/logger';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  AlertCircle,
  Briefcase,
  Building2,
  Edit2,
  Save,
  X,
  Heart,
  FileText,
  Plus,
  Clock,
  Users,
  FileCheck,
  Award,
} from 'lucide-react';
import {
  employeeApi,
  departmentApi,
  contractApi,
  performanceReviewApi,
  type Employee,
  type Department,
  type Contract,
  type PerformanceReview,
} from '@/api/hrm';
import { useNotification } from '@/hooks/useNotification';
import { StatCardGroup } from '@/components/mui';
import { logger } from '@/utils/logger';

const HrmEmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Employee>>({});
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('basic');

  useEffect(() => {
    if (id) {
      loadEmployee(id);
    }
    loadDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEmployee = async (employeeId: string) => {
    setLoading(true);
    try {
      const res = await employeeApi.get(employeeId);
      if (res.code === 200 && res.data) {
        setEmployee(res.data);
        setEditData({ ...res.data });
      }
    } catch (err) {
      apiLogger.error('Failed to load employee:', err);
      error('加载员工信息失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await departmentApi.list({ page_size: 100 });
      if (res.code === 200) {
        setDepartments(res.data?.items || []);
      }
    } catch (err) {
      apiLogger.error('Failed to load departments:', err);
    }
  };

  const getDepartmentName = (deptId?: string) => {
    if (!deptId) return '-';
    return departments.find((d) => d.id === deptId)?.name || '-';
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      const res = await employeeApi.update(id, editData);
      if (res.code === 200) {
        success('保存成功');
        setIsEditing(false);
        loadEmployee(id);
      }
    } catch (err) {
      apiLogger.error('Failed to save:', err);
      error('保存失败');
    }
  };

  const handleCancelEdit = () => {
    if (employee) {
      setEditData({ ...employee });
      setIsEditing(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            width: 48,
            height: 48,
            border: 4,
            borderColor: 'primary.main',
            borderBottomColor: 'transparent',
          }}
        />
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'grey.100',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <AlertCircle sx={{ width: 48, height: 48, color: 'grey.400', mx: 'auto', mb: 2 }} />
          <Typography
            variant='body1'
            sx={{ color: 'grey.500' }}
          >
            员工不存在
          </Typography>
          <Button
            onClick={() => navigate('/hrm/employees')}
            sx={{ mt: 2 }}
          >
            返回列表
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          boxShadow: 1,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Container
          maxWidth='lg'
          sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 2 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant='text'
              onClick={() => navigate('/hrm/employees')}
            >
              <ArrowLeft sx={{ width: 16, height: 16, mr: 1 }} />
              返回
            </Button>
            <Box>
              <Typography
                variant='h5'
                sx={{ fontWeight: 700, color: 'grey.900' }}
              >
                员工详情
              </Typography>
              <Typography
                variant='body2'
                sx={{ color: 'grey.500' }}
              >
                查看和编辑员工档案信息
              </Typography>
            </Box>
            <Box sx={{ ml: 'auto' }}>
              {isEditing ? (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant='outlined'
                    onClick={handleCancelEdit}
                  >
                    <X sx={{ width: 16, height: 16, mr: 1 }} />
                    取消
                  </Button>
                  <Button onClick={handleSave}>
                    <Save sx={{ width: 16, height: 16, mr: 1 }} />
                    保存
                  </Button>
                </Box>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit2 sx={{ width: 16, height: 16, mr: 1 }} />
                  编辑
                </Button>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      <Container
        maxWidth='lg'
        sx={{ px: { xs: 2, sm: 3, lg: 4 }, py: 3 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'blue.100',
                    color: 'blue.700',
                    fontSize: '2rem',
                  }}
                >
                  {employee.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant='h4'
                      sx={{ fontWeight: 700, color: 'grey.900' }}
                    >
                      {employee.name}
                    </Typography>
                    <Chip
                      size='small'
                      variant={employee.status === 'active' ? 'filled' : 'outlined'}
                      label={employee.status === 'active' ? '在职' : '离职'}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      color: 'grey.500',
                      fontSize: '0.875rem',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <FileText sx={{ width: 16, height: 16 }} />
                      {employee.employee_no}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Briefcase sx={{ width: 16, height: 16 }} />
                      {employee.position || '-'}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Building2 sx={{ width: 16, height: 16 }} />
                      {getDepartmentName(employee.department_id)}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v as string)}
            >
              <Tab
                value='basic'
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <User sx={{ width: 16, height: 16 }} />
                    基本信息
                  </Box>
                }
              />
              <Tab
                value='contact'
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone sx={{ width: 16, height: 16 }} />
                    联系方式
                  </Box>
                }
              />
              <Tab
                value='emergency'
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Heart sx={{ width: 16, height: 16 }} />
                    紧急联系人
                  </Box>
                }
              />
            </Tabs>
          </Box>

          {activeTab === 'basic' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card>
                <CardHeader>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    基本信息
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(1, 1fr)',
                          md: 'repeat(3, 1fr)',
                        },
                        gap: 2,
                      }}
                    >
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          姓名
                        </Typography>
                        {isEditing ? (
                          <TextField
                            size='small'
                            fullWidth
                            value={editData.name || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditData({ ...editData, name: e.target.value })
                            }
                            sx={{ mt: 0.5 }}
                          />
                        ) : (
                          <Typography sx={{ mt: 0.5, fontWeight: 500 }}>{employee.name}</Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          性别
                        </Typography>
                        {isEditing ? (
                          <FormControl
                            size='small'
                            fullWidth
                            sx={{ mt: 0.5 }}
                          >
                            <Select
                              value={editData.gender || ''}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  gender: e.target.value,
                                })
                              }
                            >
                              <MenuItem value='none'>未设置</MenuItem>
                              <MenuItem value='male'>男</MenuItem>
                              <MenuItem value='female'>女</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                            {employee.gender === 'male'
                              ? '男'
                              : employee.gender === 'female'
                                ? '女'
                                : '-'}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          出生日期
                        </Typography>
                        {isEditing ? (
                          <TextField
                            size='small'
                            fullWidth
                            type='date'
                            value={editData.birth_date || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditData({
                                ...editData,
                                birth_date: e.target.value,
                              })
                            }
                            sx={{ mt: 0.5 }}
                          />
                        ) : (
                          <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                            {employee.birth_date
                              ? new Date(employee.birth_date).toLocaleDateString()
                              : '-'}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          入职日期
                        </Typography>
                        {isEditing ? (
                          <TextField
                            size='small'
                            fullWidth
                            type='date'
                            value={editData.hire_date || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditData({
                                ...editData,
                                hire_date: e.target.value,
                              })
                            }
                            sx={{ mt: 0.5 }}
                          />
                        ) : (
                          <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                            {employee.hire_date
                              ? new Date(employee.hire_date).toLocaleDateString()
                              : '-'}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          部门
                        </Typography>
                        {isEditing ? (
                          <FormControl
                            size='small'
                            fullWidth
                            sx={{ mt: 0.5 }}
                          >
                            <Select
                              value={editData.department_id || ''}
                              onChange={(e) =>
                                setEditData({
                                  ...editData,
                                  department_id: e.target.value || undefined,
                                })
                              }
                            >
                              <MenuItem value='none'>未设置</MenuItem>
                              {departments.map((dept) => (
                                <MenuItem
                                  key={dept.id}
                                  value={dept.id}
                                >
                                  {dept.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                            {getDepartmentName(employee.department_id)}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography
                          variant='body2'
                          sx={{ color: 'grey.500' }}
                        >
                          职位
                        </Typography>
                        {isEditing ? (
                          <TextField
                            size='small'
                            fullWidth
                            value={editData.position || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setEditData({
                                ...editData,
                                position: e.target.value,
                              })
                            }
                            sx={{ mt: 0.5 }}
                          />
                        ) : (
                          <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                            {employee.position || '-'}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {activeTab === 'contact' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card>
                <CardHeader>
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    联系方式
                  </Typography>
                </CardHeader>
                <CardContent>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: 'repeat(1, 1fr)',
                        md: 'repeat(2, 1fr)',
                      },
                      gap: 2,
                    }}
                  >
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        工作邮箱
                      </Typography>
                      {isEditing ? (
                        <TextField
                          size='small'
                          fullWidth
                          type='email'
                          value={editData.email || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({ ...editData, email: e.target.value })
                          }
                          placeholder='请输入邮箱'
                          sx={{ mt: 0.5 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            mt: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Mail sx={{ width: 16, height: 16, color: 'grey.400' }} />
                          <Typography sx={{ fontWeight: 500 }}>{employee.email || '-'}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        联系电话
                      </Typography>
                      {isEditing ? (
                        <TextField
                          size='small'
                          fullWidth
                          value={editData.phone || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({ ...editData, phone: e.target.value })
                          }
                          placeholder='请输入电话'
                          sx={{ mt: 0.5 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            mt: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                          }}
                        >
                          <Phone sx={{ width: 16, height: 16, color: 'grey.400' }} />
                          <Typography sx={{ fontWeight: 500 }}>{employee.phone || '-'}</Typography>
                        </Box>
                      )}
                    </Box>
                    <Box sx={{ gridColumn: { xs: 1, md: 2 } }}>
                      <Typography
                        variant='body2'
                        sx={{ color: 'grey.500' }}
                      >
                        联系地址
                      </Typography>
                      {isEditing ? (
                        <TextField
                          size='small'
                          fullWidth
                          multiline
                          rows={3}
                          value={editData.address || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setEditData({
                              ...editData,
                              address: e.target.value,
                            })
                          }
                          placeholder='请输入地址'
                          sx={{ mt: 0.5 }}
                        />
                      ) : (
                        <Box
                          sx={{
                            mt: 0.5,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                          }}
                        >
                          <MapPin
                            sx={{
                              width: 16,
                              height: 16,
                              color: 'grey.400',
                              mt: 0.5,
                            }}
                          />
                          <Typography sx={{ fontWeight: 500 }}>
                            {employee.address || '-'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}

          {activeTab === 'emergency' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Card>
                <CardHeader
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography
                    variant='h6'
                    sx={{ fontWeight: 600 }}
                  >
                    紧急联系人
                  </Typography>
                  {isEditing && (
                    <Button
                      size='small'
                      onClick={() => setShowEmergencyModal(true)}
                    >
                      <Plus sx={{ width: 16, height: 16, mr: 1 }} />
                      添加
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {employee.emergency_contact_name ? (
                    <Box
                      sx={{
                        bgcolor: 'grey.100',
                        borderRadius: 2,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            bgcolor: 'error.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Heart sx={{ width: 20, height: 20, color: 'error.main' }} />
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>
                            {employee.emergency_contact_name}
                          </Typography>
                          <Typography
                            variant='body2'
                            sx={{ color: 'grey.500' }}
                          >
                            紧急联系人
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: 'repeat(1, 1fr)',
                            md: 'repeat(2, 1fr)',
                          },
                          gap: 2,
                          ml: 4,
                        }}
                      >
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ color: 'grey.500' }}
                          >
                            联系电话
                          </Typography>
                          {isEditing ? (
                            <TextField
                              size='small'
                              fullWidth
                              value={editData.emergency_contact_phone || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditData({
                                  ...editData,
                                  emergency_contact_phone: e.target.value,
                                })
                              }
                              sx={{ mt: 0.5 }}
                            />
                          ) : (
                            <Box
                              sx={{
                                mt: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Phone
                                sx={{
                                  width: 16,
                                  height: 16,
                                  color: 'grey.400',
                                }}
                              />
                              <Typography sx={{ fontWeight: 500 }}>
                                {employee.emergency_contact_phone || '-'}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box>
                          <Typography
                            variant='body2'
                            sx={{ color: 'grey.500' }}
                          >
                            联系人姓名
                          </Typography>
                          {isEditing ? (
                            <TextField
                              size='small'
                              fullWidth
                              value={editData.emergency_contact_name || ''}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setEditData({
                                  ...editData,
                                  emergency_contact_name: e.target.value,
                                })
                              }
                              sx={{ mt: 0.5 }}
                            />
                          ) : (
                            <Typography sx={{ mt: 0.5, fontWeight: 500 }}>
                              {employee.emergency_contact_name}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Heart
                        sx={{
                          width: 48,
                          height: 48,
                          color: 'grey.300',
                          mx: 'auto',
                          mb: 2,
                        }}
                      />
                      <Typography
                        variant='body1'
                        sx={{ color: 'grey.500' }}
                      >
                        暂无紧急联系人信息
                      </Typography>
                      {isEditing && (
                        <Button
                          onClick={() => setShowEmergencyModal(true)}
                          sx={{ mt: 2 }}
                        >
                          <Plus sx={{ width: 16, height: 16, mr: 1 }} />
                          添加紧急联系人
                        </Button>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Box>
          )}

          <Card>
            <CardHeader>
              <Typography
                variant='h6'
                sx={{ fontWeight: 600 }}
              >
                其他信息
              </Typography>
            </CardHeader>
            <CardContent>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'repeat(1, 1fr)',
                    sm: 'repeat(2, 1fr)',
                    md: 'repeat(4, 1fr)',
                  },
                  gap: 2,
                }}
              >
                <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    创建时间
                  </Typography>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                    <Calendar
                      sx={{
                        width: 16,
                        height: 16,
                        color: 'grey.400',
                        mr: 0.5,
                        verticalAlign: 'middle',
                      }}
                    />
                    {new Date(employee.created_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    更新时间
                  </Typography>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                    <Calendar
                      sx={{
                        width: 16,
                        height: 16,
                        color: 'grey.400',
                        mr: 0.5,
                        verticalAlign: 'middle',
                      }}
                    />
                    {new Date(employee.updated_at).toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    员工ID
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: 500,
                      mt: 0.5,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    {employee.id.substring(0, 8)}...
                  </Typography>
                </Box>
                <Box sx={{ bgcolor: 'grey.100', borderRadius: 2, p: 2 }}>
                  <Typography
                    variant='body2'
                    sx={{ color: 'grey.500' }}
                  >
                    状态
                  </Typography>
                  <Typography sx={{ fontWeight: 500, mt: 0.5 }}>
                    <Chip
                      size='small'
                      variant={employee.status === 'active' ? 'filled' : 'outlined'}
                      label={employee.status === 'active' ? '在职' : '离职'}
                    />
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>

      <Dialog
        open={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>添加紧急联系人</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Box>
              <InputLabel htmlFor='emergency-name'>联系人姓名 *</InputLabel>
              <TextField
                id='emergency-name'
                size='small'
                fullWidth
                type='text'
                value={editData.emergency_contact_name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditData({
                    ...editData,
                    emergency_contact_name: e.target.value,
                  })
                }
                placeholder='请输入联系人姓名'
                sx={{ mt: 0.5 }}
              />
            </Box>
            <Box>
              <InputLabel htmlFor='emergency-phone'>联系电话 *</InputLabel>
              <TextField
                id='emergency-phone'
                size='small'
                fullWidth
                type='text'
                value={editData.emergency_contact_phone || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditData({
                    ...editData,
                    emergency_contact_phone: e.target.value,
                  })
                }
                placeholder='请输入联系电话'
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            variant='contained'
            onClick={() => setShowEmergencyModal(false)}
          >
            取消
          </Button>
          <Button onClick={() => setShowEmergencyModal(false)}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HrmEmployeeDetailPage;
