import { browser } from 'webextension-polyfill-ts';

document.addEventListener('DOMContentLoaded', () => {
  const btnSettings = document.getElementById('settings');
  if (btnSettings != null) {
    btnSettings.addEventListener('click', () => browser.runtime.openOptionsPage());
  }
});
