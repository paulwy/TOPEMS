import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { FormDesigner } from '@/components/lowcode';
import { lowcodeApi } from '@/api';
import type { FormSchema } from '@/api/lowcode';
import { LOWCODE_PATHS } from '@/modules/lowcode/config';
import { logger } from '@/utils/logger';

const FormDesignerPage: React.FC = () => {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(formId && formId !== 'new');

  useEffect(() => {
    if (formId && formId !== 'new') {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      setLoading(true);
      const formRes = await lowcodeApi.formApi.getForm(formId!);
      if (formRes.success) {
        setSchema(formRes.data);
      }
    } catch (error) {
      logger.error('Failed to load form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newSchema: FormSchema) => {
    try {
      if (formId && formId !== 'new') {
        await lowcodeApi.formApi.updateForm(formId, {
          name: newSchema.name,
          description: newSchema.description,
          components: newSchema.components,
        });
      } else {
        const createdRes = await lowcodeApi.formApi.createForm({
          name: newSchema.name,
          description: newSchema.description,
          components: newSchema.components,
        });
        if (createdRes.success) {
          navigate(LOWCODE_PATHS.formDesigner.replace(':id', createdRes.data.id), { replace: true });
        }
      }
    } catch (error) {
      logger.error('Failed to save form:', error);
    }
  };

  const handlePublish = async (newSchema: FormSchema) => {
    try {
      if (formId && formId !== 'new') {
        await lowcodeApi.formApi.publishForm(formId);
      }
    } catch (error) {
      logger.error('Failed to publish form:', error);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <FormDesigner
      formId={formId !== 'new' ? formId : undefined}
      initialSchema={schema || undefined}
      onSave={handleSave}
      onPublish={handlePublish}
      onBack={() => navigate(LOWCODE_PATHS.form)}
    />
  );
};

export default FormDesignerPage;
