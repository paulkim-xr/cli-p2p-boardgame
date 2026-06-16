'use strict';

const GAMES = {
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

function loadGameClasses() {
  return {
    nim:        require('../../games/nim').Nim,
    mastermind: require('../../games/mastermind').Mastermind,
    connect4:   require('../../games/connect_four').ConnectFour,
    othello:    require('../../games/othello').Othello,
    checkers:   require('../../games/checkers').Checkers,
    chess:      require('../../games/chess').Chess,
    battleship: require('../../games/battleship').Battleship,
    go:         require('../../games/go').Go,
    hex:        require('../../games/hex_game').Hex,
    quoridor:   require('../../games/quoridor').Quoridor,
    mancala:    require('../../games/mancala').Mancala,
  };
}

module.exports = { GAMES, loadGameClasses };
