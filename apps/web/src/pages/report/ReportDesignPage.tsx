import React from 'react';
import { Box, Container, Typography, Card, CardContent, Button } from '@mui/material';
import {
  PenTool as PenToolIcon,
  Table as TableIcon,
  ChartBar as ChartBarIcon,
  Layout as LayoutIcon,
} from 'lucide-react';

const ReportDesignPage: React.FC = () => {
  return (
    <Container
      maxWidth='xl'
      sx={{ py: 3 }}
    >
      <div style={{ marginBottom: 12 }}>
        <Typography
          variant='h4'
          sx={{ fontWeight: 'bold' }}
          gutterBottom
        >
          报表设计
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          可视化报表设计器，支持拖拽式布局和多种组件
        </Typography>
      </div>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 8,
            }}
          >
            <PenToolIcon
              size={64}
              style={{ color: '#1976d2' }}
            />
            <Typography
              variant='h5'
              sx={{ mt: 4, mb: 2 }}
            >
              报表设计器
            </Typography>
            <Typography
              variant='body1'
              color='text.secondary'
              sx={{ textAlign: 'center' }}
            >
              可视化拖拽式报表设计工具，支持表格、图表、文本等多种组件
            </Typography>

            <Box sx={{ mt: 6, display: 'flex', gap: 3 }}>
              <Button
                variant='contained'
                startIcon={<TableIcon />}
                size='large'
              >
                添加表格
              </Button>
              <Button
                variant='contained'
                startIcon={<ChartBarIcon />}
                size='large'
              >
                添加图表
              </Button>
              <Button
                variant='contained'
                startIcon={<LayoutIcon />}
                size='large'
              >
                布局设置
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ReportDesignPage;
