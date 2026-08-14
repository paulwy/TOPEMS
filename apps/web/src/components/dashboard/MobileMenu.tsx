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
import i18n from '@/i18n';
import { useAuth } from '../../hooks/useAuth';
import { BI_PATHS } from '@/modules/bi/config';

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
    { id: 'dashboard', label: i18n.t('shared.mobile_menu.k0'), icon: Activity },
    { id: 'pm', label: i18n.t('shared.mobile_menu.k1'), icon: FolderKanban, path: '/pm/projects' },
    { id: 'addressbook', label: i18n.t('shared.mobile_menu.k2'), icon: Book },
    { id: 'documents', label: i18n.t('shared.mobile_menu.k3'), icon: FileText },
    { id: 'ai', label: i18n.t('components.mobile_menu.ai_0'), icon: Bot },
    { id: 'workflows', label: i18n.t('shared.mobile_menu.k4'), icon: GitBranch },
    { id: 'system', label: i18n.t('shared.mobile_menu.k5'), icon: Settings, adminOnly: true },
    { id: 'companies', label: i18n.t('shared.mobile_menu.k6'), icon: Building, adminOnly: true },
    { id: 'departments', label: i18n.t('shared.mobile_menu.k7'), icon: Folder, adminOnly: true },
    { id: 'employees', label: i18n.t('shared.mobile_menu.k8'), icon: Users, adminOnly: true },
    { id: 'documents', label: i18n.t('shared.mobile_menu.k9'), icon: BookOpen },
    { id: 'bi', label: i18n.t('shared.mobile_menu.k10'), icon: BarChart3, path: BI_PATHS.dashboard },
    { id: 'help', label: i18n.t('shared.mobile_menu.k11'), icon: HelpCircle },
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
        backgroundColor: 'action.active',
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
          backgroundColor: 'common.white',
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
            <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{i18n.t('shared.mobile_menu.k12')}</Typography>
            <IconButton
              onClick={onClose}
              sx={{
                p: 2,
                borderRadius: 3,
                '&:hover': { backgroundColor: 'grey.100' },
              }}
              aria-label={i18n.t('shared.mobile_menu.k13')}
            >
              <X size={20} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {menuItems
              .filter(
                (item) =>
                  !item.adminOnly || user?.is_superuser || hasPermission('iam:dashboard:admin')
              )
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
                      color: currentPage === item.id ? 'primary.dark' : 'grey.700',
                      '&:hover': {
                        backgroundColor: currentPage === item.id ? 'primary.100' : 'grey.100',
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
