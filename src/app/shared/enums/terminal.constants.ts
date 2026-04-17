import { Command } from '../models';

export const TERMINAL_COMMANDS: Command[] = [
  { key: 'help', description: 'show available commands' },
  { key: 'whoami', description: 'who is Dayana?' },
  {
    key: 'ls projects',
    description: 'list all projects',
    aliases: ['ls projects'],
  },
  {
    key: 'ls stack',
    description: 'tech stack & skill levels',
    aliases: ['cat stack'],
  },
  {
    key: 'git log',
    description: 'work experience timeline',
    aliases: ['git log --oneline'],
  },
  {
    key: 'cat <company>',
    description: 'full details for a work experience  (e.g. cat tmrnd)',
  },
  { key: 'cat education', description: 'academic background' },
  { key: 'cat hobbies', description: 'life outside the terminal' },
  {
    key: 'cat contact',
    description: 'get in touch',
    aliases: ['curl contact'],
  },
  { key: 'docker ps', description: 'running services on my server' },
  { key: 'curl /api/health', description: 'live health check of my API' },
  { key: 'cat pipeline', description: 'CI/CD pipeline overview' },
  { key: 'pdf resume', description: 'download my resume' },
  { key: 'clear', description: 'clear terminal' },
];

export const CAT_ALIASES: Record<string, number> = {
  tmrnd: 1,
  epnox: 2,
};

// ── Resume ────────────────────────────────────────────────────────────────────
export const RESUME = {
  path:     'assets/Dayana Athira - Backend Software Engineer.pdf',
  filename: 'Dayana Athira - Backend Software Engineer.pdf',
} as const;

// ── Hidden easter-egg directory ───────────────────────────────────────────────
export const HIDDEN_DIR = '.hidden' as const;

// ── Wordle config ─────────────────────────────────────────────────────────────
export const WORDLE_CONFIG = {
  maxTries:   6,
  wordLength: 5,
  colors: {
    green:  { bg: '#538d4e', fg: '#fff' },
    yellow: { bg: '#b59f3b', fg: '#fff' },
    grey:   { bg: '#3a3a3c', fg: '#aaa' },
  },
} as const;

// ── Docker containers ─────────────────────────────────────────────────────────
export interface DockerContainer {
  id:    string;
  image: string;
  days:  number;
  hrs:   number;
  ports: string;
  name:  string;
}

export const DOCKER_CONTAINERS: DockerContainer[] = [
  { id: 'a1f3c92d', image: 'nginx:alpine',      days: 14, hrs: 3, ports: '0.0.0.0:80->80, 443->443',  name: 'nginx-proxy'  },
  { id: 'b2e4d83c', image: 'node:20-alpine',     days: 14, hrs: 3, ports: '0.0.0.0:3000->3000',        name: 'arkspace-api' },
  { id: 'c3f5e74b', image: 'postgres:16-alpine', days: 14, hrs: 3, ports: '127.0.0.1:5432->5432',      name: 'postgres-db'  },
];

// ── CI/CD pipeline stages ─────────────────────────────────────────────────────
export interface PipelineStage {
  name:   string;
  detail: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { name: 'lint',         detail: 'eslint + prettier check'                    },
  { name: 'test',         detail: 'jest unit tests'                            },
  { name: 'build',        detail: 'nest build → dist/'                         },
  { name: 'docker build', detail: 'build image · tag :latest + :sha'           },
  { name: 'docker push',  detail: 'push to GitHub Container Registry (ghcr.io)'},
  { name: 'deploy',       detail: 'SSH → docker pull + docker compose up -d'   },
];

// ── Virtual filesystem (ls -a) ────────────────────────────────────────────────
export interface FsEntry {
  perms: string;
  name:  string;
  cls:   string;
}

export const FILESYSTEM_ENTRIES: FsEntry[] = [
  { perms: 'drwxr-xr-x', name: 'portfolio/',  cls: 'wht' },
  { perms: 'drwxr-xr-x', name: 'projects/',   cls: 'wht' },
  { perms: 'drwxr-xr-x', name: 'experience/', cls: 'wht' },
  { perms: 'drwxr-xr-x', name: 'stack/',      cls: 'wht' },
  { perms: 'drwx------', name: '.hidden/',     cls: 'dim' },
  { perms: '-rw-r--r--', name: 'resume.pdf',  cls: 'yel' },
  { perms: '-rw-r--r--', name: 'hobbies.txt', cls: 'wht' },
  { perms: '-rwxr-xr-x', name: 'life.sh',     cls: 'grn' },
];

export const WORDLE_WORDS: string[] = [
  // tech-flavoured
  'query', 'stack', 'fetch', 'build', 'debug', 'login', 'merge', 'patch',
  'proxy', 'reset', 'route', 'scope', 'token', 'cache', 'crash', 'error',
  'index', 'model', 'input', 'class', 'array', 'watch', 'cloud', 'shell',
  'stage', 'local', 'pixel', 'swipe', 'bytes', 'macro', 'mutex', 'queue',
  // common
  'about', 'actor', 'after', 'again', 'alert', 'angle', 'apple', 'arena',
  'beach', 'black', 'blade', 'blast', 'blend', 'block', 'bloom', 'board',
  'brain', 'brand', 'brave', 'bread', 'brick', 'brief', 'cabin', 'carry',
  'cause', 'chain', 'chaos', 'charm', 'chase', 'cheap', 'check', 'chest',
  'chief', 'child', 'clean', 'clear', 'climb', 'clock', 'close', 'coast',
  'count', 'court', 'cover', 'craft', 'crane', 'crazy', 'cream', 'crime',
  'cross', 'crowd', 'crown', 'crush', 'dance', 'depth', 'drift', 'drink',
  'drive', 'earth', 'eight', 'empty', 'enemy', 'enjoy', 'equal', 'event',
  'exact', 'faith', 'false', 'fancy', 'fault', 'feast', 'fence', 'fever',
  'field', 'fight', 'final', 'first', 'flame', 'flash', 'fleet', 'flesh',
  'float', 'flood', 'floor', 'focus', 'force', 'forge', 'found', 'frame',
  'fresh', 'front', 'frost', 'fruit', 'giant', 'given', 'glass', 'globe',
  'grace', 'grade', 'grain', 'grant', 'graph', 'grass', 'grave', 'great',
  'green', 'grief', 'grind', 'group', 'grove', 'grown', 'guard', 'guess',
  'guide', 'guilt', 'heart', 'heavy', 'honey', 'honor', 'house', 'human',
  'hurry', 'ideal', 'image', 'inner', 'issue', 'judge', 'juice', 'karma',
  'knife', 'knock', 'known', 'label', 'laser', 'later', 'laugh', 'layer',
  'learn', 'least', 'leave', 'level', 'light', 'limit', 'logic', 'lower',
  'lucky', 'lunch', 'magic', 'major', 'maker', 'march', 'match', 'mercy',
  'metal', 'micro', 'might', 'minor', 'money', 'month', 'moral', 'motor',
  'mount', 'mouse', 'music', 'nerve', 'never', 'nexus', 'night', 'ninja',
  'noise', 'north', 'novel', 'nurse', 'occur', 'ocean', 'offer', 'often',
  'orbit', 'order', 'outer', 'ozone', 'paint', 'panic', 'paper', 'party',
  'pasta', 'pause', 'peace', 'pearl', 'penny', 'phase', 'phone', 'photo',
  'piano', 'pilot', 'pizza', 'place', 'plain', 'plant', 'plate', 'point',
  'polar', 'pound', 'power', 'press', 'price', 'pride', 'prime', 'prize',
  'prose', 'proud', 'prove', 'pulse', 'queen', 'quest', 'quick', 'quiet',
  'radar', 'radio', 'range', 'rapid', 'reach', 'realm', 'rebel', 'relay',
  'reply', 'rider', 'right', 'river', 'robot', 'rough', 'round', 'royal',
  'ruler', 'sadly', 'saint', 'sauce', 'scale', 'scene', 'score', 'sense',
  'serve', 'setup', 'seven', 'shade', 'shake', 'shape', 'share', 'sharp',
  'shelf', 'shift', 'shirt', 'shock', 'shore', 'short', 'shout', 'sight',
  'since', 'skill', 'sleep', 'slice', 'slide', 'slope', 'smart', 'smile',
  'smoke', 'snake', 'solar', 'solve', 'sorry', 'south', 'space', 'spark',
  'speak', 'spell', 'spend', 'spike', 'split', 'spoke', 'spoon', 'sport',
  'stake', 'stand', 'stark', 'state', 'steel', 'steep', 'stern', 'stick',
  'still', 'stone', 'stood', 'store', 'storm', 'story', 'strip', 'stuck',
  'study', 'style', 'sugar', 'sweet', 'swift', 'sword', 'table', 'taste',
  'teach', 'theme', 'thick', 'thing', 'think', 'third', 'those', 'three',
  'throw', 'tiger', 'tight', 'timer', 'tired', 'title', 'today', 'topic',
  'total', 'touch', 'tough', 'tower', 'toxic', 'trace', 'track', 'trade',
  'trail', 'train', 'trait', 'treat', 'trend', 'trial', 'tribe', 'trick',
  'truck', 'truly', 'trust', 'truth', 'twice', 'twist', 'ultra', 'under',
  'union', 'unity', 'until', 'upper', 'urban', 'usage', 'valid', 'value',
  'vapor', 'vault', 'verse', 'video', 'vigor', 'viral', 'virus', 'visit',
  'vital', 'vivid', 'voice', 'voter', 'watch', 'water', 'weave', 'weird',
  'where', 'which', 'while', 'white', 'whole', 'whose', 'woman', 'world',
  'worry', 'worst', 'worth', 'would', 'wound', 'write', 'wrote', 'yacht',
  'yield', 'young', 'youth', 'zebra',
];
