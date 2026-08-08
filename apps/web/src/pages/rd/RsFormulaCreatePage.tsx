import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormPageTemplate, type FormSection } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { formulaApi, rdApi } from '@/api/rd';
import type {
  Formula,
  FormulaIngredient,
  CreateFormulaRequest,
  UpdateFormulaRequest,
} from '@/api/rd';
import { useNotificationStore } from '@/store';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS } from '@/lib/reactQuery';
import { logger } from '@/utils/logger';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { Plus, Trash2 } from 'lucide-react';

const statuses = [
  { value: 'draft', label: '草稿' },
  { value: 'testing', label: '测试中' },
  { value: 'approved', label: '已发布' },
];

const RsFormulaCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const [ingredients, setIngredients] = useState<FormulaIngredient[]>([
    { name: '', quantity: 0, unit: '%', purity: '', supplier: '', notes: '' },
  ]);

  const projectsQuery = useQuery({
    queryKey: QUERY_KEYS.RD.PROJECTS,
    queryFn: async () => {
      const response = await rdApi.listProjects();
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载项目列表失败');
      }
      return response.data.projects?.map((p) => ({ id: p.id, name: p.name })) || [];
    },
  });

  const formulaQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULA(id || ''),
    queryFn: async () => {
      const response = await formulaApi.getFormula(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || '加载配方数据失败');
      }
      return response.data;
    },
    enabled: isEdit && !!id,
  });

  useEffect(() => {
    if (formulaQuery.data) {
      setIngredients(
        formulaQuery.data.ingredients || [
          { name: '', quantity: 0, unit: '%', purity: '', supplier: '', notes: '' },
        ]
      );
    }
  }, [formulaQuery.data]);

  const submitMutation = useMutation({
    mutationFn: async (params: {
      isEdit: boolean;
      id?: string;
      createData?: CreateFormulaRequest;
      updateData?: UpdateFormulaRequest;
    }) => {
      if (params.isEdit && params.id && params.updateData) {
        const response = await formulaApi.updateFormula(params.id, params.updateData);
        if (!response.success) {
          throw new Error(response.message || '更新配方失败');
        }
        return response;
      } else if (params.createData) {
        const response = await formulaApi.createFormula(params.createData);
        if (!response.success) {
          throw new Error(response.message || '创建配方失败');
        }
        return response;
      }
      throw new Error('无效的提交参数');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RD.FORMULAS });
      addNotification({
        type: 'success',
        title: isEdit ? '更新成功' : '创建成功',
        message: isEdit ? '配方已更新' : '配方已创建',
      });
      navigate(RD_PATHS.formula);
    },
    onError: (error: unknown) => {
      logger.error('提交配方失败:', error);
      addNotification({
        type: 'error',
        title: '提交失败',
        message: error instanceof Error ? error.message : '无法提交配方',
      });
    },
  });

  const projects = projectsQuery.data || [];
  const loading = formulaQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = formulaQuery.error ? '加载配方数据失败' : undefined;

  const defaultValues = {
    name: '',
    code: '',
    project_id: '',
    version: 'v1.0',
    category: '',
    description: '',
    status: 'draft',
    effective_date: '',
    expiration_date: '',
  };

  const sections: FormSection[] = useMemo(
    () => [
      {
        id: 'basic',
        title: '基本信息',
        description: '配方核心信息',
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'name',
            label: '配方名称',
            type: 'text',
            required: true,
            placeholder: '请输入配方名称',
          },
          {
            name: 'code',
            label: '配方编码',
            type: 'text',
            required: true,
            placeholder: '例如: FM-2024-001',
          },
          {
            name: 'version',
            label: '版本号',
            type: 'text',
            placeholder: '例如: v1.0',
          },
          {
            name: 'project_id',
            label: '所属项目',
            type: 'select',
            required: true,
            options: projects.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            name: 'status',
            label: '状态',
            type: 'select',
            options: statuses.map((s) => ({ label: s.label, value: s.value })),
          },
          {
            name: 'category',
            label: '配方类别',
            type: 'text',
            placeholder: '请输入配方类别',
          },
          {
            name: 'effective_date',
            label: '生效日期',
            type: 'date',
          },
          {
            name: 'expiration_date',
            label: '过期日期',
            type: 'date',
          },
          {
            name: 'description',
            label: '配方描述',
            type: 'textarea',
            rows: 3,
            placeholder: '请输入配方描述',
          },
        ],
      },
    ],
    [projects]
  );

  const handleAddIngredient = () => {
    setIngredients([
      ...ingredients,
      { name: '', quantity: 0, unit: '%', purity: '', supplier: '', notes: '' },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: keyof FormulaIngredient,
    value: string | number
  ) => {
    const newIngredients = [...ingredients];
    (newIngredients[index] as unknown as Record<string, string | number>)[field] = value;
    setIngredients(newIngredients);
  };

  const handleSubmit = async (data: unknown) => {
    const formData = data as unknown as Record<string, unknown>;

    if (!formData.name || !formData.code || !formData.project_id) {
      addNotification({
        type: 'error',
        title: '验证失败',
        message: '请填写必填字段',
      });
      return;
    }

    const validIngredients = ingredients.filter((i) => i.name.trim());

    if (isEdit && id) {
      const updateData: UpdateFormulaRequest = {
        name: formData.name as string,
        code: formData.code as string,
        version: formData.version as string,
        category: (formData.category as string) || undefined,
        description: (formData.description as string) || undefined,
        ingredients: validIngredients.length > 0 ? validIngredients : undefined,
        status: formData.status as string,
        effective_date: (formData.effective_date as string) || undefined,
        expiration_date: (formData.expiration_date as string) || undefined,
      };

      await submitMutation.mutateAsync({ isEdit, id, updateData });
    } else {
      const createData: CreateFormulaRequest = {
        name: formData.name as string,
        code: formData.code as string,
        project_id: formData.project_id as string,
        version: formData.version as string,
        category: (formData.category as string) || undefined,
        description: (formData.description as string) || undefined,
        ingredients: validIngredients.length > 0 ? validIngredients : undefined,
        status: formData.status as string,
        effective_date: (formData.effective_date as string) || undefined,
        expiration_date: (formData.expiration_date as string) || undefined,
      };

      await submitMutation.mutateAsync({ isEdit, createData });
    }
  };

  const handleCancel = () => {
    navigate(RD_PATHS.formula);
  };

  const additionalContent = (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography
        variant='h6'
        gutterBottom
      >
        配方组成
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>组分名称</TableCell>
              <TableCell>数量</TableCell>
              <TableCell>单位</TableCell>
              <TableCell>纯度</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>备注</TableCell>
              <TableCell align='center'>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map((comp, index) => (
              <TableRow key={index}>
                <TableCell>
                  <TextField
                    size='small'
                    value={comp.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size='small'
                    type='number'
                    value={comp.quantity}
                    onChange={(e) =>
                      handleIngredientChange(index, 'quantity', parseFloat(e.target.value) || 0)
                    }
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size='small'
                    value={comp.unit}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size='small'
                    value={comp.purity}
                    onChange={(e) => handleIngredientChange(index, 'purity', e.target.value)}
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size='small'
                    value={comp.supplier}
                    onChange={(e) => handleIngredientChange(index, 'supplier', e.target.value)}
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size='small'
                    value={comp.notes}
                    onChange={(e) => handleIngredientChange(index, 'notes', e.target.value)}
                    disabled={submitting}
                  />
                </TableCell>
                <TableCell align='center'>
                  <IconButton
                    size='small'
                    color='error'
                    onClick={() => handleRemoveIngredient(index)}
                    disabled={submitting || ingredients.length === 1}
                    aria-label='删除'
                  >
                    <Trash2 />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button
        startIcon={<Plus />}
        onClick={handleAddIngredient}
        sx={{ mt: 2 }}
        disabled={submitting}
      >
        添加组分
      </Button>
    </Paper>
  );

  return (
    <PageContainer
      title={isEdit ? '编辑配方' : '新增配方'}
      subtitle={isEdit ? '修改配方信息' : '创建新的研发配方'}
    >
      <FormPageTemplate
        title=''
        subtitle=''
        backHref={RD_PATHS.formula}
        sections={sections}
        defaultValues={defaultValues}
        loading={loading}
        submitting={submitting}
        error={error}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        submitText={isEdit ? '保存修改' : '创建配方'}
        columns={2}
        showValidationHints
        validationToasts={[
          { message: '提交成功', type: 'success' },
          { message: '提交失败，请检查表单', type: 'error' },
        ]}
        footerContent={additionalContent}
      />
    </PageContainer>
  );
};

export default RsFormulaCreatePage;
