import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { reviewApi } from '../services/api';
import { useToast } from './Toast';
import type { Review } from '../types';

type PeriodFilter = 'all' | 'weekly' | 'monthly' | 'quarterly';

const PERIOD_LABELS: Record<string, string> = {
  weekly: '周复盘',
  monthly: '月复盘',
  quarterly: '季度复盘',
};

const PERIOD_BADGE_COLORS: Record<string, string> = {
  weekly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  monthly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  quarterly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const FILTER_TABS: { key: PeriodFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'weekly', label: '周复盘' },
  { key: 'monthly', label: '月复盘' },
  { key: 'quarterly', label: '季度复盘' },
];

export default function ReviewPage() {
  const toast = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<PeriodFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formPeriod, setFormPeriod] = useState<'weekly' | 'monthly' | 'quarterly'>('weekly');
  const [formContent, setFormContent] = useState('');

  const loadReviews = useCallback(async () => {
    try {
      setIsLoading(true);
      const period = filter === 'all' ? undefined : filter;
      const response = await reviewApi.getReviews(period);
      setReviews(response.reviews);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载复盘记录失败';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleCreate = async () => {
    if (!formContent.trim()) {
      toast.error('请输入复盘内容');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await reviewApi.createReview({
        period: formPeriod,
        content: formContent.trim(),
      });
      setReviews(prev => [response.review, ...prev]);
      toast.success(response.message || '复盘创建成功');
      setShowForm(false);
      setFormContent('');
      setFormPeriod('weekly');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '创建复盘失败';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条复盘记录吗？此操作不可撤销。')) return;

    try {
      setDeletingId(id);
      await reviewApi.deleteReview(id);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success('复盘记录已删除');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '删除失败';
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">学习复盘</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">定期回顾学习成果，持续优化学习方法</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary self-start sm:self-auto"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          新建复盘
        </button>
      </div>

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">新建复盘</h2>
              <button
                onClick={() => { setShowForm(false); setFormContent(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  复盘周期
                </label>
                <select
                  value={formPeriod}
                  onChange={e => setFormPeriod(e.target.value as typeof formPeriod)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="weekly">周复盘</option>
                  <option value="monthly">月复盘</option>
                  <option value="quarterly">季度复盘</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  复盘内容
                </label>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  rows={6}
                  placeholder="回顾这段时间的学习成果、遇到的问题和改进方向..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => { setShowForm(false); setFormContent(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !formContent.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="spinner w-4 h-4 mr-2" />
                    创建中...
                  </span>
                ) : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Period filter tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="spinner w-8 h-8 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">正在加载复盘记录...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reviews.length === 0 && (
        <div className="text-center py-16">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
            {filter === 'all' ? '暂无复盘记录' : `暂无${PERIOD_LABELS[filter]}记录`}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            定期复盘有助于提升学习效果
          </p>
          {filter === 'all' && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 btn-primary"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              新建复盘
            </button>
          )}
        </div>
      )}

      {/* Review cards list */}
      {!isLoading && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map(review => (
            <div
              key={review.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PERIOD_BADGE_COLORS[review.period]}`}>
                      {PERIOD_LABELS[review.period]}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(review.createdAt), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                  <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-4">
                    {review.content}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(review.id)}
                  disabled={deletingId === review.id}
                  className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  title="删除复盘"
                >
                  {deletingId === review.id ? (
                    <span className="spinner w-5 h-5" />
                  ) : (
                    <TrashIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
