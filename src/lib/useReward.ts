import { useCallback, useEffect, useState } from 'react';
import { storage } from './storage';

const REWARD_KEY = 'kid-todolist:reward:v1';
const DEFAULT_REWARD = '你今天好棒！';

export function useReward() {
  const [text, setText] = useState<string>(() =>
    storage.get<string>(REWARD_KEY, DEFAULT_REWARD),
  );

  useEffect(() => {
    storage.set(REWARD_KEY, text);
  }, [text]);

  const update = useCallback((next: string) => {
    setText(next);
  }, []);

  return { text, setText: update, defaultText: DEFAULT_REWARD };
}
