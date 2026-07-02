import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Chip,
  useTheme,
} from '@mui/material';
import {
  ChevronDown,
  ChevronRight,
  Type,
  AlignLeft,
  Hash,
  Lock,
  ChevronDown as ChevronDownIcon,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  Calendar,
  Clock,
  LayoutGrid,
  Folder,
  Layers,
  Minus,
  MousePointerClick,
  Image,
  FileText,
  Star,
  Layout,
  Square,
  Table,
  BarChart2,
  List as ListIcon,
} from 'lucide-react';
import type { ComponentCategory, ComponentDefinition } from '@/api/lowcode';

interface ComponentPaletteProps {
  categories: ComponentCategory[];
  onDragStart?: (component: ComponentDefinition) => void;
  onComponentClick?: (component: ComponentDefinition) => void;
}

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Type,
  AlignLeft,
  Hash,
  Lock,
  ChevronDown: ChevronDownIcon,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  Calendar,
  Clock,
  LayoutGrid,
  Folder,
  Layers,
  Minus,
  MousePointerClick,
  Image,
  FileText,
  Star,
  Layout,
  Square,
  Table,
  BarChart2,
  List: ListIcon,
};

const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  categories,
  onDragStart,
  onComponentClick,
}) => {
  const theme = useTheme();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(component);
  };

  const handleComponentClick = (component: ComponentDefinition) => {
    onComponentClick?.(component);
  };

  const renderIcon = (iconName?: string) => {
    const IconComponent = iconName ? iconMap[iconName] : null;
    return IconComponent ? <IconComponent size={18} /> : <Square size={18} />;
  };

  return (
    <Box
      sx={{
        width: 260,
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        overflow: 'auto',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'sticky',
          top: 0,
          bgcolor: 'background.paper',
          zIndex: 1,
        }}
      >
        <Typography
          variant='h6'
          sx={{ fontWeight: 600 }}
        >
          组件库
        </Typography>
        <Typography
          variant='body2'
          color='text.secondary'
        >
          拖拽组件到画布
        </Typography>
      </Box>

      <List
        dense
        sx={{ p: 1 }}
      >
        {categories.map((category) => (
          <React.Fragment key={category.id}>
            <ListItemButton
              onClick={() => handleToggleCategory(category.id)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{renderIcon(category.icon)}</ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant='subtitle2'
                    sx={{ fontWeight: 600 }}
                  >
                    {category.name}
                  </Typography>
                }
              />
              {expandedCategories.has(category.id) ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </ListItemButton>

            <Collapse
              in={expandedCategories.has(category.id)}
              timeout='auto'
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 0.5,
                  px: 1,
                  pb: 1,
                }}
              >
                {category.components.map((component) => (
                  <Box
                    key={component.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, component)}
                    onClick={() => handleComponentClick(component)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 1.5,
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider',
                      cursor: 'grab',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'primary.lighter',
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[2],
                      },
                      '&:active': {
                        cursor: 'grabbing',
                      },
                    }}
                    title={component.description}
                  >
                    <Box sx={{ color: 'primary.main', mb: 0.5 }}>{renderIcon(component.icon)}</Box>
                    <Typography
                      variant='caption'
                      noWrap
                      sx={{ maxWidth: '100%' }}
                    >
                      {component.name}
                    </Typography>
                    {component.isContainer && (
                      <Chip
                        label='容器'
                        size='small'
                        color='secondary'
                        sx={{ mt: 0.5, height: 16, fontSize: 10 }}
                      />
                    )}
                  </Box>
                ))}
              </Box>
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default ComponentPalette;
