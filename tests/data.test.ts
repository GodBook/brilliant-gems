import { describe, expect, it } from 'vitest'
import { BASE_GEMS } from '../src/game/types'
import { CARDS_BY_TIER, NOBLES } from '../src/game/data'
import { validateCost } from '../src/game/engine'

describe('经典基础版数据', () => {
  it('包含 40/30/20 张三阶发展卡和 10 位贵族', () => {
    expect(CARDS_BY_TIER[1]).toHaveLength(40)
    expect(CARDS_BY_TIER[2]).toHaveLength(30)
    expect(CARDS_BY_TIER[3]).toHaveLength(20)
    expect(NOBLES).toHaveLength(10)
  })

  it('所有卡牌 ID 唯一且成本有效', () => {
    const cards = [...CARDS_BY_TIER[1], ...CARDS_BY_TIER[2], ...CARDS_BY_TIER[3]]
    expect(new Set(cards.map((card) => card.id)).size).toBe(90)
    for (const card of cards) {
      expect(BASE_GEMS).toContain(card.bonus)
      expect(validateCost(card.cost)).toBe(true)
      expect(card.prestige).toBeGreaterThanOrEqual(0)
    }
  })

  it('贵族条件均有效并固定提供 3 点威望', () => {
    for (const noble of NOBLES) {
      expect(validateCost(noble.requirement)).toBe(true)
      expect(noble.prestige).toBe(3)
      expect(Object.values(noble.requirement).filter((value) => value > 0).length).toBeGreaterThanOrEqual(2)
    }
  })
})

