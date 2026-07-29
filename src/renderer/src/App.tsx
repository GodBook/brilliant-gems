import { AlertCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/ipc'
import { chooseAiMove } from '../../game/ai'
import { applyMove, setupGame } from '../../game/engine'
import type { GameConfig, GameState, Move, SaveSnapshotV1 } from '../../game/types'
import { gameAudio, type SoundName } from './audio'
import { GameBoard } from './components/GameBoard'
import { MainMenu, RulesScreen, SettingsScreen, SetupScreen } from './components/Screens'
import { clearSave, loadSave, loadSettings, saveGame, saveSettings } from './storage'

type Screen = 'menu' | 'setup' | 'rules' | 'settings' | 'game'

function soundForMove(move: Move): SoundName {
  if (move.type === 'buy') return 'buy'
  if (move.type === 'chooseNoble') return 'score'
  if (move.type === 'reserveDeck' || move.type === 'reserveMarket') return 'reserve'
  return 'gem'
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [returnScreen, setReturnScreen] = useState<Screen>('menu')
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [savedGame, setSavedGame] = useState<SaveSnapshotV1 | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [config, setConfig] = useState<GameConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [aiThinking, setAiThinking] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const aiTimer = useRef<number | null>(null)

  useEffect(() => {
    void Promise.all([loadSave(), loadSettings()]).then(([saveResult, loadedSettings]) => {
      setSavedGame(saveResult.status === 'ok' ? saveResult.snapshot : null)
      if (saveResult.status === 'corrupt') setToast('存档已损坏，已忽略；仍可开始新游戏')
      if (saveResult.status === 'incompatible') setToast('存档版本不兼容，已忽略；仍可开始新游戏')
      setSettingsState(loadedSettings)
      gameAudio.configure(loadedSettings)
      if (loadedSettings.fullscreen) void window.desktop?.setFullscreen(true)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    gameAudio.configure(settings)
    document.documentElement.dataset.reducedMotion = settings.reducedMotion ? 'true' : 'false'
  }, [settings])

  useEffect(() => {
    const active = screen === 'game' && Boolean(game && !game.result)
    void window.desktop?.setGameActive(active)
  }, [game, screen])

  useEffect(() => {
    if (!game || !config) return
    const snapshot: SaveSnapshotV1 = {
      version: 1,
      savedAt: new Date().toISOString(),
      config,
      game
    }
    const timer = window.setTimeout(() => {
      void saveGame(snapshot).then((result) => {
        if (result.ok) setSavedGame(snapshot)
        else setToast(result.error ?? '自动存档失败')
      })
    }, 80)
    return () => window.clearTimeout(timer)
  }, [config, game])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const commitMove = useCallback((move: Move, fromAi = false) => {
    setGame((current) => {
      if (!current) return current
      const result = applyMove(current, move)
      if (!result.ok) {
        setToast(result.error ?? '当前无法执行该动作')
        gameAudio.play('error')
        return current
      }
      gameAudio.play(soundForMove(move))
      if (!fromAi && result.state.players[result.state.currentPlayer]?.isHuman) setAiThinking(false)
      return result.state
    })
  }, [])

  useEffect(() => {
    if (aiTimer.current) window.clearTimeout(aiTimer.current)
    if (screen !== 'game' || !game || game.result || game.players[game.currentPlayer].isHuman) {
      setAiThinking(false)
      return
    }
    setAiThinking(true)
    const delay = settings.aiSpeed === 0 ? 90 : settings.aiSpeed === 2 ? 420 : 850
    aiTimer.current = window.setTimeout(() => {
      const move = chooseAiMove(game)
      if (move) commitMove(move, true)
      else setToast('AI 没有可执行的合法动作')
    }, delay)
    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current)
    }
  }, [commitMove, game, screen, settings.aiSpeed])

  const updateSettings = (next: AppSettings) => {
    setSettingsState(next)
    gameAudio.configure(next)
    void saveSettings(next)
    if (next.fullscreen !== settings.fullscreen) void window.desktop?.setFullscreen(next.fullscreen)
  }

  const startGame = (nextConfig: GameConfig) => {
    const nextGame = setupGame(nextConfig)
    setConfig(nextConfig)
    setGame(nextGame)
    setScreen('game')
    gameAudio.play('score')
  }

  const openSettings = (from: Screen) => {
    setReturnScreen(from)
    setScreen('settings')
    gameAudio.play('click')
  }

  if (loading) {
    return <main className="loading-screen"><img src="assets/crest.svg" alt="" /><span>正在整理宝石市场</span></main>
  }

  return (
    <>
      {screen === 'menu' ? (
        <MainMenu
          save={savedGame}
          onContinue={() => {
            if (!savedGame) return
            setGame(savedGame.game)
            setConfig(savedGame.config)
            setScreen('game')
            gameAudio.play('click')
          }}
          onNew={() => { setScreen('setup'); gameAudio.play('click') }}
          onRules={() => { setScreen('rules'); gameAudio.play('click') }}
          onSettings={() => openSettings('menu')}
          onQuit={() => window.desktop?.quit() ?? window.close()}
        />
      ) : null}
      {screen === 'setup' ? <SetupScreen onBack={() => setScreen('menu')} onStart={startGame} /> : null}
      {screen === 'rules' ? <RulesScreen onBack={() => setScreen('menu')} /> : null}
      {screen === 'settings' ? (
        <SettingsScreen
          settings={settings}
          hasSave={Boolean(savedGame)}
          onChange={updateSettings}
          onClearSave={() => {
            if (!window.confirm('确定删除当前对局存档吗？此操作无法撤销。')) return
            void clearSave().then(() => setSavedGame(null))
          }}
          onBack={() => setScreen(returnScreen)}
        />
      ) : null}
      {screen === 'game' && game ? (
        <GameBoard
          game={game}
          settings={settings}
          aiThinking={aiThinking}
          onMove={(move) => commitMove(move)}
          onSettings={() => openSettings('game')}
          onMenu={() => setScreen('menu')}
          onNewGame={() => setScreen('setup')}
          onSpeedChange={(aiSpeed) => updateSettings({ ...settings, aiSpeed })}
        />
      ) : null}
      {toast ? <div className="toast" role="status"><AlertCircle size={17} />{toast}</div> : null}
    </>
  )
}
