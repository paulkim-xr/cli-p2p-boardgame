'use strict';
const blessed = require('blessed');

const STATUS_BAR = ' [t] chat panel  [c] msg  [?] help  [q] quit';

function createGamePanel() {
  const screen = blessed.screen({ smartCSR: true, fullUnicode: true });
  let chatVisible = false;

  const gameBox = blessed.box({
    top: 0, left: 0, width: '100%', bottom: 1,
    scrollable: true, alwaysScroll: true,
  });

  const chatBox = blessed.log({
    top: 0, right: 0, width: '35%', bottom: 1,
    label: ' Chat ',
    border: { type: 'line' },
    style: { border: { fg: 'yellow' } },
    scrollable: true, alwaysScroll: true,
    hidden: true,
  });

  const promptBox = blessed.box({
    bottom: 0, left: 0, width: '100%', height: 1,
    content: STATUS_BAR,
    style: { fg: 'black', bg: 'cyan' },
  });

  screen.append(gameBox);
  screen.append(chatBox);
  screen.append(promptBox);
  screen.render();

  const panel = {
    toggleChat() {
      chatVisible = !chatVisible;
      if (chatVisible) { chatBox.show(); gameBox.width = '65%'; }
      else { chatBox.hide(); gameBox.width = '100%'; }
      screen.render();
    },

    setContent(text) {
      gameBox.setContent(text);
      screen.render();
    },

    setPrompt(text) {
      promptBox.setContent(text || STATUS_BAR);
      screen.render();
    },

    pushChat(from, text) {
      chatBox.pushLine(`${from}: ${text}`);
      screen.render();
    },

    // textMode=true: 't' goes to buffer (for chat/text input)
    readInput(prompt, textMode = false) {
      let buf = '';
      promptBox.setContent(prompt);
      screen.render();
      return new Promise(resolve => {
        function onKey(ch, key) {
          if (!textMode && key.name === 't') { panel.toggleChat(); return; }
          if (key.name === 'enter' || key.name === 'return') {
            screen.removeListener('keypress', onKey);
            promptBox.setContent(STATUS_BAR);
            screen.render();
            resolve(buf);
            return;
          }
          if (key.name === 'backspace') {
            if (buf.length > 0) buf = buf.slice(0, -1);
          } else if (ch && !key.ctrl && !key.meta && ch.length === 1 && ch.charCodeAt(0) >= 32) {
            buf += ch;
          }
          promptBox.setContent(prompt + buf);
          screen.render();
        }
        screen.on('keypress', onKey);
      });
    },

    waitKey(ms) {
      return new Promise(resolve => {
        let done = false;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          screen.removeListener('keypress', onKey);
          resolve(null);
        }, ms);
        function onKey(ch, key) {
          if (done) return;
          if (key.name === 't') { panel.toggleChat(); return; }
          done = true;
          clearTimeout(timer);
          screen.removeListener('keypress', onKey);
          resolve(key.name || ch || null);
        }
        screen.on('keypress', onKey);
      });
    },

    destroy() {
      screen.destroy();
    },
  };

  return panel;
}

module.exports = { createGamePanel };
