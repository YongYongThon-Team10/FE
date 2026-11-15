import { designFrames, frameLink } from '@/data/designFrames'
export function DesignReview() {
  return (
    <>
      <h1 className="blue">Figma 전체 화면 확인</h1>
      <p className="small muted">
        현재 앱 36개 · 시설 화면 14개. 미리보기는 실제 저장 데이터를 바꾸지 않는
        시연 상태로 열립니다.
      </p>
      {(['192:2', '0:1'] as const).map((page) => (
        <section className="panel stack" key={page}>
          <h2>
            {page === '192:2' ? '현재 서비스 UI' : '용인데이 · 기흥 시설'}
          </h2>
          {designFrames
            .filter((f) => f.page === page)
            .map((f) => (
              <a
                className="review-link"
                href={`#${frameLink(f)}`}
                key={f.id}
                data-frame-id={f.id}
              >
                <span>
                  <strong>{f.name}</strong>
                  <small>{f.id}</small>
                </span>
                <span>열기 ›</span>
              </a>
            ))}
        </section>
      ))}
    </>
  )
}
