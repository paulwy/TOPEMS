import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import {
  X,
  Activity,
  FolderKanban,
  Book,
  FileText,
  Bot,
  GitBranch,
  Settings,
  Building,
  Folder,
  Users,
  BookOpen,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (path: string) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  currentPage,
  onNavigate,
}) => {
  const { user, hasPermission } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: '首页', icon: Activity },
    { id: 'pm', label: '项目管理', icon: FolderKanban, path: '/pm/projects' },
    { id: 'addressbook', label: '通讯录', icon: Book },
    { id: 'documents', label: '文档管理', icon: FileText },
    { id: 'ai', label: 'AI 知识库', icon: Bot },
    { id: 'workflows', label: '工作流', icon: GitBranch },
    { id: 'system', label: '系统管理', icon: Settings, adminOnly: true },
    { id: 'companies', label: '公司管理', icon: Building, adminOnly: true },
    { id: 'departments', label: '部门管理', icon: Folder, adminOnly: true },
    { id: 'employees', label: '员工管理', icon: Users, adminOnly: true },
    { id: 'documents', label: '文档中心', icon: BookOpen },
    { id: 'bi', label: '商业智能', icon: BarChart3, path: '/bi/dashboard' },
    { id: 'help', label: '帮助中心', icon: HelpCircle },
  ];

  const handleNavigate = (item: (typeof menuItems)[0]) => {
    if (item.path) {
      onNavigate(item.path);
    } else {
      const pathMap: Record<string, string> = {
        dashboard: '/dashboard',
        addressbook: '/addressbook',
        documents: '/documents',
        ai: '/ai',
        workflows: '/flow/definitions',
        system: '/system',
        companies: '/hrm/companies',
        departments: '/hrm/departments',
        employees: '/hrm/employees',
        help: '/help',
      };
      onNavigate(pathMap[item.id] || `/${item.id}`);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 40,
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 6,
            }}
          >
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>菜单</Typography>
            <IconButton
              onClick={onClose}
              sx={{
                p: 2,
                borderRadius: 3,
                '&:hover': { backgroundColor: 'grey.100' },
              }}
            >
              <X size={20} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {menuItems
              .filter((item) => !item.adminOnly || user?.is_superuser || hasPermission('iam:admin'))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    onClick={() => handleNavigate(item)}
                    sx={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      p: 3,
                      borderRadius: 3,
                      justifyContent: 'flex-start',
                      backgroundColor: currentPage === item.id ? 'primary.light' : 'transparent',
                      color: currentPage === item.id ? 'primary.dark' : '#334155',
                      '&:hover': {
                        backgroundColor: currentPage === item.id ? '#dbeafe' : 'grey.100',
                      },
                    }}
                  >
                    <Icon style={{ width: 20, height: 20 }} />
                    <Typography sx={{ fontWeight: 500 }}>{item.label}</Typography>
                  </Button>
                );
              })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
