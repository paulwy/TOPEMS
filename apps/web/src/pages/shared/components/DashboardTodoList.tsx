import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Typography,
} from '@mui/material';
import { ListTodo, CheckCircle } from 'lucide-react';
import { TodoListSection } from '@/components/dashboard';

interface Todo {
  id: string;
  title: string;
  type: string;
  done: boolean;
}

interface DashboardTodoListProps {
  todoTab: number;
  setTodoTab: (v: number) => void;
  pendingTodos: Todo[];
  completedTodos: Todo[];
  handleTodoToggle: (id: string) => Promise<void>;
  getTodoIcon: (type: string) => React.ReactNode;
}

const DashboardTodoList: React.FC<DashboardTodoListProps> = ({
  todoTab,
  setTodoTab,
  pendingTodos,
  completedTodos,
  handleTodoToggle,
  getTodoIcon,
}) => {
  const { t } = useTranslation();

  return (
    <TodoListSection>
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={todoTab}
          onChange={(_, v) => setTodoTab(v)}
          sx={{
            minHeight: 36,
            '& .MuiTabs-indicator': {
              bgcolor: 'primary.main',
            },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ListTodo size={16} />
                <Typography sx={{ fontSize: '0.875rem' }}>
                  {t('shared.dashboard.tab_pending')}
                </Typography>
                <Badge
                  badgeContent={pendingTodos.length}
                  color='primary'
                  sx={{ ml: 1 }}
                />
              </Box>
            }
            sx={{ minHeight: 36, py: 1 }}
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle size={16} />
                <Typography sx={{ fontSize: '0.875rem' }}>
                  {t('shared.dashboard.tab_completed')}
                </Typography>
                <Badge
                  badgeContent={completedTodos.length}
                  color='success'
                  sx={{ ml: 1 }}
                />
              </Box>
            }
            sx={{ minHeight: 36, py: 1 }}
          />
        </Tabs>
      </Box>
      <List sx={{ py: 0 }}>
        {(todoTab === 0 ? pendingTodos : completedTodos).map((todo) => (
          <ListItem
            key={todo.id}
            sx={{
              px: 0,
              borderBottom: '1px solid',
              borderColor: 'grey.100',
              '&:last-child': { borderBottom: 'none' },
            }}
          >
            <ListItemButton
              sx={{
                borderRadius: 1,
                '&:hover': { bgcolor: 'grey.50' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox
                  checked={todo.done}
                  onChange={() => handleTodoToggle(todo.id)}
                  size='small'
                  sx={{
                    color: 'grey.400',
                    '&.Mui-checked': { color: 'success.main' },
                  }}
                />
              </ListItemIcon>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: todo.done ? 'grey.100' : 'primary.50',
                    color: todo.done ? 'grey.500' : 'primary.main',
                  }}
                >
                  {getTodoIcon(todo.type)}
                </Box>
              </ListItemIcon>
              <ListItemText
                primary={todo.title}
                sx={{
                  '& .MuiListItemText-primary': {
                    fontSize: '0.875rem',
                    color: todo.done ? 'grey.500' : 'grey.900',
                    textDecoration: todo.done ? 'line-through' : 'none',
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </TodoListSection>
  );
};

export default DashboardTodoList;
