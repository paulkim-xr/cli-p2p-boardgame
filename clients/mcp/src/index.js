import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'module';
import { format } from 'util';

const require = createRequire(import.meta.url);

// Redirect console.log to stderr — MCP uses stdout for its wire protocol
console.log = (...a) => process.stderr.write(format(...a) + '\n');

const { Client }         = require('../../node/src/framework/net/client.js');
const { Host }           = require('../../node/src/framework/net/host.js');
const { Beacon }         = require('../../node/src/framework/lobby/discovery.js');
const { MsgType }        = require('../../node/src/framework/net/protocol.js');
const { loadGameClasses } = require('../../node/src/framework/lobby/session.js');

// ── session state ─────────────────────────────────────────────────────────
const gs = {
  phase: 'idle',    // idle | waiting | playing | done
  name: null,
  client: null,
  gameObj: null,
  players: [],
  gameName: null,
  chatLog: [],
  _waiters: [],     // resolved on GAME_START, STATE, or GAME_OVER
};

function onMsg(msg) {
  if (msg.type === MsgType.PLAYER_LIST) {
    gs.players = msg.players || [];
  } else if (msg.type === MsgType.GAME_START) {
    const classes = loadGameClasses();
    gs.gameName = msg.game;
    gs.phase = 'playing';
    if (classes[msg.game]) {
      gs.gameObj = new classes[msg.game]();
      gs.gameObj.start(msg.players || []);
    }
    gs._waiters.splice(0).forEach(r => r());
  } else if (msg.type === MsgType.STATE) {
    if (gs.gameObj) gs.gameObj.loadState(msg.data || {}, gs.name);
    gs._waiters.splice(0).forEach(r => r());
  } else if (msg.type === MsgType.CHAT) {
    gs.chatLog.push({ from: msg.from || '?', text: msg.text || '' });
  } else if (msg.type === MsgType.GAME_OVER) {
    gs.phase = 'done';
    gs._waiters.splice(0).forEach(r => r());
  }
}

function waitForChange(ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Timeout')), ms);
    gs._waiters.push(() => { clearTimeout(t); resolve(); });
  });
}

function stripAnsi(s) {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function describeState() {
  if (gs.phase === 'idle') return 'Not connected. Call join_game or host_game first.';
  if (!gs.gameObj || gs.phase === 'waiting') {
    return `Connected as "${gs.name}". Waiting for game to start. Players so far: ${gs.players.join(', ') || 'none yet'}`;
  }
  const [over, winner] = gs.gameObj.isOver();
  const board = stripAnsi(gs.gameObj.render(gs.name));
  const status = over
    ? `GAME OVER — ${winner ? winner + ' wins!' : 'draw'}`
    : `Turn: ${gs.gameObj.currentTurn()}${gs.gameObj.currentTurn() === gs.name ? ' ← you' : ''}`;
  return [`Game: ${gs.gameName}`, `Players: ${gs.players.join(' vs ')}`, '', board, '', status].join('\n');
}

function ok(text) { return { content: [{ type: 'text', text }] }; }

// ── tool definitions ──────────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'host_game',
    description: 'Host a new game. Another player (human CLI or another MCP agent) can then join. Supported games: nim, mancala, connect_four, chess, checkers, othello, go, hex, quoridor, battleship, mastermind.',
    inputSchema: {
      type: 'object',
      properties: {
        game:        { type: 'string', description: 'Game name (e.g. "nim", "chess")' },
        player_name: { type: 'string', description: 'Your player name' },
        port:        { type: 'number', description: 'Port to host on (default: 4242)' },
      },
      required: ['game', 'player_name'],
    },
  },
  {
    name: 'join_game',
    description: 'Join an existing game session hosted by a CLI player or another MCP agent.',
    inputSchema: {
      type: 'object',
      properties: {
        host:        { type: 'string', description: 'IP or hostname (e.g. "localhost")' },
        port:        { type: 'number', description: 'TCP port of the game host' },
        player_name: { type: 'string', description: 'Your player name' },
      },
      required: ['host', 'port', 'player_name'],
    },
  },
  {
    name: 'get_state',
    description: 'Get the current board, whose turn it is, and the move format for this game.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'make_move',
    description: 'Submit your move in the same string format a human would type. Examples: "0 3" (Nim: take 3 from pile 0), "4" (Mancala: pick pit 4), "e2 e4" (Chess). Returns the updated board.',
    inputSchema: {
      type: 'object',
      properties: {
        move: { type: 'string', description: 'Move string in the game\'s input format' },
      },
      required: ['move'],
    },
  },
  {
    name: 'wait_for_turn',
    description: 'Wait until it is your turn. Use after joining (to wait for game start + opponent\'s first move if needed) or after make_move (to wait for opponent\'s response). Times out after 60 seconds.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'send_chat',
    description: 'Send a chat message to the opponent.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Message to send' },
      },
      required: ['text'],
    },
  },
];

// ── request handlers ──────────────────────────────────────────────────────
const server = new Server(
  { name: 'boardgame-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  try {
    if (name === 'host_game') {
      if (gs.client) gs.client.disconnect();
      Object.assign(gs, { phase: 'waiting', name: args.player_name, client: null, gameObj: null, players: [], chatLog: [] });
      const port = args.port || 4242;
      const hostObj = new Host({ port, gameName: args.game, maxPlayers: 2 });
      await hostObj.start();
      new Beacon({ port, host: args.player_name, game: args.game, players: [], maxPlayers: 2 }).start();
      gs.client = new Client('127.0.0.1', port, args.player_name, onMsg);
      await gs.client.connect();
      return ok(`Hosting "${args.game}" on port ${port} as "${args.player_name}".\nAnother player can join at host=localhost port=${port}`);

    } else if (name === 'join_game') {
      if (gs.client) gs.client.disconnect();
      Object.assign(gs, { phase: 'waiting', name: args.player_name, client: null, gameObj: null, players: [], chatLog: [] });
      gs.client = new Client(args.host, args.port, args.player_name, onMsg);
      await gs.client.connect();
      await waitForChange(2000).catch(() => {});   // catch up on any immediate state
      return ok(`Joined ${args.host}:${args.port} as "${args.player_name}".\n${describeState()}`);

    } else if (name === 'get_state') {
      if (gs.phase === 'idle') throw new Error('Not connected. Call join_game or host_game first.');
      const help = gs.gameObj ? '\n\nMove format:\n' + gs.gameObj.getHelp().map(stripAnsi).join('\n') : '';
      return ok(describeState() + help);

    } else if (name === 'make_move') {
      if (gs.phase !== 'playing') throw new Error(`Cannot move — phase is "${gs.phase}". Wait for the game to start.`);
      if (!gs.gameObj) throw new Error('Game state not loaded. Try get_state first.');
      if (gs.gameObj.currentTurn() !== gs.name) throw new Error(`Not your turn — waiting for ${gs.gameObj.currentTurn()}.`);
      const parsed = gs.gameObj.parseInput(args.move);
      if (!parsed) throw new Error(`Invalid move "${args.move}".\n${gs.gameObj.getHelp().map(stripAnsi).join('\n')}`);
      const update = waitForChange(15000);
      gs.client.send({ type: MsgType.MOVE, from: gs.name, data: parsed });
      await update;
      return ok(describeState());

    } else if (name === 'wait_for_turn') {
      if (gs.phase === 'idle') throw new Error('Not connected. Call join_game or host_game first.');
      const deadline = Date.now() + 60000;
      while (true) {
        if (gs.gameObj) {
          const [over] = gs.gameObj.isOver();
          if (over || gs.gameObj.currentTurn() === gs.name) break;
        }
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('Timeout: opponent did not move within 60 seconds.');
        await waitForChange(remaining).catch(() => {});
      }
      return ok(describeState());

    } else if (name === 'send_chat') {
      if (!gs.client) throw new Error('Not connected.');
      gs.client.send({ type: MsgType.CHAT, from: gs.name, text: args.text });
      return ok('Message sent.');
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (e) {
    return { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
server.connect(transport).catch(e => { process.stderr.write(e.message + '\n'); process.exit(1); });
