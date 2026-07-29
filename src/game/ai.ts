import { BASE_GEMS, TOKEN_GEMS, type BaseGem, type DevelopmentCard, type GameState, type Move } from './types'
import { applyMove, canAfford, getCardFromSource, listLegalMoves, paymentForCard, totalTokens } from './engine'
import { nextRandom, randomIndex, shuffleWithSeed } from './random'

function cardDemand(state: GameState, playerIndex: number, color: BaseGem): number {
  const player = state.players[playerIndex]
  const visible = [
    ...state.market[1],
    ...state.market[2],
    ...state.market[3],
    ...player.reserved.map(({ card }) => card)
  ]
  return visible.reduce((sum, card) => {
    const gap = Math.max(0, card.cost[color] - player.bonuses[color] - player.tokens[color])
    return sum + gap * (card.prestige + card.tier)
  }, 0)
}

function nobleProgress(state: GameState, playerIndex: number, bonusColor?: BaseGem): number {
  const player = state.players[playerIndex]
  return state.nobles.reduce((best, noble) => {
    let progress = 0
    for (const color of BASE_GEMS) {
      const bonuses = player.bonuses[color] + (bonusColor === color ? 1 : 0)
      const needed = noble.requirement[color]
      if (needed > 0) progress += Math.min(needed, bonuses) / needed
    }
    return Math.max(best, progress)
  }, 0)
}

function immediateMoveScore(state: GameState, move: Move, playerIndex: number): number {
  const player = state.players[playerIndex]
  if (move.type === 'chooseNoble') return 160
  if (move.type === 'discard') {
    let penalty = 0
    for (const color of TOKEN_GEMS) {
      const amount = move.tokens[color] ?? 0
      if (color === 'gold') penalty += amount * 18
      else penalty += amount * (2 + cardDemand(state, playerIndex, color) * 0.04)
    }
    return -penalty
  }
  if (move.type === 'buy') {
    const card = getCardFromSource(state, move.source)
    if (!card) return -1000
    const payment = paymentForCard(player, card)
    const paymentSize = payment ? totalTokens(payment) : 20
    return (
      card.prestige * 42 +
      card.tier * 3 +
      nobleProgress(state, playerIndex, card.bonus) * 13 -
      paymentSize * 1.4 +
      (card.prestige === 0 ? cardDemand(state, playerIndex, card.bonus) * 0.025 : 0)
    )
  }
  if (move.type === 'takeDistinct') {
    return move.colors.reduce((score, color) => score + 5 + cardDemand(state, playerIndex, color) * 0.06, 0)
  }
  if (move.type === 'takeDouble') {
    return 10 + cardDemand(state, playerIndex, move.color) * 0.1
  }
  if (move.type === 'reserveMarket') {
    const card = state.market[move.tier].find((item) => item.id === move.cardId)
    return card ? card.prestige * 9 + card.tier * 2 + (state.supply.gold > 0 ? 5 : 0) : -100
  }
  return move.type === 'reserveDeck' ? move.tier * 1.5 + (state.supply.gold > 0 ? 4 : 0) : 0
}

function stateValue(state: GameState, rootPlayer: number): number {
  const player = state.players[rootPlayer]
  const opponents = state.players.filter((_, index) => index !== rootPlayer)
  const strongestOpponent = Math.max(...opponents.map((opponent) => opponent.prestige))
  const bonusTotal = BASE_GEMS.reduce((sum, color) => sum + player.bonuses[color], 0)
  const tokenFlexibility = totalTokens(player.tokens) + player.tokens.gold * 1.5
  const affordable = [...state.market[1], ...state.market[2], ...state.market[3]].filter((card) =>
    canAfford(player, card)
  ).length
  let value = (player.prestige - strongestOpponent) * 75 + player.prestige * 18
  value += bonusTotal * 7 + tokenFlexibility * 1.2 + affordable * 3
  if (state.result) {
    value += state.result.winnerIds.includes(player.id) ? 5000 : -5000
  }
  return value
}

function chooseWeighted(state: GameState, moves: Move[], playerIndex: number, seed: number): Move {
  const ranked = [...moves].sort(
    (a, b) => immediateMoveScore(state, b, playerIndex) - immediateMoveScore(state, a, playerIndex)
  )
  const pool = ranked.slice(0, Math.min(5, ranked.length))
  const pick = randomIndex(seed, pool.length)
  return pool[pick.index]
}

function determinizeForPlayer(state: GameState, viewer: number, seed: number): GameState {
  const sample = structuredClone(state)
  const unknown: DevelopmentCard[] = []
  const deckLengths = new Map<number, number>()

  for (const tier of [1, 2, 3] as const) {
    deckLengths.set(tier, sample.decks[tier].length)
    unknown.push(...sample.decks[tier])
    sample.decks[tier] = []
  }
  const hiddenSlots: Array<{ player: number; reserve: number }> = []
  sample.players.forEach((player, playerIndex) => {
    if (playerIndex === viewer) return
    player.reserved.forEach((reserved, reserveIndex) => {
      if (!reserved.revealed) {
        unknown.push(reserved.card)
        hiddenSlots.push({ player: playerIndex, reserve: reserveIndex })
      }
    })
  })

  unknown.sort((a, b) => a.id.localeCompare(b.id))
  const shuffled = shuffleWithSeed(unknown, seed)
  let cursor = 0
  for (const slot of hiddenSlots) {
    sample.players[slot.player].reserved[slot.reserve].card = shuffled.items[cursor++]
  }
  for (const tier of [1, 2, 3] as const) {
    const count = deckLengths.get(tier) ?? 0
    sample.decks[tier] = shuffled.items.slice(cursor, cursor + count)
    cursor += count
  }
  return sample
}

function rollout(state: GameState, rootPlayer: number, seed: number, depth: number): number {
  let simulation = state
  let randomState = seed
  for (let step = 0; step < depth && !simulation.result; step += 1) {
    const moves = listLegalMoves(simulation)
    if (moves.length === 0) break
    const current = simulation.currentPlayer
    const move = chooseWeighted(simulation, moves, current, randomState)
    randomState = nextRandom(randomState).state
    const result = applyMove(simulation, move)
    if (!result.ok) break
    simulation = result.state
  }
  return stateValue(simulation, rootPlayer)
}

function hardMove(state: GameState, moves: Move[], playerIndex: number): Move {
  const candidates = [...moves]
    .sort((a, b) => immediateMoveScore(state, b, playerIndex) - immediateMoveScore(state, a, playerIndex))
    .slice(0, 9)
  const stats = candidates.map(() => ({ visits: 0, total: 0 }))
  let randomState = (state.rngState ^ (state.actionCounter * 0x9e3779b9)) >>> 0
  const iterations = Math.max(32, candidates.length * 5)

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let selected = stats.findIndex((stat) => stat.visits === 0)
    if (selected < 0) {
      const totalVisits = stats.reduce((sum, stat) => sum + stat.visits, 0)
      selected = stats.reduce(
        (best, stat, index) => {
          const average = stat.total / stat.visits
          const exploration = Math.sqrt((2 * Math.log(totalVisits)) / stat.visits)
          return average + exploration > best.score ? { index, score: average + exploration } : best
        },
        { index: 0, score: Number.NEGATIVE_INFINITY }
      ).index
    }

    const determinized = determinizeForPlayer(state, playerIndex, randomState)
    randomState = nextRandom(randomState).state
    const applied = applyMove(determinized, candidates[selected])
    const reward = applied.ok ? rollout(applied.state, playerIndex, randomState, 5) : -5000
    stats[selected].visits += 1
    stats[selected].total += reward
    randomState = nextRandom(randomState).state
  }

  const best = stats.reduce(
    (winner, stat, index) => {
      const average = stat.visits > 0 ? stat.total / stat.visits : Number.NEGATIVE_INFINITY
      return average > winner.score ? { index, score: average } : winner
    },
    { index: 0, score: Number.NEGATIVE_INFINITY }
  )
  return candidates[best.index]
}

export function chooseAiMove(state: GameState): Move | null {
  const playerIndex = state.currentPlayer
  const player = state.players[playerIndex]
  const moves = listLegalMoves(state)
  if (moves.length === 0) return null
  const seed = (state.rngState ^ (state.actionCounter * 2654435761)) >>> 0

  if (state.pending || player.difficulty === 'normal') {
    return chooseWeighted(state, moves, playerIndex, seed)
  }
  if (player.difficulty === 'hard') return hardMove(state, moves, playerIndex)

  const purchases = moves.filter((move) => move.type === 'buy')
  const pool = purchases.length > 0 ? [...purchases, ...moves.slice(0, Math.min(5, moves.length))] : moves
  return pool[randomIndex(seed, pool.length).index]
}

export function hiddenInformationFingerprint(state: GameState, viewer: number): string {
  return state.players
    .map((player, index) =>
      player.reserved.map((reserved) => (index === viewer || reserved.revealed ? reserved.card.id : 'hidden')).join(',')
    )
    .join('|')
}
