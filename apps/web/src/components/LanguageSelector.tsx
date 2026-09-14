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
    // 大多数情况下资源已通过 idle 预加载就绪，await 瞬间完成
    try {
      await ensureLanguageLoaded(code);
    } catch {
      // 加载失败仍切换语言，依赖 fallbackLng 兜底
    }
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    setCurrentLang(code);
    setAnchorEl(null);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        variant='text'
        size='small'
        onClick={handleMenuOpen}
        aria-label={i18n.t('shared.language_selector.k0', { defaultValue: '切换语言' })}
        aria-haspopup='menu'
        aria-expanded={Boolean(anchorEl)}
        sx={{ minWidth: 32, width: 32, height: 32, p: 0 }}
      >
        <Globe style={{ width: 20, height: 20 }} />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleChangeLanguage(lang.code)}
            selected={currentLang === lang.code}
            sx={{
              backgroundColor: currentLang === lang.code ? 'action.selected' : 'inherit',
              '&:hover': {
                backgroundColor: currentLang === lang.code ? 'action.selected' : 'action.hover',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  backgroundColor: 'grey.100',
                  borderRadius: 0.5,
                }}
              >
                {lang.flag}
              </Box>
              <span>{lang.name}</span>
              {currentLang === lang.code && (
                <Box
                  component='span'
                  sx={{ ml: 1, fontSize: 12, color: 'text.disabled' }}
                >
                  ✓
                </Box>
              )}
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default LanguageSelector;
