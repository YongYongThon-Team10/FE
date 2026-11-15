import { useEffect, useState } from 'react'
import { Brand } from '@/components/Brand'
import { Modal } from '@/components/Modal'
import { useApp } from '@/state/context'
import type { Preferences } from '@/domain/models'
import { go } from '@/hooks/useRoute'
import { api, isDemo, isAuthDemo, request } from '@/services/api'
import { teamBackend } from '@/services/teamBackend'
import { sampleUser } from '@/data/scenarios'
import { isRealCourse } from '@/domain/realCourse'

export function Login({
  mode = 'login',
}: {
  mode?: 'login' | 'register' | 'reset'
}) {
  const app = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const submit = async () => {
    if (mode === 'reset' && teamBackend.enabled) return
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'login') {
        app.setUser(await api.login(email, password))
        setPassword('')
        go('/')
      } else if (mode === 'register') {
        await api.register(email, password, name)
        if (teamBackend.enabled) {
          app.setUser(await api.session())
          go('/')
        } else
          setMessage('회원가입 요청이 완료됐어요. 이메일 안내를 확인해 주세요.')
        setPassword('')
      } else {
        await api.resetPassword(email)
        setMessage('재설정 안내를 요청했어요. 이메일을 확인해 주세요.')
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '요청을 완료하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-page">
      <Brand large />
      <h1 className="sr-only">
        {mode === 'login'
          ? '로그인'
          : mode === 'register'
            ? '회원가입'
            : '비밀번호 찾기'}
      </h1>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        {mode === 'register' && (
          <label className="field">
            이름
            <input
              required
              value={name}
              maxLength={40}
              autoComplete="name"
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className="field">
          <span className="sr-only">이메일</span>
          <input
            required
            type="email"
            autoComplete="email"
            placeholder="이메일"
            value={email}
            maxLength={200}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== 'reset' && (
          <label className="field">
            <span className="sr-only">비밀번호</span>
            <input
              required
              type="password"
              minLength={mode === 'register' ? 8 : 1}
              maxLength={teamBackend.enabled ? 64 : 128}
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button
          className="primary"
          type="submit"
          disabled={busy || (mode === 'reset' && teamBackend.enabled)}
        >
          {busy
            ? '처리 중…'
            : mode === 'login'
              ? '로그인'
              : mode === 'register'
                ? '회원가입'
                : '재설정 메일 받기'}
        </button>
      </form>
      {mode === 'reset' && teamBackend.enabled && (
        <p className="info" role="status">
          현재 서버는 비밀번호 재설정을 지원하지 않아요. 운영팀에 문의해 주세요.
        </p>
      )}
      {teamBackend.enabled && (
        <p className="small muted">
          로그인은 현재 페이지에서 유지돼요. 새로고침하면 다시 로그인해 주세요.
        </p>
      )}
      {isAuthDemo && (
        <p className="small muted">
          계정 서비스 연결 준비 중이에요. 게스트 또는 시연 계정으로 화면 흐름을
          확인할 수 있어요.
        </p>
      )}
      {message && (
        <p role="status" className="info small">
          {message}
        </p>
      )}
      <button className="secondary" type="button" onClick={() => go('/')}>
        게스트로 입장
      </button>
      {isAuthDemo && (
        <button
          className="text-button small"
          type="button"
          onClick={() => {
            app.demoLogin()
            go('/saved')
          }}
        >
          시연 계정으로 둘러보기
        </button>
      )}
      <div className="row auth-links">
        <a href="#/reset-password">비밀번호 찾기</a>
        <span>·</span>
        <a href="#/register">회원가입</a>
        <span>·</span>
        <a href="#/login">로그인</a>
      </div>
    </div>
  )
}
export function Settings() {
  const { user, setUser, setToast } = useApp()
  const [logout, setLogout] = useState(
    new URLSearchParams(window.location.hash.split('?')[1]).get('dialog') ===
      'logout',
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const leave = async () => {
    setBusy(true)
    try {
      if (!isAuthDemo && user) await api.logout()
      setUser(null)
      setLogout(false)
      setToast('로그아웃했어요.')
      go('/logout-complete')
    } catch (e) {
      setError(e instanceof Error ? e.message : '로그아웃하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <section className="panel stack">
        <p className="tiny muted">내 계정</p>
        <h2>로그인 정보</h2>
        <p className="tiny muted">
          {user
            ? `${user.name}님의 연결된 계정을 확인해요.`
            : '게스트로 둘러보고 있어요.'}
        </p>
        <a className="list-link tinted" href="#/account">
          계정 정보 보기<span>›</span>
        </a>
        <a className="list-link" href="#/mypage">
          마이페이지와 추천 선호도<span>›</span>
        </a>
      </section>
      <section className="stack">
        <h2 className="group-title">앱 설정</h2>
        <div className="list-panel">
          <a className="list-link" href="#/notifications">
            알림 설정<span>›</span>
          </a>
          <a className="list-link" href="#/privacy">
            개인정보 관리<span>›</span>
          </a>
        </div>
      </section>
      <section className="stack">
        <h2 className="group-title">도움말</h2>
        <div className="list-panel">
          <a className="list-link" href="#/notices">
            공지사항<span>›</span>
          </a>
          <a className="list-link" href="#/contact">
            문의하기<span>›</span>
          </a>
        </div>
      </section>
      {user ? (
        <button
          className="secondary danger"
          type="button"
          onClick={() => setLogout(true)}
        >
          로그아웃
        </button>
      ) : (
        <a className="secondary" href="#/login">
          로그인하기
        </a>
      )}
      <p className="tiny settings-caption">내 계정을 안전하게 관리하세요.</p>
      {logout && (
        <Modal
          eyebrow="로그아웃"
          title="로그아웃할까요?"
          onClose={() => setLogout(false)}
        >
          <p className="small muted">
            저장한 코스는 이 브라우저에 남아 있어요.
          </p>
          {error && (
            <p className="error small" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={() => void leave()}
          >
            {busy ? '처리 중…' : '로그아웃'}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => setLogout(false)}
          >
            취소
          </button>
        </Modal>
      )}
    </>
  )
}
function Switch({
  title,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div className="switch-row">
      <div>
        <strong>{title}</strong>
        <p className="tiny muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        className={`switch ${checked ? 'on' : ''}`}
        aria-label={title}
        aria-checked={checked}
        disabled={disabled}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  )
}
export function Notifications() {
  const { preferences, setPreferences } = useApp()
  const toggle = (key: keyof Preferences) =>
    setPreferences({ ...preferences, [key]: !preferences[key] })
  return (
    <>
      <h1 className="settings-title">필요한 소식만 받아요</h1>
      <p className="settings-description">알림은 언제든지 변경할 수 있어요.</p>
      <section className="panel">
        <Switch
          title="푸시 알림"
          description="행사와 코스 소식을 받아요."
          checked={preferences.push}
          onChange={() => toggle('push')}
        />
      </section>
      <section className="panel">
        <Switch
          title="저장한 행사 알림"
          description="다가오는 행사 일정을 알려드려요."
          checked={preferences.events}
          onChange={() => toggle('events')}
          disabled={!preferences.push}
        />
        <Switch
          title="코스 안내"
          description="저장한 코스와 관련된 소식을 받아요."
          checked={preferences.courses}
          onChange={() => toggle('courses')}
          disabled={!preferences.push}
        />
        <Switch
          title="이벤트·혜택 알림"
          description="새로운 이벤트와 혜택을 받아요."
          checked={preferences.marketing}
          onChange={() => toggle('marketing')}
          disabled={!preferences.push}
        />
      </section>
      <section className="panel tinted">
        <h2 className="h3 blue">알림이 오지 않나요?</h2>
        <p className="small muted">
          현재는 이 브라우저에 수신 선호만 저장돼요. 실제 푸시 알림은 발송
          서비스 연결 후 제공됩니다.
        </p>
      </section>
    </>
  )
}
export function Privacy() {
  const app = useApp()
  const [confirm, setConfirm] = useState(
    new URLSearchParams(window.location.hash.split('?')[1]).get('dialog') ===
      'delete',
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      if (!isAuthDemo) await api.deleteAccount()
      app.clearLocalAccount()
      app.setPreferences({ ...app.preferences, location: false })
      setConfirm(false)
      app.setToast('계정 삭제가 완료됐어요.')
      go('/login')
    } catch (e) {
      setError(e instanceof Error ? e.message : '탈퇴를 완료하지 못했어요.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <h1 className="settings-title">내 정보는 안전하게</h1>
      <p className="settings-description">
        개인정보 이용 범위를 직접 관리하세요.
      </p>
      <section className="panel">
        <Switch
          title="위치 정보 이용"
          description="내 위치 표시와 출발지 설정에 이용해요."
          checked={app.preferences.location}
          onChange={() =>
            app.setPreferences({
              ...app.preferences,
              location: !app.preferences.location,
            })
          }
        />
        <p className="tiny muted">
          브라우저 위치 권한은 내 위치 버튼을 누를 때 요청해요. 끄면 현재 위치
          표시를 지우고 다시 요청하지 않아요.
        </p>
      </section>
      <section className="panel stack">
        <h2 className="h3">개인정보 이용 안내</h2>
        <p className="tiny muted">계정 정보</p>
        <strong className="small">로그인 및 계정 관리에 이용</strong>
        <p className="tiny muted">저장한 코스</p>
        <strong className="small">이 브라우저에 코스 보관</strong>
        <p className="tiny muted">
          현재 위치 좌표는 브라우저 저장소와 공유 링크에 보관하지 않아요. 일정
          생성 시에는 선택한 출발지를 서버에 전달합니다.
        </p>
      </section>
      <button
        className="secondary danger"
        type="button"
        disabled={!app.user || teamBackend.enabled}
        onClick={() => setConfirm(true)}
      >
        회원 탈퇴
      </button>
      {teamBackend.enabled && (
        <p className="tiny muted">
          회원 탈퇴는 서버 연결을 준비 중이에요. 계정 삭제가 필요하면 운영팀에
          문의해 주세요.
        </p>
      )}
      {!app.user && (
        <p className="tiny settings-caption">
          게스트는 삭제할 연결 계정이 없어요.
        </p>
      )}
      {confirm && (
        <Modal
          eyebrow="계정 삭제"
          title="정말 탈퇴하시겠어요?"
          onClose={() => setConfirm(false)}
        >
          <p className="small muted">
            탈퇴하면 계정과 저장한 정보가 삭제됩니다. 신중하게 결정해 주세요.
          </p>
          <div className="delete-information">
            <strong>삭제되는 정보</strong>• 로그인 및 계정 정보
            <br />• 저장한 코스와 관심 행사
            <br />• 개인화 설정
          </div>
          <p className="tiny danger strong">
            탈퇴 후에는 정보를 복구할 수 없어요.
          </p>
          {error && (
            <p className="error small" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="primary danger-fill"
            disabled={busy}
            onClick={() => void remove()}
          >
            {busy ? '처리 중…' : '탈퇴하기'}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => setConfirm(false)}
          >
            계속 이용하기
          </button>
        </Modal>
      )}
    </>
  )
}
export function Account() {
  const { user } = useApp()
  return (
    <>
      <h1 className="settings-title">내 로그인 정보</h1>
      <p className="settings-description">현재 로그인한 계정을 확인하세요.</p>
      <section className="panel">
        <dl className="account-details">
          <div>
            <dt>닉네임</dt>
            <dd>{user?.name ?? '게스트'}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{user?.email ?? '로그인 정보 없음'}</dd>
          </div>
          <div>
            <dt>로그인 방식</dt>
            <dd>
              {user?.id === sampleUser.id
                ? '이메일 로그인 · 시연'
                : user
                  ? '이메일 로그인'
                  : '게스트 이용'}
            </dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{user?.id === sampleUser.id ? '2026.11.01' : '정보 없음'}</dd>
          </div>
        </dl>
      </section>
      <section className="panel tinted stack">
        <h2 className="h3 blue">안전한 계정 이용</h2>
        <p className="small muted">
          공용 기기에서는 이용을 마친 뒤<br />
          로그아웃해 주세요.
        </p>
      </section>
      {user?.id === sampleUser.id && (
        <p className="tiny settings-caption">
          계정 정보는 화면 구성을 위한 예시입니다.
        </p>
      )}
      {!user && (
        <a className="primary" href="#/login">
          로그인하기
        </a>
      )}
    </>
  )
}
type Notice = {
  id: string
  title: string
  body: string
  publishedAt: string
  category: string
}
const exampleNotices: Notice[] = [
  {
    id: 'update',
    title: '더 편리해진 내 코스를 만나보세요',
    body: '안녕하세요. 더 즐거운 나들이를 위해 내 코스와 설정 화면을 새롭게 준비했어요.\n\n나에게 맞는 알림\n저장한 행사 소식과 코스 안내를 원하는 대로 켜고 끌 수 있어요.\n\n한곳에서 관리하는 내 정보\n설정에서 로그인 정보와 개인정보 이용 범위를 쉽게 확인할 수 있어요.\n\n앞으로도 편안한 나들이를 함께할게요. 감사합니다.',
    publishedAt: '2026-11-10T00:00:00+09:00',
    category: '업데이트 소식',
  },
  {
    id: 'notifications',
    title: '알림 설정 기능이 추가됐어요',
    body: '원하는 소식의 수신 선호를 설정에서 변경할 수 있어요. 실제 알림 발송은 서비스 연결 후 제공됩니다.',
    publishedAt: '2026-11-06T00:00:00+09:00',
    category: '업데이트',
  },
  {
    id: 'guide',
    title: '즐거운 나들이를 위한 이용 안내',
    body: '방문 전 공식 출처의 운영시간·요금·신청 방법을 확인해 주세요.',
    publishedAt: '2026-11-01T00:00:00+09:00',
    category: '안내',
  },
  {
    id: 'welcome',
    title: '함께 만드는 나들이의 시작',
    body: '마음에 드는 행사에서 우리의 하루를 시작해 보세요. 현재 시연 모드의 행사·장소는 가상 데이터입니다.',
    publishedAt: '2026-10-28T00:00:00+09:00',
    category: '공지',
  },
]
export function Notices({ id }: { id?: string }) {
  const [notices, setNotices] = useState<Notice[]>(isDemo ? exampleNotices : [])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isDemo)
  useEffect(() => {
    if (isDemo) return
    const controller = new AbortController()
    void request('/notices', { signal: controller.signal })
      .then((value) => {
        if (
          !Array.isArray(value) ||
          !value.every(
            (v) =>
              v &&
              ['id', 'title', 'body', 'publishedAt', 'category'].every(
                (key) => typeof v[key] === 'string',
              ) &&
              Number.isFinite(Date.parse(v.publishedAt)),
          )
        )
          throw new Error('공지사항 데이터 형식을 확인해 주세요.')
        if (!controller.signal.aborted) setNotices(value)
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : '공지사항을 불러오지 못했어요.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])
  const selected = notices.find((n) => n.id === id)
  return (
    <>
      <h1 className="settings-title">새로운 소식을 확인해요</h1>
      <p className="settings-description">
        서비스 소식과 업데이트를 알려드려요.
      </p>
      {loading && (
        <p className="info" role="status">
          불러오는 중…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {selected ? (
        <article className="panel stack">
          <p className="eyebrow">{selected.category}</p>
          <h2>{selected.title}</h2>
          <time className="tiny muted">
            {new Date(selected.publishedAt).toLocaleDateString('ko-KR', {
              timeZone: 'Asia/Seoul',
            })}
          </time>
          <p className="notice-body small notices-detail">{selected.body}</p>
          <a className="secondary" href="#/notices">
            목록으로 돌아가기
          </a>
        </article>
      ) : id && !loading ? (
        <p className="info">공지사항을 찾을 수 없어요.</p>
      ) : (
        <section className="list-panel">
          {notices.map((n) => (
            <a
              className="notice-item"
              href={`#/notices/${encodeURIComponent(n.id)}`}
              key={n.id}
            >
              <span className="eyebrow">{n.category}</span>
              <strong>{n.title}</strong>
              <time className="tiny muted">
                {new Date(n.publishedAt).toLocaleDateString('ko-KR', {
                  timeZone: 'Asia/Seoul',
                })}{' '}
                ›
              </time>
            </a>
          ))}
          {!notices.length && !loading && (
            <p className="panel muted">등록된 공지사항이 없어요.</p>
          )}
        </section>
      )}
    </>
  )
}
export function Contact() {
  const app = useApp()
  const [email, setEmail] = useState(app.user?.email ?? '')
  const [title, setTitle] = useState(
    app.preview?.id === '237:371' ? '저장한 코스가 보이지 않아요' : '',
  )
  const [message, setMessage] = useState(
    app.preview?.id === '237:371'
      ? '어제 저장한 코스가 내 코스 목록에 보이지 않아요. 확인 부탁드립니다.'
      : '',
  )
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      if (!isDemo) await api.inquiry(email, title, message)
      else await new Promise((resolve) => window.setTimeout(resolve, 400))
      app.setContactReceipt({ email, isDemo })
      go('/contact-complete')
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : '문의가 접수되지 않았어요. 다시 시도해 주세요.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <h1 className="settings-title">무엇을 도와드릴까요?</h1>
      <p className="settings-description">
        불편한 점이나 궁금한 내용을 알려주세요.
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <div className="panel form-stack">
          <label className="field">
            답변받을 이메일
            <input
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            제목
            <input
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            문의 내용
            <textarea
              required
              maxLength={1000}
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          <p className="tiny muted align-right">{message.length} / 1,000</p>
          <p className="tiny muted">
            문의 내용 확인 및 답변을 위해 입력한 이메일을 이용합니다.
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '접수 중…' : '문의 보내기'}
        </button>
        {isDemo && (
          <p className="settings-description">
            시연 모드에서는 문의를 전송하지 않고 완료 화면을 확인합니다.
          </p>
        )}
      </form>
    </>
  )
}
export function Guide() {
  const app = useApp()
  const current = app.draft ?? app.courses[0]
  const eventsPath = teamBackend.enabled ? '/festivals' : '/events'
  return (
    <>
      <h1 className="guide-title">우리만의 하루를 만드는 방법</h1>
      <p className="guide-description">
        다섯 단계를 따라가며 가까운 곳의 즐거움을 찾아보세요.
      </p>
      <a className="secondary" href="#/">
        처음부터 시작하기 →
      </a>
      <a className="secondary" href="#/help">
        예외 상황 · 저장과 공유 도움말 →
      </a>
      <section className="panel guide-steps">
        {[
          [
            '검색',
            '원하는 하루를 검색해요.',
            '원하는 하루나 행사명을 입력하고 검색해 주세요.',
            '/',
          ],
          [
            '행사 리스트',
            '마음에 드는 행사를 골라요.',
            '목록과 지도에서 일시·요금·출처를 확인해요.',
            eventsPath,
          ],
          [
            '행사 상세',
            '방문 전 정보를 확인해요.',
            '프로그램과 신청 채널도 함께 확인해요.',
            eventsPath,
          ],
          [
            '세부 설정',
            '우리에게 맞는 하루를 정해요.',
            '행사를 고른 뒤 출발지와 시간을 정하거나, 장소 코스의 조건을 바꿔요.',
            current
              ? isRealCourse(current)
                ? `/plan/${current.id}`
                : `/configure/${current.eventId}`
              : eventsPath,
          ],
          [
            '하루 일정',
            '일정을 고치고 함께 나눠요.',
            '순서를 바꾸고 저장·공유할 수 있어요.',
            '/saved',
          ],
        ].map(([name, title, description, path], i) => (
          <div className="guide-step" key={name}>
            <span className="number-badge">{i + 1}</span>
            <div className="stack">
              <div className="row">
                <span className="tiny muted">STEP 0{i + 1}</span>
                <h2>{name}</h2>
              </div>
              <h3>{title}</h3>
              <p className="small muted">{description}</p>
              <a className="secondary" href={`#${path}`}>
                화면 보기 ↗
              </a>
            </div>
          </div>
        ))}
      </section>
      <section className="panel stack">
        <h2>이럴 땐 이렇게 해 보세요</h2>
        <p className="small muted">
          검색 결과가 없으면 조건을 넓혀 주세요. 위치 권한을 거부해도 출발지를
          직접 입력할 수 있어요. 정보가 다른 행사는 안내 상이 배지에서 원문별
          차이를 확인해 주세요.
        </p>
      </section>
    </>
  )
}
