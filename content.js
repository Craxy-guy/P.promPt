// content.js — injected into Claude, ChatGPT, Gemini

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INJECT_PROMPT') {
    const success = injectPrompt(message.text);
    sendResponse({ success });
  }
});

function injectPrompt(text) {
  const textarea = findTextarea();
  if (!textarea) return false;

  // Handle both regular textarea and contenteditable divs
  if (textarea.tagName === 'TEXTAREA') {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeInputValueSetter.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // contenteditable (ChatGPT uses a div)
    textarea.focus();
    textarea.textContent = text;
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }

  textarea.focus();
  return true;
}

function findTextarea() {
  const host = window.location.hostname;

  if (host.includes('claude.ai')) {
    return (
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea')
    );
  }

  if (host.includes('chatgpt.com') || host.includes('chat.openai')) {
    return (
      document.querySelector('#prompt-textarea') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea')
    );
  }

  if (host.includes('gemini.google')) {
    return (
      document.querySelector('.ql-editor') ||
      document.querySelector('div[contenteditable="true"]') ||
      document.querySelector('textarea')
    );
  }

  // fallback
  return (
    document.querySelector('textarea:not([hidden])') ||
    document.querySelector('div[contenteditable="true"]')
  );
}
