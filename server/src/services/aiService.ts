import axios from 'axios';

export interface WeeklyPlan {
  week: number;
  title: string;
  description: string;
  goals: string[];
  tasks: Array<{
    day: number;
    title: string;
    description: string;
    estimatedTime: number; // 分钟
  }>;
}

export interface LearningPlan {
  title: string;
  description: string;
  durationWeeks: number;
  weeklyPlans: WeeklyPlan[];
  mermaidCode: string;
}

export interface GeneratePlanRequest {
  goal: string;
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  hoursPerWeek: number;
  durationWeeks: number;
  preferredStyle?: 'practical' | 'theoretical' | 'mixed';
  specificRequirements?: string;
}

/**
 * AI 学习计划生成服务
 */
class AIService {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    
    if (!this.apiKey) {
      console.warn('警告: OpenRouter API Key 未配置，AI 功能将不可用');
    }
  }

  /**
   * 生成学习计划
   */
  async generateLearningPlan(request: GeneratePlanRequest): Promise<LearningPlan> {
    if (!this.apiKey) {
      throw new Error('AI 服务未配置，请联系管理员');
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callOpenRouter(prompt);
      
      return this.parsePlanResponse(response, request);
    } catch (error) {
      console.error('生成学习计划失败:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          throw new Error('AI 服务认证失败，请检查 API Key');
        } else if (status === 429) {
          throw new Error('AI 服务请求频率过高，请稍后重试');
        } else if (status && status >= 500) {
          throw new Error('AI 服务暂时不可用，请稍后重试');
        }
      }
      
      throw new Error('生成学习计划失败，请重试');
    }
  }

  /**
   * 构建 AI 提示词
   */
  private buildPrompt(request: GeneratePlanRequest): string {
    const { goal, currentLevel, hoursPerWeek, durationWeeks, preferredStyle, specificRequirements } = request;
    
    return `你是一位专业的学习规划师，请为用户制定详细的学习计划。

**学习目标**: ${goal}
**当前水平**: ${currentLevel === 'beginner' ? '初学者' : currentLevel === 'intermediate' ? '中级' : '高级'}
**每周学习时间**: ${hoursPerWeek} 小时
**计划持续时间**: ${durationWeeks} 周
**学习风格偏好**: ${preferredStyle === 'practical' ? '实践为主' : preferredStyle === 'theoretical' ? '理论为主' : '理论实践结合'}
${specificRequirements ? `**特殊要求**: ${specificRequirements}` : ''}

请生成一个结构化的学习计划，包含以下内容：

1. 计划标题和总体描述
2. 每周的学习重点和具体任务
3. 每天的学习任务安排
4. 学习进度的可视化流程图(Mermaid格式)

**输出格式要求**:
请以 JSON 格式返回，结构如下：
\`\`\`json
{
  "title": "学习计划标题",
  "description": "计划的整体描述和学习路径说明",
  "durationWeeks": ${durationWeeks},
  "weeklyPlans": [
    {
      "week": 1,
      "title": "第一周标题",
      "description": "本周学习重点和目标",
      "goals": ["目标1", "目标2"],
      "tasks": [
        {
          "day": 1,
          "title": "任务标题",
          "description": "具体任务描述",
          "estimatedTime": 60
        }
      ]
    }
  ],
  "mermaidCode": "graph TD\\nA[开始学习] --> B[第一周]\\nB --> C[第二周]"
}
\`\`\`

**注意事项**:
1. 确保每周的学习时间不超过 ${hoursPerWeek} 小时
2. 任务应该循序渐进，符合学习规律
3. Mermaid 代码应该展示学习进度和关键节点
4. 每个任务要有明确的时间估算
5. 确保 JSON 格式正确，可以直接解析

请现在开始生成学习计划：`;
  }

  /**
   * 调用 OpenRouter API
   */
  private async callOpenRouter(prompt: string): Promise<string> {
    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: 'openai/gpt-3.5-turbo', // 可以根据需要切换模型
        messages: [
          {
            role: 'system',
            content: '你是一位专业的学习规划师，专门为用户制定个性化的学习计划。请始终以 JSON 格式返回结构化的学习计划。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://learnflow.app',
          'X-Title': 'LearnFlow Learning Platform',
        },
        timeout: 30000, // 30秒超时
      }
    );

    const content = response.data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI 服务返回空响应');
    }

    return content;
  }

  /**
   * 解析 AI 响应并转换为结构化数据
   */
  private parsePlanResponse(response: string, request: GeneratePlanRequest): LearningPlan {
    try {
      // 尝试从响应中提取 JSON
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      // 清理和标准化 JSON 字符串
      jsonStr = jsonStr.trim();
      
      // 移除可能的开头和结尾的换行符
      jsonStr = jsonStr.replace(/^\s*\n+/, '').replace(/\n+\s*$/, '');
      
      // 处理换行符，确保 JSON 格式正确
      jsonStr = jsonStr.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
      
      console.log('清理后的 JSON 字符串:', jsonStr);
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证必要字段
      if (!parsed.title || !parsed.weeklyPlans || !Array.isArray(parsed.weeklyPlans)) {
        throw new Error('AI 响应格式不正确');
      }

      // 使用通用方法构建计划
      return this.buildPlanFromParsedData(parsed, request);
    } catch (error) {
      console.error('解析 AI 响应失败:', error);
      console.log('原始响应长度:', response.length);
      console.log('原始响应前200字符:', response.substring(0, 200));
      console.log('原始响应后200字符:', response.substring(response.length - 200));
      
      // 尝试备用解析方法
      try {
        console.log('尝试备用解析方法...');
        // 直接查找 JSON 对象，不依赖代码块标记
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = response.substring(jsonStart, jsonEnd + 1);
          console.log('提取的 JSON:', extractedJson);
          
          // 清理 JSON 字符串
          const cleanedJson = extractedJson
            .replace(/\n\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          const parsed = JSON.parse(cleanedJson);
          console.log('备用解析成功:', parsed);
          
          // 使用备用解析结果构建计划
          return this.buildPlanFromParsedData(parsed, request);
        }
      } catch (backupError) {
        console.error('备用解析也失败:', backupError);
      }
      
      // 返回备用计划
      return this.generateFallbackPlan(request);
    }
  }

  /**
   * 从解析的数据构建学习计划
   */
  private buildPlanFromParsedData(parsed: any, request: GeneratePlanRequest): LearningPlan {
    try {
      // 验证必要字段
      if (!parsed.title || !parsed.weeklyPlans || !Array.isArray(parsed.weeklyPlans)) {
        throw new Error('备用解析数据格式不正确');
      }

      // 构建计划
      const plan: LearningPlan = {
        title: parsed.title,
        description: parsed.description || '系统生成的学习计划',
        durationWeeks: request.durationWeeks,
        weeklyPlans: parsed.weeklyPlans.map((week: any, index: number) => ({
          week: index + 1,
          title: week.title || `第${index + 1}周`,
          description: week.description || '',
          goals: Array.isArray(week.goals) ? week.goals : [],
          tasks: Array.isArray(week.tasks) ? week.tasks.map((task: any, dayIndex: number) => ({
            day: task.day || dayIndex + 1,
            title: task.title || '学习任务',
            description: task.description || '',
            estimatedTime: task.estimatedTime || 60,
          })) : [],
        })),
        mermaidCode: parsed.mermaidCode ? 
          parsed.mermaidCode.replace(/\\n/g, '\n').replace(/\n\s*/g, '\n').trim() : 
          this.generateFallbackMermaid(request.durationWeeks),
      };

      return plan;
    } catch (error) {
      console.error('构建计划失败:', error);
      return this.generateFallbackPlan(request);
    }
  }

  /**
   * 生成备用学习计划（当 AI 服务不可用时）
   */
  private generateFallbackPlan(request: GeneratePlanRequest): LearningPlan {
    const { goal, durationWeeks, hoursPerWeek } = request;
    
    const weeklyPlans: WeeklyPlan[] = [];
    const hoursPerDay = Math.ceil(hoursPerWeek / 7);
    
    for (let week = 1; week <= durationWeeks; week++) {
      const tasks = [];
      for (let day = 1; day <= 7; day++) {
        if (tasks.length < Math.ceil(hoursPerWeek / 2)) { // 每周安排一半天数的任务
          tasks.push({
            day,
            title: `${goal} - 第${week}周第${day}天学习`,
            description: `继续学习 ${goal} 相关内容`,
            estimatedTime: hoursPerDay * 60,
          });
        }
      }
      
      weeklyPlans.push({
        week,
        title: `第${week}周学习计划`,
        description: `${goal} 学习进度第${week}周`,
        goals: [`完成第${week}周的学习目标`],
        tasks,
      });
    }

    return {
      title: `${goal} 学习计划`,
      description: `为期 ${durationWeeks} 周的 ${goal} 学习计划，每周投入 ${hoursPerWeek} 小时。`,
      durationWeeks,
      weeklyPlans,
      mermaidCode: this.generateFallbackMermaid(durationWeeks),
    };
  }

  /**
   * 生成备用 Mermaid 图表
   */
  private generateFallbackMermaid(durationWeeks: number): string {
    let mermaid = 'graph TD\n    A[开始学习]';
    
    for (let i = 1; i <= durationWeeks; i++) {
      const prev = i === 1 ? 'A' : `W${i-1}`;
      mermaid += `\n    ${prev} --> W${i}[第${i}周]`;
    }
    
    mermaid += `\n    W${durationWeeks} --> E[完成学习]`;
    
    return mermaid;
  }
}

export const aiService = new AIService();
