import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormPageTemplate, type FormSection } from '@/components/templates/FormPageTemplate';
import { PageContainer } from '@/components/common';
import { formulaApi, rdApi } from '@/api/rd';
import type { FormulaIngredient, CreateFormulaRequest, UpdateFormulaRequest } from '@/api/rd';
import i18n from '@/i18n';
import { useNotificationStore } from '@/store';
import { RD_PATHS } from '@/modules/rd/config';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/reactQuery';
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
  { value: 'draft', label: i18n.t('rd.rs_formula_create_page.k0') },
  { value: 'testing', label: i18n.t('rd.rs_formula_create_page.k1') },
  { value: 'approved', label: i18n.t('rd.rs_formula_create_page.k2') },
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
        throw new Error(response.message || i18n.t('rd.rs_formula_create_page.k3'));
      }
      return response.data.projects?.map((p) => ({ id: p.id, name: p.name })) || [];
    },

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const formulaQuery = useQuery({
    queryKey: QUERY_KEYS.RD.FORMULA(id || ''),
    queryFn: async () => {
      const response = await formulaApi.getFormula(id || '');
      if (!response.success || !response.data) {
        throw new Error(response.message || i18n.t('rd.rs_formula_create_page.k4'));
      }
      return response.data;
    },
    enabled: isEdit && !!id,

    staleTime: CACHE_DURATIONS.MEDIUM,
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
          throw new Error(response.message || i18n.t('rd.rs_formula_create_page.k5'));
        }
        return response;
      } else if (params.createData) {
        const response = await formulaApi.createFormula(params.createData);
        if (!response.success) {
          throw new Error(response.message || i18n.t('rd.rs_formula_create_page.k6'));
        }
        return response;
      }
      throw new Error(i18n.t('rd.rs_formula_create_page.k7'));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.RD.FORMULAS,
        exact: false,
        refetchType: 'active',
      });
      addNotification({
        type: 'success',
        title: isEdit
          ? i18n.t('rd.rs_formula_create_page.k9')
          : i18n.t('rd.rs_formula_create_page.k8'),
        message: isEdit
          ? i18n.t('rd.rs_formula_create_page.k11')
          : i18n.t('rd.rs_formula_create_page.k10'),
      });
      navigate(RD_PATHS.formula);
    },
    onError: (error: unknown) => {
      logger.error(i18n.t('pages.rs_formula_create_page.k0'), error);
      addNotification({
        type: 'error',
        title: i18n.t('rd.rs_formula_create_page.k12'),
        message: error instanceof Error ? error.message : i18n.t('rd.rs_formula_create_page.k13'),
      });
    },
  });
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery]);
  const loading = formulaQuery.isLoading;
  const submitting = submitMutation.isPending;
  const error = formulaQuery.error ? i18n.t('rd.rs_formula_create_page.k14') : undefined;
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
        title: i18n.t('rd.rs_formula_create_page.k15'),
        description: i18n.t('rd.rs_formula_create_page.k16'),
        collapsible: true,
        defaultExpanded: true,
        fields: [
          {
            name: 'name',
            label: i18n.t('rd.rs_formula_create_page.k17'),
            type: 'text',
            required: true,
            placeholder: i18n.t('rd.rs_formula_create_page.k18'),
          },
          {
            name: 'code',
            label: i18n.t('rd.rs_formula_create_page.k19'),
            type: 'text',
            required: true,
            placeholder: i18n.t('pages.rs_formula_create_page.fm2024001_1'),
          },
          {
            name: 'version',
            label: i18n.t('rd.rs_formula_create_page.k20'),
            type: 'text',
            placeholder: i18n.t('pages.rs_formula_create_page.v10_2'),
          },
          {
            name: 'project_id',
            label: i18n.t('rd.rs_formula_create_page.k21'),
            type: 'select',
            required: true,
            options: projects.map((p) => ({ label: p.name, value: p.id })),
          },
          {
            name: 'status',
            label: i18n.t('rd.rs_formula_create_page.k22'),
            type: 'select',
            options: statuses.map((s) => ({ label: s.label, value: s.value })),
          },
          {
            name: 'category',
            label: i18n.t('rd.rs_formula_create_page.k23'),
            type: 'text',
            placeholder: i18n.t('rd.rs_formula_create_page.k24'),
          },
          {
            name: 'effective_date',
            label: i18n.t('rd.rs_formula_create_page.k25'),
            type: 'date',
          },
          {
            name: 'expiration_date',
            label: i18n.t('rd.rs_formula_create_page.k26'),
            type: 'date',
          },
          {
            name: 'description',
            label: i18n.t('rd.rs_formula_create_page.k27'),
            type: 'textarea',
            rows: 3,
            placeholder: i18n.t('rd.rs_formula_create_page.k28'),
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
        title: i18n.t('rd.rs_formula_create_page.k29'),
        message: i18n.t('rd.rs_formula_create_page.k30'),
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
        {i18n.t('pages.rs_formula_create_page.k0')}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{i18n.t('rd.rs_formula_create_page.k31')}</TableCell>
              <TableCell>{i18n.t('rd.rs_formula_create_page.k32')}</TableCell>
              <TableCell>{i18n.t('rd.rs_formula_create_page.k33')}</TableCell>
              <TableCell>{i18n.t('rd.rs_formula_create_page.k34')}</TableCell>
              <TableCell>{i18n.t('rd.rs_formula_create_page.k35')}</TableCell>
              <TableCell>{i18n.t('rd.rs_formula_create_page.k36')}</TableCell>
              <TableCell align='center'>{i18n.t('rd.rs_formula_create_page.k37')}</TableCell>
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
                    aria-label={i18n.t('rd.rs_formula_create_page.k38')}
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
        {i18n.t('pages.rs_formula_create_page.k1')}
      </Button>
    </Paper>
  );
  return (
    <PageContainer
      title={
        isEdit ? i18n.t('rd.rs_formula_create_page.k40') : i18n.t('rd.rs_formula_create_page.k39')
      }
      subtitle={
        isEdit ? i18n.t('rd.rs_formula_create_page.k42') : i18n.t('rd.rs_formula_create_page.k41')
      }
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
        submitText={
          isEdit ? i18n.t('rd.rs_formula_create_page.k44') : i18n.t('rd.rs_formula_create_page.k43')
        }
        columns={2}
        showValidationHints
        validationToasts={[
          { message: i18n.t('rd.rs_formula_create_page.k45'), type: 'success' },
          { message: i18n.t('rd.rs_formula_create_page.k46'), type: 'error' },
        ]}
        footerContent={additionalContent}
      />
    </PageContainer>
  );
};
export default RsFormulaCreatePage;
