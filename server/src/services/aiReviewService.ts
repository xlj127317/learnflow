import axios from 'axios';
import prisma from '../shared/prisma';
import logger from '../shared/logger';

/**
 * AI 学习复盘生成服务
 * 收集用户学习数据并通过 AI 生成结构化复盘报告
 */
export async function generateAIReview(
  userId: string,
  period: 'weekly' | 'monthly',
): Promise<string> {
  const days = period === 'weekly' ? 7 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [checkins, tasks, goals] = await Promise.all([
    prisma.checkin.findMany({
      where: { userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.task.findMany({
      where: { userId, updatedAt: { gte: since } },
    }),
    prisma.goal.findMany({
      where: { userId },
      include: { plans: { select: { id: true, title: true, progress: true } } },
    }),
  ]);

  const totalCheckins = checkins.length;
  const totalDuration = checkins.reduce((s, c) => s + c.duration, 0);
  const avgRating =
    checkins.filter((c) => c.rating !== null).length > 0
      ? checkins.reduce((s, c) => s + (c.rating ?? 0), 0) /
        checkins.filter((c) => c.rating !== null).length
      : 0;

  const completedTasks = tasks.filter((t) => t.completed).length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const goalSummaries = goals.map((g) => ({
    title: g.title,
    status: g.status,
    progress: g.progress,
    plans: g.plans.map((p) => ({ title: p.title, progress: p.progress })),
  }));

  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  if (apiKey) {
    try {
      return await callAIForReview(apiKey, baseURL, {
        period,
        totalCheckins,
        totalDuration,
        avgRating,
        completedTasks,
        totalTasks,
        taskCompletionRate,
        goalSummaries,
      });
    } catch (error) {
      logger.error('AI 复盘生成失败，使用模板回退', { error });
    }
  }

  return buildTemplateReview(period, {
    totalCheckins,
    totalDuration,
    avgRating,
    completedTasks,
    totalTasks,
    taskCompletionRate,
    goalSummaries,
  });
}

interface ReviewData {
  period: 'weekly' | 'monthly';
  totalCheckins: number;
  totalDuration: number;
  avgRating: number;
  completedTasks: number;
  totalTasks: number;
  taskCompletionRate: number;
  goalSummaries: Array<{
    title: string;
    status: string;
    progress: number;
    plans: Array<{ title: string; progress: number }>;
  }>;
}

async function callAIForReview(
  apiKey: string,
  baseURL: string,
  data: ReviewData,
): Promise<string> {
  const periodLabel = data.period === 'weekly' ? '本周' : '本月';
  const nextPeriodLabel = data.period === 'weekly' ? '下周' : '下月';

  const prompt = `你是一位专业的学习教练。请根据以下学习数据生成一份${periodLabel}学习复盘报告。

**学习数据**:
- 打卡次数: ${data.totalCheckins} 次
- 总学习时长: ${data.totalDuration} 分钟
- 平均效果评分: ${data.avgRating.toFixed(1)} / 5
- 任务完成: ${data.completedTasks} / ${data.totalTasks}（完成率 ${data.taskCompletionRate}%）
- 目标进展:
${data.goalSummaries.map((g) => `  - ${g.title}（${g.status}，进度 ${g.progress}%）`).join('\n')}

请按以下结构输出复盘报告（纯文本，不使用 JSON）:

## ${periodLabel}亮点
- （列出 2-3 个亮点）

## 需要改进的地方
- （列出 2-3 个改进点）

## ${nextPeriodLabel}建议
- （给出 2-3 条具体建议）`;

  const response = await axios.post(
    `${baseURL}/chat/completions`,
    {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的学习教练，擅长分析学习数据并给出有针对性的建议。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://learnflow.app',
        'X-Title': 'LearnFlow Learning Platform',
      },
      timeout: 30000,
    },
  );

  const content = response.data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI 服务返回空响应');
  }
  return content;
}

function buildTemplateReview(
  period: 'weekly' | 'monthly',
  data: Omit<ReviewData, 'period'>,
): string {
  const periodLabel = period === 'weekly' ? '本周' : '本月';
  const nextPeriodLabel = period === 'weekly' ? '下周' : '下月';

  const highlights: string[] = [];
  if (data.totalCheckins > 0) {
    highlights.push(`完成了 ${data.totalCheckins} 次学习打卡，累计 ${data.totalDuration} 分钟`);
  }
  if (data.taskCompletionRate >= 80) {
    highlights.push(`任务完成率达到 ${data.taskCompletionRate}%，表现出色`);
  } else if (data.completedTasks > 0) {
    highlights.push(`完成了 ${data.completedTasks} 个学习任务`);
  }
  if (data.avgRating >= 4) {
    highlights.push(`学习效果评分平均 ${data.avgRating.toFixed(1)} 分，学习质量较高`);
  }
  if (highlights.length === 0) {
    highlights.push('坚持记录了学习情况');
  }

  const improvements: string[] = [];
  if (data.totalCheckins < (period === 'weekly' ? 3 : 10)) {
    improvements.push('打卡频率偏低，建议保持每日学习习惯');
  }
  if (data.taskCompletionRate < 60) {
    improvements.push(`任务完成率仅 ${data.taskCompletionRate}%，可以适当调整任务难度`);
  }
  if (data.avgRating > 0 && data.avgRating < 3) {
    improvements.push('学习效果评分偏低，建议调整学习方法');
  }
  if (improvements.length === 0) {
    improvements.push('继续保持良好的学习节奏');
  }

  const suggestions: string[] = [];
  if (data.taskCompletionRate < 60) {
    suggestions.push('将大任务拆分为更小的子任务，降低完成难度');
  }
  if (data.totalCheckins < (period === 'weekly' ? 5 : 15)) {
    suggestions.push('设置固定学习时间，养成每日打卡习惯');
  }
  suggestions.push('定期回顾目标进展，及时调整学习计划');

  return `## ${periodLabel}亮点\n${highlights.map((h) => `- ${h}`).join('\n')}\n\n## 需要改进的地方\n${improvements.map((i) => `- ${i}`).join('\n')}\n\n## ${nextPeriodLabel}建议\n${suggestions.map((s) => `- ${s}`).join('\n')}`;
}
