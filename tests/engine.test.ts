import { describe, expect, it } from 'vitest'
import { chooseAiMove } from '../src/game/ai'
import { applyMove, canAfford, listLegalMoves, setupGame, totalTokens } from '../src/game/engine'
import type { Difficulty, GameState, Move } from '../src/game/types'

function game(aiDifficulties: Difficulty[] = ['normal'], seed = 42, targetPrestige?: number, playerSeat?: number): GameState {
  return setupGame({ seed, playerName: '测试玩家', aiDifficulties, targetPrestige, playerSeat })
}

function apply(state: GameState, move: Move): GameState {
  const result = applyMove(state, move)
  expect(result.ok, result.error).toBe(true)
  return result.state
}

describe('对局初始化', () => {
  it.each([
    [1, 4, 3],
    [2, 5, 4],
    [3, 7, 5]
  ])('为 %i 个 AI 配置正确的筹码和贵族', (aiCount, tokens, nobles) => {
    const state = game(Array.from({ length: aiCount }, () => 'normal' as const))
    expect(state.players).toHaveLength(aiCount + 1)
    expect(state.nobles).toHaveLength(nobles)
    for (const color of ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const) {
      expect(state.supply[color]).toBe(tokens)
    }
    expect(state.supply.gold).toBe(5)
    expect(state.market[1]).toHaveLength(4)
    expect(state.decks[1]).toHaveLength(36)
    expect(state.decks[2]).toHaveLength(26)
    expect(state.decks[3]).toHaveLength(16)
  })

  it('相同种子得到相同牌序，不同种子得到不同牌序', () => {
    expect(game(['normal'], 11).market).toEqual(game(['normal'], 11).market)
    expect(game(['normal'], 11).market).not.toEqual(game(['normal'], 12).market)
  })

  it('可以在开局配置胜利所需威望，并写入状态', () => {
    expect(game(['normal'], 42, 21).targetPrestige).toBe(21)
    expect(game(['normal'], 42).targetPrestige).toBe(15)
  })

  it('按选择的号位排列玩家，并由 1 号位先手', () => {
    const state = game(['easy', 'normal', 'hard'], 42, 15, 3)
    expect(state.players.map((player) => player.isHuman)).toEqual([false, false, true, false])
    expect(state.players.findIndex((player) => player.isHuman)).toBe(2)
    expect(state.currentPlayer).toBe(0)
    expect(state.players[0].difficulty).toBe('easy')
    expect(state.players[1].difficulty).toBe('normal')
    expect(state.players[3].difficulty).toBe('hard')
  })
})

describe('筹码与保留', () => {
  it('允许拿三种不同颜色以及供给至少四枚时拿同色两枚', () => {
    let state = game()
    state = apply(state, { type: 'takeDistinct', colors: ['diamond', 'sapphire', 'emerald'] })
    expect(state.players[0].tokens.diamond).toBe(1)
    state = apply(state, { type: 'takeDouble', color: 'ruby' })
    expect(state.players[1].tokens.ruby).toBe(2)
    expect(state.supply.ruby).toBe(2)
  })

  it('筹码超过 10 枚时强制准确归还', () => {
    const state = game()
    state.players[0].tokens.diamond = 9
    const taken = apply(state, { type: 'takeDouble', color: 'ruby' })
    expect(taken.pending).toEqual({ kind: 'discard', playerId: 'player-0', count: 1 })
    const invalid = applyMove(taken, { type: 'takeDouble', color: 'onyx' })
    expect(invalid.ok).toBe(false)
    const discarded = apply(taken, { type: 'discard', tokens: { diamond: 1 } })
    expect(totalTokens(discarded.players[0].tokens)).toBe(10)
    expect(discarded.currentPlayer).toBe(1)
  })

  it('公开保留可见、暗抽保留隐藏，并在有黄金时获得一枚', () => {
    let state = game()
    const card = state.market[1][0]
    state = apply(state, { type: 'reserveMarket', tier: 1, cardId: card.id })
    expect(state.players[0].reserved[0]).toMatchObject({ revealed: true })
    expect(state.players[0].tokens.gold).toBe(1)
    state = apply(state, { type: 'reserveDeck', tier: 2 })
    expect(state.players[1].reserved[0]).toMatchObject({ revealed: false })
  })

  it('供应区没有彩色筹码时不生成空拿取动作', () => {
    const state = game()
    for (const color of ['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as const) {
      state.supply[color] = 0
    }
    expect(listLegalMoves(state).some((move) => move.type === 'takeDistinct')).toBe(false)
    expect(applyMove(state, { type: 'takeDistinct', colors: [] }).ok).toBe(false)
  })
})

describe('购牌、贵族与终局', () => {
  it('购买后支付筹码、获得折扣和威望并补牌', () => {
    const state = game()
    const card = state.market[2][0]
    card.cost = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 }
    expect(canAfford(state.players[0], card)).toBe(true)
    const deckBefore = state.decks[2].length
    const next = apply(state, { type: 'buy', source: { kind: 'market', tier: 2, cardId: card.id } })
    expect(next.players[0].bonuses[card.bonus]).toBe(1)
    expect(next.players[0].prestige).toBe(card.prestige)
    expect(next.decks[2]).toHaveLength(deckBefore - 1)
    expect(next.market[2]).toHaveLength(4)
  })

  it('只有一位符合条件的贵族时自动来访，多位时要求选择', () => {
    let state = game()
    const first = state.nobles[0]
    state.nobles = [first]
    state.players[0].bonuses = { ...first.requirement }
    state = apply(state, { type: 'takeDistinct', colors: ['diamond', 'sapphire', 'emerald'] })
    expect(state.players[0].nobles).toHaveLength(1)
    expect(state.players[0].prestige).toBe(3)

    let multiple = game()
    multiple.nobles = multiple.nobles.slice(0, 2)
    multiple.players[0].bonuses = { diamond: 5, sapphire: 5, emerald: 5, ruby: 5, onyx: 5 }
    multiple = apply(multiple, { type: 'takeDistinct', colors: ['diamond', 'sapphire', 'emerald'] })
    expect(multiple.pending?.kind).toBe('noble')
    const nobleId = multiple.pending?.kind === 'noble' ? multiple.pending.nobleIds[0] : ''
    multiple = apply(multiple, { type: 'chooseNoble', nobleId })
    expect(multiple.players[0].nobles).toHaveLength(1)
  })

  it('达到 15 分后补齐整轮，并按发展卡更少者决胜', () => {
    let state = game()
    state.players[0].prestige = 15
    state.players[0].purchased = [state.market[1][0], state.market[1][1]]
    state.players[1].prestige = 15
    state.players[1].purchased = [state.market[1][2]]
    state = apply(state, { type: 'takeDistinct', colors: ['diamond', 'sapphire', 'emerald'] })
    expect(state.result).toBeNull()
    expect(state.endTriggeredBy).toBe('player-0')
    state = apply(state, listLegalMoves(state)[0])
    if (state.pending?.kind === 'discard') state = apply(state, listLegalMoves(state)[0])
    if (state.pending?.kind === 'noble') state = apply(state, listLegalMoves(state)[0])
    expect(state.result?.winnerIds).toEqual(['player-1'])
  })

  it('使用自定义威望目标触发终局', () => {
    let state = game(['normal'], 42, 18)
    state.players[0].prestige = 18
    state = apply(state, { type: 'takeDistinct', colors: ['diamond', 'sapphire', 'emerald'] })
    expect(state.endTriggeredBy).toBe('player-0')
  })
})

describe('AI 合法性', () => {
  it('普通 AI 会优先购买能达到胜利线的牌', () => {
    const state = game(['normal'], 77, 15)
    state.currentPlayer = 1
    const ai = state.players[1]
    ai.prestige = 14
    const finisher = state.market[3][0]
    finisher.prestige = 1
    finisher.cost = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 }
    for (const card of [...state.market[1], ...state.market[2], ...state.market[3]]) {
      card.cost = { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 }
      if (card.id !== finisher.id) card.prestige = 0
    }

    expect(chooseAiMove(state)).toEqual({ type: 'buy', source: { kind: 'market', tier: 3, cardId: finisher.id } })
  })

  it.each(['easy', 'normal', 'hard'] as const)('%s AI 能完成整局且只执行合法动作', (difficulty) => {
    let state = game([difficulty], 100 + difficulty.length)
    let actions = 0
    while (!state.result && actions < 500) {
      const move = state.players[state.currentPlayer].isHuman
        ? listLegalMoves(state)[actions % listLegalMoves(state).length]
        : chooseAiMove(state)
      expect(move).not.toBeNull()
      const result = applyMove(state, move!)
      expect(result.ok, result.error).toBe(true)
      state = result.state
      actions += 1
    }
    expect(state.result).not.toBeNull()
    expect(actions).toBeLessThan(500)
  }, 30000)
})
