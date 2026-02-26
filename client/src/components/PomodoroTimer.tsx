import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './Toast';
import { checkinApi } from '../services/api';

type TimerState = 'idle' | 'running' | 'paused' | 'break';

const PRESETS = [
  { label: '25 分钟', work: 25, break_: 5 },
  { label: '45 分钟', work: 45, break_: 10 },
  { label: '60 分钟', work: 60, break_: 15 },
];

export default function PomodoroTimer() {
  const [state, setState] = useState<TimerState>('idle');
  const [seconds, setSeconds] = useState(25 * 60);
  const [totalWork, setTotalWork] = useState(25);
  const [breakTime, setBreakTime] = useState(5);
  const [sessions, setSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setSeconds(prev => {
      if (prev <= 1) {
        clearTimer();
        if (state === 'running') {
          setSessions(s => s + 1);
          setTotalMinutes(m => m + totalWork);
          toast.success(`专注 ${totalWork} 分钟完成！休息一下吧`);
          setState('break');
          return breakTime * 60;
        }
        if (state === 'break') {
          toast.info('休息结束，继续加油！');
          setState('idle');
          return totalWork * 60;
        }
        return 0;
      }
      return prev - 1;
    });
  }, [state, totalWork, breakTime, clearTimer, toast]);

  useEffect(() => {
    if (state === 'running' || state === 'break') {
      intervalRef.current = setInterval(tick, 1000);
    }
    return clearTimer;
  }, [state, tick, clearTimer]);

  const start = () => {
    setState('running');
  };

  const pause = () => {
    clearTimer();
    setState('paused');
  };

  const resume = () => {
    setState('running');
  };

  const reset = () => {
    clearTimer();
    setState('idle');
    setSeconds(totalWork * 60);
  };

  const selectPreset = (work: number, brk: number) => {
    clearTimer();
    setState('idle');
    setTotalWork(work);
    setBreakTime(brk);
    setSeconds(work * 60);
  };

  const saveToCheckin = async () => {
    if (totalMinutes === 0) return;
    try {
      await checkinApi.createCheckin({ duration: totalMinutes, notes: `番茄钟：${sessions} 个专注时段，共 ${totalMinutes} 分钟` });
      toast.success(`已将 ${totalMinutes} 分钟记录到今日打卡`);
      setTotalMinutes(0);
      setSessions(0);
    } catch {
      toast.error('打卡记录失败，今日可能已打卡');
    }
  };

  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  const progress = state === 'break'
    ? ((breakTime * 60 - seconds) / (breakTime * 60)) * 100
    : ((totalWork * 60 - seconds) / (totalWork * 60)) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span>🍅</span> 番茄钟
      </h2>

      {/* 预设选择 */}
      {state === 'idle' && (
        <div className="flex gap-2 mb-6">
          {PRESETS.map(p => (
            <button
              key={p.work}
              onClick={() => selectPreset(p.work, p.break_)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${totalWork === p.work
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* 计时器 */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4"
            className="text-gray-200 dark:text-gray-700" />
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 54}`}
            strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${state === 'break' ? 'text-green-500' : 'text-red-500'}`}
            stroke="currentColor" />
        </svg>
        <div className="absolute text-center">
          <div className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
            {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {state === 'break' ? '休息中' : state === 'running' ? '专注中' : state === 'paused' ? '已暂停' : '准备开始'}
          </div>
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex justify-center gap-3 mb-4">
        {state === 'idle' && (
          <button onClick={start} className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium">
            开始专注
          </button>
        )}
        {state === 'running' && (
          <button onClick={pause} className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium">
            暂停
          </button>
        )}
        {state === 'paused' && (
          <>
            <button onClick={resume} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium">
              继续
            </button>
            <button onClick={reset} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 font-medium">
              重置
            </button>
          </>
        )}
        {state === 'break' && (
          <button onClick={reset} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 font-medium">
            跳过休息
          </button>
        )}
      </div>

      {/* 统计 */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3">
        <span>已完成 {sessions} 个时段 · {totalMinutes} 分钟</span>
        {totalMinutes > 0 && (
          <button onClick={saveToCheckin} className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
            记录到打卡
          </button>
        )}
      </div>
    </div>
  );
}
