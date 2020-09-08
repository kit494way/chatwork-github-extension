import { browser } from 'webextension-polyfill-ts';
import { getConfig } from './config';

const isInput = (node: Node): node is HTMLInputElement => {
  return (node as HTMLInputElement).tagName?.toLowerCase() == 'input';
};

type MsgType = 'success' | 'error';

const showMessage = (message: string, msgType: MsgType) => {
  const tmplSuccess = document.getElementById(`tmpl-${msgType}-message`) as HTMLTemplateElement;
  const fragment = tmplSuccess.content.cloneNode(true) as DocumentFragment;
  const span = fragment.querySelector('span');
  if (!span) {
    return;
  }
  span.textContent = message;

  if (!fragment.firstElementChild) {
    return;
  }
  const newChild = document.body.appendChild(fragment.firstElementChild);

  newChild.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
  const animation = newChild.animate([{ opacity: 1 }, { opacity: 0 }], {
    delay: 3000,
    duration: 600,
    fill: 'forwards',
  });

  animation.onfinish = () => document.body.removeChild(newChild);
};

document.addEventListener('DOMContentLoaded', () => {
  const tokenInput = document.querySelector('input[name=github_token]');
  if (!tokenInput || !isInput(tokenInput)) {
    return;
  }

  getConfig().then((config) => {
    tokenInput.value = config.token;

    if (config.theme === 'light') {
      const themeLightInput = document.querySelector('input[name=github_link_theme][value=light]') as HTMLInputElement;
      if (themeLightInput) {
        themeLightInput.checked = true;
      }
    } else if (config.theme === 'dark') {
      const themeDarkInput = document.querySelector('input[name=github_link_theme][value=dark]') as HTMLInputElement;
      if (themeDarkInput) {
        themeDarkInput.checked = true;
      }
    }
  });

  const saveButton = document.getElementById('btn-save');
  saveButton?.addEventListener('click', () => {
    const themeInput = document.querySelector('input[name=github_link_theme]:checked');
    if (!themeInput || !isInput(themeInput)) {
      return;
    }
    browser.storage.local.set({ token: tokenInput.value, theme: themeInput.value }).then(
      () => showMessage('Successfuly saved.', 'success'),
      (reason) => {
        showMessage(`Failed to save.`, 'error');
        console.log(reason);
      }
    );
  });
});
