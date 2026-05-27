import React, { useRef, useCallback } from 'react';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, text);
    handleInput();
  };

  const toolbarButtons = [
    { command: 'bold', icon: 'B', title: '粗体', shortcut: 'Ctrl+B' },
    { command: 'italic', icon: 'I', title: '斜体', shortcut: 'Ctrl+I' },
    { command: 'underline', icon: 'U', title: '下划线', shortcut: 'Ctrl+U' },
    { type: 'separator' },
    { command: 'insertUnorderedList', icon: '☰', title: '无序列表' },
    { command: 'insertOrderedList', icon: '☷', title: '有序列表' },
    { type: 'separator' },
    { command: 'justifyLeft', icon: '←', title: '左对齐' },
    { command: 'justifyCenter', icon: '↔', title: '居中' },
    { command: 'justifyRight', icon: '→', title: '右对齐' },
    { type: 'separator' },
    { command: 'undo', icon: '↩', title: '撤销', shortcut: 'Ctrl+Z' },
    { command: 'redo', icon: '↪', title: '重做', shortcut: 'Ctrl+Y' },
  ];

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
        {toolbarButtons.map((btn, index) => {
          if (btn.type === 'separator') {
            return <div key={index} className="w-px h-6 bg-gray-300 mx-1" />;
          }
          return (
            <button
              key={index}
              onClick={() => execCommand(btn.command!)}
              disabled={disabled}
              title={`${btn.title}${btn.shortcut ? ` (${btn.shortcut})` : ''}`}
              className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="text-sm font-medium">{btn.icon}</span>
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: value }}
        placeholder={placeholder}
        className={`min-h-[200px] p-4 outline-none focus:ring-2 focus:ring-primary-500 ${
          disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
        }`}
        style={{ userSelect: disabled ? 'none' : 'text' }}
      />
    </div>
  );
};

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-2">
        <div className="border-r border-gray-200">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-600">
            编辑
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full h-[300px] p-4 outline-none resize-none bg-white"
          />
        </div>
        <div className="bg-gray-50">
          <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-600">
            预览
          </div>
          <div
            className="h-[300px] p-4 overflow-auto"
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(value),
            }}
          />
        </div>
      </div>
    </div>
  );
};

const markdownToHtml = (markdown: string): string => {
  let html = markdown;
  
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>');
  
  html = html.replace(/\n/g, '<br>');
  
  html = html.replace(/<li>(.*?)<\/li>/g, (match) => {
    if (!html.includes('<ul>')) {
      return `<ul>${match}</ul>`;
    }
    return match;
  });
  
  return html;
};

export default RichTextEditor;
