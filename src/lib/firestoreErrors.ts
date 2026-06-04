/** User-facing message when a Firestore subscription fails. */
export function firestoreReadError(label: string, err?: Error): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code: string }).code)
      : '';

  if (import.meta.env.DEV && code) {
    console.error(`Firestore read failed (${label})`, err);
    if (code === 'permission-denied') {
      return `讀取${label}失敗（權限不足）。本機請用 npm run dev:local；雲端請部署 firestore.rules。`;
    }
  }

  return `讀取${label}失敗。`;
}
