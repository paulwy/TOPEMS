/**
 * Heavy markdown renderer. Kept in a separate module so that
 * react-markdown / remark-gfm land in a standalone lazy chunk and never
 * enter the login first-paint chain.
 *
 * Prism syntax highlighter is dynamically imported only when code blocks
 * are present, splitting ~150KB of highlighting code into its own chunk.
 */
import { useTheme } from '@mui/material';
import { designTokens } from '@topems/tokens';
import React, { Suspense, lazy } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dynamically import SyntaxHighlighter only when code blocks are rendered.
// This splits react-syntax-highlighter (~150KB) into a separate chunk.
const SyntaxHighlighter = lazy(() =>
  import('react-syntax-highlighter').then(async (mod) => {
    const { PrismLight } = mod;
    const vscDarkPlus = (await import('react-syntax-highlighter/dist/esm/styles/prism')).vscDarkPlus;
    const [javascript, typescript, jsx, tsx, python, java, json, bash, sql, css] = await Promise.all([
      import('react-syntax-highlighter/dist/esm/languages/prism/javascript'),
      import('react-syntax-highlighter/dist/esm/languages/prism/typescript'),
      import('react-syntax-highlighter/dist/esm/languages/prism/jsx'),
      import('react-syntax-highlighter/dist/esm/languages/prism/tsx'),
      import('react-syntax-highlighter/dist/esm/languages/prism/python'),
      import('react-syntax-highlighter/dist/esm/languages/prism/java'),
      import('react-syntax-highlighter/dist/esm/languages/prism/json'),
      import('react-syntax-highlighter/dist/esm/languages/prism/bash'),
      import('react-syntax-highlighter/dist/esm/languages/prism/sql'),
      import('react-syntax-highlighter/dist/esm/languages/prism/css'),
    ]);
    PrismLight.registerLanguage('javascript', javascript.default);
    PrismLight.registerLanguage('typescript', typescript.default);
    PrismLight.registerLanguage('jsx', jsx.default);
    PrismLight.registerLanguage('tsx', tsx.default);
    PrismLight.registerLanguage('python', python.default);
    PrismLight.registerLanguage('java', java.default);
    PrismLight.registerLanguage('json', json.default);
    PrismLight.registerLanguage('bash', bash.default);
    PrismLight.registerLanguage('sql', sql.default);
    PrismLight.registerLanguage('css', css.default);
    return {
      default: ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) => (
        <PrismLight
          {...rest}
          style={vscDarkPlus as { [key: string]: React.CSSProperties }}
          PreTag='div'
        >
          {String(children ?? '').replace(/\n$/, '')}
        </PrismLight>
      ),
    };
  }),
);

export interface MarkdownPreviewProps {
  content: string;
}

export default function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const theme = useTheme();
  return (
    <div
      style={{
        maxWidth: '100%',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = (props as unknown as Record<string, unknown>).inline;
            return !isInline && match ? (
              <Suspense fallback={<code className={className}>{children}</code>}>
                <SyntaxHighlighter language={match[1]}>
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </Suspense>
            ) : (
              <code
                {...(props as React.HTMLAttributes<HTMLElement>)}
                className={className}
                style={{
                  backgroundColor: 'var(--mui-palette-action-hover)',
                  padding: '0.2rem 0.4rem',
                  borderRadius: 'xs',
                  fontFamily: 'monospace',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th
              style={{
                border: '1px solid var(--mui-palette-divider)',
                padding: '0.5rem',
                textAlign: 'left',
                backgroundColor: 'var(--mui-palette-action-hover)',
                fontWeight: 600,
              }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              style={{
                border: '1px solid var(--mui-palette-divider)',
                padding: '0.5rem',
                textAlign: 'left',
              }}
            >
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: '4px solid var(--mui-palette-divider)',
                margin: '1rem 0',
                paddingLeft: '1rem',
                color: 'var(--mui-palette-text-secondary)',
                fontStyle: 'italic',
              }}
            >
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1
              style={{
                fontSize: designTokens.typography.fontSize.scale['2rem'],
                fontWeight: 700,
                margin: '1.5rem 0 1rem',
                borderBottom: '2px solid var(--mui-palette-divider)',
                paddingBottom: '0.5rem',
              }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              style={{
                fontSize: designTokens.typography.fontSize.scale['1.5rem'],
                fontWeight: 600,
                margin: '1.25rem 0 0.75rem',
                borderBottom: '1px solid var(--mui-palette-divider)',
                paddingBottom: '0.25rem',
              }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              style={{
                fontSize: designTokens.typography.fontSize.scale['1.25rem'],
                fontWeight: 600,
                margin: '1rem 0 0.5rem',
              }}
            >
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>{children}</ol>
          ),
          li: ({ children }) => <li style={{ margin: '0.25rem 0' }}>{children}</li>,
          p: ({ children }) => <p style={{ margin: '0.75rem 0', lineHeight: '1.8' }}>{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              style={{ color: theme.palette.primary.main, textDecoration: 'none' }}
            >
              {children}
            </a>
          ),
          hr: () => (
            <hr
              style={{
                border: 'none',
                borderTop: '1px solid var(--mui-palette-divider)',
                margin: '2rem 0',
              }}
            />
          ),
          strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
          em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
