import { INVALID_MOVE } from 'boardgame.io/core'
import type { Game } from 'boardgame.io'
import { applyMove, setupGame } from './engine'
import type { GameConfig, GameState, Move } from './types'

export const DEFAULT_GAME_CONFIG: GameConfig = {
  seed: 20260729,
  playerName: '玩家',
  aiDifficulties: ['normal'],
  targetPrestige: 15,
  playerSeat: 1
}

export const SplendorBoardgame: Game<GameState> = {
  name: 'brilliant-gems',
  setup: () => setupGame(DEFAULT_GAME_CONFIG),
  moves: {
    commitMove: ({ G }, move: Move) => {
      const result = applyMove(G, move)
      return result.ok ? result.state : INVALID_MOVE
    }
  },
  endIf: ({ G }) => (G.result ? G.result : undefined)
}
