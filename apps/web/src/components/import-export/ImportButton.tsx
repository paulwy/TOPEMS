import React from 'react';
import { Button } from '@/components/ui/Button';
import { Upload } from 'lucide-react';

export interface ImportButtonProps {
  onImport: () => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  onImport,
  label = '导入',
  disabled = false,
  className = '',
}) => {
  return (
    <Button
      onClick={onImport}
      disabled={disabled}
      className={className}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 4,
        py: 2,
        backgroundColor: '#22c55e',
        color: 'white',
        borderRadius: 2,
        transition: 'all',
        '&:hover': {
          backgroundColor: '#16a34a',
        },
        '&:disabled': {
          opacity: 0.5,
          cursor: 'not-allowed',
        },
      }}
    >
      <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
      {label}
    </Button>
  );
};

export default ImportButton;
