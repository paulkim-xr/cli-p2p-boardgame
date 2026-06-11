export abstract class BaseGame {
  players: string[] = [];

  start(players: string[]): void { this.players = players; }
  abstract validateMove(playerId: string, moveData: Record<string, unknown>): boolean;
  abstract applyMove(playerId: string, moveData: Record<string, unknown>): void;
  abstract render(perspective?: string): string;
  abstract getState(perspective: string): unknown;
  abstract isOver(): [boolean, string | null];
  abstract currentTurn(): string | null;
}
