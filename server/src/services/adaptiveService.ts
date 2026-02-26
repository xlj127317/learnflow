import axios from 'axios';
import prisma from '../shared/prisma';
import logger from '../shared/logger';

export interface AdaptiveSuggestion {
  status: 'on_track' | 'falling_behind' | 'ahead';
  completionRate: number;
  suggestion: string;
  adjustments: Array<{
    week: number;
    action: 'reduce' | 'increase' | 'keep';
    reason: string;
  }>;
}

/**
 * 分析学习进度并给出自适应调整建议
 */
export async function analyzeAndSuggest(
  userId: string,
  planId: string,
): Promise<AdaptiveSuggestion> {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, userId },
    include: {
      tasks: true,
      aiTaskCompletions: true,
    },
  });

  if (!plan) {
    throw new Error('学习计划不存在');
  }

  const totalTasks = plan.tasks.length + plan.aiTaskCompletions.length;
  const completedRegular = plan.tasks.filter((t) => t.completed).length;
  const completedAI = plan.aiTaskCompletions.filter((c) => c.completed).length;
  const completedTotal = completedRegular + completedAI;

  const completionRate = totalTasks > 0 ? Math.round((completedTotal / totalTasks) * 100) : 0;

  const createdAt = plan.createdAt;
  const now = new Date();
  const elapsedMs = now.getTime() - createdAt.getTime();
  const elapsedWeeks = Math.max(1, Math.ceil(elapsedMs / (7 * 24 * 60 * 60 * 1000)));
  const durationWeeks = plan.durationWeeks || 1;

  const expectedRate = Math.min(100, Math.round((elapsedWeeks / durationWeeks) * 100));

  let status: AdaptiveSuggestion['status'];
  if (completionRate >= expectedRate * 0.9) {
    status = completionRate > expectedRate * 1.1 ? 'ahead' : 'on_track';
  } else {
    status = 'falling_behind';
  }

  const apiKey = process.env.OPENROUTER_API_KEY || '';
  const baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  if (apiKey) {
    try {
      return await callAIForSuggestion(apiKey, baseURL, {
        planTitle: plan.title,
        durationWeeks,
        elapsedWeeks,
        completionRate,
        expectedRate,
        status,
        completedTotal,
        totalTasks,
      });
    } catch (error) {
      logger.error('AI 自适应建议生成失败，使用规则回退', { error });
    }
  }

  return buildRuleSuggestion({
    durationWeeks,
    elapsedWeeks,
    completionRate,
    expectedRate,
    status,
  });
}

interface SuggestionContext {
  planTitle: string;
  durationWeeks: number;
  elapsedWeeks: number;
  completionRate: number;
  expectedRate: number;
  status: AdaptiveSuggestion['status'];
  completedTotal: number;
  totalTasks: number;
}

async function callAIForSuggestion(
  apiKey: string,
  baseURL: string,
  ctx: SuggestionContext,
): Promise<AdaptiveSuggestion> {
  const prompt = `你是一位学习教练。请根据以下学习进度数据，给出自适应学习建议。

**计划**: ${ctx.planTitle}
**总周数**: ${ctx.durationWeeks} 周
**已过去**: ${ctx.elapsedWeeks} 周
**完成进度**: ${ctx.completionRate}%（预期 ${ctx.expectedRate}%）
**任务完成**: ${ctx.completedTotal} / ${ctx.totalTasks}

请以 JSON 格式返回（不要包含 markdown 代码块标记）:
{
  "status": "${ctx.status}",
  "completionRate": ${ctx.completionRate},
  "suggestion": "一段简短的总结性建议",
  "adjustments": [
    { "week": <从下周开始的周数>, "action": "reduce|increase|keep", "reason": "原因" }
  ]
}

adjustments 数组应包含从当前周到最后一周的调整建议。action 含义：
- reduce: 降低任务难度或数量
- increase: 提高任务难度或节奏
- keep: 保持当前计划`;

  const response = await axios.post(
    `${baseURL}/chat/completions`,
    {
      model: 'openai/gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位学习教练，返回严格合法的 JSON。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1500,
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

  try {
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    return {
      status: parsed.status || ctx.status,
      completionRate: ctx.completionRate,
      suggestion: parsed.suggestion || '',
      adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
    };
  } catch {
    logger.warn('AI 返回内容解析失败，使用规则回退');
    return buildRuleSuggestion({
      durationWeeks: ctx.durationWeeks,
      elapsedWeeks: ctx.elapsedWeeks,
      completionRate: ctx.completionRate,
      expectedRate: ctx.expectedRate,
      status: ctx.status,
    });
  }
}

interface RuleContext {
  durationWeeks: number;
  elapsedWeeks: number;
  completionRate: number;
  expectedRate: number;
  status: AdaptiveSuggestion['status'];
}

function buildRuleSuggestion(ctx: RuleContext): AdaptiveSuggestion {
  const adjustments: AdaptiveSuggestion['adjustments'] = [];
  const remainingWeeks = Math.max(0, ctx.durationWeeks - ctx.elapsedWeeks);

  let suggestion: string;

  if (ctx.completionRate < 60) {
    suggestion = `当前完成率 ${ctx.completionRate}%，低于预期（${ctx.expectedRate}%）。建议适当降低每周任务量，聚焦核心内容。`;
    for (let w = ctx.elapsedWeeks + 1; w <= ctx.durationWeeks; w++) {
      adjustments.push({
        week: w,
        action: 'reduce',
        reason: '进度落后，减少任务量以追赶核心目标',
      });
    }
  } else if (ctx.completionRate > 90) {
    suggestion = `当前完成率 ${ctx.completionRate}%，超出预期。可以适当增加挑战性内容或加快学习节奏。`;
    for (let w = ctx.elapsedWeeks + 1; w <= ctx.durationWeeks; w++) {
      adjustments.push({
        week: w,
        action: 'increase',
        reason: '进度超前，可增加进阶内容提升学习深度',
      });
    }
  } else {
    suggestion = `当前完成率 ${ctx.completionRate}%，基本符合预期（${ctx.expectedRate}%）。继续保持当前节奏即可。`;
    for (let w = ctx.elapsedWeeks + 1; w <= ctx.durationWeeks; w++) {
      adjustments.push({
        week: w,
        action: 'keep',
        reason: '进度正常，保持当前计划',
      });
    }
  }

  if (remainingWeeks === 0 && adjustments.length === 0) {
    adjustments.push({
      week: ctx.durationWeeks,
      action: 'keep',
      reason: '计划已到最后一周',
    });
  }

  return {
    status: ctx.status,
    completionRate: ctx.completionRate,
    suggestion,
    adjustments,
  };
}
