import { useEffect, useState } from 'react'
import type { Course, CourseStop } from '@/domain/models'
import type { PlaceResults, SearchPlace } from '@/services/places'
import { nearbyPlaces } from '@/services/places'
import { realPlace } from '@/domain/realCourse'
import { recalculate } from '@/domain/planning'
import { useApp } from '@/state/context'
import { go } from '@/hooks/useRoute'
import { PlacePhoto } from '@/components/PlacePhoto'

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
      ?.place?.id.replace('kakao:', '') ?? null,
  )
  const [cafeChoice, setCafeChoice] = useState<string | null>(
    course.stops
      .find(
        (stop) =>
          stop.place?.category === 'cafe' && stop.place.id !== course.eventId,
      )
      ?.place?.id.replace('kakao:', '') ?? null,
  )
  const [duration, setDuration] = useState(
    course.stops.find((stop) => stop.place?.id === course.eventId)
      ?.durationMinutes ?? 120,
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
  if (!anchor?.location)
    return (
      <section className="empty-state">
        <h1>기준 장소를 다시 선택해 주세요</h1>
        <a href="#/" className="primary">
          장소 검색으로
        </a>
      </section>
    )
  const ready = resource?.key === key ? resource : null
  const candidates = (data?: PlaceResults) =>
    data?.places.filter((place) => `kakao:${place.id}` !== anchor.id) ?? []
  const food = candidates(ready?.food)
  const cafes = candidates(ready?.cafe)
  const selected = (items: SearchPlace[], choice: string | null) =>
    choice === '' ? undefined : (items.find((p) => p.id === choice) ?? items[0])
  const meal = selected(food, foodChoice)
  const cafe = selected(
    cafes.filter((p) => p.id !== meal?.id),
    cafeChoice,
  )
  const generating = !ready
  const failed = Boolean(ready?.foodError || ready?.cafeError)
  const generate = () => {
    setError('')
    if (
      !settings.date ||
      !Number.isFinite(Date.parse(settings.date)) ||
      settings.startTime >= settings.endTime ||
      !Number.isInteger(duration) ||
      duration < 15 ||
      duration > 480
    ) {
      setError(
        '방문 날짜와 시작·종료 시간, 체류 시간(15~480분)을 확인해 주세요.',
      )
      return
    }
    if (generating || failed) return
    const chosen: CourseStop[] = [
      {
        id: crypto.randomUUID(),
        kind: 'arrival',
        title: anchor.name,
        place: anchor,
        durationMinutes: duration,
        travelMinutes: null,
        missingReason: null,
      },
    ]
    if (meal)
      chosen.push({
        id: crypto.randomUUID(),
        kind: 'meal',
        title: meal.name,
        place: realPlace(meal, ready!.food!.fetchedAt),
        durationMinutes: 60,
        travelMinutes: null,
        missingReason: null,
      })
    if (cafe)
      chosen.push({
        id: crypto.randomUUID(),
        kind: 'nearby',
        title: cafe.name,
        place: realPlace(cafe, ready!.cafe!.fetchedAt),
        durationMinutes: 60,
        travelMinutes: null,
        missingReason: null,
      })
    const next = recalculate({ ...course, settings, stops: chosen })
    app.storeDraft(next)
    if (app.courses.some((item) => item.id === next.id)) app.saveCourse(next)
    go(`/course/${next.id}`)
  }
  const options = (
    label: string,
    list: SearchPlace[],
    value: SearchPlace | undefined,
    change: (id: string) => void,
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
              {list.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.name}
                  {place.distanceMeters != null
                    ? ` · ${Math.round(place.distanceMeters)}m`
                    : ''}
                </option>
              ))}
            </select>
          </label>
          {value && (
            <>
              <p className="small">{value.roadAddress || value.address}</p>
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
      <h1 className="blue">실제 장소로 하루를 연결해요</h1>
      <section className="panel stack">
        <PlacePhoto name={anchor.name} image={anchor} />
        <p className="eyebrow">선택한 장소</p>
        <h2>{anchor.name}</h2>
        <p className="small">{anchor.address}</p>
      </section>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault()
          generate()
        }}
      >
        <section className="panel form-stack">
          <label className="field">
            방문 날짜
            <input
              type="date"
              required
              value={settings.date}
              onChange={(event) =>
                setSettings({ ...settings, date: event.target.value })
              }
            />
          </label>
          <div className="row">
            <label className="field grow">
              시작 시간
              <input
                type="time"
                required
                value={settings.startTime}
                onChange={(event) =>
                  setSettings({ ...settings, startTime: event.target.value })
                }
              />
            </label>
            <label className="field grow">
              종료 시간
              <input
                type="time"
                required
                value={settings.endTime}
                onChange={(event) =>
                  setSettings({ ...settings, endTime: event.target.value })
                }
              />
            </label>
          </div>
          <label className="field">
            선택 장소 체류 시간(분)
            <input
              type="number"
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
        <p className="info small">
          선택 장소 주변의 실제 음식점·카페를 거리순으로 제안해요. 평점·영업
          여부는 확인되지 않으므로 방문 전 카카오맵 상세에서 확인해 주세요.
          음식점과 카페는 각 60분의 계획으로 시작합니다.
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
        {ready?.food && options('주변 음식점', food, meal, setFoodChoice)}
        {ready?.cafe &&
          options(
            '주변 카페',
            cafes.filter((p) => p.id !== meal?.id),
            cafe,
            setCafeChoice,
          )}
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
