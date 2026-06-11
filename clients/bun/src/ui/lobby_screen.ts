import { header, hr, BOLD, RESET, DIM, GREEN } from './terminal';
import { GAMES } from '../lobby/session';
import { t } from '../i18n';
import type { SessionInfo } from '../lobby/discovery';
import type { ChatEntry } from '../chat';
import type { BaseGame } from '../games/base';

export function showLobby(sessions: SessionInfo[], _myName: string, chatLog: ChatEntry[]): void {
  header(t('lobby.title'));
  console.log();
  if (sessions.length) {
    process.stdout.write(BOLD + '  ' + t('lobby.sessions_header') + RESET + '\n');
    sessions.forEach((s, i) => {
      const playerStr = (s.players ?? []).join(', ');
      console.log('  ' + t('lobby.session_row', { i: i + 1, game: s.game, host: s.host, players: playerStr, port: s.port }));
    });
  } else {
    process.stdout.write(DIM + '  ' + t('lobby.no_sessions') + RESET + '\n');
  }
  console.log();
  hr();
  if (chatLog.length) {
    process.stdout.write(BOLD + '  ' + t('lobby.chat_header') + RESET + '\n');
    for (const e of chatLog.slice(-5)) console.log(`  ${DIM}${e.from}${RESET}: ${e.text}`);
  }
  console.log();
  console.log('  ' + t('lobby.menu'));
  console.log();
}

export async function promptHost(_myName: string, opts: { question: (p: string) => Promise<string> }): Promise<[string | null, number]> {
  console.log();
  process.stdout.write(BOLD + t('host.games_header') + RESET + '\n');
  const gameList = Object.keys(GAMES).sort();
  gameList.forEach((g, i) => {
    const info = GAMES[g];
    console.log(`  ${DIM}[${i + 1}]${RESET} ${info.name}  (${info.min}~${info.max})`);
  });
  const choice = await opts.question(t('host.pick_game'));
  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= gameList.length) return [null, 0];
  const game = gameList[idx];
  const maxP = GAMES[game].max ?? 2;
  const raw = await opts.question(t('host.max_players', { max: maxP }));
  let n = parseInt(raw, 10);
  if (isNaN(n)) n = 2;
  n = Math.min(Math.max(2, n), maxP);
  return [game, n];
}

export async function promptJoin(sessions: SessionInfo[], opts: { question: (p: string) => Promise<string> }): Promise<SessionInfo | null> {
  const raw = await opts.question(t('host.join_session'));
  const idx = parseInt(raw, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= sessions.length) return null;
  return sessions[idx];
}

export async function promptChat(myName: string, opts: { question: (p: string) => Promise<string> }): Promise<string | null> {
  const msg = await opts.question(t('host.chat_prompt', { name: myName }));
  return msg.trim() || null;
}

export function renderGame(gameObj: BaseGame, _players: string[], chatLog: ChatEntry[]): void {
  header(t('game.header'));
  console.log();
  console.log(gameObj.render());
  console.log();
  hr();
  if (chatLog.length) {
    process.stdout.write(BOLD + '  ' + t('game.chat_header') + RESET + '\n');
    for (const e of chatLog.slice(-3)) console.log(`  ${DIM}${e.from}${RESET}: ${e.text}`);
  }
  console.log();
  console.log(`  ${GREEN}${t('game.your_turn')}${RESET}   ${DIM}${t('game.chat_hint')}${RESET}`);
  console.log();
}
