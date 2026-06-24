import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Divider,
} from '@mui/material';
import { Button } from '@mui/material';
import { Edit, History } from 'lucide-react';
import { DetailPageTemplate, type SectionConfig } from '@/components/templates';

interface Formula {
  id: string;
  name: string;
  code: string;
  version: string;
  project_name: string;
  status: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Component {
  name: string;
  percentage: number;
  unit: string;
  notes: string;
}

interface Version {
  version: string;
  date: string;
  changes: string;
}

const RsFormulaDetailPage: React.FC = () => {
  const formula: Formula = {
    id: '1',
    name: '配方A-001',
    code: 'FM-2024-001',
    version: 'v2.0',
    project_name: '新型催化剂研发项目',
    status: '测试中',
    description: '新型催化剂配方，包含主要活性成分和载体材料',
    created_by: '张三',
    created_at: '2024-03-15',
    updated_at: '2024-05-20',
  };

  const components: Component[] = [
    { name: '活性成分A', percentage: 15, unit: '%', notes: '主要催化成分' },
    { name: '载体材料B', percentage: 60, unit: '%', notes: '提供结构支撑' },
    { name: '助剂C', percentage: 5, unit: '%', notes: '提高稳定性' },
    { name: '粘结剂D', percentage: 10, unit: '%', notes: '成型粘结' },
    { name: '其他', percentage: 10, unit: '%', notes: '其他添加剂' },
  ];

  const versions: Version[] = [
    {
      version: 'v2.0',
      date: '2024-05-20',
      changes: '优化活性成分比例，提高催化效率',
    },
    { version: 'v1.5', date: '2024-04-15', changes: '调整载体材料配比' },
    { version: 'v1.0', date: '2024-03-15', changes: '初始配方版本' },
  ];

  // 区块配置
  const sections: SectionConfig[] = [
    {
      id: 'description',
      title: '配方描述',
      content: (
        <Typography
          variant='body2'
          color='text.secondary'
        >
          {formula.description}
        </Typography>
      ),
    },
    {
      id: 'components',
      title: '配方组成',
      content: (
        <TableContainer>
          <Table size='small'>
            <TableHead>
              <TableRow>
                <TableCell>组分名称</TableCell>
                <TableCell>占比</TableCell>
                <TableCell>备注</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {components.map((comp, index) => (
                <TableRow key={index}>
                  <TableCell>{comp.name}</TableCell>
                  <TableCell>
                    {comp.percentage}
                    {comp.unit}
                  </TableCell>
                  <TableCell>{comp.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ),
    },
  ];

  // 侧边栏内容
  const sidebar = (
    <Stack spacing={2}>
      <Typography
        variant='subtitle1'
        sx={{ fontWeight: 'bold' }}
      >
        版本历史
      </Typography>
      {versions.map((v, index) => (
        <Paper
          key={index}
          variant='outlined'
          sx={{ p: 2 }}
        >
          <Stack
            direction='row'
            sx={{ justifyContent: 'space-between' }}
          >
            <Chip
              label={v.version}
              size='small'
            />
            <Typography variant='caption'>{v.date}</Typography>
          </Stack>
          <Typography
            variant='body2'
            sx={{ mt: 1 }}
          >
            {v.changes}
          </Typography>
        </Paper>
      ))}
    </Stack>
  );

  // 信息卡片数据
  const infoCard = {
    title: formula.name,
    subtitle: `编码: ${formula.code} | 项目: ${formula.project_name}`,
    tags: [formula.version, formula.status],
    stats: [
      { label: '创建人', value: formula.created_by },
      { label: '创建时间', value: formula.created_at },
      { label: '更新时间', value: formula.updated_at },
    ],
  };

  // 操作按钮
  const actions = [
    {
      label: '版本历史',
      icon: <History size={18} />,
      onClick: () => {},
      variant: 'outlined' as const,
    },
    {
      label: '编辑',
      icon: <Edit size={18} />,
      onClick: () => {},
      variant: 'contained' as const,
    },
  ];

  return (
    <DetailPageTemplate
      title={formula.name}
      subtitle={`编码: ${formula.code} | 项目: ${formula.project_name}`}
      infoCard={infoCard}
      sections={sections}
      sidebar={sidebar}
      actions={actions}
    />
  );
};

export default RsFormulaDetailPage;
