import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { FormDesigner } from '@/components/lowcode';
import { lowcodeApi } from '@/api';
import type { FormSchema } from '@/api/lowcode';

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
      const form = await lowcodeApi.formApi.get(formId!);
      if (form) {
        setSchema(form);
      }
    } catch (error) {
      console.error('Failed to load form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newSchema: FormSchema) => {
    try {
      if (formId && formId !== 'new') {
        await lowcodeApi.formApi.update(formId, {
          name: newSchema.name,
          description: newSchema.description,
          components: newSchema.components,
        });
      } else {
        const created = await lowcodeApi.formApi.create({
          name: newSchema.name,
          description: newSchema.description,
          components: newSchema.components,
        });
        navigate(`/lowcode/forms/${created.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Failed to save form:', error);
    }
  };

  const handlePublish = async (newSchema: FormSchema) => {
    try {
      if (formId && formId !== 'new') {
        await lowcodeApi.formApi.publish(formId);
      }
    } catch (error) {
      console.error('Failed to publish form:', error);
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
      onBack={() => navigate('/lowcode/forms')}
    />
  );
};

export default FormDesignerPage;
