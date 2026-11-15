import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useApp } from '../state/context'
import { categoryNames } from '../domain/models'
import {
  cafeOptions,
  cuisineOptions,
  defaultTaste,
  parseTaste,
} from '../domain/taste'
import type { TasteProfile } from '../domain/taste'
import { intelligence, intelligenceMode } from '../services/intelligence'
import { Settings } from './Settings'

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
      <h1 className="sr-only">마이페이지</h1>
      <Settings embedded />
      <section
        className="panel stack"
        id="my-preferences"
        aria-labelledby="my-preferences-title"
      >
        <h2 id="my-preferences-title" tabIndex={-1}>
          나의 취향으로 찾는 하루
        </h2>
        <p>{app.user?.name ?? '남곽춘'}님의 선호도를 추천에 반영해요.</p>
        <p className="small muted">
          관심 있는 장소와 음식, 카페 취향을 골라 주세요. 저장한 취향은 다음
          추천에 반영돼요.
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
        <section
          className="panel interest-panel"
          aria-labelledby="interest-title"
        >
          <div className="interest-heading">
            <h2 id="interest-title">카테고리 관심도</h2>
            <span>0 낮음 — 5 높음</span>
          </div>
          {(
            ['park', 'culture', 'food', 'cafe', 'sports', 'shopping'] as const
          ).map((category) => (
            <label className="interest-row" key={category}>
              <span>
                {
                  {
                    park: '공원·자연',
                    culture: '문화·체험',
                    food: '맛집',
                    cafe: '카페',
                    sports: '운동',
                    shopping: '쇼핑',
                  }[category]
                }
              </span>
              <input
                className="interest-range"
                type="range"
                min={0}
                max={5}
                step={1}
                aria-label={`${categoryNames[category]} 관심도`}
                aria-valuetext={`${draft.categoryWeights[category]}점, 5점 만점`}
                value={draft.categoryWeights[category]}
                style={
                  {
                    '--interest-fill': `${draft.categoryWeights[category] * 20}%`,
                  } as CSSProperties
                }
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    categoryWeights: {
                      ...draft.categoryWeights,
                      [category]: Number(event.target.value),
                    },
                  })
                }
              />
              <output aria-hidden="true">
                {draft.categoryWeights[category]}
              </output>
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
      <a className="text-button" href="#/guide">
        서비스 이용 가이드
      </a>
    </div>
  )
}
