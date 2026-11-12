import { Component, useEffect, useMemo } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AppProvider } from '@/state/AppContext'
import { useApp } from '@/state/context'
import { PageContainer } from '@/components/PageContainer'
import { NavIcon, Brand } from '@/components/Brand'
import { Home } from '@/pages/Home'
import { Detail, Events, Sources } from '@/pages/Events'
import { Configure, CourseMap, Itinerary, Saved } from '@/pages/Course'
import {
  Account,
  Contact,
  Guide,
  Login,
  Notices,
  Notifications,
  Privacy,
  Settings,
} from '@/pages/Settings'
import { go, useRoute } from '@/hooks/useRoute'
import { parseCourse } from '@/domain/validation'
import { isDemo } from '@/services/api'
import './App.css'

function Missing({
  message = '요청한 화면을 찾을 수 없어요.',
}: {
  message?: string
}) {
  return (
    <section className="empty-state">
      <Brand />
      <h1>{message}</h1>
      <p className="small muted">
        정보가 변경됐거나 아직 저장되지 않은 항목일 수 있어요.
      </p>
      <a className="primary" href="#/">
        홈으로 돌아가기
      </a>
    </section>
  )
}
class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('화면을 표시하지 못했습니다.', error, info.componentStack)
  }
  render() {
    return this.state.failed ? (
      <section className="empty-state">
        <h1>화면을 불러오지 못했어요</h1>
        <p>새로고침 후 다시 시도해 주세요.</p>
        <button className="primary" onClick={() => window.location.reload()}>
          새로고침
        </button>
      </section>
    ) : (
      this.props.children
    )
  }
}
function Shell() {
  const rawRoute = useRoute()
  const route = rawRoute.split('?')[0]
  const parts = route.split('/').filter(Boolean)
  const section = parts[0] ?? 'home'
  let id = ''
  try {
    id = decodeURIComponent(parts[1] ?? '')
  } catch {
    /* malformed IDs resolve to not found */
  }
  const app = useApp()
  const event = app.data?.events.find((e) => e.id === id)
  const course =
    app.draft?.id === id ? app.draft : app.courses.find((c) => c.id === id)
  const shared = useMemo(() => {
    if (section !== 'shared') return null
    try {
      const payload = new URLSearchParams(rawRoute.split('?')[1]).get('data')
      if (!payload || payload.length > 24000) return null
      return parseCourse(
        JSON.parse(
          new TextDecoder().decode(
            Uint8Array.from(atob(payload), (c) => c.charCodeAt(0)),
          ),
        ),
      )
    } catch {
      return null
    }
  }, [rawRoute, section])
  const titles: Record<string, string> = {
    home: '용인 나들이',
    events: id ? '행사 상세' : '행사 찾기',
    map: '행사 지도',
    sources: '신청·출처 안내',
    configure: '하루 코스 만들기',
    course: '추천 하루 일정',
    'course-map': '오늘의 동선',
    'event-map': '행사 위치',
    saved: app.user?.name ?? '내 코스',
    settings: '설정',
    notifications: '알림 설정',
    privacy: '개인정보 관리',
    account: '로그인 정보',
    notices: '공지사항',
    contact: '문의하기',
    guide: '이용 가이드',
    shared: '함께하는 하루',
    login: '로그인',
    register: '회원가입',
    'reset-password': '비밀번호 찾기',
    onboarding: '용인 나들이',
  }
  const title = titles[section] ?? '용인 나들이'
  const auth = ['login', 'register', 'reset-password', 'onboarding'].includes(
    section,
  )
  const settingsArea = [
    'saved',
    'settings',
    'notifications',
    'privacy',
    'account',
    'notices',
    'contact',
  ].includes(section)
  const action =
    ['configure', 'course', 'shared'].includes(section) ||
    (section === 'events' && !!id)
  useEffect(() => {
    document.title = `${title} · 용인 나들이`
    window.scrollTo({ top: 0 })
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
  }, [rawRoute, title])
  let content: ReactNode
  switch (section) {
    case 'home':
      content = <Home />
      break
    case 'events':
      content = id ? (
        event ? (
          <Detail event={event} />
        ) : (
          <Missing message="행사 정보를 찾을 수 없어요." />
        )
      ) : (
        <Events />
      )
      break
    case 'map':
      content = <Events mapView />
      break
    case 'sources':
      content = event ? (
        <Sources event={event} />
      ) : (
        <Missing message="행사 출처 정보를 찾을 수 없어요." />
      )
      break
    case 'configure':
      content = event ? (
        <Configure key={event.id} event={event} />
      ) : (
        <Missing message="일정을 만들 행사를 먼저 선택해 주세요." />
      )
      break
    case 'course':
      content = course ? (
        <Itinerary course={course} />
      ) : (
        <Missing message="이 브라우저에 저장된 코스가 없어요." />
      )
      break
    case 'course-map':
      content = course ? <CourseMap course={course} /> : <Missing />
      break
    case 'event-map':
      content = event ? <CourseMap event={event} /> : <Missing />
      break
    case 'shared':
      content = shared ? (
        <Itinerary course={shared} shared />
      ) : (
        <Missing message="공유 링크를 확인해 주세요." />
      )
      break
    case 'saved':
      content = <Saved />
      break
    case 'settings':
      content = <Settings />
      break
    case 'notifications':
      content = <Notifications />
      break
    case 'privacy':
      content = <Privacy />
      break
    case 'account':
      content = <Account />
      break
    case 'notices':
      content = <Notices id={id} />
      break
    case 'contact':
      content = <Contact />
      break
    case 'guide':
      content = <Guide />
      break
    case 'login':
      content = <Login key="login" />
      break
    case 'register':
      content = <Login key="register" mode="register" />
      break
    case 'reset-password':
      content = <Login key="reset" mode="reset" />
      break
    case 'onboarding':
      content = (
        <section className="onboarding">
          <Brand large />
          <h1>오늘, 용인 어디 갈까?</h1>
          <p className="small muted">가까운 곳에서 발견하는 즐거움</p>
          <button
            type="button"
            className="primary"
            onClick={() => go('/login')}
          >
            시작하기 →
          </button>
        </section>
      )
      break
    default:
      content = <Missing />
  }
  const needsCatalog = [
    'home',
    'events',
    'map',
    'sources',
    'configure',
    'event-map',
  ].includes(section)
  return (
    <div
      className={`app-shell ${settingsArea ? 'gradient-shell' : ''} ${section === 'guide' ? 'guide-shell' : ''} ${auth ? 'auth-shell' : ''}`}
    >
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main-content')?.focus()
        }}
      >
        본문으로 건너뛰기
      </a>
      {!auth && section !== 'home' && (
        <header
          className={`app-header ${settingsArea ? 'settings-header' : ''}`}
        >
          <button
            type="button"
            className="icon-button back"
            aria-label="뒤로 가기"
            onClick={() => {
              if (Number(window.history.state?.yonginDepth) > 0)
                window.history.back()
              else go('/')
            }}
          >
            ‹
          </button>
          <span>{title}</span>
          <a className="icon-button" href="#/settings" aria-label="설정">
            ···
          </a>
        </header>
      )}
      <PageContainer>
        <div
          id="main-content"
          tabIndex={-1}
          className={action ? 'page-content has-action' : 'page-content'}
        >
          {app.storageError && (
            <p className="error" role="alert">
              {app.storageError}
            </p>
          )}
          {app.error && needsCatalog && (
            <div className="error" role="alert">
              <p>
                {app.error}
                {app.data ? ' 마지막으로 불러온 정보를 표시하고 있어요.' : ''}
              </p>
              <button
                type="button"
                className="text-button"
                disabled={app.refreshing}
                onClick={() => void app.reload()}
              >
                다시 불러오기
              </button>
            </div>
          )}
          {app.loading && needsCatalog ? (
            <div className="loading-state" role="status">
              <Brand />
              <p>가까운 곳의 즐거움을 찾고 있어요…</p>
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : (
            content
          )}
          {!auth && (
            <footer className="data-footer">
              {isDemo
                ? '시연 데이터 · 실제 행사·장소·요금과 다를 수 있어요.'
                : app.data
                  ? `정보 갱신 ${new Date(app.data.updatedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
                  : '정보를 불러오지 못했어요.'}
              {!isDemo && (
                <button
                  type="button"
                  className="text-button tiny"
                  disabled={app.refreshing}
                  onClick={() => void app.reload()}
                >
                  {app.refreshing ? '갱신 중…' : '새로고침 ↻'}
                </button>
              )}
            </footer>
          )}
        </div>
      </PageContainer>
      {!auth && (
        <nav className="bottom-nav" aria-label="주 메뉴">
          {(
            [
              [
                '/',
                'search',
                '행사 찾기',
                !settingsArea && section !== 'guide',
              ],
              ['/saved', 'heart', '내 코스', settingsArea],
              ['/guide', 'flow', '화면 흐름', section === 'guide'],
            ] as const
          ).map(([path, icon, label, active]) => (
            <a
              key={path}
              href={`#${path}`}
              className={active ? 'active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              <NavIcon name={icon} active={active} />
              <span>{label}</span>
            </a>
          ))}
        </nav>
      )}
      {app.toast && (
        <div role="status" className="toast">
          {app.toast}
        </div>
      )}
    </div>
  )
}
export default function App() {
  return (
    <AppErrorBoundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </AppErrorBoundary>
  )
}
