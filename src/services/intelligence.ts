import { teamBackend } from './teamBackend'
import { mockCrowding, mockRecommendations } from '../data/intelligenceDemo'
import { parseCrowding, parseRecommendations } from '../domain/personalization'
import type { RecommendationRequest } from '../domain/personalization'
import { parseTaste } from '../domain/taste'
import type { TasteProfile } from '../domain/taste'

const configuredMode = import.meta.env.VITE_INTELLIGENCE_MODE ?? 'mock'
if (!['mock', 'api'].includes(configuredMode))
  throw new Error('추천 연결 모드는 mock 또는 api로 설정해 주세요.')
export const intelligenceMode = configuredMode as 'mock' | 'api'
export const intelligence = {
  async recommend(input: RecommendationRequest, signal: AbortSignal) {
    signal.throwIfAborted()
    const response =
      intelligenceMode === 'mock'
        ? mockRecommendations(input)
        : await teamBackend.personalizedRecommendations(input, signal)
    signal.throwIfAborted()
    return parseRecommendations(response)
  },
  async crowding(placeId: string, at: string, signal: AbortSignal) {
    signal.throwIfAborted()
    return parseCrowding(
      intelligenceMode === 'mock'
        ? mockCrowding(placeId, at)
        : await teamBackend.estimateCrowding(placeId, at, signal),
    )
  },
  async loadTaste(signal: AbortSignal) {
    return parseTaste(await teamBackend.tasteProfile(signal))
  },
  async saveTaste(profile: TasteProfile, signal?: AbortSignal) {
    return parseTaste(await teamBackend.saveTasteProfile(profile, signal))
  },
}
