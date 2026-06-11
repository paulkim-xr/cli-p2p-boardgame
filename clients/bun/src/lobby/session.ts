import type { BaseGame } from '../games/base';
import { Nim } from '../games/nim';
import { Mastermind } from '../games/mastermind';
import { ConnectFour } from '../games/connect_four';
import { Othello } from '../games/othello';
import { Checkers } from '../games/checkers';
import { Chess } from '../games/chess';
import { Battleship } from '../games/battleship';
import { Go } from '../games/go';
import { Hex } from '../games/hex_game';
import { Quoridor } from '../games/quoridor';
import { Mancala } from '../games/mancala';

export interface GameInfo {
  name: string;
  min: number;
  max: number;
}

export const GAMES: Record<string, GameInfo> = {
  nim:        { name: 'Nim',          min: 2, max: 6 },
  mastermind: { name: 'Mastermind',   min: 2, max: 2 },
  connect4:   { name: 'Connect Four', min: 2, max: 2 },
  othello:    { name: 'Othello',      min: 2, max: 2 },
  checkers:   { name: 'Checkers',     min: 2, max: 2 },
  chess:      { name: 'Chess',        min: 2, max: 2 },
  battleship: { name: 'Battleship',   min: 2, max: 2 },
  go:         { name: 'Go',           min: 2, max: 2 },
  hex:        { name: 'Hex',          min: 2, max: 2 },
  quoridor:   { name: 'Quoridor',     min: 2, max: 4 },
  mancala:    { name: 'Mancala',      min: 2, max: 4 },
};

export type GameConstructor = new () => BaseGame;

export function loadGameClasses(): Record<string, GameConstructor> {
  return {
    nim:        Nim,
    mastermind: Mastermind,
    connect4:   ConnectFour,
    othello:    Othello,
    checkers:   Checkers,
    chess:      Chess,
    battleship: Battleship,
    go:         Go,
    hex:        Hex,
    quoridor:   Quoridor,
    mancala:    Mancala,
  };
}
