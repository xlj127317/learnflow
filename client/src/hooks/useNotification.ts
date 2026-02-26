import { useState, useEffect, useCallback } from 'react';

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return;
      new Notification(title, {
        icon: '/vite.svg',
        ...options,
      });
    },
    [permission],
  );

  return { permission, requestPermission, notify };
}

/**
 * 每日学习提醒 Hook
 * 在指定时间弹出浏览器通知
 */
export function useDailyReminder() {
  const { permission, requestPermission, notify } = useNotification();
  const [enabled, setEnabled] = useState(() => localStorage.getItem('dailyReminder') === 'true');
  const [reminderTime, setReminderTimeState] = useState(() => localStorage.getItem('reminderTime') || '20:00');

  const setReminderTime = useCallback((time: string) => {
    setReminderTimeState(time);
    localStorage.setItem('reminderTime', time);
  }, []);

  const toggleReminder = useCallback(async () => {
    if (!enabled && permission !== 'granted') {
      await requestPermission();
    }
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('dailyReminder', String(next));
  }, [enabled, permission, requestPermission]);

  useEffect(() => {
    if (!enabled) return;

    const check = () => {
      const now = new Date();
      const [h, m] = reminderTime.split(':').map(Number);
      if (now.getHours() === h && now.getMinutes() === m) {
        notify('LearnFlow 学习提醒', { body: '今天还没打卡哦，该学习啦！📚' });
      }
    };

    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [enabled, reminderTime, notify]);

  return { enabled, toggleReminder, reminderTime, setReminderTime, permission };
}
