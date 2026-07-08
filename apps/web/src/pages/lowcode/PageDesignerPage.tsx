import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { PageDesigner } from '@/components/lowcode';
import { lowcodeApi } from '@/api';
import type { PageSchema } from '@/api/lowcode';
import { logger } from "@/utils/logger";

const PageDesignerPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<PageSchema | null>(null);
  const [loading, setLoading] = useState(pageId && pageId !== 'new');

  useEffect(() => {
    if (pageId && pageId !== 'new') {
      loadPage();
    }
  }, [pageId]);

  const loadPage = async () => {
    try {
      setLoading(true);
      const page = await lowcodeApi.pageApi.get(pageId!);
      if (page) {
        setSchema(page);
      }
    } catch (error) {
      logger.error('Failed to load page:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (newSchema: PageSchema) => {
    try {
      if (pageId && pageId !== 'new') {
        await lowcodeApi.pageApi.update(pageId, {
          name: newSchema.name,
          description: newSchema.description,
          components: newSchema.components,
        });
      } else {
        const created = await lowcodeApi.pageApi.create({
          name: newSchema.name,
          description: newSchema.description,
          components: newSchema.components,
        });
        navigate(`/lowcode/pages/${created.id}`, { replace: true });
      }
    } catch (error) {
      logger.error('Failed to save page:', error);
    }
  };

  const handlePublish = async (newSchema: PageSchema) => {
    try {
      if (pageId && pageId !== 'new') {
        await lowcodeApi.pageApi.publish(pageId);
      }
    } catch (error) {
      logger.error('Failed to publish page:', error);
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
    <PageDesigner
      pageId={pageId !== 'new' ? pageId : undefined}
      initialSchema={schema || undefined}
      onSave={handleSave}
      onPublish={handlePublish}
      onBack={() => navigate('/lowcode/pages')}
    />
  );
};

export default PageDesignerPage;
