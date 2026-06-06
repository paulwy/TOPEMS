import React from 'react';
import { Modal } from './Modal';

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  loading?: boolean;
  submitText?: string;
  cancelText?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  loading = false,
  submitText = '提交',
  cancelText = '取消',
  size = 'md',
  children,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? '提交中...' : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
};
