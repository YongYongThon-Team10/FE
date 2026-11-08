import { PageContainer } from '@/components/PageContainer'
import './App.css'

function App() {
  return (
    <PageContainer>
      <p className="eyebrow">YONGYONGTHON · TEAM 10</p>
      <h1>용인에서 보내는 하루</h1>
      <p className="description">
        지역 행사를 발견하고, 가고 싶은 장소를 연결해 나만의 하루를 계획합니다.
      </p>
      <section className="starter" aria-labelledby="starter-title">
        <h2 id="starter-title">프론트엔드 개발 준비 완료</h2>
        <p>React + TypeScript + Vite 프로젝트입니다.</p>
        <p>
          검색 → 행사 상세 → 일정 담기 → 하루 코스 순서로 화면을 구현합니다.
        </p>
      </section>
    </PageContainer>
  )
}

export default App
