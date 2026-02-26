import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../shared/prisma';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/reviews
 */
router.get(
  '/',
  [query('period').optional().isIn(['weekly', 'monthly', 'quarterly'])],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const period = req.query.period as string | undefined;

      const reviews = await prisma.review.findMany({
        where: { userId, ...(period && { period }) },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ reviews });
    } catch (error) {
      console.error('获取复盘列表失败:', error);
      res.status(500).json({ error: 'Server Error', message: '获取复盘列表失败' });
    }
  },
);

/**
 * GET /api/reviews/:id
 */
router.get('/:id', [param('id').isString().notEmpty()], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const review = await prisma.review.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!review) {
      res.status(404).json({ error: 'Not Found', message: '复盘记录不存在' });
      return;
    }
    res.json({ review });
  } catch (error) {
    console.error('获取复盘详情失败:', error);
    res.status(500).json({ error: 'Server Error', message: '获取复盘详情失败' });
  }
});

/**
 * POST /api/reviews
 */
router.post(
  '/',
  [
    body('period').isIn(['weekly', 'monthly', 'quarterly']).withMessage('复盘周期必须是 weekly/monthly/quarterly'),
    body('content').isLength({ min: 1, max: 5000 }).withMessage('复盘内容长度 1-5000'),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      const { period, content } = req.body;
      const review = await prisma.review.create({
        data: { period, content, userId: req.user!.id },
      });

      res.status(201).json({ message: '复盘创建成功', review });
    } catch (error) {
      console.error('创建复盘失败:', error);
      res.status(500).json({ error: 'Server Error', message: '创建复盘失败' });
    }
  },
);

/**
 * PUT /api/reviews/:id
 */
router.put(
  '/:id',
  [
    param('id').isString().notEmpty(),
    body('content').optional().isLength({ min: 1, max: 5000 }),
    body('period').optional().isIn(['weekly', 'monthly', 'quarterly']),
  ],
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ error: 'Validation Error', details: errors.array() });
        return;
      }

      const existing = await prisma.review.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
      if (!existing) {
        res.status(404).json({ error: 'Not Found', message: '复盘记录不存在' });
        return;
      }

      const { content, period } = req.body;
      const review = await prisma.review.update({
        where: { id: req.params.id },
        data: { ...(content && { content }), ...(period && { period }) },
      });

      res.json({ message: '复盘更新成功', review });
    } catch (error) {
      console.error('更新复盘失败:', error);
      res.status(500).json({ error: 'Server Error', message: '更新复盘失败' });
    }
  },
);

/**
 * DELETE /api/reviews/:id
 */
router.delete('/:id', [param('id').isString().notEmpty()], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.review.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
    if (!existing) {
      res.status(404).json({ error: 'Not Found', message: '复盘记录不存在' });
      return;
    }
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ message: '复盘删除成功' });
  } catch (error) {
    console.error('删除复盘失败:', error);
    res.status(500).json({ error: 'Server Error', message: '删除复盘失败' });
  }
});

export default router;
