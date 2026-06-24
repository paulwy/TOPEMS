import { sanitizeHtml } from '@/lib/security';

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export const SafeHtml = ({ html, className }: SafeHtmlProps) => {
  const sanitized = sanitizeHtml(html);
  
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};

export default SafeHtml;