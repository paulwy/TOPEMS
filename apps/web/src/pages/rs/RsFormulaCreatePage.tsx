import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FormPageTemplate,
  type FormSection,
  type FormField,
} from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { formulaApi, rsApi } from '@/api/rs';
import type {
  Formula,
  FormulaIngredient,
  CreateFormulaRequest,
  UpdateFormulaRequest,
} from '@/api/rs';
import { useAppStore } from '@/store';
import { RS_PATHS } from '@/modules/rs/config';
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
  const { addNotification } = useAppStore();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [ingredients, setIngredients] = useState<FormulaIngredient[]>([
    { name: '', quantity: 0, unit: '%', purity: '', supplier: '', notes: '' },
  ]);

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

  useEffect(() => {
    loadProjects();
    if (isEdit && id) {
      loadFormula(id);
    }
  }, [isEdit, id]);

  const loadProjects = async () => {
    try {
      const response = await rsApi.listProjects();
      if (response.success && response.data) {
        setProjects(response.data.projects?.map((p) => ({ id: p.id, name: p.name })) || []);
      }
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载项目列表',
      });
    }
  };

  const loadFormula = async (formulaId: string) => {
    try {
      setLoading(true);
      setError(undefined);
      const response = await formulaApi.getFormula(formulaId);
      if (response.success && response.data) {
        const formula = response.data;
        setIngredients(
          formula.ingredients || [
            { name: '', quantity: 0, unit: '%', purity: '', supplier: '', notes: '' },
          ]
        );
      } else {
        setError('无法获取配方数据');
        addNotification({
          type: 'error',
          title: '加载失败',
          message: '无法加载配方数据',
        });
      }
    } catch (err: unknown) {
      setError('加载配方数据失败');
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载配方数据',
      });
    } finally {
      setLoading(false);
    }
  };

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
    setSubmitting(true);
    try {
      const formData = data as Record<string, unknown>;

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

        const response = await formulaApi.updateFormula(id, updateData);
        if (response.success) {
          addNotification({
            type: 'success',
            title: '更新成功',
            message: '配方已更新',
          });
          navigate(RS_PATHS.formula);
        } else {
          addNotification({
            type: 'error',
            title: '更新失败',
            message: '无法更新配方',
          });
        }
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

        const response = await formulaApi.createFormula(createData);
        if (response.success) {
          addNotification({
            type: 'success',
            title: '创建成功',
            message: '配方已创建',
          });
          navigate(RS_PATHS.formula);
        } else {
          addNotification({
            type: 'error',
            title: '创建失败',
            message: '无法创建配方',
          });
        }
      }
    } catch (err: unknown) {
      addNotification({
        type: 'error',
        title: '提交失败',
        message: (err as { message?: string }).message || '无法提交配方',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(RS_PATHS.formula);
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
