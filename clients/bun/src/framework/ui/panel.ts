import blessed from 'blessed';

const STATUS_BAR = ' [t] chat panel  [c] msg  [?] help  [q] quit';

export interface GamePanel {
  toggleChat(): void;
  setContent(text: string): void;
  setPrompt(text?: string): void;
  pushChat(from: string, text: string): void;
  readInput(prompt: string, textMode?: boolean): Promise<string>;
  waitKey(ms: number): Promise<string | null>;
  destroy(): void;
}

export function createGamePanel(): GamePanel {
  const screen = blessed.screen({ smartCSR: true, fullUnicode: true });
  let chatVisible = false;

  const gameBox = blessed.box({
    top: 0, left: 0, width: '100%', bottom: 1,
    scrollable: true, alwaysScroll: true,
  } as any);

  const chatBox = blessed.log({
    top: 0, right: 0, width: '35%', bottom: 1,
    label: ' Chat ',
    border: { type: 'line' },
    style: { border: { fg: 'yellow' } },
    scrollable: true, alwaysScroll: true,
    hidden: true,
  } as any);

  const promptBox = blessed.box({
    bottom: 0, left: 0, width: '100%', height: 1,
    content: STATUS_BAR,
    style: { fg: 'black', bg: 'cyan' },
  } as any);

  screen.append(gameBox);
  screen.append(chatBox as any);
  screen.append(promptBox);
  screen.render();

  const panel: GamePanel = {
    toggleChat() {
      chatVisible = !chatVisible;
      if (chatVisible) { (chatBox as any).show(); (gameBox as any).width = '65%'; }
      else { (chatBox as any).hide(); (gameBox as any).width = '100%'; }
      screen.render();
    },

    setContent(text: string) {
      gameBox.setContent(text);
      screen.render();
    },

    setPrompt(text?: string) {
      promptBox.setContent(text || STATUS_BAR);
      screen.render();
    },

    pushChat(from: string, text: string) {
      (chatBox as any).pushLine(`${from}: ${text}`);
      screen.render();
    },

    readInput(prompt: string, textMode = false): Promise<string> {
      let buf = '';
      promptBox.setContent(prompt);
      screen.render();
      return new Promise(resolve => {
        function onKey(ch: string, key: any) {
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
        screen.on('keypress', onKey as any);
      });
    },

    waitKey(ms: number): Promise<string | null> {
      return new Promise(resolve => {
        let done = false;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          screen.removeListener('keypress', onKey);
          resolve(null);
        }, ms);
        function onKey(ch: string, key: any) {
          if (done) return;
          if (key.name === 't') { panel.toggleChat(); return; }
          done = true;
          clearTimeout(timer);
          screen.removeListener('keypress', onKey);
          resolve(key.name || ch || null);
        }
        screen.on('keypress', onKey as any);
      });
    },

    destroy() {
      screen.destroy();
    },
  };

  return panel;
}
