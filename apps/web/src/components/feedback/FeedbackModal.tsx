import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { Dialog } from '@/components/common/Dialog';
import FeedbackForm from './FeedbackForm';

import { feedbackApi } from '@/api/feedback';
import type { CreateFeedbackRequest } from '@/api/feedback/types';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';
import i18n from '@/i18n';

export interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ open, onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFeedbackMutation = useMutation({
    mutationFn: (data: CreateFeedbackRequest) => feedbackApi.createFeedback(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.FEEDBACKS_BASE,
        exact: false,
        refetchType: 'active',
      });
      toast.success(i18n.t('components.feedback_modal.k0'));
      setIsSubmitting(false);
      onClose();
    },
    onError: () => {
      toast.error(i18n.t('components.feedback_modal.k1'));
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (data: CreateFeedbackRequest) => {
    setIsSubmitting(true);
    createFeedbackMutation.mutate(data);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={i18n.t('components.feedback_modal.k2')}
      maxWidth='lg'
      fullWidth
      showCloseButton
      closeOnBackdropClick
    >
      <FeedbackForm
        onSubmit={handleSubmit}
        loading={isSubmitting}
      />
    </Dialog>
  );
};

export default FeedbackModal;
