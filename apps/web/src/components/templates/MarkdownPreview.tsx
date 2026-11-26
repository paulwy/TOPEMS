/**
 * Heavy markdown renderer. Kept in a separate module so that
 * react-markdown / remark-gfm land in a standalone lazy chunk and never
 * enter the login first-paint chain.
 *
 * Prism syntax highlighter is dynamically imported only when code blocks
 * are present, splitting ~100KB of highlighting code into its own chunk.
 * Uses prismjs directly (no react-syntax-highlighter wrapper) for smaller bundle.
 */
import { useTheme } from '@mui/material';
import styles from './MarkdownPreview.module.css';
import { designTokens } from '@topems/tokens';
import React, { Suspense, lazy, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dynamically import prismjs only when code blocks are rendered.
// Uses prismjs directly instead of react-syntax-highlighter wrapper (~500KB saving).
const CodeBlock = lazy(() =>
  import('prismjs').then(async (PrismModule) => {
    const Prism = PrismModule.default;
    await Promise.all([
      import('prismjs/components/prism-javascript'),
      import('prismjs/components/prism-typescript'),
      import('prismjs/components/prism-jsx'),
      import('prismjs/components/prism-tsx'),
      import('prismjs/components/prism-python'),
      import('prismjs/components/prism-java'),
      import('prismjs/components/prism-json'),
      import('prismjs/components/prism-bash'),
      import('prismjs/components/prism-sql'),
      import('prismjs/components/prism-css'),
    ]);
    await import('prismjs/themes/prism-okaidia.css');

    return {
      default: function CodeBlock({ language, children }: { language: string; children: string }) {
        const codeRef = useRef<HTMLElement>(null);
        useEffect(() => {
          if (codeRef.current && Prism.languages[language]) {
            Prism.highlightElement(codeRef.current);
          }
        }, [language, children]);
        return (
          <pre className={styles.il1}>
            <code
              ref={codeRef}
              className={`language-${language}`}
            >
              {children}
            </code>
          </pre>
        );
      },
    };
  })
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
              <Suspense
                fallback={
                  <pre>
                    <code className={className}>{children}</code>
                  </pre>
                }
              >
                <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
              </Suspense>
            ) : (
              <code
                {...(props as React.HTMLAttributes<HTMLElement>)}
                className={className}
                style={{
                  backgroundColor: 'var(--mui-palette-action-hover)',
                  padding: '0.2rem 0.4rem',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'monospace',
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <div className={styles.il2}>
              <table className={styles.il3}>{children}</table>
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
          strong: ({ children }) => <strong className={styles.il4}>{children}</strong>,
          em: ({ children }) => <em className={styles.il5}>{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
