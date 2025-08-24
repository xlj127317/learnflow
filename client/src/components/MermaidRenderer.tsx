import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  code: string;
  className?: string;
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
}

export default function MermaidRenderer({ 
  code, 
  className = '', 
  theme = 'default' 
}: MermaidRendererProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    try {
      console.log('初始化 Mermaid 配置...');
      // 初始化 Mermaid
      mermaid.initialize({
        startOnLoad: false,
        theme: theme,
        securityLevel: 'loose',
        fontFamily: 'Inter, system-ui, sans-serif',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
        themeVariables: {
          primaryColor: '#3b82f6',
          primaryTextColor: '#1f2937',
          primaryBorderColor: '#2563eb',
          lineColor: '#6b7280',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#ffffff',
          background: '#ffffff',
          mainBkg: '#ffffff',
          secondBkg: '#f9fafb',
          tertiaryBkg: '#f3f4f6',
        },
      });
      console.log('Mermaid 初始化成功');
    } catch (error) {
      console.error('Mermaid 初始化失败:', error);
    }
  }, [theme]);

  useEffect(() => {
    console.log('MermaidRenderer useEffect 触发，code:', code);
    console.log('code存在:', !!code);
    console.log('elementRef.current存在:', !!elementRef.current);
    
    if (!code) {
      console.log('跳过渲染：code不存在');
      return;
    }
    
    console.log('开始执行renderDiagram');

    const renderDiagram = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('开始渲染 Mermaid 图表，代码:', code);
        console.log('代码长度:', code.length);
        console.log('代码类型:', typeof code);
        
        // 检查代码是否为空
        if (!code || code.trim().length === 0) {
          throw new Error('Mermaid 代码为空');
        }
        
        // 验证 Mermaid 语法
        console.log('开始验证 Mermaid 语法...');
        try {
          await mermaid.parse(code);
          console.log('Mermaid 语法验证成功');
        } catch (parseError) {
          console.error('Mermaid 语法验证失败:', parseError);
          throw new Error(`Mermaid 语法无效: ${parseError instanceof Error ? parseError.message : '未知错误'}`);
        }

        // 生成唯一ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log('生成的图表ID:', id);
        
        // 渲染图表
        console.log('开始渲染图表...');
        const { svg } = await mermaid.render(id, code);
        console.log('Mermaid 渲染成功，SVG 长度:', svg.length);
        console.log('SVG 内容前100字符:', svg.substring(0, 100));
        
        setSvgContent(svg);
        setIsLoading(false);
      } catch (err) {
        console.error('Mermaid 渲染错误:', err);
        console.error('错误详情:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : 'No stack trace'
        });
        setError(err instanceof Error ? err.message : '图表渲染失败');
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [code]);

  // 错误重试
  const handleRetry = () => {
    if (code && elementRef.current) {
      setError(null);
      setIsLoading(true);
      // 重新触发渲染
      const event = new Event('retry');
      elementRef.current.dispatchEvent(event);
    }
  };

  if (isLoading) {
    return (
      <div className={`mermaid-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center space-y-4">
            <div className="spinner w-8 h-8" />
            <p className="text-sm text-gray-600 dark:text-gray-400">正在渲染流程图...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mermaid-container ${className}`}>
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="text-error-500 text-4xl">⚠️</div>
            <h3 className="text-lg font-medium text-error-700 dark:text-error-300">
              图表渲染失败
            </h3>
            <p className="text-sm text-error-600 dark:text-error-400 max-w-md">
              {error}
            </p>
            <button
              onClick={handleRetry}
              className="btn-outline btn text-sm"
            >
              重试
            </button>
            
            {/* 显示原始代码以便调试 */}
            <details className="mt-4 text-left">
              <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                查看原始代码
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-32">
                <code>{code}</code>
              </pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={elementRef}
      className={`mermaid-container ${className}`}
    >
      {svgContent && (
        <div 
          className="mermaid-svg-container flex justify-center items-center w-full"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  );
}

// 预设的示例 Mermaid 代码
export const sampleMermaidCodes = {
  learningFlow: `
graph TD
    A[开始学习] --> B[制定目标]
    B --> C[生成学习计划]
    C --> D[执行任务]
    D --> E[打卡记录]
    E --> F{是否完成?}
    F -->|是| G[进入下一阶段]
    F -->|否| D
    G --> H[复盘总结]
    H --> I[设定新目标]
    I --> B
  `,
  
  studyPlan: `
graph LR
    A[第1周<br/>基础学习] --> B[第2周<br/>深入理解]
    B --> C[第3周<br/>实践应用]
    C --> D[第4周<br/>项目实战]
    D --> E[第5周<br/>总结复盘]
    
    A1[理论学习] --> A
    A2[基础练习] --> A
    
    B1[概念深化] --> B
    B2[案例分析] --> B
    
    C1[动手实践] --> C
    C2[问题解决] --> C
    
    D1[项目开发] --> D
    D2[成果展示] --> D
    
    E1[经验总结] --> E
    E2[改进计划] --> E
  `,

  progressTracking: `
graph TD
    A[学习目标] --> B{目标类型}
    B -->|技能学习| C[技能目标]
    B -->|知识学习| D[知识目标]
    B -->|项目实践| E[项目目标]
    
    C --> F[分解技能点]
    D --> G[分解知识点]
    E --> H[分解项目步骤]
    
    F --> I[制定练习计划]
    G --> J[制定学习计划]
    H --> K[制定开发计划]
    
    I --> L[每日练习]
    J --> M[每日学习]
    K --> N[每日开发]
    
    L --> O[打卡记录]
    M --> O
    N --> O
    
    O --> P[进度追踪]
    P --> Q{达到目标?}
    Q -->|是| R[完成庆祝]
    Q -->|否| S[调整计划]
    S --> I
    S --> J
    S --> K
  `
};

// Mermaid 主题配置
export const mermaidThemes = {
  light: {
    theme: 'default',
    themeVariables: {
      primaryColor: '#3b82f6',
      primaryTextColor: '#1f2937',
      primaryBorderColor: '#2563eb',
      lineColor: '#6b7280',
      secondaryColor: '#f3f4f6',
      tertiaryColor: '#ffffff',
      background: '#ffffff',
      mainBkg: '#ffffff',
      secondBkg: '#f9fafb',
      tertiaryBkg: '#f3f4f6',
    }
  },
  dark: {
    theme: 'dark',
    themeVariables: {
      primaryColor: '#60a5fa',
      primaryTextColor: '#f9fafb',
      primaryBorderColor: '#3b82f6',
      lineColor: '#9ca3af',
      secondaryColor: '#374151',
      tertiaryColor: '#1f2937',
      background: '#111827',
      mainBkg: '#1f2937',
      secondBkg: '#374151',
      tertiaryBkg: '#4b5563',
    }
  }
};

// 验证 Mermaid 代码的工具函数
export const validateMermaidCode = async (code: string): Promise<boolean> => {
  try {
    await mermaid.parse(code);
    return true;
  } catch {
    return false;
  }
};

// 生成默认的学习计划流程图
export const generateDefaultLearningPlan = (weeks: number): string => {
  let code = 'graph TD\n';
  code += '    Start[开始学习] --> W1[第1周]\n';
  
  for (let i = 1; i < weeks; i++) {
    code += `    W${i}[第${i}周] --> W${i + 1}[第${i + 1}周]\n`;
  }
  
  code += `    W${weeks}[第${weeks}周] --> End[完成学习]\n`;
  
  // 添加一些阶段性节点
  if (weeks >= 4) {
    const midWeek = Math.ceil(weeks / 2);
    code += `    W${midWeek} --> Review${midWeek}[阶段复盘]\n`;
    code += `    Review${midWeek} --> W${midWeek + 1}\n`;
  }
  
  return code;
};
