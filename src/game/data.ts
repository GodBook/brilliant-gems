import type { BaseGem, Cost, DevelopmentCard, Noble, ResourceBag, Tier } from './types'
import { BASE_GEMS, TOKEN_GEMS } from './types'

export const GEM_META: Record<
  keyof ResourceBag,
  { label: string; short: string; css: string; symbol: string }
> = {
  diamond: { label: '钻石', short: '白', css: '#ece9df', symbol: '◇' },
  sapphire: { label: '蓝宝石', short: '蓝', css: '#3779d6', symbol: '◆' },
  emerald: { label: '祖母绿', short: '绿', css: '#2f9a67', symbol: '⬟' },
  ruby: { label: '红宝石', short: '红', css: '#bd3b4b', symbol: '⬢' },
  onyx: { label: '黑玛瑙', short: '黑', css: '#34343b', symbol: '⬣' },
  gold: { label: '黄金', short: '金', css: '#d4aa52', symbol: '✦' }
}

export function emptyCost(): Cost {
  return { diamond: 0, sapphire: 0, emerald: 0, ruby: 0, onyx: 0 }
}

export function emptyBag(): ResourceBag {
  return { ...emptyCost(), gold: 0 }
}

type RawCard = readonly [BaseGem, number, number, number, number, number, number]

const TIER_1: RawCard[] = [
  ['diamond', 0, 0, 3, 0, 0, 0],
  ['diamond', 0, 0, 0, 0, 2, 1],
  ['diamond', 0, 0, 1, 1, 1, 1],
  ['diamond', 0, 0, 2, 0, 0, 2],
  ['diamond', 1, 0, 0, 4, 0, 0],
  ['diamond', 0, 0, 1, 2, 1, 1],
  ['diamond', 0, 0, 2, 2, 0, 1],
  ['diamond', 0, 3, 1, 0, 0, 1],
  ['sapphire', 0, 1, 0, 0, 0, 2],
  ['sapphire', 0, 0, 0, 0, 0, 3],
  ['sapphire', 0, 1, 0, 1, 1, 1],
  ['sapphire', 0, 0, 0, 2, 0, 2],
  ['sapphire', 1, 0, 0, 0, 4, 0],
  ['sapphire', 0, 1, 0, 1, 2, 1],
  ['sapphire', 0, 1, 0, 2, 2, 0],
  ['sapphire', 0, 0, 1, 3, 1, 0],
  ['emerald', 0, 2, 1, 0, 0, 0],
  ['emerald', 0, 0, 0, 0, 3, 0],
  ['emerald', 0, 1, 1, 0, 1, 1],
  ['emerald', 0, 0, 2, 0, 2, 0],
  ['emerald', 1, 0, 0, 0, 0, 4],
  ['emerald', 0, 1, 1, 0, 1, 2],
  ['emerald', 0, 0, 1, 0, 2, 2],
  ['emerald', 0, 1, 3, 1, 0, 0],
  ['ruby', 0, 0, 2, 1, 0, 0],
  ['ruby', 0, 3, 0, 0, 0, 0],
  ['ruby', 0, 1, 1, 1, 0, 1],
  ['ruby', 0, 2, 0, 0, 2, 0],
  ['ruby', 1, 4, 0, 0, 0, 0],
  ['ruby', 0, 2, 1, 1, 0, 1],
  ['ruby', 0, 2, 0, 1, 0, 2],
  ['ruby', 0, 1, 0, 0, 1, 3],
  ['onyx', 0, 0, 0, 2, 1, 0],
  ['onyx', 0, 0, 0, 3, 0, 0],
  ['onyx', 0, 1, 1, 1, 1, 0],
  ['onyx', 0, 2, 0, 2, 0, 0],
  ['onyx', 1, 0, 4, 0, 0, 0],
  ['onyx', 0, 1, 2, 1, 1, 0],
  ['onyx', 0, 2, 2, 0, 1, 0],
  ['onyx', 0, 0, 0, 1, 3, 1]
]

const TIER_2: RawCard[] = [
  ['diamond', 2, 0, 0, 0, 5, 0],
  ['diamond', 3, 6, 0, 0, 0, 0],
  ['diamond', 1, 0, 0, 3, 2, 2],
  ['diamond', 2, 0, 0, 1, 4, 2],
  ['diamond', 1, 2, 3, 0, 3, 0],
  ['diamond', 2, 0, 0, 0, 5, 3],
  ['sapphire', 2, 0, 5, 0, 0, 0],
  ['sapphire', 3, 0, 6, 0, 0, 0],
  ['sapphire', 1, 0, 2, 2, 3, 0],
  ['sapphire', 2, 2, 0, 0, 1, 4],
  ['sapphire', 1, 0, 2, 3, 0, 3],
  ['sapphire', 2, 5, 3, 0, 0, 0],
  ['emerald', 2, 0, 0, 5, 0, 0],
  ['emerald', 3, 0, 0, 6, 0, 0],
  ['emerald', 1, 2, 3, 0, 0, 2],
  ['emerald', 1, 3, 0, 2, 3, 0],
  ['emerald', 2, 4, 2, 0, 0, 1],
  ['emerald', 2, 0, 5, 3, 0, 0],
  ['ruby', 2, 0, 0, 0, 0, 5],
  ['ruby', 3, 0, 0, 0, 6, 0],
  ['ruby', 1, 2, 0, 0, 2, 3],
  ['ruby', 2, 1, 4, 2, 0, 0],
  ['ruby', 1, 0, 3, 0, 2, 3],
  ['ruby', 2, 3, 0, 0, 0, 5],
  ['onyx', 2, 5, 0, 0, 0, 0],
  ['onyx', 3, 0, 0, 0, 0, 6],
  ['onyx', 1, 3, 2, 2, 0, 0],
  ['onyx', 2, 0, 1, 4, 2, 0],
  ['onyx', 1, 3, 0, 3, 0, 2],
  ['onyx', 2, 0, 0, 5, 3, 0]
]

const TIER_3: RawCard[] = [
  ['diamond', 4, 0, 0, 0, 0, 7],
  ['diamond', 5, 3, 0, 0, 0, 7],
  ['diamond', 4, 3, 0, 0, 3, 6],
  ['diamond', 3, 0, 3, 3, 5, 3],
  ['sapphire', 4, 7, 0, 0, 0, 0],
  ['sapphire', 5, 7, 3, 0, 0, 0],
  ['sapphire', 4, 6, 3, 0, 0, 3],
  ['sapphire', 3, 3, 0, 3, 3, 5],
  ['emerald', 4, 0, 7, 0, 0, 0],
  ['emerald', 5, 0, 7, 3, 0, 0],
  ['emerald', 4, 3, 6, 3, 0, 0],
  ['emerald', 3, 5, 3, 0, 3, 3],
  ['ruby', 4, 0, 0, 7, 0, 0],
  ['ruby', 5, 0, 0, 7, 3, 0],
  ['ruby', 4, 0, 3, 6, 3, 0],
  ['ruby', 3, 3, 5, 3, 0, 3],
  ['onyx', 4, 0, 0, 0, 7, 0],
  ['onyx', 5, 0, 0, 0, 7, 3],
  ['onyx', 4, 0, 0, 3, 6, 3],
  ['onyx', 3, 3, 3, 5, 3, 0]
]

function makeCards(tier: Tier, rows: RawCard[]): DevelopmentCard[] {
  return rows.map(([bonus, prestige, diamond, sapphire, emerald, ruby, onyx], index) => ({
    id: `t${tier}-${String(index + 1).padStart(2, '0')}`,
    tier,
    bonus,
    prestige,
    cost: { diamond, sapphire, emerald, ruby, onyx },
    artVariant: index % 6
  }))
}

export const CARDS_BY_TIER: Record<Tier, DevelopmentCard[]> = {
  1: makeCards(1, TIER_1),
  2: makeCards(2, TIER_2),
  3: makeCards(3, TIER_3)
}

const nobleRows: Array<[string, string, Partial<Cost>]> = [
  ['伊莎贝拉', '翡翠宫廷', { sapphire: 3, emerald: 3, ruby: 3 }],
  ['洛伦佐', '星辉议会', { diamond: 3, sapphire: 3, emerald: 3 }],
  ['卡特琳娜', '蔷薇使节', { emerald: 3, ruby: 3, onyx: 3 }],
  ['奥古斯特', '黑曜公爵', { diamond: 3, ruby: 3, onyx: 3 }],
  ['塞拉菲娜', '苍蓝女爵', { diamond: 3, sapphire: 3, onyx: 3 }],
  ['阿德里安', '双海领主', { sapphire: 4, emerald: 4 }],
  ['维奥拉', '昼夜监护人', { diamond: 4, onyx: 4 }],
  ['马尔切洛', '赤翠执政官', { emerald: 4, ruby: 4 }],
  ['埃莉诺', '焰影侯爵', { ruby: 4, onyx: 4 }],
  ['朱利安', '霜蓝伯爵', { diamond: 4, sapphire: 4 }]
]

export const NOBLES: Noble[] = nobleRows.map(([name, title, partial], index) => ({
  id: `noble-${index + 1}`,
  name,
  title,
  prestige: 3,
  requirement: { ...emptyCost(), ...partial },
  artVariant: index
}))

export const TIERS: Tier[] = [1, 2, 3]

export function costEntries(cost: Cost): Array<[BaseGem, number]> {
  return BASE_GEMS.filter((color) => cost[color] > 0).map((color) => [color, cost[color]])
}

export function bagEntries(bag: ResourceBag): Array<[keyof ResourceBag, number]> {
  return TOKEN_GEMS.map((color) => [color, bag[color]])
}

