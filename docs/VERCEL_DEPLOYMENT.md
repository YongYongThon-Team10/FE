# 용인데이 Vercel 배포

프로덕션: https://yongin-day.vercel.app

Vercel 프로젝트: `brian180099/yongin-day`. 기존 Sites 배포는 별도로 유지한다.

React/Vite 프론트는 `npm run build`로 `dist`에 빌드한다. `api/places.js`, `api/nearby.js`는 공통 `server/places.mjs`를 Vercel Node.js Functions로 실행한다. 기존 Sites용 `build:site`와 독립적인 배포 설정이다.

필수 production 환경변수:

- `KAKAO_REST_API_KEY`: Vercel Secret. 브라우저에 노출하지 않는다.
- `VITE_KAKAO_JAVASCRIPT_KEY`: 지도 SDK의 JavaScript 키. 빌드에 적용한다.
- `VITE_PLACES_API_BASE=/api`: `.env.production`에서 제공한다.

배포된 production 도메인은 카카오디벨로퍼스 앱 1650321의 JavaScript SDK 도메인 목록에 추가해야 한다. 새 preview 도메인은 별도 등록 전 카카오 지도가 표시되지 않을 수 있다.

로컬 소스에서 `vercel --prod`로 배포할 수 있다. 팀 GitHub 저장소 자동 배포는 Vercel GitHub 앱에 해당 저장소 접근을 허용하고 `codex/figma-service-ui` 브랜치를 production으로 지정한 경우에만 사용한다. 현재 main 브랜치는 이전 초기 코드이므로 최신 기능 배포 시 브랜치를 확인한다.

## Git 자동 배포 연결 상태

2026-11-14 기준 배포는 CLI로 진행하며, Git 자동 배포는 아직 연결되지 않았다.

- 팀 저장소 `YongYongThon-Team10/FE`는 비공개 organization 저장소다. 현재 Hobby 프로젝트에서는 이 저장소의 Git 배포를 지원하지 않으므로 비공개 유지 시 Pro 전환이 필요하다. [Vercel 공식 안내](https://vercel.com/docs/git#using-hobby-teams).
- GitHub organization 소유자가 Vercel GitHub App 설치를 승인해야 한다. 저장소 접근 범위는 `Only select repositories`에서 `FE`만 선택한다.
- 위 조건 충족 후 Vercel 프로젝트의 Settings → Git에서 저장소를 연결하고 Production Branch를 `codex/figma-service-ui`로 설정한다. 최신 코드가 main에 병합되면 production 브랜치도 main으로 변경한다.
- 연결 후 해당 브랜치의 새 커밋 푸시로 생성되는 배포가 Ready인지, 프로덕션 도메인에 반영되는지 확인해야 자동 배포 검증이 완료된다.

요금제 변경과 저장소 공개 전환은 별도 승인 전 수행하지 않는다. API 키나 Vercel 토큰은 저장소와 GitHub Actions 파일에 기록하지 않는다.
