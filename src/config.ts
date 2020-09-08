import { browser } from 'webextension-polyfill-ts';

export type Theme = 'light' | 'dark';

export interface Config {
  token: string;
  theme: Theme;
}

export const getConfig = async (): Promise<Config> => {
  const config: Config = { token: '', theme: 'light' };
  let result;
  try {
    result = await browser.storage.local.get(['token', 'theme']);
  } catch (reason) {
    console.log('Failed to get token');
    return config;
  }

  if (typeof result.token === 'string') {
    config.token = result.token;
  }
  if (result.theme === 'light' || result.theme === 'dark') {
    config.theme = result.theme;
  }

  return config;
};
