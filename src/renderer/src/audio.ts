import type { AppSettings } from '../../shared/ipc'

export type SoundName = 'click' | 'gem' | 'reserve' | 'buy' | 'score' | 'error'

class GameAudio {
  private context: AudioContext | null = null
  private musicGain: GainNode | null = null
  private effectsGain: GainNode | null = null
  private musicStarted = false
  private settings: AppSettings | null = null

  configure(settings: AppSettings): void {
    this.settings = settings
    if (this.musicGain) this.musicGain.gain.value = settings.musicVolume * 0.08
    if (this.effectsGain) this.effectsGain.gain.value = settings.effectsVolume * 0.18
  }

  private ensureContext(): AudioContext | null {
    if (!this.settings) return null
    this.context ??= new AudioContext()
    if (this.context.state === 'suspended') void this.context.resume()
    if (!this.musicGain || !this.effectsGain) {
      this.musicGain = this.context.createGain()
      this.effectsGain = this.context.createGain()
      this.musicGain.gain.value = this.settings.musicVolume * 0.08
      this.effectsGain.gain.value = this.settings.effectsVolume * 0.18
      this.musicGain.connect(this.context.destination)
      this.effectsGain.connect(this.context.destination)
    }
    if (!this.musicStarted) this.startAmbience()
    return this.context
  }

  private startAmbience(): void {
    if (!this.context || !this.musicGain || this.musicStarted) return
    this.musicStarted = true
    const frequencies = [110, 164.81, 220]
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator()
      const gain = this.context!.createGain()
      oscillator.type = index === 1 ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      gain.gain.value = index === 0 ? 0.35 : 0.14
      oscillator.connect(gain)
      gain.connect(this.musicGain!)
      oscillator.start()
    })
  }

  play(name: SoundName): void {
    const context = this.ensureContext()
    if (!context || !this.effectsGain || !this.settings || this.settings.effectsVolume <= 0) return
    const map: Record<SoundName, [number, number, OscillatorType]> = {
      click: [320, 0.05, 'sine'],
      gem: [520, 0.11, 'triangle'],
      reserve: [240, 0.14, 'sine'],
      buy: [410, 0.18, 'triangle'],
      score: [660, 0.36, 'sine'],
      error: [145, 0.16, 'sawtooth']
    }
    const [frequency, duration, type] = map[name]
    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(frequency * (name === 'score' ? 1.5 : 0.86), now + duration)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.85, now + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(this.effectsGain)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }
}

export const gameAudio = new GameAudio()

