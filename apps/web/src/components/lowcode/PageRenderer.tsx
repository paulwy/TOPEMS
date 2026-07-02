import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  ButtonGroup,
  Button,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
} from '@mui/material';
import type { ComponentSchema, PageSchema } from '@/api/lowcode';

interface PageRendererProps {
  schema: PageSchema;
  data?: Record<string, unknown>;
}

const PageRenderer: React.FC<PageRendererProps> = ({ schema, data = {} }) => {
  const theme = useTheme();

  const renderComponent = (component: ComponentSchema): React.ReactNode => {
    switch (component.type) {
      case 'container':
        return (
          <Box
            sx={{
              p: (component.props?.padding as number) || 2,
              bgcolor: (component.props?.background as string) || 'transparent',
              borderRadius: 1,
              ...component.style,
            }}
          >
            {component.children?.map((child, idx) => (
              <React.Fragment key={idx}>{renderComponent(child)}</React.Fragment>
            ))}
          </Box>
        );

      case 'card':
        return (
          <Card elevation={(component.props?.shadow as boolean) ? 2 : 0}>
            {component.props?.title ? <CardHeader title={component.props.title as string} /> : null}
            <CardContent>
              {component.children?.map((child, idx) => (
                <React.Fragment key={idx}>{renderComponent(child)}</React.Fragment>
              ))}
            </CardContent>
          </Card>
        );

      case 'tabs':
        return (
          <TabsRenderComponent
            component={component}
            renderComponent={renderComponent}
          />
        );

      case 'table':
        const columns = (component.props?.columns as Array<{ key: string; title: string }>) || [];
        const tableData = (data[component.name || 'table'] as unknown[]) || [
          { name: '示例数据1', value: 100 },
          { name: '示例数据2', value: 200 },
          { name: '示例数据3', value: 150 },
        ];

        return (
          <TableContainer
            component={Paper}
            variant='outlined'
          >
            <Table
              size='small'
              sx={{ height: (component.props?.height as number) || 400 }}
            >
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell key={col.key}>{col.title}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {tableData.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {(row as Record<string, unknown>)[col.key] as string}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );

      case 'chart':
        return (
          <Box
            sx={{
              height: (component.props?.height as number) || 300,
              bgcolor: 'grey.100',
              borderRadius: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography
              variant='h6'
              color='text.secondary'
            >
              {(component.props?.title as string) || '图表'}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {(component.props?.chartType as string) || 'bar'} 图表示例
            </Typography>
          </Box>
        );

      case 'list':
        const listData = (data[component.name || 'list'] as unknown[]) || [
          { id: 1, title: '列表项1', desc: '描述信息' },
          { id: 2, title: '列表项2', desc: '描述信息' },
          { id: 3, title: '列表项3', desc: '描述信息' },
        ];

        return (
          <Box>
            {listData.map((item, idx) => (
              <Paper
                key={idx}
                variant='outlined'
                sx={{ p: 2, mb: 1 }}
              >
                <Typography variant='subtitle2'>
                  {(item as Record<string, unknown>).title as string}
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                >
                  {(item as Record<string, unknown>).desc as string}
                </Typography>
              </Paper>
            ))}
          </Box>
        );

      case 'form':
        return (
          <Paper
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mb: 2 }}
            >
              表单组件
            </Typography>
            {component.children?.map((child, idx) => (
              <React.Fragment key={idx}>{renderComponent(child)}</React.Fragment>
            ))}
          </Paper>
        );

      case 'button-group':
        const buttons =
          (component.props?.buttons as Array<{ text: string; variant: string }>) || [];
        return (
          <ButtonGroup variant='contained'>
            {buttons.map((btn, idx) => (
              <Button
                key={idx}
                color={
                  btn.variant === 'secondary'
                    ? 'secondary'
                    : btn.variant === 'danger'
                      ? 'error'
                      : 'primary'
                }
                variant={
                  btn.variant === 'text'
                    ? 'text'
                    : btn.variant === 'secondary'
                      ? 'outlined'
                      : 'contained'
                }
              >
                {btn.text}
              </Button>
            ))}
          </ButtonGroup>
        );

      case 'image':
        return (
          <Box
            component='img'
            src={(component.props?.src as string) || 'https://via.placeholder.com/400x200'}
            alt={(component.props?.alt as string) || '图片'}
            sx={{
              width: (component.props?.width as string) || '100%',
              height: (component.props?.height as string) || 'auto',
              objectFit: (component.props?.fit as string) || 'cover',
              borderRadius: 1,
              ...component.style,
            }}
          />
        );

      case 'text':
        const variant = (component.props?.variant as string) || 'body1';
        const align = (component.props?.align as string) || 'left';

        return (
          <Typography
            variant={variant as 'h1' | 'h2' | 'h3' | 'body1' | 'body2' | 'subtitle1'}
            align={align as 'left' | 'center' | 'right'}
            sx={component.style}
          >
            {component.props?.content as string}
          </Typography>
        );

      default:
        return (
          <Paper
            variant='outlined'
            sx={{ p: 2 }}
          >
            <Typography
              variant='body2'
              color='text.secondary'
            >
              {component.label || component.type} 组件
            </Typography>
          </Paper>
        );
    }
  };

  const layoutType = schema.layout?.type || 'flex';
  const columns = schema.layout?.columns || 1;
  const gap = schema.layout?.gap || 16;

  return (
    <Box
      sx={{
        display: layoutType === 'grid' ? 'grid' : 'flex',
        flexDirection: layoutType === 'flex' ? 'column' : undefined,
        gridTemplateColumns: layoutType === 'grid' ? `repeat(${columns}, 1fr)` : undefined,
        gap,
        ...schema.style,
      }}
    >
      {schema.components.map((component) => (
        <React.Fragment key={component.id}>{renderComponent(component)}</React.Fragment>
      ))}
    </Box>
  );
};

const TabsRenderComponent: React.FC<{
  component: ComponentSchema;
  renderComponent: (comp: ComponentSchema) => React.ReactNode;
}> = ({ component, renderComponent }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const tabs = (component.props?.tabs as Array<{ key: string; label: string }>) || [];

  return (
    <Paper variant='outlined'>
      <Tabs
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        variant='scrollable'
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.key}
            label={tab.label}
          />
        ))}
      </Tabs>
      <Box sx={{ p: 2 }}>
        {component.children?.[activeTab] && renderComponent(component.children[activeTab])}
      </Box>
    </Paper>
  );
};

export default PageRenderer;
