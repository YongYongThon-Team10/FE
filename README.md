# Team 10 · FE

용인 지역 행사 탐색과 하루 코스 설계 서비스 프론트엔드입니다.
서비스 이름과 디자인은 팀 논의 후 확정합니다.

## 개발 시작

Node.js 24.14.1과 npm 11 기준입니다. 버전 기준은 `.nvmrc`에 있습니다.

```bash
git clone https://github.com/YongYongThon-Team10/FE.git
cd FE
npm ci
npm run dev
```

터미널에 표시된 주소를 엽니다. 기본 주소는 http://localhost:5173 입니다.
의존성을 변경하면 `package-lock.json`도 함께 커밋합니다.

## 명령어

| 명령어            | 용도                                        |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | 개발 서버                                   |
| `npm run check`   | 린트, TypeScript, 포맷 검사                 |
| `npm run format`  | 포맷 정리                                   |
| `npm run build`   | TypeScript 검사 후 배포 파일 생성 (`dist/`) |
| `npm run preview` | 빌드 결과 로컬 확인                         |

## 기본 구성

- React + TypeScript + Vite 공식 템플릿 기반입니다.
- 템플릿 기본 도구인 Oxlint로 검사하고 Prettier로 포맷을 정리합니다.
- `@/`는 `src/`를 가리킵니다.
- `src/components/`: 공통 UI. `PageContainer`가 첫 예제입니다.
- `src/App.tsx`: 앱 시작 화면. 현재 초기 개발 안내를 표시합니다.
- `src/index.css`: 전역 스타일. `src/App.css`: 시작 화면 스타일.
- 기능 구현 시 `src/pages/`, `src/features/`, `src/lib/`를 필요에 따라 추가합니다.

## 환경변수와 API

`.env.example`을 `.env.local`로 복사하고 백엔드 주소가 확정되면
`VITE_API_BASE_URL`을 설정합니다. `import.meta.env.VITE_API_BASE_URL`로 읽습니다.
변경 후 개발 서버를 다시 시작합니다.
`VITE_` 변수는 브라우저에 공개되므로 비밀키를 넣지 않습니다.
현재 API, 지도 SDK, 로그인 및 라우팅은 연결하지 않았습니다.

## 협업

기능 브랜치에서 작업하고 `main`으로 PR을 생성합니다.
PR 전 `npm run check`와 `npm run build`를 실행합니다.
GitHub Actions가 PR과 `main` push에서 같은 검사를 수행합니다.
브랜치 보호 규칙과 필수 승인자는 팀이 저장소 설정에서 결정합니다.

기획 흐름: 검색 조건 → 행사 목록 → 행사 상세 → 일정 담기 → 하루 코스.
기존 프로토타입은 참고 자료로 별도 관리합니다.

공식 도구 안내: https://vite.dev/guide/
