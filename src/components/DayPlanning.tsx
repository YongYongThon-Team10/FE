import { useState } from 'react'
import type { Course } from '@/domain/models'
import { minutes, schedule } from '@/domain/planning'
import { dayWindowError, durationText } from '@/domain/dayPlan'
import type { DayWindow } from '@/domain/dayPlan'
import './DayPlanning.css'

export function DayTimeSettings({
  value,
  onChange,
}: {
  value: DayWindow
  onChange: (value: DayWindow) => void
}) {
  const error = dayWindowError(value)
  return (
    <div className="day-time-settings">
      <div className="day-time-heading">
        <h2>하루의 시간을 정해요</h2>
        <span>날짜·시간</span>
      </div>
      <label className="field">
        방문 날짜
        <input
          type="date"
          name="date"
          required
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
      </label>
      <div className="day-time-inputs">
        <label className="field">
          시작 시간
          <input
            type="time"
            name="startTime"
            required
            value={value.startTime}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange({ ...value, startTime: e.target.value })}
          />
        </label>
        <span aria-hidden="true">—</span>
        <label className="field">
          종료 시간
          <input
            type="time"
            name="endTime"
            required
            value={value.endTime}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange({ ...value, endTime: e.target.value })}
          />
        </label>
      </div>
      <div className="day-time-presets" aria-label="추천 시간대">
        {[
          { label: '오전 나들이', start: '09:00', end: '12:00' },
          { label: '오후 나들이', start: '13:00', end: '18:00' },
          { label: '하루 종일', start: '10:00', end: '18:00' },
        ].map((preset) => (
          <button
            type="button"
            key={preset.label}
            aria-pressed={
              value.startTime === preset.start && value.endTime === preset.end
            }
            onClick={() =>
              onChange({
                ...value,
                startTime: preset.start,
                endTime: preset.end,
              })
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
      <p className={`day-window-caption ${error ? 'invalid' : ''}`}>
        {error ||
          `총 ${durationText(minutes(value.endTime) - minutes(value.startTime))} 동안 나들이할 수 있어요.`}
      </p>
    </div>
  )
}

export function DaySchedulePreview({
  course,
  summaryOnly = false,
}: {
  course: Course
  summaryOnly?: boolean
}) {
  if (dayWindowError(course.settings)) return null
  const items = schedule(course)
  const available =
    minutes(course.settings.endTime) - minutes(course.settings.startTime)
  const finalEnd = items.at(-1)?.end ?? course.settings.startTime
  const used = Number.isFinite(minutes(finalEnd))
    ? Math.max(0, minutes(finalEnd) - minutes(course.settings.startTime))
    : null
  const remaining = used === null ? null : available - used
  return (
    <section
      className="panel day-plan-preview"
      aria-label={summaryOnly ? '하루 시간 요약' : '하루 시간표 미리보기'}
    >
      <div className="day-time-heading">
        <h2>{summaryOnly ? '나의 하루 시간표' : '하루 시간표 미리보기'}</h2>
        <span>{items.length}개 일정</span>
      </div>
      <div className="day-plan-stats">
        <div>
          <span>나들이 시간</span>
          <strong>{durationText(available)}</strong>
        </div>
        <div>
          <span>예상 소요</span>
          <strong>{used === null ? '시간 미정' : durationText(used)}</strong>
        </div>
        <div
          className={remaining !== null && remaining < 0 ? 'over-budget' : ''}
        >
          <span>
            {remaining !== null && remaining < 0 ? '초과 시간' : '여유 시간'}
          </span>
          <strong>
            {remaining === null
              ? '시간 미정'
              : durationText(Math.abs(remaining))}
          </strong>
        </div>
      </div>
      {remaining !== null && remaining < 0 && (
        <p className="day-plan-warning">
          종료 시간보다 {durationText(-remaining)} 더 필요해요. 머무는 시간을
          줄이거나 종료 시간을 늘려 주세요.
        </p>
      )}
      {!summaryOnly && (
        <ol className="day-plan-stops">
          {items.map((stop, index) => (
            <li key={stop.id}>
              <span className="day-plan-dot">{index + 1}</span>
              <div>
                <p className="day-plan-time">
                  {stop.start} — {stop.end}
                </p>
                <strong>{stop.title}</strong>
                <p className="tiny muted">
                  {durationText(stop.durationMinutes)} 머무르기
                  {stop.travelMinutes
                    ? ` · 이동 약 ${stop.travelMinutes}분`
                    : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className="tiny muted">
        이동 시간은 예상치예요. 실제 교통 상황과 운영 시간을 확인해 주세요.
      </p>
    </section>
  )
}

export function DayTimeEditor({
  course,
  busy,
  onApply,
}: {
  course: Course
  busy: boolean
  onApply: (value: DayWindow) => Promise<void>
}) {
  const [value, setValue] = useState<DayWindow>({
    date: course.settings.date,
    startTime: course.settings.startTime,
    endTime: course.settings.endTime,
  })
  const [error, setError] = useState('')
  return (
    <details className="panel day-time-editor">
      <summary>
        날짜·시간 바꾸기
        <span>
          {course.settings.startTime}–{course.settings.endTime}
        </span>
      </summary>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          const fields = new FormData(event.currentTarget)
          const next = {
            date: String(fields.get('date')),
            startTime: String(fields.get('startTime')),
            endTime: String(fields.get('endTime')),
          }
          const message = dayWindowError(next)
          setError(message)
          if (!message) {
            setValue(next)
            void onApply(next)
          }
        }}
      >
        <DayTimeSettings value={value} onChange={setValue} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy}>
          시간표에 반영
        </button>
      </form>
    </details>
  )
}
