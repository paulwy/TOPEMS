import React, { useState, useCallback, useRef, useEffect } from 'react';

export type Language = 'javascript' | 'typescript' | 'python' | 'rust' | 'sql' | 'json' | 'yaml' | 'markdown';

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: Language;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  showToolbar?: boolean;
  theme?: 'light' | 'dark';
}

const keywords: Record<Language, string[]> = {
  javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'],
  typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'enum', 'extends', 'implements', 'readonly', 'private', 'public', 'protected'],
  python: ['def', 'return', 'if', 'else', 'elif', 'for', 'while', 'class', 'import', 'from', 'as', 'try', 'except', 'raise', 'with', 'in', 'and', 'or', 'not', 'is', 'True', 'False', 'None', 'self', '__init__', '__name__'],
  rust: ['fn', 'let', 'mut', 'const', 'pub', 'struct', 'enum', 'impl', 'trait', 'use', 'mod', 'crate', 'self', 'super', 'if', 'else', 'match', 'for', 'while', 'loop', 'return', 'break', 'continue', 'true', 'false', 'Some', 'None', 'Ok', 'Err'],
  sql: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'AS', 'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'ADD', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES'],
  json: [],
  yaml: [],
  markdown: [],
};

const highlightSyntax = (code: string, language: Language): string => {
  let highlighted = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'json') {
    highlighted = highlighted.replace(
      /(".*?")\s*:/g,
      '<span class="text-blue-600">$1</span>:'
    );
    highlighted = highlighted.replace(
      /: ("[^"]*"|true|false|null|-?\d+)/g,
      ': <span class="text-green-600">$1</span>'
    );
  } else if (language === 'yaml') {
    highlighted = highlighted.replace(
      /^(\s*[\w-]+):/gm,
      '<span class="text-blue-600">$1</span>:'
    );
    highlighted = highlighted.replace(
      /:\s*(".*?"|'.*?'|\d+|true|false|null)/g,
      ': <span class="text-green-600">$1</span>'
    );
  } else if (language === 'markdown') {
    highlighted = highlighted.replace(
      /^(#{1,6})\s(.+)$/gm,
      '<span class="text-purple-600 font-bold">$1 $2</span>'
    );
    highlighted = highlighted.replace(
      /\*\*(.+?)\*\*/g,
      '<span class="font-bold">$1</span>'
    );
    highlighted = highlighted.replace(
      /\*(.+?)\*/g,
      '<span class="italic">$1</span>'
    );
    highlighted = highlighted.replace(
      /`([^`]+)`/g,
      '<span class="bg-gray-200 px-1 rounded">$1</span>'
    );
  } else {
    const langKeywords = keywords[language] || [];
    langKeywords.forEach((keyword) => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      highlighted = highlighted.replace(
        regex,
        '<span class="text-purple-600 font-medium">$1</span>'
      );
    });

    highlighted = highlighted.replace(
      /(".*?"|'.*?'|`.*?`)/g,
      '<span class="text-green-600">$1</span>'
    );

    highlighted = highlighted.replace(
      /(\/\/.*$|#.*$)/gm,
      '<span class="text-gray-400 italic">$1</span>'
    );

    highlighted = highlighted.replace(
      /(\/\*[\s\S]*?\*\/)/g,
      '<span class="text-gray-400 italic">$1</span>'
    );

    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      '<span class="text-orange-600">$1</span>'
    );
  }

  return highlighted;
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  showLineNumbers = true,
  showToolbar = true,
  theme = 'light',
}) => {
  const [lineCount, setLineCount] = useState(value.split('\n').length);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setLineCount(value.split('\n').length);
  }, [value]);

  useEffect(() => {
    if (textareaRef.current && highlightRef.current) {
      textareaRef.current.scrollTop = highlightRef.current.scrollTop;
      textareaRef.current.scrollLeft = highlightRef.current.scrollLeft;
    }
  }, [value]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  }, [value, onChange]);

  const languages: { value: Language; label: string }[] = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'rust', label: 'Rust' },
    { value: 'sql', label: 'SQL' },
    { value: 'json', label: 'JSON' },
    { value: 'yaml', label: 'YAML' },
    { value: 'markdown', label: 'Markdown' },
  ];

  return (
    <div className={`border rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
      {showToolbar && (
        <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <select
              value={language}
              onChange={(e) => onChange(value)}
              className="px-2 py-1 text-sm border rounded bg-white"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {lineCount} 行
            </span>
          </div>
        </div>
      )}
      <div className="relative">
        {showLineNumbers && (
          <div
            className={`absolute left-0 top-0 bottom-0 w-12 px-2 py-3 overflow-hidden select-none ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
            }`}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className={`text-xs text-right pr-2 leading-6 ${
                  theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        )}
        <div className="relative">
          <pre
            ref={highlightRef}
            className={`p-3 overflow-auto ${showLineNumbers ? 'pl-14' : ''} ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            } font-mono text-sm leading-6 whitespace-pre-wrap break-all`}
            dangerouslySetInnerHTML={{ __html: highlightSyntax(value, language) }}
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className={`absolute inset-0 w-full h-full p-3 bg-transparent resize-none outline-none ${
              showLineNumbers ? 'pl-14' : ''
            } font-mono text-sm leading-6 ${
              theme === 'dark' ? 'text-transparent caret-white' : 'text-transparent caret-gray-900'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export interface CodeBlockProps {
  code: string;
  language?: Language;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'javascript',
  showLineNumbers = true,
  highlightLines = [],
}) => {
  const lines = code.split('\n');

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
        <span className="text-xs font-medium text-gray-600 uppercase">{language}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {lines.map((line, index) => (
              <tr
                key={index}
                className={highlightLines.includes(index + 1) ? 'bg-yellow-50' : ''}
              >
                {showLineNumbers && (
                  <td className="w-12 px-3 py-1 text-right text-xs text-gray-400 select-none border-r border-gray-100">
                    {index + 1}
                  </td>
                )}
                <td className="px-3 py-1 font-mono text-sm">
                  <span dangerouslySetInnerHTML={{ __html: highlightSyntax(line || ' ', language) }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CodeEditor;
