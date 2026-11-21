export interface ConfirmDialogConfig {
  title: string;
  message: string;
  onConfirm: () => void;
  danger?: boolean;
}
