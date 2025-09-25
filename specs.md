0) MVP Scope (what ships)

Play loop: Lobby → Night 1 → Day 1 → (Nominate/Vote/Execute) → Night 2 → … → End.

Roles: A small, fixed set from Trouble Brewing (e.g., Washerwoman, Investigator, Chef, Empath, Slayer, Undertaker, Poisoner, Baron, Scarlet Woman, Imp). No custom scripting yet.

Secrets preserved: Each player only sees their own role; storyteller sees all.

Nominations & votes: Single open nomination at a time; simple majority rule (≥ half of alive players).

Whispers: Optional; keep public chat only in MVP (DMs are stretch).

Reconnect: Fast state resync.

Manual overrides: Storyteller can fix anything.

1) High-Level Architecture

Server: Node.js + TypeScript (Fastify/Express) or FastAPI; WebSockets for real-time.

One GameActor per game_id: serializes all mutations, emits ordered events (seq).

PostgreSQL for persistence.

Auth: short-lived JWT (role=storyteller|player|observer, game_id, player_id).

2) State Machine (authoritative)
LOBBY
  └─ start_game → NIGHT(1)
NIGHT(n)
  └─ open_day → DAY(n)
DAY(n)
  ├─ nominate / vote / close_nomination …
  └─ end_day → (execute if leader) → CHECK_WIN(n)
CHECK_WIN(n)
  ├─ if win → ENDED
  └─ else → NIGHT(n+1)
ENDED

3) Data Model (PostgreSQL)

games

game_id (PK, uuid)

storyteller_id (uuid)

phase ENUM('LOBBY','NIGHT','DAY','PENDING_EXECUTION','CHECK_WIN','ENDED')

day_number INT NOT NULL DEFAULT 0

config JSONB (e.g., voting rules, timers)

created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ

players

player_id (PK, uuid)

game_id (FK), seat INT, display_name TEXT

alive BOOL DEFAULT TRUE

vote_token_used BOOL DEFAULT FALSE // 1 extra life vote after death is NOT in MVP; keep simple: dead=no vote

connected BOOL DEFAULT FALSE

unique (game_id, seat)

role_assignments

id (PK, uuid), game_id (FK), player_id (FK)

role_code TEXT, alignment ENUM('GOOD','EVIL')

revealed BOOL DEFAULT FALSE

nominations

id (PK, uuid), game_id (FK), day_number INT

nominator_id (FK), nominee_id (FK)

open BOOL, final_yes INT, final_no INT, created_at

votes

id (PK, uuid), game_id (FK), nomination_id (FK)

voter_id (FK), vote BOOL, created_at

events (append-only for audit/resync)

seq BIGSERIAL (PK), game_id (FK)

evt_type TEXT, payload JSONB, created_at

commands (for idempotency)

request_id (PK, uuid), game_id, actor_id, cmd_type TEXT, payload JSONB, status TEXT, created_at

Secrets live in role_assignments. Public state is derived from games, players, nominations, votes.

4) REST Endpoints (thin, mostly “session & fetch”)

Base URL: /api/v1

Auth & Session

POST /auth/join

Body: { gameCode: string, displayName?: string, role: 'player'|'storyteller'|'observer' }

Resp: { jwt: string, game_id: string, player_id?: string }

POST /auth/refresh

Body: { jwt: string }

Resp: { jwt: string }

Game Lifecycle (Storyteller)

POST /games (create)

Body: { script: 'trouble_brewing', seats: number, config?: {...} }

Resp: { game_id, gameCode }

POST /games/:gameId/start

Body: { assignments: Array<{player_id, role_code}> }

Resp: { phase:'NIGHT', day_number:1 }

POST /games/:gameId/open-day

Resp: { phase:'DAY', day_number }

POST /games/:gameId/end-day

Body: { nomination_id?: string } // if provided and qualifies → execute

Resp: { executed_player_id?: string, next_phase:'CHECK_WIN' }

POST /games/:gameId/open-night

Resp: { phase:'NIGHT', day_number: next }

POST /games/:gameId/override

Body: { evt_type: string, payload: any }

Resp: { ok: true }

Lobby & Players

GET /games/:gameId/public-state

Resp: { phase, day_number, players:[{player_id, seat, name, alive}], nominations_summary, config }

POST /games/:gameId/seat (join seat as player)

Body: { display_name: string }

Resp: { player_id, seat }

GET /games/:gameId/me (private)

Auth: JWT

Resp: { player_id, role_card?: {role_code, text}, private_messages:[] } // role only to owner & ST

GET /games/:gameId/role-card/:playerId (Storyteller only)

Resp: { role_code, alignment, text }

Day Actions

POST /games/:gameId/nominate

Body: { nominee_id: string }

Resp: { nomination_id }

POST /games/:gameId/vote

Body: { nomination_id: string, vote: boolean }

Resp: { ok: true }

POST /games/:gameId/close-nomination (ST)

Resp: { nomination_id, yes: number, no: number, qualifies: boolean }

Night Actions (MVP: prompt & submit)

GET /games/:gameId/night-prompts (private)

Resp: e.g., { prompts: [{ prompt_id, prompt:'Choose a player', type:'select_player', options:[player_ids] }] }

POST /games/:gameId/night-action

Body: { prompt_id, target_id?: string, choice?: string }

Resp: { accepted: true }

All mutating endpoints accept an optional X-Request-Id header for idempotency.

5) WebSocket Protocol

Path: wss://…/ws?token=<JWT>&game_id=<id>

Client → Server (Commands)
// Envelope
{
  "request_id": "uuid",
  "cmd": "NOMINATE" | "CAST_VOTE" | "SUBMIT_NIGHT_ACTION" |
         "OPEN_DAY" | "END_DAY" | "OPEN_NIGHT" | "OVERRIDE",
  "payload": { /* command-specific */ }
}


Examples

NOMINATE: { nominee_id }

CAST_VOTE: { nomination_id, vote: true|false }

SUBMIT_NIGHT_ACTION: { prompt_id, target_id }

Server → Client (Events)
{
  "seq": 123,
  "evt": "STATE_SNAPSHOT" | "PHASE_CHANGED" | "PLAYER_JOINED" |
         "ROLES_ASSIGNED_ST" | "PRIVATE_ROLE" |
         "NOMINATION_OPENED" | "VOTE_CAST" | "NOMINATION_CLOSED" |
         "EXECUTION" | "PLAYER_DIED" | "CHECK_WIN" | "GAME_ENDED" |
         "PRIVATE_PROMPT" | "PRIVATE_RESULT" |
         "ERROR",
  "payload": { /* event-specific */ },
  "ts": "2025-09-25T17:05:12Z"
}


Initial Sync

On connect: server sends STATE_SNAPSHOT { publicState, last_seq }.

Client replies with ACK { last_seen_seq } (optional).

Server streams events with seq > last_seen_seq.

Audience filtering

PRIVATE_ROLE, PRIVATE_PROMPT, PRIVATE_RESULT only to the owning player and storyteller.

6) Business Rules (MVP)

Majority: yes >= ceil(alive / 2)

Tie: no execution (MVP). Configurable later.

One open nomination at a time; votes are mutable until close-nomination.

Dead players: cannot vote (keep it simple in MVP).

Night order: fixed priority list; if a player doesn’t respond by deadline → auto “no action”.

Execution: sets alive=false, closes day, proceeds to CHECK_WIN.

Win Check (simplified)

Evil wins if evilAlive >= goodAlive or if Imp is the only remaining evil? (Simplify to parity: if evilAlive >= goodAlive).

Good wins if Imp dies (execution or night death) and no Scarlet Woman takeover in MVP (or handle simply via role rule inside Night/Exec hooks if included).

7) Validation & Errors

Phase guard: disallow NOMINATE during NIGHT, etc.

Auth guard: storyteller-only actions.

Integrity: nominee must be alive; voter must be alive; one nomination open.

Errors (WS or REST):

{ "error": { "code": "ERR_INVALID_PHASE", "message": "Cannot NOMINATE during NIGHT" } }
{ "error": { "code": "ERR_FORBIDDEN", "message": "Storyteller action only" } }
{ "error": { "code": "ERR_BAD_TARGET", "message": "Nominee must be alive" } }
{ "error": { "code": "ERR_CONFLICT", "message": "Another nomination is open" } }

8) Security & Idempotency

JWT: sub, game_id, role, player_id?, exp ~ 2h

Idempotency: X-Request-Id (REST) / request_id (WS) → persisted in commands.

Server authoritative: all computed on server; clients are dumb displays.

9) UI (React) — Component Breakdown & Props
Layout

<GameShell>

Regions: Header (phase/timer), Main (board), RightSidebar (storyteller tools), Bottom (chat/actions)

Props: { me, role, phase, dayNumber, timer, onOpenDay, onOpenNight, onEndDay }

Public Board

<PlayersGrid>

Shows seat, name, alive/dead, vote indicator

Props: { players: PlayerPublic[], onNominate?: (playerId)=>void, canNominate: boolean }

<NominationBanner>

Shows current nomination, counts, call-to-vote CTA

Props: { openNomination?: { id, nominator, nominee }, yes, no, onVote: (vote)=>void, canVote: boolean }

<PhaseIndicator>

Props: { phase:'LOBBY'|'NIGHT'|'DAY'|'ENDED', dayNumber:number, deadline?:Date }

Chat (MVP: public only)

<PublicChatPanel>

Props: { messages: ChatMsg[], onSend: (text)=>void }

Player Private

<RoleCardPrivate>

Props: { role?: { code, name, alignment, text } }

<NightPromptModal>

Props: { open:boolean, prompt?: { prompt_id, text, type, options }, onSubmit:(payload)=>void, onSkip:()=>void }

Storyteller Tools (RightSidebar)

<STDashboard>

Sections:

PlayersTable (private info): { players:[{player_id, seat, name, alive, role_code?}], onKill, onRevive }

PhaseControls: { phase, onStart, onOpenDay, onEndDay, onOpenNight }

RoleAssignmentsPanel (only in LOBBY): { seats, onAssign(role_code, seat) }

NominationControls: { currentNomination, onCloseNomination }

OverridesPanel: { onEmit(evt_type, payload) }

Reconnect/Bootstrap

<StateHydrator>

Connects WS, requests snapshot, streams events; stores in Zustand/Redux.

Types (front-end)
type PlayerPublic = { player_id:string; seat:number; name:string; alive:boolean };
type Phase = 'LOBBY'|'NIGHT'|'DAY'|'PENDING_EXECUTION'|'CHECK_WIN'|'ENDED';

10) Example Flows (Step-by-Step)
A) Start Game (ST)

ST creates game (POST /games).

Players join seats (POST /games/:id/seat).

ST assigns roles (POST /games/:id/start { assignments }).

Server:

sets phase=NIGHT, day_number=1

emits PHASE_CHANGED, PRIVATE_ROLE to each player, ROLES_ASSIGNED_ST to ST.

B) Night

Server (RoleEngine) emits PRIVATE_PROMPT by role priority.

Players submit SUBMIT_NIGHT_ACTION (WS or REST).

On OPEN_DAY, server resolves queued effects → emits PRIVATE_RESULT and PLAYER_DIED etc.

Broadcast PHASE_CHANGED { phase:'DAY' }.

C) Day → Nomination → Vote

Any alive player hits “Nominate” on a target → NOMINATE.

Server opens nomination → NOMINATION_OPENED.

Players cast votes → stream VOTE_CAST.

ST closes nomination → NOMINATION_CLOSED { yes, no, qualifies }.

Track top qualifying nomination of the day (server).

ST clicks “End Day” → END_DAY → if leader qualifies → EXECUTION (and death).

CHECK_WIN → either GAME_ENDED or PHASE_CHANGED (NIGHT n+1).

11) Server Modules (minimal responsibilities)

GameRegistry: maps game_id → owning process/actor.

GameActor: owns in-memory state; validates, mutates, appends events, broadcasts.

RoleEngine: role metadata {priority, promptType, validate(), resolve()}.

Transport: WS rooms, REST handlers, auth middleware.

Persistence: repositories for tables + appendEvent().

12) Config Defaults (MVP)
{
  "voting": { "majorityRule": ">=halfAlive", "tieBreak": "no-exec" },
  "timers": { "nightSeconds": 120, "daySeconds": 480, "nominationSeconds": 60 },
  "reconnect": { "snapshotCutoff": 200 } // if gap > 200 events, send fresh snapshot
}

13) Testing Checklist (MVP)

Can’t nominate at NIGHT.

Only one active nomination.

Only alive players can nominate/vote.

Majority rule correct for odd/even alive counts.

Execution flips alive=false, disallows further votes from that player.

Reconnect: client sees same seq, receives deltas.

Private prompts/results are visible only to owner and ST.

14) Minimal RoleEngine (MVP subset)

Priority order (low to high, example):

Poisoner

Chef / Investigator / Empath (info roles)

Undertaker (resolves on night after execution)

Slayer (day ability; treat as command with once-per-game flag)

Keep night prompts simple (“pick a player”), store once-per-night flags, and resolve with deterministic rules first; add redirections/blocks later.

15) Deployment & Ops

Process model: 1 + Postgres.

Sticky routing by game_id hash → actor node (or use a per-game shard topic in Redis).

Metrics: per-game event rate, command latency p95, reconnect success.

Logs: include game_id, request_id, seq.