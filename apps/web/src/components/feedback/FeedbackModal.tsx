import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { Dialog } from '@/components/common/Dialog';
import FeedbackForm from './FeedbackForm';

import { feedbackApi } from '@/api/feedback';
import type { CreateFeedbackRequest } from '@/api/feedback/types';

import { queryClient, QUERY_KEYS } from '@/lib/reactQuery';

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
      toast.success('反馈提交成功');
      setIsSubmitting(false);
      onClose();
    },
    onError: () => {
      toast.error('反馈提交失败，请重试');
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
      title='提交反馈'
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
