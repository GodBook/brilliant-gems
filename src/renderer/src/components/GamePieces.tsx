import { BookmarkPlus, LockKeyhole, ShoppingBag } from 'lucide-react'
import { canAfford } from '../../../game/engine'
import { costEntries, GEM_META } from '../../../game/data'
import type {
  BaseGem,
  DevelopmentCard,
  GameState,
  GemColor,
  Noble,
  PlayerState,
  Tier
} from '../../../game/types'

export function GemMark({ color, size = 'normal' }: { color: GemColor; size?: 'small' | 'normal' | 'large' }) {
  return (
    <span className={`gem-mark gem-${color} gem-${size}`} aria-hidden="true">
      <img src={`assets/gem-${color}.svg`} alt="" draggable={false} />
    </span>
  )
}

export function GemAmount({ color, count, subtle = false }: { color: GemColor; count: number; subtle?: boolean }) {
  return (
    <span className={`gem-amount ${subtle ? 'is-subtle' : ''}`} aria-label={`${GEM_META[color].label} ${count}`}>
      <GemMark color={color} size="small" />
      <b>{count}</b>
    </span>
  )
}

interface CardProps {
  card: DevelopmentCard
  player?: PlayerState
  selected?: boolean
  compact?: boolean
  hidden?: boolean
  disabled?: boolean
  onSelect?: () => void
}

export function DevelopmentCardView({
  card,
  player,
  selected = false,
  compact = false,
  hidden = false,
  disabled = false,
  onSelect
}: CardProps) {
  if (hidden) {
    return (
      <div className="development-card card-hidden" aria-label="隐藏的保留牌">
        <LockKeyhole size={20} aria-hidden="true" />
        <span>暗牌</span>
      </div>
    )
  }
  const affordable = player ? canAfford(player, card) : false
  const Tag = onSelect ? 'button' : 'div'
  return (
    <Tag
      className={`development-card tier-${card.tier} bonus-${card.bonus} ${selected ? 'is-selected' : ''} ${affordable ? 'is-affordable' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={onSelect}
      disabled={onSelect ? disabled : undefined}
      aria-pressed={onSelect ? selected : undefined}
      aria-label={`${card.tier} 阶${GEM_META[card.bonus].label}发展卡，${card.prestige} 点威望`}
      type={onSelect ? 'button' : undefined}
    >
      <div className={`card-art art-${card.artVariant}`}>
        <span className="card-prestige">{card.prestige || ''}</span>
        <GemMark color={card.bonus} size={compact ? 'small' : 'normal'} />
      </div>
      <div className="card-cost" aria-label="购买成本">
        {costEntries(card.cost).map(([color, amount]) => (
          <GemAmount key={color} color={color} count={amount} />
        ))}
      </div>
      {affordable && !compact ? <span className="affordable-mark"><ShoppingBag size={12} />可购</span> : null}
    </Tag>
  )
}

export function DeckCard({
  tier,
  count,
  selected,
  disabled,
  onSelect
}: {
  tier: Tier
  count: number
  selected: boolean
  disabled: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`deck-card tier-${tier} ${selected ? 'is-selected' : ''}`}
      disabled={disabled || count === 0}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`保留 ${tier} 阶牌库顶牌，剩余 ${count} 张`}
    >
      <BookmarkPlus size={16} aria-hidden="true" />
      <strong>{tier === 1 ? 'I' : tier === 2 ? 'II' : 'III'}</strong>
      <span>{count}</span>
    </button>
  )
}

export function NobleTile({
  noble,
  eligible = false,
  selected = false,
  onSelect
}: {
  noble: Noble
  eligible?: boolean
  selected?: boolean
  onSelect?: () => void
}) {
  const Tag = onSelect ? 'button' : 'div'
  return (
    <Tag
      className={`noble-tile noble-${noble.artVariant % 5} ${eligible ? 'is-eligible' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      type={onSelect ? 'button' : undefined}
      aria-label={`${noble.name}，${noble.title}，价值 3 点威望`}
    >
      <div className="noble-portrait" aria-hidden="true">
        <span>{noble.name.slice(0, 1)}</span>
      </div>
      <div className="noble-copy">
        <strong>{noble.name}</strong>
        <span>{noble.title}</span>
      </div>
      <b className="noble-points">3</b>
      <div className="noble-cost">
        {costEntries(noble.requirement).map(([color, amount]) => (
          <GemAmount key={color} color={color} count={amount} subtle />
        ))}
      </div>
    </Tag>
  )
}

export function PlayerStrip({ player, active }: { player: PlayerState; active: boolean }) {
  return (
    <section className={`player-strip ${active ? 'is-active' : ''}`} aria-label={`${player.name}的状态`}>
      <div className="player-identity">
        <span className="player-seal">{player.name.slice(0, 1)}</span>
        <div>
          <strong>{player.name}</strong>
          <span>{player.difficulty === 'easy' ? '简单' : player.difficulty === 'hard' ? '困难' : '普通'} AI</span>
        </div>
      </div>
      <div className="player-score"><b>{player.prestige}</b><span>威望</span></div>
      <div className="mini-assets" aria-label="永久折扣">
        {(['diamond', 'sapphire', 'emerald', 'ruby', 'onyx'] as BaseGem[]).map((color) => (
          <GemAmount key={color} color={color} count={player.bonuses[color]} subtle />
        ))}
      </div>
      <div className="strip-meta">
        <span>{player.purchased.length} 张发展卡</span>
        <span>{player.reserved.length} 张保留</span>
        <span>{totalPlayerTokens(player)} 枚筹码</span>
      </div>
      {active ? <span className="turn-indicator">行动中</span> : null}
    </section>
  )
}

function totalPlayerTokens(player: PlayerState): number {
  return Object.values(player.tokens).reduce((sum, value) => sum + value, 0)
}

export function MarketRows({
  game,
  selectedCardId,
  selectedDeck,
  interactive,
  onCard,
  onDeck
}: {
  game: GameState
  selectedCardId: string | null
  selectedDeck: Tier | null
  interactive: boolean
  onCard: (card: DevelopmentCard) => void
  onDeck: (tier: Tier) => void
}) {
  const player = game.players[game.currentPlayer]
  return (
    <div className="market-rows" aria-label="发展卡市场">
      {([3, 2, 1] as Tier[]).map((tier) => (
        <div className="market-row" key={tier}>
          <DeckCard
            tier={tier}
            count={game.decks[tier].length}
            selected={selectedDeck === tier}
            disabled={!interactive || player.reserved.length >= 3}
            onSelect={() => onDeck(tier)}
          />
          {game.market[tier].map((card) => (
            <DevelopmentCardView
              key={card.id}
              card={card}
              player={player}
              selected={selectedCardId === card.id}
              disabled={!interactive}
              onSelect={() => onCard(card)}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

