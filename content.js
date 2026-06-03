// content.js — injected into Claude, ChatGPT, Gemini

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INJECT_PROMPT') {
    const success = injectPrompt(message.text);
    sendResponse({ success });
  }
});

function injectPrompt(text) {
  const el = findTextarea();
  if (!el) return false;

  el.focus();

  if (el.tagName === 'TEXTAREA') {
    // Standard textarea (rare on modern AI sites)
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    ).set;
    nativeSetter.call(el, text);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

  } else {
    // contenteditable div (ChatGPT, Claude, Gemini)
    // Must use execCommand so React/framework picks up the change
    el.focus();

    // Clear existing content first
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // Insert text — this fires proper input events that React listens to
    document.execCommand('insertText', false, text);

    // Fallback: if execCommand didn't work (some browsers), set innerHTML
    if (!el.textContent.trim()) {
      el.textContent = text;
      el.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
    }
  }

  el.focus();
  return true;
}

function findTextarea() {
  const host = window.location.hostname;
  let el = null;

  if (host.includes('claude.ai')) {
    el = document.querySelector('div.ProseMirror[contenteditable="true"]') ||
         document.querySelector('div[contenteditable="true"]');
  } 
  else if (host.includes('chatgpt.com') || host.includes('chat.openai')) {
    el = document.querySelector('#prompt-textarea') ||
         document.querySelector('div[contenteditable="true"]');
  } 
  else if (host.includes('gemini.google')) {
    el = document.querySelector('.ql-editor') ||
         document.querySelector('rich-textarea div[contenteditable="true"]') ||
         document.querySelector('div[contenteditable="true"]');
  }

  // Fallback: If we didn't find it, find ALL text areas and pick the last one
  // (The main chat input is almost always the last editable area on the page)
  if (!el) {
    const editables = Array.from(document.querySelectorAll('div[contenteditable="true"], textarea:not([hidden])'));
    el = editables[editables.length - 1];
  }

  return el;
}
