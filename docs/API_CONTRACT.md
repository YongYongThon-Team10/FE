# 백엔드 연결 규격 초안

이 문서는 FE가 현재 호출하는 **제안 규격**이다. 전달받은 `용인 행사·축제 서비스 기능명세서.md`(2026-11-09)에는 실제 URL·필드·인증 프로토콜이 없으므로, 기존 백엔드 API라고 가정하지 않았다. 백엔드와 합의 후 `src/services/api.ts`, `src/services/search.ts`에서 변환한다.

## 연결과 갱신

`.env.local`의 `VITE_API_BASE_URL`을 비우면 명시적인 시연 모드다. 예: `VITE_API_BASE_URL=https://api.example.com/v1`. 주소를 설정한 모드에서는 실패하더라도 시연 데이터로 대체하지 않는다.

- `GET /catalog`를 최초 로드, 기본 60초 간격, 탭 복귀, 온라인 복구, 새로고침 버튼에서 호출한다. `VITE_DATA_REFRESH_MS`로 조절하며 최소 15초다.
- 갱신 실패 시 마지막 정상 데이터를 유지하고 오류를 표시한다. 최초 오류에는 재시도 UI를 표시한다.
- 요청 제한 시간은 15초다. 이전 조회는 취소하며 화면을 떠날 때 정리한다.
- 모든 시각은 timezone을 포함하는 ISO 8601, 방문 날짜는 `YYYY-MM-DD`, 좌표는 WGS84 `{lat, lng}`다. FE의 달력·표시는 `Asia/Seoul` 기준이다.
- 모든 API는 JSON이다. 쿠키 세션을 위해 `credentials: include`를 사용한다. 배포 도메인을 CORS allowlist에 등록하고 쿠키/SameSite/CSRF 정책은 백엔드와 확정한다. 상태 변경 요청은 서버에서 Origin 검증 등 CSRF 방어가 필요하다.
- 누락 가격·좌표·이미지·신청 URL은 `null`, 프로그램·출처 차이가 없으면 `[]`이다. 요금 `0`은 확인된 무료이며 미확인 요금에 0을 쓰지 않는다.

## n8n / 정기 수집 파이프라인

```text
공식 출처 → n8n/수집 작업 → 정규화·중복 제거·주소 좌표 변환·출처 차이 비교
          → 백엔드 DB 트랜잭션 반영 → catalog revision / updatedAt 변경
          → GET /catalog → FE 목록·상세·마커 동시 갱신
```

n8n은 브라우저가 호출하는 공개 webhook이 아니라 서버 측 수집 작업으로 둔다. 서비스 키·수집 인증키는 FE 환경변수에 넣지 않는다. 안정적인 행사/장소 ID를 유지해야 선택한 마커·상세가 갱신 후에도 연결된다. `revision`은 배치 버전, `updatedAt`은 실제 성공 반영 시각이다. `source.updatedAt`은 해당 출처를 확인한 시각이다. 실패한 수집은 정상 갱신 시각을 덮어쓰지 않는다.

수집·DB·n8n 워크플로 자체는 이 FE 저장소에서 실행하지 않는다.

## GET /catalog

타입의 기준은 `src/domain/models.ts`, 런타임 검증은 `src/domain/validation.ts`다. 응답 예시는 아래와 같다.

```json
{
  "revision": "batch-20261112-001",
  "updatedAt": "2026-11-12T12:00:00+09:00",
  "events": [
    {
      "id": "event-stable-id",
      "name": "확인한 행사명",
      "description": "행사 소개",
      "category": "culture",
      "district": "기흥구",
      "address": "공식 출처에서 확인한 주소",
      "location": null,
      "imageUrl": null,
      "price": null,
      "durationMinutes": 60,
      "openingHours": "",
      "source": {
        "name": "공식 출처",
        "url": "https://example.com/events/1",
        "updatedAt": "2026-11-12T12:00:00+09:00",
        "isDemo": false
      },
      "startsAt": "2026-11-14T10:00:00+09:00",
      "endsAt": "2026-11-14T18:00:00+09:00",
      "venue": "확인한 행사장",
      "participation": "신청 필요",
      "companions": ["혼자", "아이와", "연인과", "친구와", "가족과"],
      "notice": null,
      "environment": null,
      "programs": [],
      "sources": [],
      "conflicts": [],
      "applicationUrl": null
    }
  ],
  "places": []
}
```

`Place`는 위 이벤트 중 공통 필드(`id`~`source`)를 사용한다. `category`: `park | food | cafe | culture | sports | shopping`. `environment`: `indoor | outdoor | null`.

`programs` 항목: `{id, name, category, price: number|null, durationMinutes}`. `sources` 항목은 `source`와 같다. `conflicts`: `{field, entries: [{sourceName, value, url: string|null}]}`. 출처 차이를 보존해야 안내 상이 상세가 표시된다. 신청은 `applicationUrl`의 외부 채널에서만 진행한다.

혼잡도 데이터는 확정되지 않아 FE에서 표시하지 않는다. 추후 필드를 추가하더라도 반드시 ‘예측·제보 기반 추정’ 라벨을 함께 설계한다.

## 문장 검색 (S1)

`POST /search/interpret`

요청: `{text, timezone: "Asia/Seoul", referenceDate: "2026-11-12"}`.

응답:

```json
{
  "query": "",
  "categories": [],
  "districts": ["기흥구"],
  "companions": ["아이와"],
  "date": "2026-11-14",
  "until": "2026-11-15",
  "freeOnly": true,
  "environment": "outdoor",
  "maxDuration": 120
}
```

조건을 못 읽으면 422 등 오류를 반환한다. FE는 추측 조건을 채우지 않고 칩 선택을 안내한다. 사용자가 해석 결과를 수정한 값으로 검색한다. 행사명 직접 검색은 별도로 제공한다. 시연 모드는 명시적인 키워드 미리보기만 제공하며 실제 AI 호출은 하지 않는다.

## 좌표와 코스 (S4–S5)

| 요청                        | 입력                  | 출력                         |
| --------------------------- | --------------------- | ---------------------------- |
| `POST /places/geocode`      | `{address}`           | `{lat, lng}`; 못 찾으면 오류 |
| `POST /courses/generate`    | `{eventId, settings}` | `Course`                     |
| `POST /courses/recalculate` | `{course}`            | 수정·재계산한 `Course`       |

`settings`:

```json
{
  "date": "2026-11-14",
  "companion": "아이와",
  "childAge": 7,
  "transport": "도보",
  "origin": "출발지 주소",
  "originLocation": { "lat": 37.275, "lng": 127.116 },
  "startTime": "10:00",
  "endTime": "17:00",
  "budget": 0,
  "activities": ["먹거리", "체험"]
}
```

`budget: null`은 상관없음, `0`은 무료만이다. `activities`: 먹거리/체험/휴식/공연. 원본 값과 확인된 좌표를 서버에 전달한다. 주소 입력은 geocode 후 생성한다. 권한 거부 시 FE는 직접 입력에 포커스를 옮긴다.

`Course`: `{id, name, eventId, settings, stops, createdAt, isDemo}`.

`stops` 항목:

```json
{
  "id": "stop-stable-id",
  "kind": "meal",
  "title": "식사 장소",
  "place": null,
  "missingReason": "확인된 식사 후보가 없어요. 직접 추가해 주세요.",
  "durationMinutes": 0,
  "travelMinutes": null
}
```

종류는 `arrival | program | meal | nearby | return | custom`. 기본 5칸(행사·프로그램·식사·근처 행사·귀가)을 유지하고 후보가 없으면 위처럼 비워 둔다. `place`는 `Place | null`이다. 시간은 분 단위 정수, 미확인 이동은 `null`. 정확한 도로 시간으로 표현하지 않는다. 시연 모드의 속도 가정은 자동차 25 / 대중교통 15 / 도보 4 km/h이며 직선거리 기반 추정 라벨을 표시한다. 실제 서버도 추정 방식/버전 합의가 필요하다.

초기 추천은 선택 시간 내 후보만 채운다. 사용자가 수정해서 종료 시간을 넘으면 삭제하지 않고 경고한다. 실측 운영 시간·프로그램 시작 시간·경로 제약을 고려한 최종 추천은 백엔드 생성/재계산 응답에서 보장해야 한다.

## 계정·문의·공지

이 경로들도 합의 전 제안이다. 세션은 HttpOnly 쿠키 사용을 전제로 하며 FE에 토큰을 보관하지 않는다.

| 요청                        | 입력 / 출력                               |
| --------------------------- | ----------------------------------------- |
| `GET /auth/session`         | `User` 또는 `null`                        |
| `POST /auth/login`          | `{email, password}` → `User`              |
| `POST /auth/register`       | `{email, password, name}` → 성공 JSON/204 |
| `POST /auth/password-reset` | `{email}` → 성공 JSON/204                 |
| `POST /auth/logout`         | → 성공 JSON/204                           |
| `DELETE /auth/account`      | → 성공 JSON/204                           |
| `POST /inquiries`           | `{email, title, message}` → 성공 JSON/204 |
| `GET /notices`              | `[{id,title,body,publishedAt,category}]`  |

`User`: `{id,name,email}`. 오류는 HTTP status로 판단한다. 인증 실패 401, 요청 과다 429 등의 UX가 있다. 비밀번호 재설정·가입은 이메일 안내 확인 흐름이며 실제 발송은 서버 책임이다.

## 현재 보관·공유 방식과 다음 연결

- 내 코스·관심 행사·설정은 브라우저 localStorage에 저장한다. 로그인 계정별 클라우드 저장은 아직 없다. 계정 동기화를 붙일 때 GET/PUT/DELETE courses 저장소 어댑터를 추가해야 한다.
- 현재 위치 좌표는 메모리에서만 사용한다. 코스 저장소 직렬화 시 originLocation을 제거한다. 새로고침 후 귀가 위치는 다시 확인해야 한다.
- 공유는 URL hash에 검증 가능한 일정 스냅샷을 담는다. 출발지·현재 위치·아이 나이·출발/귀가 이동시간은 제외한다. 정해진 최대 길이를 넘으면 사용자에게 안내한다. 짧은 서버 공유 ID, 취소/만료, 변경 반영은 추후 공유 API가 필요하다.
- `localhost`에서 만든 링크는 배포된 서비스의 공유 링크가 아니다. 동일한 공개 배포 주소에서 생성해야 동행자가 열 수 있다.
- 푸시 설정은 선호값만 저장한다. 실제 알림 구독·발송 서비스는 아직 연결하지 않았다.

## 지도 운영

Leaflet과 OpenStreetMap 배경 지도, 숫자 마커, 클릭 정보 카드, 방문 순서 점선을 사용한다. 배경 실패 시에도 목록으로 위치/출처 정보를 확인할 수 있다. Figma의 지도 캡처 이미지를 실제 지도처럼 사용하지 않는다.

출처 표시는 유지하며 서버/SDK 변경 시에도 이용 조건을 지킨다. 대규모 운영 전 지도 제공사·쿼터·타일 이용 정책을 확정한다. [Leaflet 문서](https://leafletjs.com/reference.html), [OSM 타일 이용 정책](https://operations.osmfoundation.org/policies/tiles/), [카카오맵 이동수단별 길찾기 링크](https://apis.map.kakao.com/web/guide/#routeurl).
