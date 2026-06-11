export interface ChatEntry {
  from: string;
  text: string;
}

export class ChatLog {
  private _entries: ChatEntry[] = [];

  add(from: string, text: string): void {
    this._entries.push({ from, text });
    if (this._entries.length > 100) this._entries.shift();
  }

  recent(n: number): ChatEntry[] {
    return this._entries.slice(-n);
  }
}
