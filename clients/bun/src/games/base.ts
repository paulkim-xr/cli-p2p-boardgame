export interface BaseGame {
  players: string[];
  _over: boolean;
  _winner: string | null;

  start(players: string[]): void;
  validateMove(playerId: string, moveData: Record<string, unknown>): boolean;
  applyMove(playerId: string, moveData: Record<string, unknown>): void;
  render(perspective?: string): string;
  getState(perspective?: string): Record<string, unknown>;
  loadState(data: Record<string, unknown>, perspective?: string): void;
  isOver(): [boolean, string | null];
  currentTurn(): string | null;
  parseInput(raw: string): Record<string, unknown> | null;
  getHelp(): string[];
}

export abstract class BaseGameImpl implements BaseGame {
  players: string[] = [];
  _over = false;
  _winner: string | null = null;

  start(players: string[]): void {
    this.players = players;
    this._over = false;
    this._winner = null;
  }

  abstract validateMove(playerId: string, moveData: Record<string, unknown>): boolean;
  abstract applyMove(playerId: string, moveData: Record<string, unknown>): void;
  abstract render(perspective?: string): string;
  abstract getState(perspective?: string): Record<string, unknown>;
  abstract isOver(): [boolean, string | null];
  abstract currentTurn(): string | null;
  abstract parseInput(raw: string): Record<string, unknown> | null;
  abstract getHelp(): string[];

  // Default no-op; override in games that support full state sync
  loadState(_data: Record<string, unknown>, _perspective?: string): void {}
}
