# 용인데이 BE 연동 준비

확인 기준: 2026-11-14, `YongYongThon-Team10/BE`의 작업 브랜치 `dev`, 커밋 `521da0046fa36263356c43032594a2561050607b`. GitHub 기본 브랜치 main과 다르므로 실제 배포 커밋을 반드시 확인한다.

## 준비한 코드와 적용 범위

1. `src/services/teamBackend/client.ts`: BE 실제 경로, `{data, error}` 응답 해제, 오류 코드 보존, Bearer 인증, 401 시 토큰 재발급 및 1회 재시도, 동시 재발급 합치기, 요청 취소와 타임아웃. 서버 오류 상세와 토큰은 출력하지 않는다.
2. `contracts.ts`: BE DTO에 맞춘 행사 목록, 검색 해석, 출발지 검색, 일정, 코스 저장 및 목록 타입. 응답 envelope와 토큰을 런타임 검사한다. 나머지 DTO 타입은 컴파일 기준이며 화면에 연결할 때 해당 화면용 런타임 검증과 표시 모델 변환을 추가해야 한다.
3. `adapters.ts`: FE 코스 설정을 `baseEventId`, `origin`, `transport`, `timeWindow`, `wants`로 변환한다. 카카오 장소 ID, 좌표 없는 출발지, 미지원 금액 예산을 행사 생성 요청으로 잘못 보내지 않는다.
4. `index.ts`: `VITE_TEAM_API_BASE_URL`로 설정할 수 있는 클라이언트. 서버 원점만 입력한다. 예: `https://backend.example.com`. `/api`나 `/api/v1`을 붙이지 않는다.
5. `tests/backend-contract.spec.ts`: 모의 BE로 경로, 인증 및 재발급, 세션 변경, 오류, 취소, 시간 초과, 조건 변환을 검증한다.

2026-11-15 업데이트: 전달받은 API 문서(main 2863542 기준)를 `RECEIVED_API_REFERENCE.md`에 보관하고, 26개 API 경로의 호출 모듈을 반영했다. Cloudtype 운영 서버를 `VITE_TEAM_API_BASE_URL`로 설정했다. 로그인과 가입, 로그아웃은 실제 BE 인증을 사용하며 토큰은 메모리에만 보관한다. 새로고침 시 재로그인이 필요하다.

홈의 '용인 축제와 행사 찾아보기'에서 `#/festivals`로 이동한다. 날짜와 지역별 행사 조회, 상세 및 공식 신청과 출처, 출발지 검색과 선택, 행사 기반 서버 일정 생성과 조회를 연결했다. 서버 일정은 nullable 정보와 24시 이후 시각, 경고 및 이동 추정 정보를 그대로 표시한다. 개인 저장으로 표시하거나 샘플 식사 후보를 실제 식당으로 바꾸어 표시하지 않는다. 현재 카카오 실제 장소 검색과 브라우저 코스 저장은 별도로 유지한다.

운영 서버: `https://port-0-yongyongthon-mwf9naui0f714f94.sel3.cloudtype.app`. `/v3/api-docs`와 행사 조회, 출발지 검색의 정상 JSON 응답 및 FE 도메인 CORS 헤더를 확인했다. 2026-11-15 조회와 2025-01-01부터 2027-12-31까지 조회가 모두 행사 0건을 반환했다. 이는 DB 전체가 비었다는 단정은 아니며, BE 담당자가 운영 DB와 데이터 적재 및 조회 조건을 확인해야 한다. 실제 행사 상세와 일정 생성의 운영 데이터 검증은 행사 데이터 확보 후 진행해야 한다. 문서 예시 응답을 이용한 자동 테스트는 실서버 검증과 구분한다.

`VITE_API_BASE_URL`은 기존 FE 제안 규격용이다. 팀 BE 주소를 여기에 넣으면 `/catalog`, `/auth/session` 같은 존재하지 않는 API를 호출하므로 사용하지 않는다. `VITE_PLACES_API_BASE=/api`는 현재 Vercel의 카카오 프록시용으로 별도 유지한다.

## 실제 호출 규격

| 기능              | 메서드와 경로                                        | 차이 및 주의                                                                     |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| 가입, 로그인      | POST `/api/v1/auth/signup`, `/signin`                | email, password, 가입은 name 추가. 응답은 accessToken, refreshToken, email, name |
| 토큰 재발급       | POST `/api/v1/auth/reissue`                          | `{refreshToken}`. 갱신된 AT와 RT를 함께 교체                                     |
| 로그아웃          | POST `/api/v1/auth/logout`                           | Bearer AT 필요                                                                   |
| 행사 목록         | GET `/api/events`                                    | dateFrom 필수. page는 0부터, district와 dong은 콤마 구분. map은 전체 결과        |
| 문장 해석         | POST `/api/search/parse`                             | `{query, today}`. parsed=false도 200                                             |
| 출발지 검색       | GET `/api/places/search?query=...`                   | name, address, lat, lng만 제공. 관광지 추천이나 주변 카페 API가 아님             |
| 관심 행사         | PUT 또는 DELETE `/api/me/favorites/{eventId}`        | 로그인 필요                                                                      |
| 일정 생성         | POST `/api/itineraries`                              | BE DB의 YI 행사 ID와 출발지 좌표 필요. 카카오 장소를 기준으로 생성 불가          |
| 일정 조회, 재추천 | GET `/api/itineraries/{id}`, POST `/{id}/regenerate` | 재추천은 변경한 조건만 보냄                                                      |
| 방문 순서 수정    | PATCH `/api/itineraries/{id}/slots/order`            | `{slotIds}`. return 슬롯 제외                                                    |
| 코스 저장, 목록   | POST 또는 GET `/api/me/courses`                      | 저장은 `{itineraryId, title?}`. 현재 공통 데모 소유자 사용                       |
| 코스 삭제         | DELETE `/api/me/courses/{courseId}`                  | itineraryId가 아닌 저장 응답의 courseId                                          |
| 공유              | POST `/api/itineraries/{id}/share`                   | shareId, shareUrl, title. BE 공유 URL과 FE 수신 화면 연결은 후속 작업            |

호출 예시 (개발 코드):

```ts
import { teamBackend } from '@/services/teamBackend'
import { itineraryInput } from '@/services/teamBackend/adapters'

await teamBackend.signIn(email, password)
const events = await teamBackend.events({ dateFrom: date, page: 0, size: 20 })
const origin = await teamBackend.originPlaces(originQuery)
// 사용자가 실제 검색 결과를 선택한 뒤 originLocation을 설정한다.
const input = itineraryInput(events.events[0].eventId, settings)
const itinerary = await teamBackend.createItinerary(input, abortSignal)
// 개인 저장으로 운영 연결하기 전 BE의 사용자별 소유권 구현을 확인한다.
```

## 운영 전 해결해야 하는 차이

1. 일정과 내 코스는 현재 인증을 읽지 않는 공통 데모 API다. `CourseController`, `ItineraryController`와 `PROGRESS.md`에 명시되어 있다. 로그인 토큰을 보내도 개인 소유권이 생기지 않는다. 개인 저장 화면에 연결하려면 BE가 사용자별 조회, 수정 및 삭제 권한을 구현해야 한다.
2. BE 생성은 `baseEventId` 기준이다. 현재 FE는 카카오 장소를 선택해 실제 주변 음식점 및 카페로 일정을 만든다. 기존 코스 스냅샷(카카오 장소 ID, 좌표, 방문 순서, 체류 시간)을 저장하는 계약 또는 카카오 장소 기반 생성 API가 필요하다. 카카오 ID를 YI 행사 ID로 바꾸어 보내지 않는다.
3. BE의 meal-candidates는 `MealSamples`의 샘플이다. 현재 실제 음식점과 카페 추천을 이 API로 교체하지 않는다. 샘플 사용 없이 카카오 API로 통합할 계획과 응답을 합의한다.
4. `/auth/session`, 비밀번호 재설정, 회원 탈퇴 및 프로필 ID 조회 API가 없다. 클라이언트의 토큰은 메모리에만 둔다. 새로고침하면 재로그인이 필요하다. 지속 세션과 계정 메뉴 지원 범위를 BE와 합의해야 한다.
5. BE는 무료 또는 제한 없음만 지원하며 숫자 예산을 지원하지 않는다. 동행 및 실내외는 유효성 검사만 하고 행사 필터로 쓰지 않는다. 데이터가 없는 요금, 좌표와 시간은 임의 값으로 채우지 않는다.
6. 일정 응답의 nullable 슬롯, `24:10`처럼 자정을 넘는 시간, warnings, isSaved 및 mapLink를 기존 Course로 단순 치환하지 않는다. UI 모델 변환과 회귀 검증이 필요하다.

## BE 담당자에게 받을 정보

이미지 표시 계층도 준비되어 있다. `imageUrl`과 `thumbnailUrl`, 선택 출처 필드 `imageCredit`를 전달하면 BE 사진을 우선 표시한다. [사진 규격과 출처](PLACE_IMAGES.md)를 참고한다. 이미지 URL과 재사용 가능한 저작자 정보도 함께 요청한다.

1. 브라우저에서 접근 가능한 HTTPS 운영 및 테스트 API 원점, Swagger URL, 실제 배포 브랜치와 커밋.
2. 테스트 계정 및 역할. 비밀번호는 단체방 대신 별도 안전한 경로로 전달받는다. 가능하면 테스트 환경에서 직접 가입한다.
3. 실제 데이터가 있는 행사 ID, 조회 가능한 날짜, 일정 생성 요청 및 성공 응답 예시. DB 스키마와 행사 적재 완료 여부.
4. 로그인, 재발급, 로그아웃의 실제 동작과 토큰 유효시간, 지속 세션 및 내 정보 조회 방식.
5. 사용자별 일정 및 저장 소유권 적용 여부. 두 계정 간 코스 조회 및 삭제가 분리되는지.
6. 카카오 장소 기반 코스 저장 계약, 실제 주변 음식점 및 카페 추천 통합 계획.
7. CORS 반영 여부. `https://yongin-day.vercel.app`, 개발 시 `http://localhost:5173`과 `http://127.0.0.1:5173`. Preview는 사용할 정확한 주소만 추가한다. `cors.allowed-origins` 설정에 반영하고 Authorization, Content-Type 및 OPTIONS 요청을 허용한다. 이 클라이언트는 쿠키를 보내지 않는다.
8. BE 서버의 KAKAO_REST_API_KEY 및 AI 기능 사용 시 OPENAI_API_KEY 설정 여부. 실제 키 값을 단체방이나 FE 소스에 전달할 필요는 없다.

## 다음 적용 순서

1. 운영 주소, 배포 커밋, Swagger, 테스트 데이터를 확인한다.
2. 테스트 환경에서 공개 행사 조회, 출발지 검색 및 브라우저 CORS를 먼저 검증한다.
3. 실제 가입, 로그인 및 재발급을 검증하고 계정 UI를 연결한다.
4. BE 행사 기반 일정의 표시 및 편집 어댑터를 연결한다. 카카오 장소 흐름은 별도 계약 확정 후 연결한다.
5. 사용자별 소유권이 구현된 서버 저장을 연결한다. 두 계정 격리, 새로고침과 재로그인, 실패 및 재시도를 검증한다.
6. 공유 링크 수신 화면을 연결하고 검증된 변경만 Vercel 운영 배포에 반영한다.

## 톡방 전달 문구

용인데이 FE는 https://yongin-day.vercel.app 에서 확인할 수 있습니다. BE dev(521da004) 기준으로 API 호출 모듈과 인증 및 토큰 재발급 처리를 준비했습니다. 아직 실제 서버에 연결한 상태는 아닙니다.

연동 시작을 위해 아래 정보 부탁드립니다.

1. HTTPS BE 운영 및 테스트 API 주소, Swagger 주소, 실제 배포 브랜치와 커밋
2. 테스트 계정(비밀번호는 개인 전달 또는 직접 가입), 테스트 가능한 행사 ID와 날짜
3. FE 도메인 https://yongin-day.vercel.app CORS 허용
4. DB 및 행사 데이터 적재, 카카오 REST 키와 AI 키의 서버 설정 여부

코드상 확인이 필요한 부분도 있습니다.

1. 일정과 내 코스가 현재 공통 데모 사용자 방식인데, 계정별 조회 및 저장과 수정, 삭제 권한을 적용할 계획인지 확인 부탁드립니다.
2. FE는 카카오 실제 장소로 코스를 만드는 반면 BE 생성은 행사 ID 기준입니다. 카카오 장소 코스를 저장할 요청 및 응답 규격을 합의하고 싶습니다.
3. meal-candidates는 샘플로 확인했습니다. 실제 음식점 및 카페 추천은 현재 카카오 검색을 유지하고, BE 통합 방향을 맞추면 좋겠습니다.
4. 새로고침 후 로그인 유지 및 내 정보 조회 방식도 확인 부탁드립니다.

정보가 준비되면 공개 조회부터 로그인, 일정, 개인 저장 순서로 연동 검증하겠습니다. API 키나 DB 접속 비밀번호를 단체방에 올릴 필요는 없습니다.
