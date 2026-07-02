import { Box, Button } from '@mui/material';
import React from 'react';
import { Download } from 'lucide-react';

export interface ExportDropdownProps {
  onExport: (format: string, columns?: string[]) => void;
  options?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({
  onExport,
  options = [
    { value: 'csv', label: '导出为 CSV' },
    { value: 'xlsx', label: '导出为 Excel' },
  ],
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Box
      sx={{ position: 'relative', display: 'inline-block' }}
      className={className}
    >
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        startIcon={<Download sx={{ width: 16, height: 16, mr: 1 }} />}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: 'primary.dark',
          color: 'white',
          borderRadius: 3,
          '&:hover': { backgroundColor: 'primary.dark' },
          '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
          transition: 'colors 0.2s',
        }}
      >
        导出
      </Button>

      {isOpen && (
        <>
          <Box
            sx={{ position: 'fixed', inset: 0 }}
            onClick={() => setIsOpen(false)}
          />
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              marginTop: 1,
              width: 192,
              backgroundColor: 'white',
              borderRadius: 3,
              boxShadow: 3,
              border: '1px solid border.default',
              padding: 0.5,
              zIndex: 10,
            }}
          >
            {options.map((option) => (
              <Button
                key={option.value}
                onClick={() => {
                  onExport(option.value);
                  setIsOpen(false);
                }}
                sx={{
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'left',
                  fontSize: 14,
                  color: '#334155',
                  '&:hover': { backgroundColor: 'grey.100' },
                  transition: 'colors 0.2s',
                }}
              >
                {option.label}
              </Button>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default ExportDropdown;
