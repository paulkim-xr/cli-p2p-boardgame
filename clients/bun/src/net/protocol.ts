export const MsgType = {
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  MOVE: 'MOVE',
  CHAT: 'CHAT',
  STATE: 'STATE',
  PLAYER_LIST: 'PLAYER_LIST',
  GAME_START: 'GAME_START',
  GAME_OVER: 'GAME_OVER',
  ERROR: 'ERROR',
} as const;

export type MsgTypeName = typeof MsgType[keyof typeof MsgType];

export interface WireMsg {
  type: MsgTypeName;
  from?: string;
  text?: string;
  data?: Record<string, unknown>;
  players?: string[];
  game?: string;
  winner?: string | null;
  message?: string;
  [key: string]: unknown;
}

export function encode(msg: WireMsg): string {
  return JSON.stringify(msg) + '\n';
}

export function decode(line: string): WireMsg {
  return JSON.parse(line.trim()) as WireMsg;
}
