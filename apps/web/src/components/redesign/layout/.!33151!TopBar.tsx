import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  User,
  LogOut,
  UserCircle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { Button } from '../primitives';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { AUTH_PATHS } from '@/routes/auth';
import i18n from '@/i18n';
import { designTokens } from '@topems/tokens';

export interface TopBarProps {
  onMenuToggle?: () => void;
  onCommandOpen?: () => void;
  onNotificationsOpen?: () => void;
  onSettingsOpen?: () => void;
  onProfileOpen?: () => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
  title?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  onMenuToggle,
  onCommandOpen,
  onNotificationsOpen,
  onSettingsOpen,
  onProfileOpen,
  onToggleSidebar,
  sidebarExpanded = true,
  title = 'TOPEMS',
}) => {
  const { t } = useTranslation();
  const handleToggle = onToggleSidebar || onMenuToggle;
  const ToggleIcon = sidebarExpanded ? PanelLeftClose : PanelLeftOpen;

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

