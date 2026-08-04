import {
  ArrowLeft,
  BookOpen,
  BookmarkPlus,
  Bot,
  Check,
  Expand,
  Eye,
  Gamepad2,
  Music2,
  Play,
  ShoppingBag,
  StepForward,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  Volume2,
  X
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { AppSettings } from '../../../shared/ipc'
import type { Difficulty, GameConfig, SaveSnapshotV1 } from '../../../game/types'
import { BASE_GEMS } from '../../../game/types'
import { GemMark } from './GamePieces'

export function MainMenu({
  save,
  onContinue,
  onNew,
  onRules,
  onSettings,
  onQuit
}: {
  save: SaveSnapshotV1 | null
  onContinue: () => void
  onNew: () => void
  onRules: () => void
  onSettings: () => void
  onQuit: () => void
}) {
  return (
    <main className="menu-screen">
      <div className="menu-atmosphere" aria-hidden="true">
        {BASE_GEMS.map((color, index) => (
          <span key={color} className={`orbit-gem orbit-${index}`}><GemMark color={color} size="large" /></span>
        ))}
      </div>
      <section className="menu-stage" aria-labelledby="game-title">
        <img className="brand-crest" src="assets/crest.svg" alt="" />
        <p className="brand-kicker">离线策略桌游</p>
        <h1 id="game-title">璀璨宝石</h1>
        <p className="brand-subtitle">收集珍石，构筑商路，赢得贵族青睐。</p>
        <nav className="menu-actions" aria-label="主菜单">
          {save ? (
            <button type="button" className="primary-command" onClick={onContinue}>
              <StepForward size={19} />
              <span><strong>继续游戏</strong><small>第 {save.game.round} 轮 · {save.game.players.length} 人桌</small></span>
            </button>
          ) : null}
          <button type="button" className={save ? 'menu-command' : 'primary-command'} onClick={onNew}>
            <Play size={19} />
            <span><strong>新游戏</strong><small>配置 AI 席位与难度</small></span>
          </button>
          <button type="button" className="menu-command" onClick={onRules}><BookOpen size={19} /><span><strong>游戏规则</strong></span></button>
          <button type="button" className="menu-command" onClick={onSettings}><Settings size={19} /><span><strong>设置</strong></span></button>
          <button type="button" className="quiet-command" onClick={onQuit}><X size={18} />退出游戏</button>
        </nav>
      </section>
      <footer className="menu-footer"><span>完整基础版</span><span>1.1.0 · 本地离线</span></footer>
    </main>
  )
}

const difficulties: Array<{ value: Difficulty; label: string; detail: string }> = [
  { value: 'easy', label: '简单', detail: '偏好明确，偶尔随性' },
  { value: 'normal', label: '普通', detail: '权衡成本与贵族进度' },
  { value: 'hard', label: '困难', detail: '采样未知牌并搜索后续' }
]

export function SetupScreen({ onBack, onStart }: { onBack: () => void; onStart: (config: GameConfig) => void }) {
  const [playerName, setPlayerName] = useState('玩家')
  const [aiCount, setAiCount] = useState(1)
  const [aiLevels, setAiLevels] = useState<Difficulty[]>(['normal', 'normal', 'normal'])
  const [targetPrestige, setTargetPrestige] = useState('15')
  const [playerSeat, setPlayerSeat] = useState(1)
  const totalPlayers = aiCount + 1
  const normalizedPlayerSeat = Math.min(totalPlayers, Math.max(1, playerSeat))
  const normalizedTargetPrestige = Math.min(50, Math.max(5, Math.trunc(Number(targetPrestige) || 15)))
  const updateDifficulty = (index: number, difficulty: Difficulty) => {
    const next = [...aiLevels]
    next[index] = difficulty
    setAiLevels(next)
  }

  return (
    <main className="subscreen setup-screen">
      <ScreenHeader title="新游戏" subtitle="安排你的宝石商会席位" onBack={onBack} />
      <div className="setup-layout">
        <section className="setup-block">
          <div className="section-heading"><Gamepad2 size={20} /><div><h2>玩家席位</h2><p>1 号位先手，可自由选择你的座位。</p></div></div>
          <label className="field-label" htmlFor="player-name">玩家名称</label>
          <input id="player-name" className="text-input" maxLength={12} value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
          <label className="field-label">AI 数量</label>
          <div className="segmented" role="group" aria-label="AI 数量">
            {[1, 2, 3].map((count) => (
              <button type="button" key={count} className={aiCount === count ? 'is-active' : ''} onClick={() => { setAiCount(count); setPlayerSeat((seat) => Math.min(seat, count + 1)) }}>
                {count} 个 AI
              </button>
            ))}
          </div>
          <label className="field-label">你的号位</label>
          <div className="segmented seat-selector" role="group" aria-label="你的号位">
            {Array.from({ length: totalPlayers }, (_, index) => index + 1).map((seat) => (
              <button type="button" key={seat} className={normalizedPlayerSeat === seat ? 'is-active' : ''} onClick={() => setPlayerSeat(seat)}>{seat} 号</button>
            ))}
          </div>
          <div className="table-preview" aria-label={`${aiCount + 1} 人桌预览`}>
            {Array.from({ length: totalPlayers }, (_, index) => {
              const seat = index + 1
              const aiNumber = seat < normalizedPlayerSeat ? seat : seat - 1
              return (
                <span key={seat} className={seat === normalizedPlayerSeat ? 'human-seat' : 'ai-seat'}>{seat === normalizedPlayerSeat ? '你' : `AI ${aiNumber}`}</span>
              )
            })}
          </div>
          <div className="target-setting">
            <div className="section-heading compact-heading"><Trophy size={20} /><div><h2>胜利目标</h2><p>达到目标威望后完成当前轮，再结算胜负。</p></div></div>
            <label className="field-label" htmlFor="target-prestige">所需威望</label>
            <div className="number-input-wrap"><input id="target-prestige" className="number-input" type="number" min="5" max="50" step="1" value={targetPrestige} onChange={(event) => setTargetPrestige(event.target.value)} onBlur={() => setTargetPrestige(String(normalizedTargetPrestige))} /><span>点</span></div>
            <div className="target-presets" role="group" aria-label="常用胜利目标">
              {[12, 15, 18, 21].map((value) => <button type="button" key={value} className={normalizedTargetPrestige === value ? 'is-active' : ''} onClick={() => setTargetPrestige(String(value))}>{value}</button>)}
            </div>
          </div>
        </section>

        <section className="setup-block ai-config">
          <div className="section-heading"><Bot size={20} /><div><h2>对手难度</h2><p>每个席位可以单独设置。</p></div></div>
          {Array.from({ length: aiCount }, (_, index) => {
            const aiSeat = index < normalizedPlayerSeat - 1 ? index + 1 : index + 2
            return (
              <div className="ai-row" key={index}>
                <div className="ai-label"><span>{aiSeat}</span><strong>{['灰烬商会', '翠庭工坊', '绯红银行'][index]}</strong></div>
                <div className="difficulty-options">
                  {difficulties.map((difficulty) => (
                    <button
                      type="button"
                      key={difficulty.value}
                      className={aiLevels[index] === difficulty.value ? 'is-active' : ''}
                      onClick={() => updateDifficulty(index, difficulty.value)}
                      title={difficulty.detail}
                    >
                      {aiLevels[index] === difficulty.value ? <Check size={14} /> : null}{difficulty.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
          <button
            type="button"
            className="start-game-button"
            onClick={() => onStart({ seed: Date.now() >>> 0, playerName: playerName.trim() || '玩家', aiDifficulties: aiLevels.slice(0, aiCount), targetPrestige: normalizedTargetPrestige, playerSeat: normalizedPlayerSeat })}
          >
            <Sparkles size={19} />开始对局
          </button>
        </section>
      </div>
    </main>
  )
}

export function RulesScreen({ onBack }: { onBack: () => void }) {
  return (
    <main className="subscreen rules-screen">
      <ScreenHeader title="游戏规则" subtitle="完整经典基础版" onBack={onBack} />
      <div className="rules-grid">
        <article><span className="rule-index">目标</span><h2>达到设定的威望</h2><p>购买发展卡、获得永久宝石折扣，并满足贵族条件。新游戏开始前可以把目标设为 5 到 50 点，默认是 15 点。</p></article>
        <article><span className="rule-index">行动</span><h2>每回合选择一项</h2><p>拿取三种不同颜色；或在该颜色至少剩四枚时拿两枚同色；或购买一张发展卡；或保留一张卡并尽量获得一枚黄金。</p></article>
        <article><span className="rule-index">购买</span><h2>折扣永久生效</h2><p>发展卡右上角的宝石会永久降低同色成本。筹码先支付对应颜色，不足部分自动用黄金代替。</p></article>
        <article><span className="rule-index">保留</span><h2>最多保留三张</h2><p>可以保留市场中的公开卡，也可以从任一牌库暗抽。公开来源保持可见，暗抽卡只对持有者可见。</p></article>
        <article><span className="rule-index">贵族</span><h2>满足条件即来访</h2><p>回合结束时，若永久折扣满足贵族要求，获得 3 点威望；同时满足多位时由你选择一位。</p></article>
        <article><span className="rule-index">决胜</span><h2>同分比较发展卡数</h2><p>威望相同时，购买发展卡更少者获胜；若仍完全相同，则共同获胜。保留牌不计入数量。</p></article>
      </div>
      <div className="rules-gems" aria-hidden="true">{BASE_GEMS.map((color) => <GemMark key={color} color={color} size="large" />)}</div>
    </main>
  )
}

export function SettingsScreen({
  settings,
  hasSave,
  onChange,
  onClearSave,
  onBack
}: {
  settings: AppSettings
  hasSave: boolean
  onChange: (settings: AppSettings) => void
  onClearSave: () => void
  onBack: () => void
}) {
  return (
    <main className="subscreen settings-screen">
      <ScreenHeader title="设置" subtitle="声音、显示与本地数据" onBack={onBack} />
      <div className="settings-list">
        <SettingSlider icon={<Music2 />} label="背景氛围" value={settings.musicVolume} onChange={(musicVolume) => onChange({ ...settings, musicVolume })} />
        <SettingSlider icon={<Volume2 />} label="操作音效" value={settings.effectsVolume} onChange={(effectsVolume) => onChange({ ...settings, effectsVolume })} />
        <SettingToggle icon={<Sparkles />} label="减少动态效果" checked={settings.reducedMotion} onChange={(reducedMotion) => onChange({ ...settings, reducedMotion })} />
        <SettingToggle icon={<Expand />} label="全屏显示" checked={settings.fullscreen} onChange={(fullscreen) => onChange({ ...settings, fullscreen })} />
        <SettingToggle icon={<Eye />} label="显示对手筹码数量" checked={settings.showOpponentTokens} onChange={(showOpponentTokens) => onChange({ ...settings, showOpponentTokens })} />
        <SettingToggle icon={<BookmarkPlus />} label="显示对手保留牌" checked={settings.showOpponentReserved} onChange={(showOpponentReserved) => onChange({ ...settings, showOpponentReserved })} />
        <SettingToggle icon={<ShoppingBag />} label="标出可购买的牌" checked={settings.markAffordableCards} onChange={(markAffordableCards) => onChange({ ...settings, markAffordableCards })} />
        <div className="setting-row danger-setting">
          <Trash2 size={20} />
          <div><strong>当前对局存档</strong><span>{hasSave ? '已保存，可从主菜单继续' : '没有可继续的对局'}</span></div>
          <button type="button" disabled={!hasSave} onClick={onClearSave}>删除存档</button>
        </div>
      </div>
    </main>
  )
}

function ScreenHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <header className="screen-header">
      <button type="button" className="icon-button" onClick={onBack} aria-label="返回" title="返回"><ArrowLeft /></button>
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <img src="assets/crest.svg" alt="" />
    </header>
  )
}

function SettingSlider({ icon, label, value, onChange }: { icon: ReactNode; label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="setting-row">
      {icon}<div><strong>{label}</strong><span>{Math.round(value * 100)}%</span></div>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function SettingToggle({ icon, label, checked, onChange }: { icon: ReactNode; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="setting-row">
      {icon}<div><strong>{label}</strong><span>{checked ? '已开启' : '已关闭'}</span></div>
      <input className="switch-input" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  )
}
