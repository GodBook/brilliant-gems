import { CARDS_BY_TIER, GEM_META, NOBLES, TIERS, emptyBag, emptyCost } from './data'
import { shuffleWithSeed } from './random'
import {
  BASE_GEMS,
  TOKEN_GEMS,
  type BaseGem,
  type CardSource,
  type Cost,
  type DevelopmentCard,
  type GameConfig,
  type GameResult,
  type GameState,
  type Move,
  type MoveResult,
  type PlayerState,
  type ResourceBag,
  type Tier
} from './types'

const AI_NAMES = ['灰烬商会', '翠庭工坊', '绯红银行']

function cloneState(state: GameState): GameState {
  return structuredClone(state)
}

export function totalTokens(tokens: ResourceBag): number {
  return TOKEN_GEMS.reduce((sum, color) => sum + tokens[color], 0)
}

export function playerCardCount(player: PlayerState): number {
  return player.purchased.length
}

function drawMarket(decks: Record<Tier, DevelopmentCard[]>, tier: Tier): DevelopmentCard[] {
  const cards: DevelopmentCard[] = []
  while (cards.length < 4 && decks[tier].length > 0) {
    const card = decks[tier].pop()
    if (card) cards.push(card)
  }
  return cards
}

export function setupGame(config: GameConfig): GameState {
  if (config.aiDifficulties.length < 1 || config.aiDifficulties.length > 3) {
    throw new Error('AI 数量必须为 1 到 3 个')
  }

  let rngState = config.seed >>> 0
  const decks = {} as Record<Tier, DevelopmentCard[]>
  for (const tier of TIERS) {
    const shuffled = shuffleWithSeed(CARDS_BY_TIER[tier], rngState)
    decks[tier] = shuffled.items
    rngState = shuffled.state
  }

  const nobleShuffle = shuffleWithSeed(NOBLES, rngState)
  rngState = nobleShuffle.state

  const players: PlayerState[] = [
    {
      id: 'player-0',
      name: config.playerName.trim() || '玩家',
      isHuman: true,
      tokens: emptyBag(),
      bonuses: emptyCost(),
      purchased: [],
      reserved: [],
      nobles: [],
      prestige: 0
    },
    ...config.aiDifficulties.map((difficulty, index) => ({
      id: `player-${index + 1}`,
      name: AI_NAMES[index],
      isHuman: false,
      difficulty,
      tokens: emptyBag(),
      bonuses: emptyCost(),
      purchased: [],
      reserved: [],
      nobles: [],
      prestige: 0
    }))
  ]

  const coloredTokenCount = players.length === 2 ? 4 : players.length === 3 ? 5 : 7
  const supply = emptyBag()
  for (const color of BASE_GEMS) supply[color] = coloredTokenCount
  supply.gold = 5

  return {
    schemaVersion: 1,
    seed: config.seed >>> 0,
    rngState,
    players,
    currentPlayer: 0,
    round: 1,
    supply,
    decks,
    market: {
      1: drawMarket(decks, 1),
      2: drawMarket(decks, 2),
      3: drawMarket(decks, 3)
    },
    nobles: nobleShuffle.items.slice(0, players.length + 1),
    pending: null,
    endTriggeredBy: null,
    result: null,
    log: [
      {
        id: 1,
        round: 1,
        playerId: 'system',
        text: `${players.length} 人对局开始，率先达到 15 点将触发最后一轮。`,
        tone: 'system'
      }
    ],
    actionCounter: 1
  }
}

function addLog(
  state: GameState,
  playerId: string,
  text: string,
  tone: 'neutral' | 'gain' | 'score' | 'system' = 'neutral'
): void {
  state.actionCounter += 1
  state.log.push({ id: state.actionCounter, round: state.round, playerId, text, tone })
  if (state.log.length > 80) state.log.splice(0, state.log.length - 80)
}

export function paymentForCard(player: PlayerState, card: DevelopmentCard): ResourceBag | null {
  const payment = emptyBag()
  let goldNeeded = 0
  for (const color of BASE_GEMS) {
    const required = Math.max(0, card.cost[color] - player.bonuses[color])
    const colored = Math.min(player.tokens[color], required)
    payment[color] = colored
    goldNeeded += required - colored
  }
  if (goldNeeded > player.tokens.gold) return null
  payment.gold = goldNeeded
  return payment
}

export function canAfford(player: PlayerState, card: DevelopmentCard): boolean {
  return paymentForCard(player, card) !== null
}

export function eligibleNobles(state: GameState, player: PlayerState): string[] {
  return state.nobles
    .filter((noble) => BASE_GEMS.every((color) => player.bonuses[color] >= noble.requirement[color]))
    .map((noble) => noble.id)
}

function calculateResult(players: PlayerState[]): GameResult {
  const highest = Math.max(...players.map((player) => player.prestige))
  const leaders = players.filter((player) => player.prestige === highest)
  const fewestCards = Math.min(...leaders.map(playerCardCount))
  const winnerIds = leaders
    .filter((player) => playerCardCount(player) === fewestCards)
    .map((player) => player.id)
  return {
    winnerIds,
    reason: 'prestige',
    scores: players.map((player) => ({
      playerId: player.id,
      prestige: player.prestige,
      cards: playerCardCount(player)
    }))
  }
}

function finishTurn(state: GameState): void {
  const player = state.players[state.currentPlayer]
  if (!state.endTriggeredBy && player.prestige >= 15) {
    state.endTriggeredBy = player.id
    addLog(state, 'system', `${player.name} 达到 15 点，本轮结束后结算。`, 'system')
  }

  const nextPlayer = (state.currentPlayer + 1) % state.players.length
  if (state.endTriggeredBy && nextPlayer === 0) {
    state.result = calculateResult(state.players)
    const winners = state.result.winnerIds
      .map((id) => state.players.find((playerState) => playerState.id === id)?.name)
      .filter(Boolean)
      .join('、')
    addLog(state, 'system', `${winners} 赢得本局。`, 'score')
    return
  }

  state.currentPlayer = nextPlayer
  if (nextPlayer === 0) state.round += 1
}

function resolveEndOfAction(state: GameState): void {
  const player = state.players[state.currentPlayer]
  const overLimit = totalTokens(player.tokens) - 10
  if (overLimit > 0) {
    state.pending = { kind: 'discard', playerId: player.id, count: overLimit }
    return
  }

  const nobles = eligibleNobles(state, player)
  if (nobles.length === 1) {
    awardNoble(state, nobles[0])
    finishTurn(state)
    return
  }
  if (nobles.length > 1) {
    state.pending = { kind: 'noble', playerId: player.id, nobleIds: nobles }
    return
  }
  finishTurn(state)
}

function awardNoble(state: GameState, nobleId: string): void {
  const nobleIndex = state.nobles.findIndex((noble) => noble.id === nobleId)
  if (nobleIndex < 0) return
  const [noble] = state.nobles.splice(nobleIndex, 1)
  const player = state.players[state.currentPlayer]
  player.nobles.push(noble)
  player.prestige += noble.prestige
  addLog(state, player.id, `${noble.name} 到访，获得 3 点威望。`, 'score')
}

function getCard(state: GameState, source: CardSource): DevelopmentCard | undefined {
  if (source.kind === 'market') {
    return state.market[source.tier].find((card) => card.id === source.cardId)
  }
  return state.players[state.currentPlayer].reserved.find(({ card }) => card.id === source.cardId)?.card
}

function removePurchasedCard(state: GameState, source: CardSource): DevelopmentCard | undefined {
  if (source.kind === 'market') {
    const market = state.market[source.tier]
    const index = market.findIndex((card) => card.id === source.cardId)
    if (index < 0) return undefined
    const [card] = market.splice(index, 1)
    const replacement = state.decks[source.tier].pop()
    if (replacement) market.splice(index, 0, replacement)
    return card
  }
  const reserves = state.players[state.currentPlayer].reserved
  const index = reserves.findIndex(({ card }) => card.id === source.cardId)
  if (index < 0) return undefined
  return reserves.splice(index, 1)[0].card
}

function fail(state: GameState, error: string): MoveResult {
  return { ok: false, state, error }
}

function success(state: GameState): MoveResult {
  return { ok: true, state }
}

export function applyMove(original: GameState, move: Move): MoveResult {
  if (original.result) return fail(original, '本局已经结束')
  const state = cloneState(original)
  const player = state.players[state.currentPlayer]

  if (state.pending?.kind === 'discard') {
    if (move.type !== 'discard') return fail(original, '请先弃掉超出上限的筹码')
    const selected = emptyBag()
    for (const color of TOKEN_GEMS) {
      const count = Math.trunc(move.tokens[color] ?? 0)
      if (count < 0 || count > player.tokens[color]) return fail(original, '弃置数量无效')
      selected[color] = count
    }
    if (totalTokens(selected) !== state.pending.count) {
      return fail(original, `需要弃置 ${state.pending.count} 枚筹码`)
    }
    for (const color of TOKEN_GEMS) {
      player.tokens[color] -= selected[color]
      state.supply[color] += selected[color]
    }
    const summary = TOKEN_GEMS.filter((color) => selected[color] > 0)
      .map((color) => `${GEM_META[color].short}${selected[color]}`)
      .join(' ')
    addLog(state, player.id, `归还筹码：${summary}。`)
    state.pending = null
    resolveEndOfAction(state)
    return success(state)
  }

  if (state.pending?.kind === 'noble') {
    if (move.type !== 'chooseNoble' || !state.pending.nobleIds.includes(move.nobleId)) {
      return fail(original, '请选择一位符合条件的贵族')
    }
    state.pending = null
    awardNoble(state, move.nobleId)
    finishTurn(state)
    return success(state)
  }

  if (move.type === 'takeDistinct') {
    const unique = [...new Set(move.colors)]
    const available = BASE_GEMS.filter((color) => state.supply[color] > 0)
    const required = Math.min(3, available.length)
    if (required === 0) return fail(original, '供应区没有可拿取的彩色筹码')
    if (unique.length !== required || unique.some((color) => state.supply[color] < 1)) {
      return fail(original, `请选择 ${required} 种不同颜色的筹码`)
    }
    for (const color of unique) {
      state.supply[color] -= 1
      player.tokens[color] += 1
    }
    addLog(
      state,
      player.id,
      `拿取 ${unique.map((color) => GEM_META[color].label).join('、')}。`,
      'gain'
    )
    resolveEndOfAction(state)
    return success(state)
  }

  if (move.type === 'takeDouble') {
    if (state.supply[move.color] < 4) return fail(original, '该颜色剩余不足 4 枚，不能拿取两枚')
    state.supply[move.color] -= 2
    player.tokens[move.color] += 2
    addLog(state, player.id, `拿取 2 枚${GEM_META[move.color].label}。`, 'gain')
    resolveEndOfAction(state)
    return success(state)
  }

  if (move.type === 'buy') {
    const card = getCard(state, move.source)
    if (!card) return fail(original, '找不到这张发展卡')
    const payment = paymentForCard(player, card)
    if (!payment) return fail(original, '当前筹码不足以购买这张卡')
    const purchased = removePurchasedCard(state, move.source)
    if (!purchased) return fail(original, '这张发展卡已经不可用')
    for (const color of TOKEN_GEMS) {
      player.tokens[color] -= payment[color]
      state.supply[color] += payment[color]
    }
    player.purchased.push(purchased)
    player.bonuses[purchased.bonus] += 1
    player.prestige += purchased.prestige
    addLog(
      state,
      player.id,
      `购买 ${GEM_META[purchased.bonus].label}发展卡${purchased.prestige ? `，获得 ${purchased.prestige} 点威望` : ''}。`,
      purchased.prestige ? 'score' : 'gain'
    )
    resolveEndOfAction(state)
    return success(state)
  }

  if (move.type === 'reserveMarket') {
    if (player.reserved.length >= 3) return fail(original, '最多只能保留 3 张发展卡')
    const market = state.market[move.tier]
    const index = market.findIndex((card) => card.id === move.cardId)
    if (index < 0) return fail(original, '这张发展卡已经不可用')
    const [card] = market.splice(index, 1)
    const replacement = state.decks[move.tier].pop()
    if (replacement) market.splice(index, 0, replacement)
    player.reserved.push({ card, revealed: true })
    if (state.supply.gold > 0) {
      state.supply.gold -= 1
      player.tokens.gold += 1
    }
    addLog(state, player.id, `保留一张公开的 ${move.tier} 阶发展卡。`, 'gain')
    resolveEndOfAction(state)
    return success(state)
  }

  if (move.type === 'reserveDeck') {
    if (player.reserved.length >= 3) return fail(original, '最多只能保留 3 张发展卡')
    const card = state.decks[move.tier].pop()
    if (!card) return fail(original, '该牌库已经为空')
    player.reserved.push({ card, revealed: false })
    if (state.supply.gold > 0) {
      state.supply.gold -= 1
      player.tokens.gold += 1
    }
    addLog(state, player.id, `从 ${move.tier} 阶牌库暗抽并保留一张卡。`, 'gain')
    resolveEndOfAction(state)
    return success(state)
  }

  return fail(original, '当前不能执行这个动作')
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const result: T[][] = []
  for (let index = 0; index <= items.length - size; index += 1) {
    for (const tail of combinations(items.slice(index + 1), size - 1)) {
      result.push([items[index], ...tail])
    }
  }
  return result
}

function discardMoves(player: PlayerState, count: number): Move[] {
  const moves: Move[] = []
  const selected = emptyBag()
  function visit(index: number, remaining: number): void {
    if (index === TOKEN_GEMS.length) {
      if (remaining === 0) moves.push({ type: 'discard', tokens: { ...selected } })
      return
    }
    const color = TOKEN_GEMS[index]
    for (let amount = 0; amount <= Math.min(player.tokens[color], remaining); amount += 1) {
      selected[color] = amount
      visit(index + 1, remaining - amount)
    }
    selected[color] = 0
  }
  visit(0, count)
  return moves
}

export function listLegalMoves(state: GameState): Move[] {
  if (state.result) return []
  const player = state.players[state.currentPlayer]
  if (state.pending?.kind === 'discard') return discardMoves(player, state.pending.count)
  if (state.pending?.kind === 'noble') {
    return state.pending.nobleIds.map((nobleId) => ({ type: 'chooseNoble', nobleId }))
  }

  const moves: Move[] = []
  const available = BASE_GEMS.filter((color) => state.supply[color] > 0)
  const distinctCount = Math.min(3, available.length)
  if (distinctCount > 0) {
    for (const colors of combinations(available, distinctCount)) moves.push({ type: 'takeDistinct', colors })
  }
  for (const color of BASE_GEMS) {
    if (state.supply[color] >= 4) moves.push({ type: 'takeDouble', color })
  }
  for (const tier of TIERS) {
    for (const card of state.market[tier]) {
      if (canAfford(player, card)) {
        moves.push({ type: 'buy', source: { kind: 'market', tier, cardId: card.id } })
      }
      if (player.reserved.length < 3) moves.push({ type: 'reserveMarket', tier, cardId: card.id })
    }
    if (player.reserved.length < 3 && state.decks[tier].length > 0) {
      moves.push({ type: 'reserveDeck', tier })
    }
  }
  for (const { card } of player.reserved) {
    if (canAfford(player, card)) {
      moves.push({ type: 'buy', source: { kind: 'reserved', cardId: card.id } })
    }
  }
  return moves
}

export function getCardFromSource(state: GameState, source: CardSource): DevelopmentCard | undefined {
  return getCard(state, source)
}

export function describeMove(state: GameState, move: Move): string {
  if (move.type === 'takeDistinct') return `拿取 ${move.colors.map((c) => GEM_META[c].short).join('、')}`
  if (move.type === 'takeDouble') return `拿取两枚${GEM_META[move.color].short}`
  if (move.type === 'buy') {
    const card = getCardFromSource(state, move.source)
    return card ? `购买 ${card.tier} 阶${GEM_META[card.bonus].short}卡` : '购买发展卡'
  }
  if (move.type === 'reserveMarket') return `保留 ${move.tier} 阶公开卡`
  if (move.type === 'reserveDeck') return `暗抽 ${move.tier} 阶卡`
  if (move.type === 'discard') return '归还筹码'
  return '选择贵族'
}

export function validateCost(cost: Cost): boolean {
  return BASE_GEMS.every((color) => Number.isInteger(cost[color]) && cost[color] >= 0)
}
