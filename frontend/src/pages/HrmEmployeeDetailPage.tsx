import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { employeeApi, departmentApi, type Employee, type Department } from '../api/hrm';
import { useNotification } from '../hooks/useNotification';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

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

  useEffect(() => {
    if (id) {
      loadEmployee(id);
    }
    loadDepartments();
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
      console.error('Failed to load employee:', err);
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
      console.error('Failed to load departments:', err);
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
      console.error('Failed to save:', err);
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
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <AlertCircle className='w-12 h-12 text-gray-400 mx-auto mb-3' />
          <p className='text-gray-500'>员工不存在</p>
          <Button onClick={() => navigate('/hrm/employees')} className='mt-4'>
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='bg-white shadow-sm border-b'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' onClick={() => navigate('/hrm/employees')}>
              <ArrowLeft className='w-4 h-4 mr-2' />
              返回
            </Button>
            <div>
              <h1 className='text-xl font-bold text-gray-900'>员工详情</h1>
              <p className='text-sm text-gray-500'>查看和编辑员工档案信息</p>
            </div>
            <div className='ml-auto'>
              {isEditing ? (
                <div className='flex gap-2'>
                  <Button variant='secondary' onClick={handleCancelEdit}>
                    <X className='w-4 h-4 mr-2' />
                    取消
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className='w-4 h-4 mr-2' />
                    保存
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit2 className='w-4 h-4 mr-2' />
                  编辑
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='grid gap-6'>
          <Card>
            <CardContent className='p-6'>
              <div className='flex items-start gap-6'>
                <Avatar className='w-20 h-20'>
                  <AvatarFallback className='bg-blue-100 text-blue-700 text-2xl'>
                    {employee.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1'>
                  <div className='flex items-center gap-3 mb-2'>
                    <h2 className='text-2xl font-bold text-gray-900'>{employee.name}</h2>
                    <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                      {employee.status === 'active' ? '在职' : '离职'}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-4 text-sm text-gray-500'>
                    <span className='flex items-center gap-1'>
                      <FileText className='w-4 h-4' />
                      {employee.employee_number}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Briefcase className='w-4 h-4' />
                      {employee.position || '-'}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Building2 className='w-4 h-4' />
                      {getDepartmentName(employee.department_id)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue='basic' className='space-y-6'>
            <TabsList className='grid w-[360px] grid-cols-3'>
              <TabsTrigger value='basic' className='flex items-center gap-2'>
                <User className='w-4 h-4' />
                基本信息
              </TabsTrigger>
              <TabsTrigger value='contact' className='flex items-center gap-2'>
                <Phone className='w-4 h-4' />
                联系方式
              </TabsTrigger>
              <TabsTrigger value='emergency' className='flex items-center gap-2'>
                <Heart className='w-4 h-4' />
                紧急联系人
              </TabsTrigger>
            </TabsList>

            <TabsContent value='basic' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>基本信息</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-3 gap-4'>
                    <div>
                      <Label className='text-sm text-gray-500'>姓名</Label>
                      {isEditing ? (
                        <Input
                          value={editData.name || ''}
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className='mt-1'
                        />
                      ) : (
                        <p className='mt-1 font-medium'>{employee.name}</p>
                      )}
                    </div>
                    <div>
                      <Label className='text-sm text-gray-500'>性别</Label>
                      {isEditing ? (
                        <div className='mt-1'>
                          <Select
                            value={editData.gender || ''}
                            onValueChange={(value) => setEditData({ ...editData, gender: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='请选择' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='none'>未设置</SelectItem>
                              <SelectItem value='male'>男</SelectItem>
                              <SelectItem value='female'>女</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className='mt-1 font-medium'>
                          {employee.gender === 'male' ? '男' : employee.gender === 'female' ? '女' : '-'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className='text-sm text-gray-500'>出生日期</Label>
                      {isEditing ? (
                        <Input
                          type='date'
                          value={editData.birth_date || ''}
                          onChange={(e) => setEditData({ ...editData, birth_date: e.target.value })}
                          className='mt-1'
                        />
                      ) : (
                        <p className='mt-1 font-medium'>
                          {employee.birth_date ? new Date(employee.birth_date).toLocaleDateString() : '-'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className='text-sm text-gray-500'>入职日期</Label>
                      {isEditing ? (
                        <Input
                          type='date'
                          value={editData.hire_date || ''}
                          onChange={(e) => setEditData({ ...editData, hire_date: e.target.value })}
                          className='mt-1'
                        />
                      ) : (
                        <p className='mt-1 font-medium'>
                          {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className='text-sm text-gray-500'>部门</Label>
                      {isEditing ? (
                        <div className='mt-1'>
                          <Select
                            value={editData.department_id || ''}
                            onValueChange={(value) => setEditData({ ...editData, department_id: value || undefined })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='请选择部门' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='none'>未设置</SelectItem>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <p className='mt-1 font-medium'>{getDepartmentName(employee.department_id)}</p>
                      )}
                    </div>
                    <div>
                      <Label className='text-sm text-gray-500'>职位</Label>
                      {isEditing ? (
                        <Input
                          value={editData.position || ''}
                          onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                          className='mt-1'
                        />
                      ) : (
                        <p className='mt-1 font-medium'>{employee.position || '-'}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='contact' className='space-y-4'>
              <Card>
                <CardHeader>
                  <CardTitle className='text-lg'>联系方式</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label className='text-sm text-gray-500'>工作邮箱</Label>
                      {isEditing ? (
                        <Input
                          type='email'
                          value={editData.email || ''}
                          onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          className='mt-1'
                          placeholder='请输入邮箱'
                        />
                      ) : (
                        <div className='mt-1 flex items-center gap-2'>
                          <Mail className='w-4 h-4 text-gray-400' />
                          <span className='font-medium'>{employee.email || '-'}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className='text-sm text-gray-500'>联系电话</Label>
                      {isEditing ? (
                        <Input
                          value={editData.phone || ''}
                          onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className='mt-1'
                          placeholder='请输入电话'
                        />
                      ) : (
                        <div className='mt-1 flex items-center gap-2'>
                          <Phone className='w-4 h-4 text-gray-400' />
                          <span className='font-medium'>{employee.phone || '-'}</span>
                        </div>
                      )}
                    </div>
                    <div className='col-span-2'>
                      <Label className='text-sm text-gray-500'>联系地址</Label>
                      {isEditing ? (
                        <textarea
                          value={editData.address || ''}
                          onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                          className='w-full mt-1 border border-gray-300 rounded-md px-3 py-2'
                          rows={3}
                          placeholder='请输入地址'
                        />
                      ) : (
                        <div className='mt-1 flex items-start gap-2'>
                          <MapPin className='w-4 h-4 text-gray-400 mt-0.5' />
                          <span className='font-medium'>{employee.address || '-'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='emergency' className='space-y-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between'>
                  <CardTitle className='text-lg'>紧急联系人</CardTitle>
                  {isEditing && (
                    <Button size='sm' onClick={() => setShowEmergencyModal(true)}>
                      <Plus className='w-4 h-4 mr-2' />
                      添加
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {employee.emergency_contact_name ? (
                    <div className='bg-gray-50 rounded-lg p-4 space-y-3'>
                      <div className='flex items-center gap-3'>
                        <div className='w-10 h-10 rounded-full bg-red-100 flex items-center justify-center'>
                          <Heart className='w-5 h-5 text-red-600' />
                        </div>
                        <div>
                          <p className='font-semibold'>{employee.emergency_contact_name}</p>
                          <p className='text-sm text-gray-500'>紧急联系人</p>
                        </div>
                      </div>
                      <div className='grid grid-cols-2 gap-4 ml-13'>
                        <div>
                          <Label className='text-sm text-gray-500'>联系电话</Label>
                          {isEditing ? (
                            <Input
                              value={editData.emergency_contact_phone || ''}
                              onChange={(e) => setEditData({ ...editData, emergency_contact_phone: e.target.value })}
                              className='mt-1'
                            />
                          ) : (
                            <div className='mt-1 flex items-center gap-2'>
                              <Phone className='w-4 h-4 text-gray-400' />
                              <span className='font-medium'>{employee.emergency_contact_phone || '-'}</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <Label className='text-sm text-gray-500'>联系人姓名</Label>
                          {isEditing ? (
                            <Input
                              value={editData.emergency_contact_name || ''}
                              onChange={(e) => setEditData({ ...editData, emergency_contact_name: e.target.value })}
                              className='mt-1'
                            />
                          ) : (
                            <p className='mt-1 font-medium'>{employee.emergency_contact_name}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='text-center py-8'>
                      <Heart className='w-12 h-12 text-gray-300 mx-auto mb-3' />
                      <p className='text-gray-500'>暂无紧急联系人信息</p>
                      {isEditing && (
                        <Button onClick={() => setShowEmergencyModal(true)} className='mt-4'>
                          <Plus className='w-4 h-4 mr-2' />
                          添加紧急联系人
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>其他信息</CardTitle>
            </CardHeader>
            <CardContent className='grid grid-cols-4 gap-4'>
              <div className='bg-gray-50 rounded-lg p-4'>
                <p className='text-sm text-gray-500'>创建时间</p>
                <p className='font-medium mt-1'>
                  <Calendar className='w-4 h-4 text-gray-400 inline mr-1' />
                  {new Date(employee.created_at).toLocaleString()}
                </p>
              </div>
              <div className='bg-gray-50 rounded-lg p-4'>
                <p className='text-sm text-gray-500'>更新时间</p>
                <p className='font-medium mt-1'>
                  <Calendar className='w-4 h-4 text-gray-400 inline mr-1' />
                  {new Date(employee.updated_at).toLocaleString()}
                </p>
              </div>
              <div className='bg-gray-50 rounded-lg p-4'>
                <p className='text-sm text-gray-500'>员工ID</p>
                <p className='font-medium mt-1 font-mono text-sm'>{employee.id.substring(0, 8)}...</p>
              </div>
              <div className='bg-gray-50 rounded-lg p-4'>
                <p className='text-sm text-gray-500'>状态</p>
                <p className='font-medium mt-1'>
                  <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                    {employee.status === 'active' ? '在职' : '离职'}
                  </Badge>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {showEmergencyModal && (
        <Dialog open={showEmergencyModal} onOpenChange={setShowEmergencyModal}>
          <DialogContent className='max-w-md'>
            <DialogHeader>
              <DialogTitle>添加紧急联系人</DialogTitle>
            </DialogHeader>
            <div className='space-y-4'>
              <div>
                <Label htmlFor='emergency-name'>联系人姓名 *</Label>
                <Input
                  id='emergency-name'
                  type='text'
                  value={editData.emergency_contact_name || ''}
                  onChange={(e) => setEditData({ ...editData, emergency_contact_name: e.target.value })}
                  placeholder='请输入联系人姓名'
                />
              </div>
              <div>
                <Label htmlFor='emergency-phone'>联系电话 *</Label>
                <Input
                  id='emergency-phone'
                  type='text'
                  value={editData.emergency_contact_phone || ''}
                  onChange={(e) => setEditData({ ...editData, emergency_contact_phone: e.target.value })}
                  placeholder='请输入联系电话'
                />
              </div>
            </div>
            <DialogFooter className='mt-6'>
              <Button variant='secondary' onClick={() => setShowEmergencyModal(false)}>
                取消
              </Button>
              <Button onClick={() => setShowEmergencyModal(false)}>保存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default HrmEmployeeDetailPage;
