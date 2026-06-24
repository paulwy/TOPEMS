import { Menu, MenuItem, Box } from '@mui/material';
import { Button } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language as LanguageCode;
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleChangeLanguage = (code: LanguageCode) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
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
