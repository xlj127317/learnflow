import { useState } from 'react';
import Markdown from 'react-markdown';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}

export default function MarkdownEditor({ value, onChange, placeholder = '支持 Markdown 格式...', rows = 6 }: Props) {
  const [preview, setPreview] = useState(false);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
        <button type="button" onClick={() => setPreview(false)}
          className={`px-2 py-0.5 text-xs rounded ${!preview ? 'bg-white dark:bg-gray-600 shadow-sm font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          编辑
        </button>
        <button type="button" onClick={() => setPreview(true)}
          className={`px-2 py-0.5 text-xs rounded ${preview ? 'bg-white dark:bg-gray-600 shadow-sm font-medium text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
          预览
        </button>
        <span className="ml-auto text-xs text-gray-400">Markdown</span>
      </div>

      {preview ? (
        <div className="p-3 min-h-[8rem] prose prose-sm dark:prose-invert max-w-none">
          {value ? <Markdown>{value}</Markdown> : <p className="text-gray-400 italic">暂无内容</p>}
        </div>
      ) : (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-y focus:outline-none"
        />
      )}
    </div>
  );
}
