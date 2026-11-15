import { dayWindowError } from '@/domain/dayPlan'
import { DayTimeSettings, DaySchedulePreview } from '@/components/DayPlanning'
import { useEffect, useState } from 'react'
import type { Course, CourseStop } from '@/domain/models'
import type { PlaceResults, SearchPlace } from '@/services/places'
import { nearbyPlaces } from '@/services/places'
import { realPlace } from '@/domain/realCourse'
import { recalculate } from '@/domain/planning'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { PlacePhoto } from '@/components/PlacePhoto'
import { BasicCoursePlan } from './BasicCoursePlan'
import { PlaceCrowding } from '@/components/PlaceCrowding'
import { previewCrowding } from '@/data/crowdingPreview'
import { intelligenceMode } from '@/services/intelligence'

type NearbyState = {
  key: string
  food?: PlaceResults
  cafe?: PlaceResults
  foodError?: string
  cafeError?: string
}
export function RealCoursePlan({ course }: { course: Course }) {
  const app = useApp()
  const anchor = course.stops.find(
    (stop) => stop.place?.id === course.eventId,
  )?.place
  const [settings, setSettings] = useState(course.settings)
  const [radius, setRadius] = useState(1000)
  const [attempt, setAttempt] = useState(0)
  const [resource, setResource] = useState<NearbyState | null>(null)
  const [foodChoice, setFoodChoice] = useState<string | null>(
    course.stops
      .find(
        (stop) =>
          stop.place?.category === 'food' && stop.place.id !== course.eventId,
      )
      ?.place?.id.replace('kakao:', '') ??
      (course.planned ||
      app.courses.some((c) => c.id === course.id) ||
      course.stops.length > 1
        ? ''
        : null),
  )
  const [cafeChoice, setCafeChoice] = useState<string | null>(
    course.stops
      .find(
        (stop) =>
          stop.place?.category === 'cafe' && stop.place.id !== course.eventId,
      )
      ?.place?.id.replace('kakao:', '') ??
      (course.planned ||
      app.courses.some((c) => c.id === course.id) ||
      course.stops.length > 1
        ? ''
        : null),
  )
  const [duration, setDuration] = useState(
    course.stops.find((stop) => stop.place?.id === course.eventId)
      ?.durationMinutes ?? 120,
  )
  const [mealDuration, setMealDuration] = useState(
    course.stops.find(
      (s) => s.kind === 'meal' && s.place?.id !== course.eventId,
    )?.durationMinutes ?? 60,
  )
  const [cafeDuration, setCafeDuration] = useState(
    course.stops.find(
      (s) => s.place?.category === 'cafe' && s.place.id !== course.eventId,
    )?.durationMinutes ?? 60,
  )
  const [error, setError] = useState('')
  const lat = anchor?.location?.lat
  const lng = anchor?.location?.lng
  const key = `${lat},${lng},${radius},${attempt}`
  useEffect(() => {
    if (lat === undefined || lng === undefined) return
    const controller = new AbortController()
    void Promise.allSettled([
      nearbyPlaces(lat, lng, 'FD6', radius, controller.signal),
      nearbyPlaces(lat, lng, 'CE7', radius, controller.signal),
    ]).then(([food, cafe]) => {
      if (controller.signal.aborted) return
      setResource({
        key,
        ...(food.status === 'fulfilled'
          ? { food: food.value }
          : {
              foodError:
                food.reason instanceof Error
                  ? food.reason.message
                  : '주변 음식점을 불러오지 못했어요.',
            }),
        ...(cafe.status === 'fulfilled'
          ? { cafe: cafe.value }
          : {
              cafeError:
                cafe.reason instanceof Error
                  ? cafe.reason.message
                  : '주변 카페를 불러오지 못했어요.',
            }),
      })
    })
    return () => controller.abort()
  }, [key, lat, lng, radius])
  if (!anchor?.location) return <BasicCoursePlan course={course} />
  const ready = resource?.key === key ? resource : null
  const candidates = (data?: PlaceResults) =>
    data?.places.filter((place) => `kakao:${place.id}` !== anchor.id) ?? []
  const retained = (category: 'food' | 'cafe', items: SearchPlace[]) => {
    const old = course.stops.find(
      (s) => s.place?.category === category && s.place.id !== anchor.id,
    )?.place
    if (
      !old?.location ||
      !old.id.startsWith('kakao:') ||
      !old.source.url ||
      items.some((p) => `kakao:${p.id}` === old.id)
    )
      return items
    return [
      ...items,
      {
        ...old,
        id: old.id.slice(6),
        category: old.description,
        categoryGroup: category === 'food' ? 'FD6' : 'CE7',
        address: old.address,
        roadAddress: old.address,
        phone: '',
        location: old.location,
        url: old.source.url,
      },
    ]
  }
  const food = retained('food', candidates(ready?.food))
  const cafes = retained('cafe', candidates(ready?.cafe))
  const selected = (items: SearchPlace[], choice: string | null) =>
    choice === '' ? undefined : (items.find((p) => p.id === choice) ?? items[0])
  const meal = selected(food, foodChoice)
  const cafe = selected(
    cafes.filter((p) => p.id !== meal?.id),
    cafeChoice,
  )
  const generating = !ready
  const failed = Boolean(ready?.foodError || ready?.cafeError)
  const buildPlan = (
    submittedSettings: Course['settings'],
    submittedDuration: number,
    mealStay = mealDuration,
    cafeStay = cafeDuration,
  ) => {
    const oldMeal = course.stops.find(
      (s) => s.kind === 'meal' && s.place?.id !== anchor.id,
    )
    const oldCafe = course.stops.find(
      (s) => s.place?.category === 'cafe' && s.place.id !== anchor.id,
    )
    const makeStop = (
      place: SearchPlace,
      kind: CourseStop['kind'],
      old: CourseStop | undefined,
      fetchedAt: string,
    ): CourseStop => ({
      id: old?.id ?? `${course.id}:${kind}:${place.id}`,
      kind,
      title: place.name,
      place: realPlace(place, fetchedAt),
      durationMinutes: kind === 'meal' ? mealStay : cafeStay,
      travelMinutes: null,
      missingReason: null,
    })
    const newMeal = meal
      ? makeStop(
          meal,
          'meal',
          oldMeal,
          ready?.food?.fetchedAt ?? course.createdAt,
        )
      : undefined
    const newCafe = cafe
      ? makeStop(
          cafe,
          'nearby',
          oldCafe,
          ready?.cafe?.fetchedAt ?? course.createdAt,
        )
      : undefined
    const chosen: CourseStop[] = course.stops.flatMap((stop) => {
      if (stop.place?.id === anchor.id)
        return [{ ...stop, durationMinutes: submittedDuration }]
      if (stop.id === oldMeal?.id) return newMeal ? [newMeal] : []
      if (stop.id === oldCafe?.id) return newCafe ? [newCafe] : []
      return [stop]
    })
    if (newMeal && !oldMeal)
      chosen.splice(
        chosen.findIndex((s) => s.place?.id === anchor.id) + 1,
        0,
        newMeal,
      )
    if (newCafe && !oldCafe)
      chosen.splice(
        newMeal
          ? chosen.findIndex((s) => s.id === newMeal.id) + 1
          : chosen.findIndex((s) => s.place?.id === anchor.id) + 1,
        0,
        newCafe,
      )
    const next = recalculate({
      ...course,
      planned: true,
      settings: submittedSettings,
      stops: chosen,
    })
    return next
  }
  const generate = (form: HTMLFormElement) => {
    // Read the submitted controls too: browser date pickers/autofill may update
    // the visible input before React has received a change event.
    const fields = new FormData(form)
    const submittedSettings = {
      ...settings,
      date: String(fields.get('date')),
      startTime: String(fields.get('startTime')),
      endTime: String(fields.get('endTime')),
      transport: String(
        fields.get('transport'),
      ) as Course['settings']['transport'],
    }
    const submittedDuration = Number(fields.get('duration'))
    const submittedMeal = Number(fields.get('mealDuration') ?? mealDuration)
    const submittedCafe = Number(fields.get('cafeDuration') ?? cafeDuration)
    setError('')
    if (
      dayWindowError(submittedSettings) ||
      [
        submittedDuration,
        ...(meal ? [submittedMeal] : []),
        ...(cafe ? [submittedCafe] : []),
      ].some((value) => !Number.isInteger(value) || value < 15 || value > 480)
    ) {
      setError(
        '방문 날짜와 시작·종료 시간, 체류 시간(15~480분)을 확인해 주세요.',
      )
      return
    }
    if (generating || failed) return
    const next = buildPlan(
      submittedSettings,
      submittedDuration,
      submittedMeal,
      submittedCafe,
    )
    app.storeDraft(next)
    if (app.courses.some((item) => item.id === next.id)) app.saveCourse(next)
    go(`/course/${next.id}`)
  }
  const preview = buildPlan(settings, duration)
  const options = (
    label: string,
    list: SearchPlace[],
    value: SearchPlace | undefined,
    change: (id: string) => void,
    stay: number,
    changeStay: (value: number) => void,
    fieldName: string,
  ) => (
    <section className="panel stack">
      <h2>{label}</h2>
      {list.length ? (
        <>
          <label className="field">
            {label} 선택
            <select
              value={value?.id ?? ''}
              onChange={(event) => change(event.target.value)}
            >
              <option value="">코스에서 제외</option>
              {list.map((place) => {
                const crowding =
                  place.crowding ??
                  (intelligenceMode === 'mock' &&
                  !place.crowdingUnavailable &&
                  !place.crowdingPlaceId
                    ? previewCrowding(place.name)
                    : null)
                return (
                  <option key={place.id} value={place.id}>
                    {place.name}
                    {place.distanceMeters != null
                      ? ` · ${Math.round(place.distanceMeters)}m`
                      : ''}
                    {crowding
                      ? ` · ${crowding.current.label}${crowding.dataMode === 'simulation' ? ' (예시)' : ''}`
                      : ' · 혼잡도 정보 없음'}
                  </option>
                )
              })}
            </select>
          </label>
          {value && (
            <>
              <label className="field">
                {label === '주변 음식점'
                  ? '식사 시간(분)'
                  : '카페 머무는 시간(분)'}
                <input
                  type="number"
                  name={fieldName}
                  min={15}
                  max={480}
                  step={1}
                  required
                  value={stay}
                  onChange={(e) => changeStay(Number(e.target.value))}
                />
              </label>
              <p className="small">{value.roadAddress || value.address}</p>
              <PlaceCrowding key={value.id} place={value} />
              <a
                className="small blue"
                href={value.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {value.name} 운영 정보 확인 ↗
              </a>
            </>
          )}
        </>
      ) : (
        <p className="small muted">
          반경 안에 확인된 후보가 없어요. 반경을 넓히거나 선택한 장소만으로
          코스를 만들 수 있어요.
        </p>
      )}
    </section>
  )
  return (
    <>
      <h1 className="blue">나만의 하루 일정 만들기</h1>
      <p className="small muted">
        나들이 시간을 정하고, 가고 싶은 장소와 머무는 시간을 골라 보세요.
      </p>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          generate(event.currentTarget)
        }}
      >
        <section className="panel form-stack">
          <DayTimeSettings
            value={settings}
            onChange={(window) => setSettings({ ...settings, ...window })}
          />
          <label className="field">
            선택 장소 체류 시간(분)
            <input
              type="number"
              name="duration"
              min={15}
              max={480}
              required
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
            />
          </label>
          <label className="field">
            이동수단
            <select
              name="transport"
              value={settings.transport}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  transport: event.target
                    .value as Course['settings']['transport'],
                })
              }
            >
              <option>도보</option>
              <option>자가용</option>
              <option>대중교통</option>
            </select>
          </label>
          <label className="field">
            주변 검색 반경
            <select
              value={radius}
              onChange={(event) => {
                setRadius(Number(event.target.value))
                setFoodChoice(null)
                setCafeChoice(null)
              }}
            >
              <option value={1000}>1km</option>
              <option value={3000}>3km</option>
              <option value={5000}>5km</option>
            </select>
          </label>
        </section>
        <a
          className="secondary"
          href={`#/recommendations?${new URLSearchParams({ lat: String(lat), lng: String(lng), name: anchor.name, categories: 'food,cafe' })}`}
        >
          이 장소 주변 취향 맞춤 맛집과 카페
        </a>
        <section className="panel stack">
          <PlacePhoto name={anchor.name} image={anchor} />
          <p className="eyebrow">선택한 장소</p>
          <h2>{anchor.name}</h2>
          <p className="small">{anchor.address}</p>
          <PlaceCrowding place={anchor} />
        </section>
        <p className="info small">
          마음에 드는 음식점과 카페를 골라 더해 보세요. 머무는 시간을 조절하면
          아래 시간표에 바로 반영돼요.
        </p>
        {generating && <p role="status">주변 음식점과 카페를 찾고 있어요…</p>}
        {ready?.foodError && (
          <p className="error" role="alert">
            음식점 · {ready.foodError}
          </p>
        )}
        {ready?.cafeError && (
          <p className="error" role="alert">
            카페 · {ready.cafeError}
          </p>
        )}
        {failed && (
          <button
            type="button"
            className="secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            주변 추천 다시 불러오기
          </button>
        )}
        {ready?.food &&
          options(
            '주변 음식점',
            food,
            meal,
            setFoodChoice,
            mealDuration,
            setMealDuration,
            'mealDuration',
          )}
        {ready?.cafe &&
          options(
            '주변 카페',
            cafes.filter((p) => p.id !== meal?.id),
            cafe,
            setCafeChoice,
            cafeDuration,
            setCafeDuration,
            'cafeDuration',
          )}
        {ready && !failed && <DaySchedulePreview course={preview} />}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary"
          type="submit"
          disabled={generating || failed}
        >
          이 장소들로 하루 코스 만들기 →
        </button>
      </form>
      <p className="tiny muted">
        지도 선은 방문 순서이고 이동시간은 직선거리 기반 추정입니다. 실제
        길찾기는 카카오맵에서 확인할 수 있어요.
      </p>
    </>
  )
}
