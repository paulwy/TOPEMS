import { escapeHtml } from '@/lib/security';

interface SafeTextProps {
  text: string;
  className?: string;
}

export const SafeText = ({ text, className }: SafeTextProps) => {
  const escaped = escapeHtml(text);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: escaped }}
    />
  );
};

export default SafeText;
