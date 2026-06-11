'use strict';
const { header, hr, BOLD, RESET, DIM, GREEN } = require('./terminal');
const { GAMES } = require('../lobby/session');
const { t } = require('../i18n');

function showLobby(sessions, myName, chatLog) {
  header(t('lobby.title'));
  console.log();
  if (sessions.length) {
    process.stdout.write(BOLD + '  ' + t('lobby.sessions_header') + RESET + '\n');
    sessions.forEach((s, i) => {
      const playerStr = (s.players || []).join(', ');
      console.log('  ' + t('lobby.session_row', { i: i + 1, game: s.game, host: s.host, players: playerStr, port: s.port }));
    });
  } else {
    process.stdout.write(DIM + '  ' + t('lobby.no_sessions') + RESET + '\n');
  }
  console.log();
  hr();
  if (chatLog.length) {
    process.stdout.write(BOLD + '  ' + t('lobby.chat_header') + RESET + '\n');
    for (const e of chatLog.slice(-5)) {
      console.log(`  ${DIM}${e.from}${RESET}: ${e.text}`);
    }
  }
  console.log();
  console.log('  ' + t('lobby.menu'));
  console.log();
}

async function promptHost(myName, { question }) {
  console.log();
  process.stdout.write(BOLD + t('host.games_header') + RESET + '\n');
  const gameList = Object.keys(GAMES).sort();
  gameList.forEach((g, i) => {
    const info = GAMES[g];
    console.log(`  ${DIM}[${i + 1}]${RESET} ${info.name}  (${info.min}~${info.max})`);
  });
  const choice = await question(t('host.pick_game'));
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= gameList.length) return [null, null];
  const game = gameList[idx];
  const maxP = GAMES[game].max || 2;
  const raw = await question(t('host.max_players', { max: maxP }));
  let n = parseInt(raw, 10);
  if (isNaN(n)) n = 2;
  n = Math.min(Math.max(2, n), maxP);
  return [game, n];
}

async function promptJoin(sessions, { question }) {
  const raw = await question(t('host.join_session'));
  const idx = parseInt(raw, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= sessions.length) return null;
  return sessions[idx];
}

async function promptChat(myName, { question }) {
  const msg = await question(t('host.chat_prompt', { name: myName }));
  return msg.trim() || null;
}

function renderGame(gameObj, players, chatLog) {
  header(t('game.header'));
  console.log();
  console.log(gameObj.render());
  console.log();
  hr();
  if (chatLog.length) {
    process.stdout.write(BOLD + '  ' + t('game.chat_header') + RESET + '\n');
    for (const e of chatLog.slice(-3)) {
      console.log(`  ${DIM}${e.from}${RESET}: ${e.text}`);
    }
  }
  console.log();
  console.log(`  ${GREEN}${t('game.your_turn')}${RESET}   ${DIM}${t('game.chat_hint')}${RESET}`);
  console.log();
}

module.exports = { showLobby, promptHost, promptJoin, promptChat, renderGame };
