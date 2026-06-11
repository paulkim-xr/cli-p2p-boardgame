'use strict';

const MsgType = {
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  MOVE: 'MOVE',
  CHAT: 'CHAT',
  STATE: 'STATE',
  PLAYER_LIST: 'PLAYER_LIST',
  GAME_START: 'GAME_START',
  GAME_OVER: 'GAME_OVER',
  ERROR: 'ERROR',
};

function encode(msg) {
  return JSON.stringify(msg) + '\n';
}

function decode(line) {
  return JSON.parse(line.trim());
}

module.exports = { MsgType, encode, decode };
