import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { crmApi, Opportunity, CreateOpportunityRequest, UpdateOpportunityRequest } from '@/api/crm';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Search, Plus, Edit, Trash2, Eye, TrendingUp } from 'lucide-react';

const OpportunityManagementPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CreateOpportunityRequest>({
    name: '',
    value: undefined,
    probability: undefined,
    close_date: '',
    notes: '',
  });

  const { addNotification } = useAppStore();

  useEffect(() => {
    loadOpportunities();
  }, [currentPage, pageSize, searchTerm, stageFilter]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        pageSize,
      };
      if (searchTerm) params.search = searchTerm;
      if (stageFilter !== 'all') params.stage = stageFilter;

      const response = await crmApi.opportunities.list(params);
      if (response.success && response.data) {
        setOpportunities(response.data.items || []);
        setTotal(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载商机列表失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载商机列表',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedOpportunity) {
        await crmApi.opportunities.update(selectedOpportunity.id, formData as UpdateOpportunityRequest);
        addNotification({
          type: 'success',
          title: '更新成功',
          message: '商机信息已更新',
        });
      } else {
        await crmApi.opportunities.create(formData);
        addNotification({
          type: 'success',
          title: '创建成功',
          message: '新商机已创建',
        });
      }
      setShowDialog(false);
      resetForm();
      loadOpportunities();
    } catch (error) {
      console.error('操作失败:', error);
      addNotification({
        type: 'error',
        title: '操作失败',
        message: selectedOpportunity ? '更新商机失败' : '创建商机失败',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个商机吗?')) return;
    try {
      await crmApi.opportunities.delete(id);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: '商机已删除',
      });
      loadOpportunities();
    } catch (error) {
      console.error('删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除商机',
      });
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedIds.length} 个商机吗?`)) return;
    try {
      await crmApi.opportunities.batchDelete(selectedIds);
      addNotification({
        type: 'success',
        title: '删除成功',
        message: `已删除 ${selectedIds.length} 个商机`,
      });
      setSelectedIds([]);
      loadOpportunities();
    } catch (error) {
      console.error('批量删除失败:', error);
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '批量删除失败',
      });
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setFormData({
      name: opportunity.name,
      customer_id: opportunity.customer_id,
      value: opportunity.value,
      probability: opportunity.probability,
      close_date: opportunity.close_date || '',
      notes: opportunity.notes || '',
    });
    setShowDialog(true);
  };

  const handleViewDetail = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setShowDetailDialog(true);
  };

  const resetForm = () => {
    setSelectedOpportunity(null);
    setFormData({
      name: '',
      value: undefined,
      probability: undefined,
      close_date: '',
      notes: '',
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === opportunities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(opportunities.map((o) => o.id));
    }
  };

  const getStageBadge = (stage: string) => {
    const stageMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      lead: { label: '线索', variant: 'outline' },
      qualified: { label: '合格', variant: 'secondary' },
      proposal: { label: '提案', variant: 'default' },
      negotiation: { label: '谈判', variant: 'default' },
      closed_won: { label: '赢单', variant: 'default' },
      closed_lost: { label: '输单', variant: 'destructive' },
    };
    const s = stageMap[stage] || { label: stage, variant: 'outline' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  // 计算销售漏斗数据
  const getFunnelData = () => {
    const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    const stageLabels: Record<string, string> = {
      lead: '线索',
      qualified: '合格',
      proposal: '提案',
      negotiation: '谈判',
      closed_won: '赢单',
      closed_lost: '输单',
    };

    return stages.map((stage) => {
      const stageOpportunities = opportunities.filter((o) => o.stage === stage);
      const count = stageOpportunities.length;
      const value = stageOpportunities.reduce((sum, o) => sum + (o.value || 0), 0);
      return {
        stage,
        label: stageLabels[stage],
        count,
        value,
      };
    });
  };

  const funnelData = getFunnelData();
  const maxValue = Math.max(...funnelData.map((f) => f.value), 1);

  if (loading) return <LoadingSpinner />;

  return (
    <div className='space-y-6'>
      {/* 销售漏斗可视化 */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <TrendingUp className='h-5 w-5' />
            销售漏斗
          </CardTitle>
          <CardDescription>各阶段商机数量与金额统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4'>
            {funnelData.map((item) => (
              <Card key={item.stage} className='relative overflow-hidden'>
                <div
                  className='absolute bottom-0 left-0 right-0 bg-primary/10 transition-all'
                  style={{ height: `${(item.value / maxValue) * 100}%` }}
                />
                <CardContent className='relative p-4'>
                  <div className='text-sm font-medium text-muted-foreground'>{item.label}</div>
                  <div className='text-2xl font-bold'>{item.count}</div>
                  <div className='text-sm text-muted-foreground'>¥{item.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 商机列表 */}
      <Card>
        <CardHeader>
          <CardTitle>商机管理</CardTitle>
          <CardDescription>管理商机信息,跟踪销售机会和成交进度</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-4 mb-6'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='搜索商机名称...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className='w-[150px]'>
                <SelectValue placeholder='阶段筛选' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>全部阶段</SelectItem>
                <SelectItem value='lead'>线索</SelectItem>
                <SelectItem value='qualified'>合格</SelectItem>
                <SelectItem value='proposal'>提案</SelectItem>
                <SelectItem value='negotiation'>谈判</SelectItem>
                <SelectItem value='closed_won'>赢单</SelectItem>
                <SelectItem value='closed_lost'>输单</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
            >
              <Plus className='mr-2 h-4 w-4' />
              新增商机
            </Button>
          </div>

          {selectedIds.length > 0 && (
            <div className='mb-4 p-3 bg-muted rounded-lg flex items-center justify-between'>
              <span className='text-sm'>已选择 {selectedIds.length} 个商机</span>
              <Button variant='destructive' size='sm' onClick={handleBatchDelete}>
                <Trash2 className='mr-2 h-4 w-4' />
                批量删除
              </Button>
            </div>
          )}

          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'>
                    <Checkbox
                      checked={selectedIds.length === opportunities.length && opportunities.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>商机名称</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>阶段</TableHead>
                  <TableHead>概率</TableHead>
                  <TableHead>预计成交日期</TableHead>
                  <TableHead className='text-right'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className='text-center'>
                      <EmptyState title='暂无商机数据' description='点击上方按钮添加第一个商机' />
                    </TableCell>
                  </TableRow>
                ) : (
                  opportunities.map((opportunity) => (
                    <TableRow key={opportunity.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(opportunity.id)}
                          onCheckedChange={() => toggleSelect(opportunity.id)}
                        />
                      </TableCell>
                      <TableCell className='font-medium'>{opportunity.name}</TableCell>
                      <TableCell>¥{(opportunity.value || 0).toLocaleString()}</TableCell>
                      <TableCell>{getStageBadge(opportunity.stage)}</TableCell>
                      <TableCell>{opportunity.probability ? `${opportunity.probability}%` : '-'}</TableCell>
                      <TableCell>
                        {opportunity.close_date ? new Date(opportunity.close_date).toLocaleDateString('zh-CN') : '-'}
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button variant='ghost' size='sm' onClick={() => handleViewDetail(opportunity)}>
                          <Eye className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleEdit(opportunity)}>
                          <Edit className='h-4 w-4' />
                        </Button>
                        <Button variant='ghost' size='sm' onClick={() => handleDelete(opportunity.id)}>
                          <Trash2 className='h-4 w-4' />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className='mt-4 flex items-center justify-between'>
            <div className='text-sm text-muted-foreground'>
              共 {total} 条记录,第 {currentPage} / {Math.ceil(total / pageSize) || 1} 页
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {Array.from({ length: Math.min(5, Math.ceil(total / pageSize)) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className='cursor-pointer'
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(Math.min(Math.ceil(total / pageSize), currentPage + 1))}
                    className={
                      currentPage >= Math.ceil(total / pageSize) ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      {/* 新增/编辑对话框 */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{selectedOpportunity ? '编辑商机' : '新增商机'}</DialogTitle>
            <DialogDescription>{selectedOpportunity ? '修改商机信息' : '填写新商机信息'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className='grid grid-cols-2 gap-4 py-4'>
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='name'>商机名称 *</Label>
                <Input
                  id='name'
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='value'>金额</Label>
                <Input
                  id='value'
                  type='number'
                  value={formData.value || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='probability'>成交概率 (%)</Label>
                <Input
                  id='probability'
                  type='number'
                  min='0'
                  max='100'
                  value={formData.probability || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, probability: e.target.value ? Number(e.target.value) : undefined })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='close_date'>预计成交日期</Label>
                <Input
                  id='close_date'
                  type='date'
                  value={formData.close_date}
                  onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
                />
              </div>
              {selectedOpportunity && (
                <div className='space-y-2'>
                  <Label htmlFor='stage'>阶段</Label>
                  <Select
                    value={selectedOpportunity.stage}
                    onValueChange={(value) => setSelectedOpportunity({ ...selectedOpportunity, stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='lead'>线索</SelectItem>
                      <SelectItem value='qualified'>合格</SelectItem>
                      <SelectItem value='proposal'>提案</SelectItem>
                      <SelectItem value='negotiation'>谈判</SelectItem>
                      <SelectItem value='closed_won'>赢单</SelectItem>
                      <SelectItem value='closed_lost'>输单</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className='col-span-2 space-y-2'>
                <Label htmlFor='notes'>备注</Label>
                <Textarea
                  id='notes'
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type='button' variant='outline' onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type='submit'>保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>商机详情</DialogTitle>
          </DialogHeader>
          {selectedOpportunity && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>商机名称</Label>
                  <p className='font-medium'>{selectedOpportunity.name}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>金额</Label>
                  <p>¥{(selectedOpportunity.value || 0).toLocaleString()}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>阶段</Label>
                  <div>{getStageBadge(selectedOpportunity.stage)}</div>
                </div>
                <div>
                  <Label className='text-muted-foreground'>成交概率</Label>
                  <p>{selectedOpportunity.probability ? `${selectedOpportunity.probability}%` : '-'}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>预计成交日期</Label>
                  <p>
                    {selectedOpportunity.close_date
                      ? new Date(selectedOpportunity.close_date).toLocaleDateString('zh-CN')
                      : '-'}
                  </p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>创建时间</Label>
                  <p>{new Date(selectedOpportunity.created_at).toLocaleString('zh-CN')}</p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>更新时间</Label>
                  <p>{new Date(selectedOpportunity.updated_at).toLocaleString('zh-CN')}</p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>备注</Label>
                  <p>{selectedOpportunity.notes || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpportunityManagementPage;
