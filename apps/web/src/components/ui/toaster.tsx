'use client';

import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/ui/toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map(({ id, title, description, variant, open, onOpenChange }) => (
        <Toast
          key={id}
          id={id}
          open={open ?? false}
          onOpenChange={onOpenChange}
          title={title}
          description={description}
          variant={variant}
        />
      ))}
    </>
  );
}
