import { useEffect, useState } from 'react'
import { Brand } from '@/components/Brand'
import { Modal } from '@/components/Modal'
import { useApp } from '@/state/context'
import type { Preferences } from '@/domain/models'
import { go } from '@/hooks/useRoute'
import { api, isDemo, request } from '@/services/api'

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
    setBusy(true)
    setMessage('')
    try {
      if (mode === 'login') {
        app.setUser(await api.login(email, password))
        setPassword('')
        go('/')
      } else if (mode === 'register') {
        await api.register(email, password, name)
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
              maxLength={128}
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button className="primary" type="submit" disabled={busy || isDemo}>
          {busy
            ? '처리 중…'
            : mode === 'login'
              ? '로그인'
              : mode === 'register'
                ? '회원가입'
                : '재설정 메일 받기'}
        </button>
      </form>
      {isDemo && (
        <p className="small muted">
          계정 서비스 연결 준비 중이에요. 게스트로 주요 기능을 둘러볼 수 있어요.
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
  const [logout, setLogout] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const leave = async () => {
    setBusy(true)
    try {
      if (!isDemo && user) await api.logout()
      setUser(null)
      setLogout(false)
      setToast('로그아웃했어요.')
      go('/login')
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
        <Modal title="로그아웃할까요?" onClose={() => setLogout(false)}>
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
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await api.deleteAccount()
      app.setUser(null)
      app.setCourses([])
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
        disabled={!app.user}
        onClick={() => setConfirm(true)}
      >
        회원 탈퇴
      </button>
      {!app.user && (
        <p className="tiny settings-caption">
          게스트는 삭제할 연결 계정이 없어요.
        </p>
      )}
      {confirm && (
        <Modal title="정말 탈퇴하시겠어요?" onClose={() => setConfirm(false)}>
          <p className="small muted">
            계정과 연결된 정보가 삭제됩니다. 탈퇴 후에는 복구할 수 없어요.
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
    <section className="panel stack">
      <h1>로그인 정보</h1>
      {user ? (
        <dl className="info-list">
          <div>
            <dt>이름</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{user.email}</dd>
          </div>
        </dl>
      ) : (
        <>
          <p className="small muted">현재 게스트로 이용 중이에요.</p>
          <a className="primary" href="#/login">
            로그인하기
          </a>
        </>
      )}
    </section>
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
    id: 'welcome',
    title: '함께 만드는 나들이의 시작',
    body: '마음에 드는 행사에서 나만의 하루를 만들어 보세요. 현재 보이는 행사와 장소는 Figma의 시연 데이터입니다.',
    publishedAt: '2026-11-12T00:00:00+09:00',
    category: '시연 안내',
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
          <p className="notice-body small">{selected.body}</p>
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
  const { user } = useApp()
  const [email, setEmail] = useState(user?.email ?? '')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    setBusy(true)
    setError('')
    try {
      await api.inquiry(email, title, message)
      setSent(true)
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
  if (sent)
    return (
      <section className="panel stack">
        <p className="eyebrow">접수 완료</p>
        <h1>문의를 잘 받았어요</h1>
        <p className="small muted">
          보내주신 내용을 확인한 뒤 {email}로 답변드릴게요.
        </p>
        <a className="primary" href="#/settings">
          설정으로 돌아가기
        </a>
      </section>
    )
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
              value={email}
              maxLength={200}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
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
        <button className="primary" type="submit" disabled={busy || isDemo}>
          {busy ? '접수 중…' : '문의 보내기'}
        </button>
        {isDemo && (
          <p className="settings-description">
            문의 접수 서비스 연결 준비 중이에요. 아직 문의가 전송되지 않습니다.
          </p>
        )}
      </form>
    </>
  )
}
export function Guide() {
  return (
    <>
      <h1 className="guide-title">우리만의 하루를 만드는 방법</h1>
      <p className="guide-description">
        다섯 단계를 따라가며 가까운 곳의 즐거움을 찾아보세요.
      </p>
      <a className="secondary" href="#/">
        처음부터 시작하기 →
      </a>
      <section className="panel guide-steps">
        {[
          [
            '검색',
            '원하는 하루를 검색해요.',
            '날짜·지역·동행 조건을 골라 주세요.',
            '/',
          ],
          [
            '행사 리스트',
            '마음에 드는 행사를 골라요.',
            '목록과 지도에서 일시·요금·출처를 확인해요.',
            '/events',
          ],
          [
            '행사 상세',
            '방문 전 정보를 확인해요.',
            '프로그램과 신청 채널도 함께 확인해요.',
            '/events',
          ],
          [
            '세부 설정',
            '우리에게 맞는 하루를 정해요.',
            '출발지·시간·예산과 활동을 선택해요.',
            '/events',
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
