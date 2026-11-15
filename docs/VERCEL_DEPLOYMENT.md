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

- 팀 저장소 `YongYongThon-Team10/FE`는 사용자 승인에 따라 공개로 전환했다. 공개 저장소로 Hobby 무료 Git 배포를 연결할 수 있다. [Vercel 공식 안내](https://vercel.com/docs/git#using-hobby-teams).
- GitHub organization 소유자가 Vercel GitHub App 설치를 승인해야 한다. 저장소 접근 범위는 `Only select repositories`에서 `FE`만 선택한다.
- 공개 전환 후 CLI의 Git 연결은 저장소 접근 오류로 실패했다. GitHub 설치 화면에서는 현재 계정에 Install 대신 Request만 표시되므로 조직 소유자의 앱 설치 승인이 필요하다.
- 승인 후 Vercel 프로젝트의 Settings → Git에서 저장소를 연결하고 Settings → Environments → Production → Branch Tracking에서 `codex/figma-service-ui`를 설정한다. 최신 코드가 main에 병합되면 production 브랜치도 main으로 변경한다.
- 연결 후 해당 브랜치의 새 커밋 푸시로 생성되는 배포가 Ready인지, 프로덕션 도메인에 반영되는지 확인해야 자동 배포 검증이 완료된다.

요금제는 Hobby를 유지한다. API 키나 Vercel 토큰은 저장소와 GitHub Actions 파일에 기록하지 않는다. 조직 소유자는 https://github.com/apps/vercel/installations/new 에서 `YongYongThon-Team10`을 선택하고 `Only select repositories` → `FE`만 지정해 설치를 승인하면 된다.
