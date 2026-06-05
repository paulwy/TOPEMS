import React, { useState, useEffect, useMemo } from 'react';
import { Building, Building2, Search, Plus, Edit, Trash2, Eye, X, Users, ChevronRight, RefreshCw } from 'lucide-react';
import { companyApi, departmentApi, employeeApi, type Company, type Department, type Employee } from '../api/hrm';
import { useAppStore } from '../store';
import { HrmLayout } from '../components/HrmLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface OrganizationNode {
  id: string;
  name: string;
  type: 'company' | 'department';
  companyId?: string;
  parentId?: string;
  children?: OrganizationNode[];
  data?: Company | Department;
}

const HrmOrganizationPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);

  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchText, setSearchText] = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrganizationNode | null>(null);

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  
  const [companyFormData, setCompanyFormData] = useState<Partial<Company>>({});
  const [deptFormData, setDeptFormData] = useState<Partial<Department>>({});

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const treeData = useMemo(() => {
    const result: OrganizationNode[] = [];
    
    companies.forEach(company => {
      const companyNode: OrganizationNode = {
        id: `company-${company.id}`,
        name: company.name,
        type: 'company',
        companyId: company.id,
        data: company,
        children: []
      };
      
      const companyDepts = departments.filter(d => d.company_id === company.id);
      const deptMap = new Map<string, OrganizationNode>();
      
      companyDepts.forEach(dept => {
        deptMap.set(dept.id, {
          id: `dept-${dept.id}`,
          name: dept.name,
          type: 'department',
          companyId: company.id,
          parentId: dept.parent_id,
          data: dept,
          children: []
        });
      });
      
      companyDepts.forEach(dept => {
        const node = deptMap.get(dept.id)!;
        if (dept.parent_id && deptMap.has(dept.parent_id)) {
          deptMap.get(dept.parent_id)!.children!.push(node);
        } else {
          companyNode.children!.push(node);
        }
      });
      
      result.push(companyNode);
    });
    
    return result;
  }, [companies, departments]);

  const filteredTreeData = useMemo(() => {
    if (!searchText.trim()) return treeData;
    
    const search = searchText.toLowerCase();
    
    const filterNode = (node: OrganizationNode): OrganizationNode | null => {
      const matches = node.name.toLowerCase().includes(search);
      const filteredChildren = (node.children || []).map(filterNode).filter((n): n is OrganizationNode => n !== null);
      
      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    
    return treeData.map(filterNode).filter((n): n is OrganizationNode => n !== null);
  }, [treeData, searchText]);

  const renderTree = (nodes: OrganizationNode[], level: number = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-slate-100 ${
            selectedNode?.id === node.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
          }`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => handleNodeSelect(node)}
        >
          {node.children && node.children.length > 0 && (
            <button
              className="p-0.5 hover:bg-slate-200 rounded"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${expandedIds.has(node.id) ? 'rotate-90' : ''}`}
              />
            </button>
          )}
          {node.children && node.children.length === 0 && (
            <span className="w-5" />
          )}
          {node.type === 'company' ? (
            <Building className="w-4 h-4 text-blue-500" />
          ) : (
            <Building2 className="w-4 h-4 text-green-500" />
          )}
          <span className="font-medium text-sm">{node.name}</span>
          {node.type === 'company' && (
            <Badge variant="outline" className="ml-auto text-xs">
              {getCompanyEmployeeCount(node.companyId!)} 人
            </Badge>
          )}
          {node.type === 'department' && (
            <Badge variant="outline" className="ml-auto text-xs">
              {getDeptEmployeeCount(node.id.replace('dept-', ''))} 人
            </Badge>
          )}
        </div>
        {node.children && node.children.length > 0 && expandedIds.has(node.id) && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  const getCompanyEmployeeCount = (companyId: string): number => {
    const companyDepts = departments.filter(d => d.company_id === companyId);
    const deptIds = companyDepts.map(d => d.id);
    return employees.filter(e => deptIds.includes(e.department_id || '')).length;
  };

  const getDeptEmployeeCount = (deptId: string): number => {
    return employees.filter(e => e.department_id === deptId).length;
  };

  const handleNodeSelect = (node: OrganizationNode) => {
    setSelectedNode(node);
    if (node.type === 'department') {
      const deptId = node.id.replace('dept-', '');
      fetchDeptEmployees(deptId);
    } else {
      fetchCompanyEmployees(node.companyId!);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [companyRes, deptRes, empRes] = await Promise.all([
        companyApi.list(),
        departmentApi.list(),
        employeeApi.list({ page_size: 500 })
      ]);

      if (companyRes.code === 200 && companyRes.data) {
        setCompanies((companyRes.data as any).items || []);
      }
      if (deptRes.code === 200 && deptRes.data) {
        setDepartments((deptRes.data as any).items || []);
      }
      if (empRes.code === 200 && empRes.data) {
        setEmployees((empRes.data as any).items || []);
      }
    } catch (error: any) {
      addNotification({ title: '加载失败', message: error.message || '获取数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyEmployees = async (companyId: string) => {
    try {
      const companyDepts = departments.filter(d => d.company_id === companyId);
      const deptIds = companyDepts.map(d => d.id).join(',');
      const response = await employeeApi.list({ department_id: undefined, page_size: 200 });
      if (response.code === 200 && response.data) {
        const allEmps = (response.data as any).items || [];
        const filtered = allEmps.filter((e: Employee) => deptIds.includes(e.department_id || ''));
        setEmployees(filtered);
      }
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchDeptEmployees = async (deptId: string) => {
    try {
      const response = await employeeApi.list({ department_id: deptId, page_size: 100 });
      if (response.code === 200 && response.data) {
        setEmployees((response.data as any).items || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch employees:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCompany = () => {
    setModalMode('create');
    setCompanyFormData({});
    setShowCompanyModal(true);
  };

  const handleEditCompany = () => {
    if (selectedNode?.type === 'company' && selectedNode.data) {
      setModalMode('edit');
      setCompanyFormData(selectedNode.data as Company);
      setShowCompanyModal(true);
    }
  };

  const handleViewCompany = () => {
    if (selectedNode?.type === 'company' && selectedNode.data) {
      setModalMode('view');
      setCompanyFormData(selectedNode.data as Company);
      setShowCompanyModal(true);
    }
  };

  const handleDeleteCompany = async () => {
    if (selectedNode?.type === 'company' && selectedNode.companyId) {
      if (confirm('确定要删除这个公司吗？')) {
        try {
          const response = await companyApi.delete(selectedNode.companyId);
          if (response.code === 200) {
            addNotification({ title: '成功', message: '删除成功', type: 'success' });
            fetchData();
            setSelectedNode(null);
          } else {
            addNotification({ title: '失败', message: '删除失败', type: 'error' });
          }
        } catch (error: any) {
          addNotification({ title: '失败', message: error.message || '删除失败', type: 'error' });
        }
      }
    }
  };

  const handleSaveCompany = async () => {
    try {
      if (modalMode === 'create') {
        const response = await companyApi.create(companyFormData as Company);
        if (response.code === 200) {
          addNotification({ title: '成功', message: '创建成功', type: 'success' });
          setShowCompanyModal(false);
          fetchData();
        }
      } else {
        if (companyFormData.id) {
          const response = await companyApi.update(companyFormData.id, companyFormData as Company);
          if (response.code === 200) {
            addNotification({ title: '成功', message: '更新成功', type: 'success' });
            setShowCompanyModal(false);
            fetchData();
          }
        }
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '操作失败', type: 'error' });
    }
  };

  const handleCreateDepartment = () => {
    setModalMode('create');
    setDeptFormData({ company_id: selectedNode?.companyId });
    setShowDeptModal(true);
  };

  const handleEditDepartment = () => {
    if (selectedNode?.type === 'department' && selectedNode.data) {
      setModalMode('edit');
      setDeptFormData(selectedNode.data as Department);
      setShowDeptModal(true);
    }
  };

  const handleViewDepartment = () => {
    if (selectedNode?.type === 'department' && selectedNode.data) {
      setModalMode('view');
      setDeptFormData(selectedNode.data as Department);
      setShowDeptModal(true);
    }
  };

  const handleDeleteDepartment = async () => {
    if (selectedNode?.type === 'department') {
      const deptId = selectedNode.id.replace('dept-', '');
      if (confirm('确定要删除这个部门吗？')) {
        try {
          const response = await departmentApi.delete(deptId);
          if (response.code === 200) {
            addNotification({ title: '成功', message: '删除成功', type: 'success' });
            fetchData();
            setSelectedNode(null);
          } else {
            addNotification({ title: '失败', message: '删除失败', type: 'error' });
          }
        } catch (error: any) {
          addNotification({ title: '失败', message: error.message || '删除失败', type: 'error' });
        }
      }
    }
  };

  const handleSaveDepartment = async () => {
    try {
      if (modalMode === 'create') {
        const response = await departmentApi.create(deptFormData as Department);
        if (response.code === 200) {
          addNotification({ title: '成功', message: '创建成功', type: 'success' });
          setShowDeptModal(false);
          fetchData();
        }
      } else {
        if (deptFormData.id) {
          const response = await departmentApi.update(deptFormData.id, deptFormData as Department);
          if (response.code === 200) {
            addNotification({ title: '成功', message: '更新成功', type: 'success' });
            setShowDeptModal(false);
            fetchData();
          }
        }
      }
    } catch (error: any) {
      addNotification({ title: '失败', message: error.message || '操作失败', type: 'error' });
    }
  };

  const availableParentDepts = useMemo(() => {
    if (!selectedNode) return [];
    const companyId = selectedNode.type === 'company' ? selectedNode.companyId : selectedNode.companyId;
    if (!companyId) return [];
    return departments.filter(d => d.company_id === companyId && d.id !== (deptFormData.id as string));
  }, [selectedNode, departments, deptFormData.id]);

  return (
    <HrmLayout>
      <div className="flex h-[calc(100vh-72px)]">
        <div className="w-80 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">组织架构</h2>
              <Button size="sm" onClick={handleCreateCompany}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="搜索公司或部门..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              </div>
            ) : filteredTreeData.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Building className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>暂无组织架构数据</p>
              </div>
            ) : (
              renderTree(filteredTreeData)
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedNode ? (
                  <>
                    {selectedNode.type === 'company' ? (
                      <Building className="w-6 h-6 text-blue-500" />
                    ) : (
                      <Building2 className="w-6 h-6 text-green-500" />
                    )}
                    <div>
                      <h2 className="font-semibold text-slate-800">{selectedNode.name}</h2>
                      <p className="text-sm text-slate-500">
                        {selectedNode.type === 'company' ? '公司' : '部门'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <h2 className="font-semibold text-slate-800">请选择组织</h2>
                    <p className="text-sm text-slate-500">在左侧选择公司或部门查看详情</p>
                  </div>
                )}
              </div>

              {selectedNode && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={selectedNode.type === 'company' ? handleViewCompany : handleViewDepartment}>
                    <Eye className="w-4 h-4" />
                    查看
                  </Button>
                  <Button variant="outline" size="sm" onClick={selectedNode.type === 'company' ? handleEditCompany : handleEditDepartment}>
                    <Edit className="w-4 h-4" />
                    编辑
                  </Button>
                  {selectedNode.type === 'department' && (
                    <Button variant="outline" size="sm" onClick={handleCreateDepartment}>
                      <Plus className="w-4 h-4" />
                      添加子部门
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600" onClick={selectedNode.type === 'company' ? handleDeleteCompany : handleDeleteDepartment}>
                    <Trash2 className="w-4 h-4" />
                    删除
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {selectedNode ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    员工列表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employees.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>暂无员工</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {employees.map(emp => (
                        <div
                          key={emp.id}
                          className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{emp.name}</p>
                            <p className="text-sm text-slate-500">{emp.position || '无职位'}</p>
                          </div>
                          <Badge variant="outline">{emp.status === 'active' ? '在职' : '离职'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <Building className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">选择一个组织</p>
                  <p className="text-sm">在左侧树形结构中选择公司或部门</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? '创建公司' : modalMode === 'edit' ? '编辑公司' : '查看公司'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>公司名称</Label>
              <Input
                value={companyFormData.name || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, name: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder="请输入公司名称"
              />
            </div>
            <div>
              <Label>公司简称</Label>
              <Input
                value={companyFormData.short_name || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, short_name: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder="请输入公司简称"
              />
            </div>
            <div>
              <Label>公司地址</Label>
              <Input
                value={companyFormData.address || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, address: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder="请输入公司地址"
              />
            </div>
            <div>
              <Label>公司描述</Label>
              <Textarea
                value={companyFormData.description || ''}
                onChange={(e) => setCompanyFormData({ ...companyFormData, description: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder="请输入公司描述"
              />
            </div>
            <div>
              <Label>状态</Label>
              <Select
                value={companyFormData.status || ''}
                onValueChange={(value) => setCompanyFormData({ ...companyFormData, status: value as 'active' | 'inactive' })}
                disabled={modalMode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {modalMode !== 'view' && (
              <Button onClick={handleSaveCompany}>
                {modalMode === 'create' ? '创建' : '保存'}
              </Button>
            )}
            {modalMode === 'view' && (
              <Button onClick={() => setShowCompanyModal(false)}>关闭</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeptModal} onOpenChange={setShowDeptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? '创建部门' : modalMode === 'edit' ? '编辑部门' : '查看部门'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>部门名称</Label>
              <Input
                value={deptFormData.name || ''}
                onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder="请输入部门名称"
              />
            </div>
            <div>
              <Label>上级部门</Label>
              <Select
                value={deptFormData.parent_id || ''}
                onValueChange={(value) => setDeptFormData({ ...deptFormData, parent_id: value || undefined })}
                disabled={modalMode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择上级部门（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无上级部门</SelectItem>
                  {availableParentDepts.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>部门描述</Label>
              <Textarea
                value={deptFormData.description || ''}
                onChange={(e) => setDeptFormData({ ...deptFormData, description: e.target.value })}
                disabled={modalMode === 'view'}
                placeholder="请输入部门描述"
              />
            </div>
            <div>
              <Label>状态</Label>
              <Select
                value={deptFormData.status || ''}
                onValueChange={(value) => setDeptFormData({ ...deptFormData, status: value as 'active' | 'inactive' })}
                disabled={modalMode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="inactive">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            {modalMode !== 'view' && (
              <Button onClick={handleSaveDepartment}>
                {modalMode === 'create' ? '创建' : '保存'}
              </Button>
            )}
            {modalMode === 'view' && (
              <Button onClick={() => setShowDeptModal(false)}>关闭</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrmLayout>
  );
};

export default HrmOrganizationPage;