import { describe, expect, it } from 'vitest'
import { setupGame } from '../src/game/engine'
import type { SaveSnapshotV1 } from '../src/game/types'
import { parseSnapshot } from '../src/game/validation'

function snapshot(): SaveSnapshotV1 {
  const config = { seed: 7, playerName: '测试玩家', aiDifficulties: ['normal'] as const }
  return {
    version: 1,
    savedAt: new Date(0).toISOString(),
    config: { ...config, aiDifficulties: [...config.aiDifficulties] },
    game: setupGame({ ...config, aiDifficulties: [...config.aiDifficulties] })
  }
}

describe('存档结构校验', () => {
  it('接受完整的一版本存档', () => {
    expect(parseSnapshot(snapshot())).not.toBeNull()
  })

  it('兼容缺少新增目标字段的旧存档并使用 15 点默认值', () => {
    const value = structuredClone(snapshot()) as unknown as { config: Record<string, unknown>; game: Record<string, unknown> }
    delete value.config.targetPrestige
    delete value.game.targetPrestige
    const parsed = parseSnapshot(value)
    expect(parsed?.config.targetPrestige).toBe(15)
    expect(parsed?.game.targetPrestige).toBe(15)
  })

  it('拒绝损坏的待处理动作', () => {
    const value = structuredClone(snapshot()) as unknown as { game: { pending: unknown } }
    value.game.pending = { kind: 'discard', playerId: 'player-0', count: -2 }
    expect(parseSnapshot(value)).toBeNull()
  })

  it('拒绝未来版本和损坏的结算结构', () => {
    expect(parseSnapshot({ ...snapshot(), version: 2 })).toBeNull()
    const value = structuredClone(snapshot()) as unknown as { game: { result: unknown } }
    value.game.result = { winnerIds: [], reason: 'prestige', scores: [] }
    expect(parseSnapshot(value)).toBeNull()
  })
})
