export type ListScope = 'today' | 'extra';

export interface DailyListCopy {
  progress: (done: number, total: number) => string;
  empty: string;
  adhocPlaceholder: string;
  adhocAriaLabel: string;
  adhocBadge: string;
  allDoneHeading: string;
}

export const DAILY_LIST_COPY: Record<ListScope, DailyListCopy> = {
  today: {
    progress: (done, total) => `今天 ${done} / ${total} 完成`,
    empty:
      '今天沒有安排的任務。在下面臨時加一個，或點右上角「管理任務」設定排程。',
    adhocPlaceholder: '臨時加一個今天的任務',
    adhocAriaLabel: '臨時加一個今天的任務',
    adhocBadge: '今天',
    allDoneHeading: '今天全部完成了！',
  },
  extra: {
    progress: (done, total) => `額外 ${done} / ${total} 完成`,
    empty:
      '額外沒有安排的任務。在下面臨時加一個，或點右上角「管理任務」設定排程。',
    adhocPlaceholder: '臨時加一個額外的任務',
    adhocAriaLabel: '臨時加一個額外的任務',
    adhocBadge: '額外',
    allDoneHeading: '額外全部完成了！',
  },
};
