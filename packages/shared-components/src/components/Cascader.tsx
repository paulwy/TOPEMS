import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Popover,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider,
  Chip,
} from '@mui/material';
import { ChevronRight, ChevronLeft, Check, X } from 'lucide-react';

export interface CascaderOption {
  value: string;
  label: string;
  children?: CascaderOption[];
  disabled?: boolean;
}

export interface CascaderLocale {
  placeholder?: string;
  backText?: string;
}

export interface CascaderProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  options: CascaderOption[];
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  multiple?: boolean;
  maxTagCount?: number;
  className?: string;
  locale?: CascaderLocale;
}

const Cascader: React.FC<CascaderProps> = ({
  value = [],
  onChange,
  options,
  placeholder,
  disabled = false,
  fullWidth = false,
  className,
  locale,
}) => {
  const finalPlaceholder = placeholder ?? locale?.placeholder ?? 'Select';
  const backText = locale?.backText ?? 'Back';
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedPath, setSelectedPath] = useState<CascaderOption[]>([]);
  const [currentLevel, setCurrentLevel] = useState<CascaderOption[]>(options);

  const open = Boolean(anchorEl);

  const selectedLabels = useMemo(() => {
    const labels: string[] = [];
    let currentOptions = options;
    
    for (const val of value) {
      const found = currentOptions.find((opt) => opt.value === val);
      if (found) {
        labels.push(found.label);
        currentOptions = found.children || [];
      }
    }
    
    return labels;
  }, [value, options]);

  const handleOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    setAnchorEl(event.currentTarget);
    setCurrentLevel(options);
    setSelectedPath([]);
  }, [disabled, options]);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleSelect = useCallback((option: CascaderOption) => {
    if (option.disabled) return;

    const newPath = [...selectedPath, option];

    if (option.children && option.children.length > 0) {
      setSelectedPath(newPath);
      setCurrentLevel(option.children);
    } else {
      const newValue = newPath.map((opt) => opt.value);
      onChange?.(newValue);
      handleClose();
    }
  }, [selectedPath, onChange, handleClose]);

  const handleBack = useCallback(() => {
    if (selectedPath.length > 0) {
      const newPath = selectedPath.slice(0, -1);
      setSelectedPath(newPath);
      
      let parentOptions = options;
      for (const opt of newPath) {
        parentOptions = opt.children || [];
      }
      setCurrentLevel(parentOptions);
    }
  }, [selectedPath, options]);

  const handleClear = useCallback(() => {
    onChange?.([]);
  }, [onChange]);

  const displayValue = selectedLabels.join(' / ');

  return (
    <Box className={className}>
      <Box sx={{ position: 'relative' }}>
        <TextField
          onClick={handleOpen}
          value={displayValue}
          placeholder={finalPlaceholder}
          disabled={disabled}
          fullWidth={fullWidth}
          slotProps={{
            input: {
              readOnly: true,
            },
          }}
        />
        {value.length > 0 && !disabled && (
          <Chip
            icon={<X size={14} />}
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
          />
        )}
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
            },
          },
        } as any}
      >
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: 240, overflowY: 'auto', borderRight: '1px solid rgba(0,0,0,0.1)' }}>
            <List>
              {currentLevel.map((option) => (
                <ListItemButton
                  key={option.value}
                  disabled={option.disabled}
                  onClick={() => handleSelect(option)}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                    '&.Mui-disabled': { opacity: 0.5 },
                  }}
                >
                  <ListItemText primary={option.label} />
                  {option.children && option.children.length > 0 && (
                    <ListItemIcon>
                      <ChevronRight size={20} />
                    </ListItemIcon>
                  )}
                  {value.includes(option.value) && !option.children?.length && (
                    <ListItemIcon>
                      <Check size={18} />
                    </ListItemIcon>
                  )}
                </ListItemButton>
              ))}
            </List>
          </Box>

          {selectedPath.length > 0 && (
            <Box sx={{ width: 120, overflowY: 'auto', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <List>
                {selectedPath.map((option, index) => (
                  <React.Fragment key={option.value}>
                    <ListItemButton
                      onClick={() => {
                        const newPath = selectedPath.slice(0, index + 1);
                        setSelectedPath(newPath);
                        
                        let parentOptions = options;
                        for (const opt of newPath.slice(0, -1)) {
                          parentOptions = opt.children || [];
                        }
                        setCurrentLevel(parentOptions);
                      }}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Typography variant="caption" noWrap>
                            {option.label}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    {index < selectedPath.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                <ListItemButton
                  onClick={handleBack}
                  sx={{
                    '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  <ListItemIcon>
                    <ChevronLeft size={18} />
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="caption">{backText}</Typography>} />
                </ListItemButton>
              </Box>
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export { Cascader };