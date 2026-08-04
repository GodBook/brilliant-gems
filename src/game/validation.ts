import { z } from 'zod'
import type { SaveSnapshotV1 } from './types'

const difficulty = z.enum(['easy', 'normal', 'hard'])
const nonNegativeInteger = z.number().int().nonnegative()
const resourceBag = z.object({
  diamond: nonNegativeInteger,
  sapphire: nonNegativeInteger,
  emerald: nonNegativeInteger,
  ruby: nonNegativeInteger,
  onyx: nonNegativeInteger,
  gold: nonNegativeInteger
})

const cost = resourceBag.omit({ gold: true })
const card = z.object({
  id: z.string().min(1),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  bonus: z.enum(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx']),
  prestige: nonNegativeInteger,
  cost,
  artVariant: nonNegativeInteger
})
const noble = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  prestige: z.literal(3),
  requirement: cost,
  artVariant: nonNegativeInteger
})
const player = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(24),
  isHuman: z.boolean(),
  difficulty: difficulty.optional(),
  tokens: resourceBag,
  bonuses: cost,
  purchased: z.array(card),
  reserved: z.array(z.object({ card, revealed: z.boolean() })).max(3),
  nobles: z.array(noble),
  prestige: nonNegativeInteger
})
const pending = z.union([
  z.object({
    kind: z.literal('discard'),
    playerId: z.string().min(1),
    count: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('noble'),
    playerId: z.string().min(1),
    nobleIds: z.array(z.string().min(1)).min(1)
  })
])
const gameResult = z.object({
  winnerIds: z.array(z.string().min(1)).min(1),
  reason: z.literal('prestige'),
  scores: z.array(
    z.object({
      playerId: z.string().min(1),
      prestige: nonNegativeInteger,
      cards: nonNegativeInteger
    })
  )
})
const turnLog = z.object({
  id: nonNegativeInteger,
  round: z.number().int().positive(),
  playerId: z.string().min(1),
  text: z.string(),
  tone: z.enum(['neutral', 'gain', 'score', 'system'])
})

const gameState = z
  .object({
    schemaVersion: z.literal(1),
    seed: nonNegativeInteger,
    rngState: nonNegativeInteger,
    targetPrestige: z.number().int().min(5).max(50).default(15),
    players: z.array(player).min(2).max(4),
    currentPlayer: nonNegativeInteger,
    round: z.number().int().positive(),
    supply: resourceBag,
    decks: z.object({ 1: z.array(card), 2: z.array(card), 3: z.array(card) }),
    market: z.object({ 1: z.array(card).max(4), 2: z.array(card).max(4), 3: z.array(card).max(4) }),
    nobles: z.array(noble).max(5),
    pending: pending.nullable(),
    endTriggeredBy: z.string().nullable(),
    result: gameResult.nullable(),
    log: z.array(turnLog).max(80),
    actionCounter: nonNegativeInteger
  })
  .refine((game) => game.currentPlayer < game.players.length, '当前玩家索引无效')

const snapshot = z.object({
  version: z.literal(1),
  savedAt: z.iso.datetime(),
  config: z.object({
    seed: nonNegativeInteger,
    playerName: z.string().min(1).max(24),
    aiDifficulties: z.array(difficulty).min(1).max(3),
    targetPrestige: z.number().int().min(5).max(50).default(15),
    playerSeat: z.number().int().min(1).max(4).default(1)
  }),
  game: gameState
})

export function parseSnapshot(value: unknown): SaveSnapshotV1 | null {
  const parsed = snapshot.safeParse(value)
  return parsed.success ? (parsed.data as SaveSnapshotV1) : null
}
