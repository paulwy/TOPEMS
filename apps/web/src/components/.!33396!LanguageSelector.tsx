import { Menu, MenuItem, Box, Button } from '@mui/material';
import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageCode, ensureLanguageLoaded } from '../i18n';
import i18n from '../i18n';

const LanguageSelector: React.FC = () => {
  const [currentLang, setCurrentLang] = useState<LanguageCode>(
    (localStorage.getItem('language') as LanguageCode) || (i18n.language as LanguageCode)
  );
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const handler = (lng: string) => {
      setCurrentLang(lng as LanguageCode);
    };
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, []);

  const handleChangeLanguage = async (code: LanguageCode) => {
    // 确保目标语言资源已加载完成，避免切换后短暂显示 key
