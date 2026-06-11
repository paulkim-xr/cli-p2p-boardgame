'use strict';

class ChatLog {
  constructor() {
    this._entries = [];
  }

  add(from, text) {
    this._entries.push({ from, text });
    if (this._entries.length > 100) this._entries.shift();
  }

  recent(n) {
    return this._entries.slice(-n);
  }
}

module.exports = { ChatLog };
