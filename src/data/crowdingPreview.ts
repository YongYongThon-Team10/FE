import type { CrowdingEstimate, CrowdingWindow } from '@/domain/personalization'
const previewAt = '2026-11-21T14:10:00+09:00'

// UI fixtures only: stable across search, map selection, and course planning.
export function previewCrowding(key: string): CrowdingEstimate {
  const index =
    Array.from(key).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 4
  const initialPeople = [56, 112, 152, 184][index]
  let previous = initialPeople - 6
  const windows: CrowdingWindow[] = [0, 1, 2, 3].map((step) => {
    const people = Math.max(0, initialPeople + [0, 8, 16, -4][step])
    const percent = people / 2
    const level =
      percent < 40
        ? 'relaxed'
        : percent < 65
          ? 'normal'
          : percent < 85
            ? 'slightly_busy'
            : 'busy'
    const window: CrowdingWindow = {
      at: new Date(Date.parse(previewAt) + step * 600000).toISOString(),
      previousPeople: previous,
      inflowPeople: Math.max(people - previous, 0) + 4,
      outflowPeople: Math.max(previous - people, 0) + 4,
      estimatedPeople: people,
      occupancyPercent: percent,
      level,
      label: {
        relaxed: '여유',
        normal: '보통',
        slightly_busy: '약간 붐빔',
        busy: '혼잡',
      }[level],
    }
    previous = people
    return window
  })
  return {
    placeId: `preview:${key}`,
    dataMode: 'simulation',
    predictionSource: 'scenario_mock',
    asOf: windows[0].at,
    generatedAt: windows[0].at,
    confidence: 'low',
    capacity: { people: 200, basis: 'ui_preview_capacity' },
    current: windows[0],
    forecast: windows.slice(1),
    warnings: [],
  }
}
