import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import { Plus, Trash2, Link2, GitBranch, Network } from 'lucide-react';
import type { ModelRelation, DataModel, RelationType } from '../../api/lowcode/types';

interface RelationEditorProps {
  relations: ModelRelation[];
  models: DataModel[];
  currentModelId: string;
  onAddRelation: (relation: Omit<ModelRelation, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteRelation: (relationId: string) => void;
}

const relationTypeOptions: { value: RelationType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'oneToOne', label: '一对一', icon: <Link2 style={{ width: 16, height: 16 }} />, description: '一条记录对应一条记录' },
  { value: 'oneToMany', label: '一对多', icon: <GitBranch style={{ width: 16, height: 16 }} />, description: '一条记录对应多条记录' },
  { value: 'manyToMany', label: '多对多', icon: <Network style={{ width: 16, height: 16 }} />, description: '多条记录对应多条记录' },
];

export const RelationEditor: React.FC<RelationEditorProps> = ({
  relations,
  models,
  currentModelId,
  onAddRelation,
  onDeleteRelation,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    label: '',
    type: 'oneToMany' as RelationType,
    targetModelId: '',
    foreignKey: '',
    displayField: '',
  });

  const currentModel = models.find((m) => m.id === currentModelId);

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      label: '',
      type: 'oneToMany',
      targetModelId: '',
      foreignKey: '',
      displayField: '',
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSubmit = () => {
    if (formData.name && formData.label && formData.targetModelId) {
      onAddRelation({
        name: formData.name,
        label: formData.label,
        type: formData.type,
        modelId: currentModelId,
        sourceModelId: currentModelId,
        sourceFieldId: '',
        targetModelId: formData.targetModelId,
        targetFieldId: '',
        foreignKey: formData.foreignKey,
        displayField: formData.displayField,
      });
      setDialogOpen(false);
    }
  };

  const getRelationTypeInfo = (type: RelationType) => {
    return relationTypeOptions.find((o) => o.value === type) || relationTypeOptions[0];
  };

  const getModelName = (modelId: string) => {
    return models.find((m) => m.id === modelId)?.label || modelId;
  };

  const getRelationTypeColor = (type: RelationType): 'primary' | 'success' | 'warning' => {
    switch (type) {
      case 'oneToOne': return 'primary';
      case 'oneToMany': return 'success';
      case 'manyToMany': return 'warning';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">模型关系</Typography>
          <Typography variant="body2" color="text.secondary">
            {currentModel?.label} 的关联关系配置
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus style={{ width: 18, height: 18 }} />}
          onClick={handleOpenDialog}
        >
          新建关系
        </Button>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {relations.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Network style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.3 }} />
            <Typography>暂无关系配置</Typography>
            <Typography variant="body2">点击上方按钮创建第一个关系</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {relations.map((relation) => {
              const typeInfo = getRelationTypeInfo(relation.type);
              return (
                <Card key={relation.id} variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {relation.label}
                          </Typography>
                          <Chip
                            label={typeInfo.label}
                            color={getRelationTypeColor(relation.type)}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {relation.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip
                            label={currentModel?.label || '当前模型'}
                            size="small"
                            variant="outlined"
                          />
                          {typeInfo.icon}
                          <Chip
                            label={getModelName(relation.targetModelId)}
                            size="small"
                            color="info"
                            variant="outlined"
                          />
                        </Box>
                        {relation.foreignKey && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            外键: {relation.foreignKey}
                            {relation.displayField && ` | 显示字段: ${relation.displayField}`}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteRelation(relation.id)}
                      >
                        <Trash2 style={{ width: 18, height: 18 }} />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>新建关系</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="关系名称"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              size="small"
              helperText="英文标识"
            />
            <TextField
              label="关系显示名"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              size="small"
            />
            <FormControl size="small">
              <InputLabel>关系类型</InputLabel>
              <Select
                value={formData.type}
                label="关系类型"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as RelationType })}
              >
                {relationTypeOptions.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {opt.icon}
                      <Box>
                        <Typography variant="body2">{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{opt.description}</Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>关联模型</InputLabel>
              <Select
                value={formData.targetModelId}
                label="关联模型"
                onChange={(e) => setFormData({ ...formData, targetModelId: e.target.value })}
              >
                {models
                  .filter((m) => m.id !== currentModelId)
                  .map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.label}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="外键字段"
              value={formData.foreignKey}
              onChange={(e) => setFormData({ ...formData, foreignKey: e.target.value })}
              size="small"
              helperText="用于关联的外键字段名"
            />
            <TextField
              label="显示字段"
              value={formData.displayField}
              onChange={(e) => setFormData({ ...formData, displayField: e.target.value })}
              size="small"
              helperText="关联数据展示时使用的字段"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button variant="contained" onClick={handleSubmit}>
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RelationEditor;
