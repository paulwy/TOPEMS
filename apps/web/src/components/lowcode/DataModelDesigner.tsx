import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Database,
  Plus,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Link,
  Image,
  FileText,
  Table2,
  Network,
  Eye,
  Save,
  Upload,
} from 'lucide-react';
import FieldEditor from './FieldEditor';
import ModelPreview from './ModelPreview';
import RelationEditor from './RelationEditor';
import type { DataModel, ModelField, ModelRelation, FieldType } from '../../api/lowcode/types';

interface DataModelDesignerProps {
  model: DataModel | null;
  models?: DataModel[];
  onSave?: (model: DataModel) => void;
  onPublish?: (modelId: string) => void;
}

const getFieldTypeIcon = (type: FieldType) => {
  const iconStyle = { width: 18, height: 18 };
  switch (type) {
    case 'id':
    case 'integer':
      return <Hash style={iconStyle} />;
    case 'string':
    case 'text':
    case 'richText':
      return <Type style={iconStyle} />;
    case 'date':
    case 'time':
    case 'datetime':
    case 'createdAt':
    case 'updatedAt':
      return <Calendar style={iconStyle} />;
    case 'boolean':
    case 'select':
    case 'multiSelect':
      return <ToggleLeft style={iconStyle} />;
    case 'relation':
    case 'multiRelation':
    case 'createdBy':
    case 'updatedBy':
      return <Link style={iconStyle} />;
    case 'image':
      return <Image style={iconStyle} />;
    case 'file':
      return <FileText style={iconStyle} />;
    default:
      return <Type style={iconStyle} />;
  }
};

const getFieldTypeColor = (type: FieldType): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'error' => {
  switch (type) {
    case 'id':
    case 'integer':
    case 'float':
    case 'currency':
    case 'percent':
      return 'primary';
    case 'string':
    case 'text':
    case 'richText':
      return 'secondary';
    case 'date':
    case 'time':
    case 'datetime':
    case 'createdAt':
    case 'updatedAt':
      return 'success';
    case 'boolean':
    case 'select':
    case 'multiSelect':
      return 'warning';
    case 'relation':
    case 'multiRelation':
    case 'createdBy':
    case 'updatedBy':
      return 'info';
    case 'image':
    case 'file':
      return 'default';
    default:
      return 'default';
  }
};

type DesignerTab = 'fields' | 'relations' | 'preview';

export const DataModelDesigner: React.FC<DataModelDesignerProps> = ({
  model,
  models = [],
  onSave,
  onPublish,
}) => {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isNewField, setIsNewField] = useState(false);
  const [activeTab, setActiveTab] = useState<DesignerTab>('fields');
  const [localModel, setLocalModel] = useState<DataModel | null>(model);

  useEffect(() => {
    setLocalModel(model);
  }, [model]);

  const selectedField = localModel?.fields.find((f) => f.id === selectedFieldId) || null;

  const handleAddField = () => {
    setIsNewField(true);
    setSelectedFieldId(null);
  };

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    setIsNewField(false);
  };

  const handleSaveField = (fieldData: Partial<ModelField>) => {
    if (!localModel) return;

    let updatedFields: ModelField[];
    if (isNewField) {
      const newField: ModelField = {
        id: `f-${Date.now()}`,
        name: fieldData.name || '',
        label: fieldData.label || '',
        type: (fieldData.type as FieldType) || 'string',
        required: fieldData.required || false,
        unique: fieldData.unique || false,
        searchable: fieldData.searchable || false,
        sortable: fieldData.sortable || false,
        isSystem: false,
        length: fieldData.length,
        precision: fieldData.precision,
        scale: fieldData.scale,
        defaultValue: fieldData.defaultValue,
        options: fieldData.options,
        description: fieldData.description,
        relationModelId: fieldData.relationModelId,
        relationField: fieldData.relationField,
      };
      updatedFields = [...localModel.fields, newField];
      setSelectedFieldId(newField.id);
    } else if (selectedFieldId) {
      updatedFields = localModel.fields.map((f) =>
        f.id === selectedFieldId ? { ...f, ...fieldData } : f
      );
    } else {
      return;
    }

    const updatedModel = { ...localModel, fields: updatedFields };
    setLocalModel(updatedModel);
    setIsNewField(false);
    onSave?.(updatedModel);
  };

  const handleDeleteField = (fieldId: string) => {
    if (!localModel) return;
    const updatedFields = localModel.fields.filter((f) => f.id !== fieldId);
    const updatedModel = { ...localModel, fields: updatedFields };
    setLocalModel(updatedModel);
    setSelectedFieldId(null);
    onSave?.(updatedModel);
  };

  const handleAddRelation = (relation: Omit<ModelRelation, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!localModel) return;
    const newRelation: ModelRelation = {
      ...relation,
      id: `r-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedModel = {
      ...localModel,
      relations: [...(localModel.relations || []), newRelation],
    };
    setLocalModel(updatedModel);
    onSave?.(updatedModel);
  };

  const handleDeleteRelation = (relationId: string) => {
    if (!localModel) return;
    const updatedRelations = (localModel.relations || []).filter((r) => r.id !== relationId);
    const updatedModel = { ...localModel, relations: updatedRelations };
    setLocalModel(updatedModel);
    onSave?.(updatedModel);
  };

  const handleCancelField = () => {
    setSelectedFieldId(null);
    setIsNewField(false);
  };

  const systemFields = localModel?.fields.filter((f) => f.isSystem) || [];
  const customFields = localModel?.fields.filter((f) => !f.isSystem) || [];

  if (!localModel) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'text.secondary',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Database style={{ width: 64, height: 64, marginBottom: 16, opacity: 0.3 }} />
          <Typography>请选择一个数据模型开始设计</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <Paper
        variant="outlined"
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 0,
          borderRadius: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Database style={{ width: 20, height: 20, color: 'primary.main' }} />
            <Typography variant="h6">{localModel.label}</Typography>
            <Chip
              label={localModel.status === 'published' ? '已发布' : '草稿'}
              size="small"
              color={localModel.status === 'published' ? 'success' : 'default'}
              variant="outlined"
            />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Upload style={{ width: 16, height: 16 }} />}
            onClick={() => onPublish?.(localModel.id)}
          >
            发布
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<Save style={{ width: 16, height: 16 }} />}
            onClick={() => onSave?.(localModel)}
          >
            保存
          </Button>
        </Box>
      </Paper>

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Paper
          variant="outlined"
          sx={{
            width: 280,
            display: 'flex',
            flexDirection: 'column',
            borderRight: 0,
            borderRadius: 0,
          }}
        >
          <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
              <Tab label="字段" value="fields" icon={<Table2 style={{ width: 16, height: 16 }} />} iconPosition="start" />
              <Tab label="关系" value="relations" icon={<Network style={{ width: 16, height: 16 }} />} iconPosition="start" />
              <Tab label="预览" value="preview" icon={<Eye style={{ width: 16, height: 16 }} />} iconPosition="start" />
            </Tabs>
          </Box>

          <Divider />

          {activeTab === 'fields' && (
            <>
              <Box sx={{ p: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<Plus style={{ width: 16, height: 16 }} />}
                  onClick={handleAddField}
                >
                  新增字段
                </Button>
              </Box>
              <Divider />
              <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
                {systemFields.length > 0 && (
                  <>
                    <ListItem sx={{ bgcolor: 'action.hover' }}>
                      <ListItemText
                        primary={<Typography variant="caption" color="text.secondary">系统字段</Typography>}
                      />
                    </ListItem>
                    {systemFields.map((field) => (
                      <ListItemButton
                        key={field.id}
                        selected={selectedFieldId === field.id}
                        onClick={() => handleFieldSelect(field.id)}
                        dense
                        sx={{ pl: 2 }}
                      >
                        <ListItemIcon sx={{ minWidth: 32, color: getFieldTypeColor(field.type) + '.main' }}>
                          {getFieldTypeIcon(field.type)}
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2">{field.label}</Typography>}
                          secondary={<Typography variant="caption">{field.name}</Typography>}
                        />
                      </ListItemButton>
                    ))}
                    <Divider />
                  </>
                )}
                <ListItem sx={{ bgcolor: 'action.hover' }}>
                  <ListItemText
                    primary={<Typography variant="caption" color="text.secondary">业务字段</Typography>}
                  />
                </ListItem>
                {customFields.map((field) => (
                  <ListItemButton
                    key={field.id}
                    selected={selectedFieldId === field.id}
                    onClick={() => handleFieldSelect(field.id)}
                    dense
                    sx={{ pl: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: getFieldTypeColor(field.type) + '.main' }}>
                      {getFieldTypeIcon(field.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2">{field.label}</Typography>}
                      secondary={<Typography variant="caption">{field.name}</Typography>}
                    />
                  </ListItemButton>
                ))}
                {customFields.length === 0 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="text.secondary" align="center">
                          暂无业务字段
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </>
          )}

          {activeTab === 'relations' && (
            <List dense sx={{ flex: 1, overflow: 'auto', py: 0 }}>
              {(localModel.relations || []).map((rel) => (
                <ListItemButton
                  key={rel.id}
                  dense
                >
                  <ListItemIcon sx={{ minWidth: 32, color: 'info.main' }}>
                    <Network style={{ width: 18, height: 18 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={<Typography variant="body2">{rel.label}</Typography>}
                    secondary={<Typography variant="caption">{rel.type}</Typography>}
                  />
                </ListItemButton>
              ))}
              {(localModel.relations || []).length === 0 && (
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.secondary" align="center">
                        暂无关系配置
                      </Typography>
                    }
                  />
                </ListItem>
              )}
            </List>
          )}

          {activeTab === 'preview' && (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary', p: 2 }}>
              <Typography variant="body2" align="center">
                在右侧查看数据预览
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            flex: 1,
            borderRadius: 0,
            overflow: 'auto',
          }}
        >
          {activeTab === 'fields' && (
            (selectedField || isNewField) ? (
              <FieldEditor
                field={selectedField}
                models={models.map((m) => ({ id: m.id, label: m.label }))}
                onSave={handleSaveField}
                onCancel={handleCancelField}
                onDelete={handleDeleteField}
                isNew={isNewField}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'text.secondary',
                }}
              >
                <Table2 style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.3 }} />
                <Typography>选择一个字段进行编辑</Typography>
                <Typography variant="body2">或点击新增字段按钮创建新字段</Typography>
              </Box>
            )
          )}

          {activeTab === 'relations' && (
            <RelationEditor
              relations={localModel.relations || []}
              models={models}
              currentModelId={localModel.id}
              onAddRelation={handleAddRelation}
              onDeleteRelation={handleDeleteRelation}
            />
          )}

          {activeTab === 'preview' && (
            <ModelPreview modelId={localModel.id} model={localModel} />
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default DataModelDesigner;
