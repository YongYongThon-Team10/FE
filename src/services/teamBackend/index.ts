import { createTeamBackend } from './client'

// Separate from the old proposal API and Kakao proxy. Opt-in only after BE QA.
export const teamBackend = createTeamBackend({
  baseUrl: import.meta.env.VITE_TEAM_API_BASE_URL ?? '',
})
