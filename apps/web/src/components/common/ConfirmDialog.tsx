import React from 'react';
import { Modal, Button } from '@heroui/react';

export interface ConfirmDialogConfig {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  confirmDisabled?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  confirmColor = 'primary',
  confirmDisabled = false,
}: ConfirmDialogConfig) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className='p-6 bg-white rounded-lg shadow-xl'>
        <h2 className='text-lg font-semibold mb-4'>{title}</h2>
        <div className='text-sm text-gray-600 mb-6'>{message}</div>
        <div className='flex justify-end gap-3'>
          <Button variant='ghost' onPress={onClose} isDisabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmColor === 'danger' ? 'danger' : 'primary'}
            onPress={handleConfirm}
            isDisabled={confirmDisabled || isLoading}
          >
            {isLoading ? '处理中...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
