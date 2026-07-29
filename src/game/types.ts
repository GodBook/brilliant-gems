export const BASE_GEMS = ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const
export const TOKEN_GEMS = [...BASE_GEMS, 'gold'] as const

export type BaseGem = (typeof BASE_GEMS)[number]
export type GemColor = (typeof TOKEN_GEMS)[number]
export type Tier = 1 | 2 | 3
export type Difficulty = 'easy' | 'normal' | 'hard'
export type ResourceBag = Record<GemColor, number>
export type Cost = Record<BaseGem, number>

export interface DevelopmentCard {
  id: string
  tier: Tier
  bonus: BaseGem
  prestige: number
  cost: Cost
  artVariant: number
}

export interface Noble {
  id: string
  name: string
  title: string
  prestige: 3
  requirement: Cost
  artVariant: number
}

export interface ReservedCard {
  card: DevelopmentCard
  revealed: boolean
}

export interface PlayerState {
  id: string
  name: string
  isHuman: boolean
  difficulty?: Difficulty
  tokens: ResourceBag
  bonuses: Cost
  purchased: DevelopmentCard[]
  reserved: ReservedCard[]
  nobles: Noble[]
  prestige: number
}

export interface TurnLogEntry {
  id: number
  round: number
  playerId: string
  text: string
  tone: 'neutral' | 'gain' | 'score' | 'system'
}

export interface PendingDiscard {
  kind: 'discard'
  playerId: string
  count: number
}

export interface PendingNoble {
  kind: 'noble'
  playerId: string
  nobleIds: string[]
}

export type PendingAction = PendingDiscard | PendingNoble | null

export interface GameResult {
  winnerIds: string[]
  reason: 'prestige'
  scores: Array<{ playerId: string; prestige: number; cards: number }>
}

export interface GameState {
  schemaVersion: 1
  seed: number
  rngState: number
  players: PlayerState[]
  currentPlayer: number
  round: number
  supply: ResourceBag
  decks: Record<Tier, DevelopmentCard[]>
  market: Record<Tier, DevelopmentCard[]>
  nobles: Noble[]
  pending: PendingAction
  endTriggeredBy: string | null
  result: GameResult | null
  log: TurnLogEntry[]
  actionCounter: number
}

export interface GameConfig {
  seed: number
  playerName: string
  aiDifficulties: Difficulty[]
}

export type CardSource =
  | { kind: 'market'; tier: Tier; cardId: string }
  | { kind: 'reserved'; cardId: string }

export type Move =
  | { type: 'takeDistinct'; colors: BaseGem[] }
  | { type: 'takeDouble'; color: BaseGem }
  | { type: 'buy'; source: CardSource }
  | { type: 'reserveMarket'; tier: Tier; cardId: string }
  | { type: 'reserveDeck'; tier: Tier }
  | { type: 'discard'; tokens: Partial<ResourceBag> }
  | { type: 'chooseNoble'; nobleId: string }

export interface MoveResult {
  ok: boolean
  state: GameState
  error?: string
}

export interface SaveSnapshotV1 {
  version: 1
  savedAt: string
  config: GameConfig
  game: GameState
}

