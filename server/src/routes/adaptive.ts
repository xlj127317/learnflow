import { Router, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { analyzeAndSuggest } from '../services/adaptiveService';

const router = Router();

/**
 * POST /api/adaptive/:planId/analyze
 * 分析学习进度并返回自适应调整建议
 */
router.post(
  '/:planId/analyze',
  requireAuth,
  [param('planId').isString().notEmpty().withMessage('planId 不能为空')],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      const userId = req.user!.id;
      const planId = req.params.planId as string;

      const suggestion = await analyzeAndSuggest(userId, planId);
      res.json({ success: true, suggestion });
    } catch (error: any) {
      if (error.message === '学习计划不存在') {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }
      console.error('自适应分析失败:', error);
      res.status(500).json({ error: 'Server Error', message: '自适应分析失败' });
    }
  },
);

export default router;
