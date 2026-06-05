/** 與 manifest / index.html 共用的 PWA 品牌常數（可單元測試）。 */
export const PWA_APP_NAME = '每天的事';

export const PWA_THEME_COLOR = '#fef9f3';

export const PWA_MANIFEST = {
  name: PWA_APP_NAME,
  short_name: PWA_APP_NAME,
  theme_color: PWA_THEME_COLOR,
  background_color: PWA_THEME_COLOR,
  display: 'browser' as const,
  start_url: '/index.html',
  lang: 'zh-Hant',
};
