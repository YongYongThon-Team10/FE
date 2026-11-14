# Vercel 배포

프로덕션: https://yongin-day.vercel.app

Vercel 프로젝트: `brian180099/yongin-day`. 기존 Sites 배포는 별도로 유지한다.

React/Vite 프론트는 `npm run build`로 `dist`에 빌드한다. `api/places.js`, `api/nearby.js`는 공통 `server/places.mjs`를 Vercel Node.js Functions로 실행한다. 기존 Sites용 `build:site`와 독립적인 배포 설정이다.

필수 production 환경변수:

- `KAKAO_REST_API_KEY`: Vercel Secret. 브라우저에 노출하지 않는다.
- `VITE_KAKAO_JAVASCRIPT_KEY`: 지도 SDK의 JavaScript 키. 빌드에 적용한다.
- `VITE_PLACES_API_BASE=/api`: `.env.production`에서 제공한다.

배포된 production 도메인은 카카오디벨로퍼스 앱 1650321의 JavaScript SDK 도메인 목록에 추가해야 한다. 새 preview 도메인은 별도 등록 전 카카오 지도가 표시되지 않을 수 있다.

로컬 소스에서 `vercel --prod`로 배포할 수 있다. 팀 GitHub 저장소 자동 배포는 Vercel GitHub 앱에 해당 저장소 접근을 허용하고 `codex/figma-service-ui` 브랜치를 production으로 지정한 경우에만 사용한다. 현재 main 브랜치는 이전 초기 코드이므로 최신 기능 배포 시 브랜치를 확인한다.
