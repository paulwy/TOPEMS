import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

export interface AIGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  isLoading?: boolean;
  onConfirm?: (e?: React.MouseEvent) => void;
  confirmText?: string;
  cancelText?: string;
  extraActions?: React.ReactNode;
}

export function AIGenerateModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  isLoading = false,
  onConfirm,
  confirmText = '确认',
  cancelText = '取消',
  extraActions,
}: AIGenerateModalProps) {
  const handleClose = (e?: React.MouseEvent | boolean) => {
    if (typeof e !== 'boolean') {
      e?.stopPropagation();
      e?.preventDefault();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-purple-100'>
              <Sparkles className='w-4 h-4 text-purple-600' />
            </div>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description || ' '}</DialogDescription>
        </DialogHeader>

        <div className='py-4'>{children}</div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>{extraActions}</div>
          <div className='flex items-center gap-3'>
            <Button variant='secondary' onClick={(e) => handleClose(e)} disabled={isLoading}>
              {cancelText}
            </Button>
            {onConfirm && (
              <Button onClick={(e) => onConfirm(e)} disabled={isLoading}>
                {confirmText}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
