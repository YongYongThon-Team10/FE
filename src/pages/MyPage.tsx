import { useEffect, useRef, useState } from 'react'
import { useApp } from '../state/context'
import { categories, categoryNames } from '../domain/models'
import {
  cafeOptions,
  cuisineOptions,
  defaultTaste,
  parseTaste,
} from '../domain/taste'
import type { TasteProfile } from '../domain/taste'
import { intelligence, intelligenceMode } from '../services/intelligence'

export function MyPage() {
  const app = useApp()
  const [draft, setDraft] = useState(app.tasteProfile)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  const toggle = (key: 'cuisines' | 'cafeFeatures', item: string) => {
    const values: string[] = draft[key]
    setDraft(
      parseTaste({
        ...draft,
        [key]: values.includes(item)
          ? values.filter((v) => v !== item)
          : [...values, item],
      }),
    )
  }
  const save = async () => {
    const profile: TasteProfile = {
      ...draft,
      updatedAt: new Date().toISOString(),
    }
    const stored = app.saveTasteProfile(profile)
    setDraft(profile)
    setMessage(
      stored
        ? '이 브라우저에 선호도를 저장했어요. 다음 추천부터 반영돼요.'
        : '현재 화면에 반영했지만 브라우저 저장은 실패했어요.',
    )
    if (intelligenceMode !== 'api' || !app.user) return
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    try {
      const saved = await intelligence.saveTaste(profile, controller.signal)
      if (!controller.signal.aborted) {
        app.saveTasteProfile(saved)
        setDraft(saved)
        setMessage('브라우저와 계정에 선호도를 저장했어요.')
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          `브라우저 반영은 완료했지만 계정 동기화는 실패했어요. ${error instanceof Error ? error.message : '다시 시도해 주세요.'}`,
        )
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  const load = async () => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setBusy(true)
    try {
      const profile = await intelligence.loadTaste(controller.signal)
      if (!controller.signal.aborted) {
        app.saveTasteProfile(profile)
        setDraft(profile)
        setMessage('계정의 선호도를 불러왔어요.')
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : '계정 선호도를 불러오지 못했어요.',
        )
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }
  return (
    <div className="stack personalization-page">
      <section className="panel stack">
        <p className="eyebrow">MY PREFERENCES</p>
        <h1>나의 취향으로 찾는 하루</h1>
        <p>
          {app.user ? `${app.user.name}님의 선호도` : '게스트 선호도'}를 추천에
          반영해요.
        </p>
        <p className="small muted">
          카테고리 관심도와 음식, 카페 취향을 함께 선택해 주세요. 로그인
          계정별로 이 브라우저의 선호도를 구분해 보관해요.
        </p>
        <a className="secondary" href="#/recommendations">
          맞춤 추천 보기
        </a>
      </section>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <section className="panel form-stack">
          <h2>카테고리별 관심도</h2>
          <p className="tiny muted">0은 낮은 관심, 5는 높은 관심이에요.</p>
          {categories.map((category) => (
            <label className="field" key={category}>
              {categoryNames[category]}
              <select
                aria-label={`${categoryNames[category]} 관심도`}
                value={draft.categoryWeights[category]}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    categoryWeights: {
                      ...draft.categoryWeights,
                      [category]: Number(event.target.value),
                    },
                  })
                }
              >
                {[0, 1, 2, 3, 4, 5].map((weight) => (
                  <option key={weight} value={weight}>
                    {weight} / 5
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
        <section className="panel stack">
          <h2>좋아하는 음식</h2>
          <div className="taste-chips">
            {Object.entries(cuisineOptions).map(([key, name]) => (
              <button
                type="button"
                key={key}
                className={
                  draft.cuisines.includes(key as keyof typeof cuisineOptions)
                    ? 'taste-chip selected'
                    : 'taste-chip'
                }
                aria-pressed={draft.cuisines.includes(
                  key as keyof typeof cuisineOptions,
                )}
                onClick={() => toggle('cuisines', key)}
              >
                {name}
              </button>
            ))}
          </div>
          <h2>카페에서 중요하게 보는 것</h2>
          <div className="taste-chips">
            {Object.entries(cafeOptions).map(([key, name]) => (
              <button
                type="button"
                key={key}
                className={
                  draft.cafeFeatures.includes(key as keyof typeof cafeOptions)
                    ? 'taste-chip selected'
                    : 'taste-chip'
                }
                aria-pressed={draft.cafeFeatures.includes(
                  key as keyof typeof cafeOptions,
                )}
                onClick={() => toggle('cafeFeatures', key)}
              >
                {name}
              </button>
            ))}
          </div>
        </section>
        <section className="panel form-stack">
          <h2>추천할 때 고려할 정보</h2>
          <label className="field">
            별점 중요도
            <select
              value={draft.ratingPriority}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  ratingPriority: Number(event.target.value),
                })
              }
            >
              {[0, 1, 2, 3, 4, 5].map((weight) => (
                <option value={weight} key={weight}>
                  {weight} / 5
                </option>
              ))}
            </select>
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={draft.avoidCrowds}
              onChange={(event) =>
                setDraft({ ...draft, avoidCrowds: event.target.checked })
              }
            />
            덜 붐비는 장소 우선 추천
          </label>
        </section>
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '동기화 중' : '선호도 저장'}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setDraft(defaultTaste())
            setMessage('초기 설정을 확인한 뒤 저장해 주세요.')
          }}
        >
          선택 초기화
        </button>
      </form>
      {intelligenceMode === 'api' && app.user && (
        <button
          className="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          계정 선호도 불러오기
        </button>
      )}
      {(message || app.tasteStorageError) && (
        <p className="info small" role="status">
          {app.tasteStorageError || message}
        </p>
      )}
      <p className="tiny muted">
        {intelligenceMode === 'mock'
          ? '시연 모드는 계정 서버에 전송하지 않고 브라우저에서 추천 흐름을 확인해요.'
          : '추천 요청에 현재 선호도를 전달해요. 계정 동기화는 로그인 후 사용할 수 있어요.'}
      </p>
      <a className="text-button" href="#/settings">
        계정과 앱 설정
      </a>
    </div>
  )
}
