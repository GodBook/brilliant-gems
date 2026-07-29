import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChevronRight,
  CircleMinus,
  CirclePlus,
  Crown,
  FastForward,
  Gauge,
  HandCoins,
  History,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  Trophy
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { AppSettings } from '../../../shared/ipc'
import { BASE_GEMS, TOKEN_GEMS, type BaseGem, type CardSource, type GameState, type Move, type ResourceBag, type Tier } from '../../../game/types'
import { canAfford, getCardFromSource, totalTokens } from '../../../game/engine'
import { GEM_META, emptyBag } from '../../../game/data'
import { DevelopmentCardView, GemAmount, GemMark, MarketRows, NobleTile, PlayerStrip } from './GamePieces'

export function GameBoard({
  game,
  settings,
  aiThinking,
  onMove,
  onSettings,
  onMenu,
  onNewGame,
  onSpeedChange
}: {
  game: GameState
  settings: AppSettings
  aiThinking: boolean
  onMove: (move: Move) => void
  onSettings: () => void
  onMenu: () => void
  onNewGame: () => void
  onSpeedChange: (speed: 0 | 1 | 2) => void
}) {
  const [selectedGems, setSelectedGems] = useState<BaseGem[]>([])
  const [selectedCard, setSelectedCard] = useState<CardSource | null>(null)
  const [selectedDeck, setSelectedDeck] = useState<Tier | null>(null)
  const [logOpen, setLogOpen] = useState(true)
  const player = game.players[game.currentPlayer]
  const human = game.players[0]
  const isHumanTurn = player.isHuman && !game.result
  const canUseBoard = isHumanTurn && !game.pending
  const chosenCard = selectedCard ? getCardFromSource(game, selectedCard) : undefined
  const availableColors = BASE_GEMS.filter((color) => game.supply[color] > 0)
  const requiredDistinct = Math.min(3, availableColors.length)

  useEffect(() => {
    setSelectedGems([])
    setSelectedCard(null)
    setSelectedDeck(null)
  }, [game.actionCounter, game.currentPlayer])

  const selectGem = (color: BaseGem) => {
    if (!canUseBoard || game.supply[color] <= 0) return
    setSelectedCard(null)
    setSelectedDeck(null)
    setSelectedGems((current) => {
      if (current.includes(color)) return current.filter((item) => item !== color)
      return current.length < 3 ? [...current, color] : [...current.slice(1), color]
    })
  }

  const selectMarketCard = (card: { id: string; tier: Tier }) => {
    setSelectedGems([])
    setSelectedDeck(null)
    setSelectedCard((current) =>
      current?.kind === 'market' && current.cardId === card.id
        ? null
        : { kind: 'market', tier: card.tier, cardId: card.id }
    )
  }

  const selectReserve = (cardId: string) => {
    setSelectedGems([])
    setSelectedDeck(null)
    setSelectedCard((current) =>
      current?.kind === 'reserved' && current.cardId === cardId ? null : { kind: 'reserved', cardId }
    )
  }

  const handleMenu = () => {
    if (window.confirm('当前对局已经自动保存。返回主菜单吗？')) onMenu()
  }

  return (
    <main className={`game-screen ${settings.reducedMotion ? 'reduce-motion' : ''}`}>
      <header className="game-toolbar">
        <button type="button" className="icon-button" onClick={handleMenu} aria-label="返回主菜单" title="返回主菜单"><ArrowLeft /></button>
        <div className="game-title-lockup"><img src="assets/crest.svg" alt="" /><strong>璀璨宝石</strong><span>第 {game.round} 轮</span></div>
        <div className="turn-banner" aria-live="polite">
          <span className={`turn-dot ${isHumanTurn ? 'human' : 'ai'}`} />
          <strong>{game.result ? '对局结束' : isHumanTurn ? '你的回合' : `${player.name}思考中`}</strong>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="speed-button"
            onClick={() => onSpeedChange(settings.aiSpeed === 1 ? 2 : settings.aiSpeed === 2 ? 0 : 1)}
            title="切换 AI 动画速度"
          >
            {settings.aiSpeed === 0 ? <FastForward size={17} /> : <Gauge size={17} />}
            {settings.aiSpeed === 0 ? '立即' : `${settings.aiSpeed}×`}
          </button>
          <button type="button" className="icon-button" onClick={() => setLogOpen((open) => !open)} aria-label="回合记录" title="回合记录"><History /></button>
          <button type="button" className="icon-button" onClick={onSettings} aria-label="设置" title="设置"><Settings /></button>
        </div>
      </header>

      <div className="opponents-row">
        {game.players.slice(1).map((opponent, index) => (
          <PlayerStrip key={opponent.id} player={opponent} active={game.currentPlayer === index + 1 && !game.result} />
        ))}
      </div>

      <div className={`game-workspace ${logOpen ? '' : 'log-collapsed'}`}>
        <aside className="bank-panel" aria-label="宝石供给">
          <div className="panel-label"><HandCoins size={16} />宝石供给</div>
          <div className="bank-gems">
            {BASE_GEMS.map((color) => (
              <button
                type="button"
                key={color}
                className={`bank-gem gem-${color} ${selectedGems.includes(color) ? 'is-selected' : ''}`}
                disabled={!canUseBoard || game.supply[color] === 0}
                onClick={() => selectGem(color)}
                aria-pressed={selectedGems.includes(color)}
              >
                <GemMark color={color} />
                <span>{GEM_META[color].label}</span>
                <b>{game.supply[color]}</b>
              </button>
            ))}
            <div className="bank-gem gem-gold is-static"><GemMark color="gold" /><span>黄金</span><b>{game.supply.gold}</b></div>
          </div>
          <div className="bank-selection">
            <span>已选择 {selectedGems.length}/{requiredDistinct}</span>
            <div className="bank-buttons">
              <button
                type="button"
                disabled={selectedGems.length !== requiredDistinct}
                onClick={() => onMove({ type: 'takeDistinct', colors: selectedGems })}
              ><Check size={15} />拿取所选</button>
              <button
                type="button"
                disabled={selectedGems.length !== 1 || game.supply[selectedGems[0]] < 4}
                onClick={() => onMove({ type: 'takeDouble', color: selectedGems[0] })}
              ><Sparkles size={15} />拿取两枚</button>
            </div>
          </div>
        </aside>

        <section className="central-board">
          <div className="nobles-row" aria-label="到访贵族">
            <div className="panel-label"><Crown size={16} />贵族席</div>
            <div className="nobles-list">
              {game.nobles.map((noble) => <NobleTile key={noble.id} noble={noble} />)}
            </div>
          </div>
          <MarketRows
            game={game}
            selectedCardId={selectedCard?.cardId ?? null}
            selectedDeck={selectedDeck}
            interactive={canUseBoard}
            onCard={selectMarketCard}
            onDeck={(tier) => {
              setSelectedGems([])
              setSelectedCard(null)
              setSelectedDeck((current) => (current === tier ? null : tier))
            }}
          />
          <div className="market-action-bar" aria-live="polite">
            {chosenCard ? (
              <>
                <div className="action-summary"><GemMark color={chosenCard.bonus} size="small" /><span>{chosenCard.tier} 阶发展卡</span><b>{chosenCard.prestige} 威望</b></div>
                <button type="button" className="buy-command" disabled={!canAfford(human, chosenCard)} onClick={() => onMove({ type: 'buy', source: selectedCard! })}>
                  <ShoppingBag size={16} />购买
                </button>
                {selectedCard?.kind === 'market' ? (
                  <button type="button" disabled={human.reserved.length >= 3} onClick={() => onMove({ type: 'reserveMarket', tier: selectedCard.tier, cardId: selectedCard.cardId })}>
                    <BookmarkPlus size={16} />保留
                  </button>
                ) : null}
              </>
            ) : selectedDeck ? (
              <>
                <div className="action-summary"><BookmarkPlus size={17} /><span>暗抽 {selectedDeck} 阶牌</span><b>仅自己可见</b></div>
                <button type="button" disabled={human.reserved.length >= 3} onClick={() => onMove({ type: 'reserveDeck', tier: selectedDeck })}><Check size={16} />确认保留</button>
              </>
            ) : (
              <div className="action-idle"><ChevronRight size={16} /><span>{isHumanTurn ? '选择宝石、发展卡或牌库开始行动' : `等待 ${player.name} 完成行动`}</span></div>
            )}
          </div>
        </section>

        {logOpen ? <TurnLog game={game} /> : null}
      </div>

      <PlayerDock game={game} selectedCardId={selectedCard?.cardId ?? null} interactive={canUseBoard} onReserve={selectReserve} />

      {aiThinking ? <div className="ai-thinking" aria-live="polite"><span /><span /><span />{player.name}正在权衡市场</div> : null}
      {game.pending?.kind === 'discard' && game.pending.playerId === human.id ? <DiscardDialog game={game} onMove={onMove} /> : null}
      {game.pending?.kind === 'noble' && game.pending.playerId === human.id ? <NobleDialog game={game} onMove={onMove} /> : null}
      {game.result ? <ResultDialog game={game} onMenu={onMenu} onNewGame={onNewGame} /> : null}
    </main>
  )
}

function PlayerDock({ game, selectedCardId, interactive, onReserve }: { game: GameState; selectedCardId: string | null; interactive: boolean; onReserve: (id: string) => void }) {
  const player = game.players[0]
  return (
    <section className={`player-dock ${game.currentPlayer === 0 && !game.result ? 'is-active' : ''}`} aria-label="你的商会">
      <div className="human-profile"><span className="human-seal">{player.name.slice(0, 1)}</span><div><strong>{player.name}</strong><span>你的商会</span></div><div className="human-score"><b>{player.prestige}</b><span>威望</span></div></div>
      <div className="dock-assets">
        <div><span className="dock-label">筹码 · {totalTokens(player.tokens)}/10</span><div className="asset-row">{TOKEN_GEMS.map((color) => <GemAmount key={color} color={color} count={player.tokens[color]} />)}</div></div>
        <div><span className="dock-label">永久折扣</span><div className="asset-row">{BASE_GEMS.map((color) => <GemAmount key={color} color={color} count={player.bonuses[color]} subtle />)}</div></div>
      </div>
      <div className="reserved-area"><span className="dock-label">保留牌 · {player.reserved.length}/3</span><div className="reserved-list">
        {player.reserved.map(({ card }) => (
          <DevelopmentCardView key={card.id} card={card} player={player} compact selected={selectedCardId === card.id} disabled={!interactive} onSelect={() => onReserve(card.id)} />
        ))}
        {Array.from({ length: 3 - player.reserved.length }, (_, index) => <span key={index} className="reserve-slot" />)}
      </div></div>
      <div className="owned-nobles"><span className="dock-label">贵族</span><div>{player.nobles.map((noble) => <span key={noble.id} title={`${noble.name} · 3 威望`}>{noble.name.slice(0, 1)}</span>)}</div></div>
    </section>
  )
}

function TurnLog({ game }: { game: GameState }) {
  return (
    <aside className="turn-log" aria-label="回合记录">
      <div className="panel-label"><History size={16} />回合记录</div>
      <div className="log-list">
        {[...game.log].reverse().map((entry) => {
          const owner = game.players.find((player) => player.id === entry.playerId)
          return <div key={entry.id} className={`log-entry tone-${entry.tone}`}><span>{entry.round}</span><p><strong>{owner?.name ?? '裁判'}</strong>{entry.text}</p></div>
        })}
      </div>
    </aside>
  )
}

function DiscardDialog({ game, onMove }: { game: GameState; onMove: (move: Move) => void }) {
  const player = game.players[0]
  const needed = game.pending?.kind === 'discard' ? game.pending.count : 0
  const [selected, setSelected] = useState<ResourceBag>(emptyBag())
  const count = totalTokens(selected)
  const adjust = (color: keyof ResourceBag, delta: number) => {
    setSelected((current) => ({
      ...current,
      [color]: Math.max(0, Math.min(player.tokens[color], current[color] + delta))
    }))
  }
  return (
    <div className="modal-scrim"><section className="game-dialog" role="dialog" aria-modal="true" aria-labelledby="discard-title">
      <div className="dialog-icon"><HandCoins /></div><h2 id="discard-title">归还 {needed} 枚筹码</h2><p>回合结束时最多持有 10 枚筹码。</p>
      <div className="discard-grid">{TOKEN_GEMS.map((color) => (
        <div key={color} className="discard-item"><GemMark color={color} /><span>{GEM_META[color].label}</span><small>持有 {player.tokens[color]}</small><div>
          <button type="button" className="icon-button" disabled={selected[color] === 0} onClick={() => adjust(color, -1)} aria-label={`减少${GEM_META[color].label}`}><CircleMinus /></button>
          <b>{selected[color]}</b>
          <button type="button" className="icon-button" disabled={selected[color] >= player.tokens[color] || count >= needed} onClick={() => adjust(color, 1)} aria-label={`增加${GEM_META[color].label}`}><CirclePlus /></button>
        </div></div>
      ))}</div>
      <button type="button" className="dialog-confirm" disabled={count !== needed} onClick={() => onMove({ type: 'discard', tokens: selected })}><Check size={17} />确认归还</button>
    </section></div>
  )
}

function NobleDialog({ game, onMove }: { game: GameState; onMove: (move: Move) => void }) {
  const ids = game.pending?.kind === 'noble' ? game.pending.nobleIds : []
  const nobles = game.nobles.filter((noble) => ids.includes(noble.id))
  const [selected, setSelected] = useState(nobles[0]?.id ?? '')
  return (
    <div className="modal-scrim"><section className="game-dialog noble-dialog" role="dialog" aria-modal="true" aria-labelledby="noble-title">
      <div className="dialog-icon"><Crown /></div><h2 id="noble-title">选择到访贵族</h2><p>你同时满足多位贵族的条件，本回合可以接待其中一位。</p>
      <div className="dialog-nobles">{nobles.map((noble) => <NobleTile key={noble.id} noble={noble} eligible selected={selected === noble.id} onSelect={() => setSelected(noble.id)} />)}</div>
      <button type="button" className="dialog-confirm" onClick={() => onMove({ type: 'chooseNoble', nobleId: selected })}><Check size={17} />接待贵族</button>
    </section></div>
  )
}

function ResultDialog({ game, onMenu, onNewGame }: { game: GameState; onMenu: () => void; onNewGame: () => void }) {
  const winners = game.result?.winnerIds.map((id) => game.players.find((player) => player.id === id)?.name).filter(Boolean) ?? []
  const humanWon = game.result?.winnerIds.includes('player-0')
  const ranking = useMemo(() => [...game.players].sort((a, b) => b.prestige - a.prestige || a.purchased.length - b.purchased.length), [game.players])
  return (
    <div className="modal-scrim result-scrim"><section className="game-dialog result-dialog" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-crown">{humanWon ? <Trophy /> : <Crown />}</div>
      <span className="result-kicker">对局结束</span><h2 id="result-title">{winners.join('、')}获胜</h2>
      <div className="ranking-list">{ranking.map((player, index) => <div key={player.id} className={game.result?.winnerIds.includes(player.id) ? 'is-winner' : ''}><b>{index + 1}</b><span>{player.name}</span><strong>{player.prestige} 威望</strong><small>{player.purchased.length} 张发展卡</small></div>)}</div>
      <div className="dialog-actions"><button type="button" onClick={onMenu}><ArrowLeft size={17} />主菜单</button><button type="button" className="dialog-confirm" onClick={onNewGame}><RotateCcw size={17} />再来一局</button></div>
    </section></div>
  )
}

