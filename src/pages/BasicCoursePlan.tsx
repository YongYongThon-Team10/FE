import { useState } from 'react'
import type { Course } from '@/domain/models'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { recalculate } from '@/domain/planning'

export function BasicCoursePlan({ course }: { course: Course }) {
  const app = useApp()
  const [settings, setSettings] = useState(course.settings)
  const [error, setError] = useState('')
  return (
    <div className="stack">
      <h1>코스 조건 바꾸기</h1>
      <p className="info">
        기준 장소의 좌표가 없어 주변 추천은 제공할 수 없어요. 기존 일정은
        유지하며 날짜와 시간을 바꿀 수 있어요.
      </p>
      <form
        className="panel form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (!settings.date || settings.startTime >= settings.endTime) {
            setError('날짜와 시간대를 확인해 주세요.')
            return
          }
          const next = recalculate({ ...course, settings })
          app.storeDraft(next)
          if (app.courses.some((c) => c.id === course.id)) app.saveCourse(next)
          go(`/course/${course.id}`)
        }}
      >
        <label className="field">
          방문 날짜
          <input
            type="date"
            required
            value={settings.date}
            onChange={(e) => setSettings({ ...settings, date: e.target.value })}
          />
        </label>
        <label className="field">
          시작 시간
          <input
            type="time"
            required
            value={settings.startTime}
            onChange={(e) =>
              setSettings({ ...settings, startTime: e.target.value })
            }
          />
        </label>
        <label className="field">
          종료 시간
          <input
            type="time"
            required
            value={settings.endTime}
            onChange={(e) =>
              setSettings({ ...settings, endTime: e.target.value })
            }
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          조건 반영
        </button>
      </form>
      <a className="secondary" href={`#/course/${course.id}`}>
        일정으로 돌아가기
      </a>
    </div>
  )
}
