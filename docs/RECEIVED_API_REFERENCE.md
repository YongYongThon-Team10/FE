# 용인 행사 축제 서비스 API 문서

> 기준: `YongYongThon-Team10/BE` `main` 브랜치 `2863542` (2026-11-14). 모든 내용은 코드에서 확인했다.
> 예시 JSON의 값은 이해를 돕기 위한 예시다. 필드 이름과 모양은 실제 응답과 같다.

## 목차

| #   | Method | Endpoint                                                        | 설명                        |
| --- | ------ | --------------------------------------------------------------- | --------------------------- |
| 1   | POST   | `/api/v1/auth/signup`                                           | 회원가입                    |
| 2   | POST   | `/api/v1/auth/signin`                                           | 로그인                      |
| 3   | POST   | `/api/v1/auth/reissue`                                          | 토큰 재발급                 |
| 4   | POST   | `/api/v1/auth/logout`                                           | 로그아웃                    |
| 5   | GET    | `/api/events`                                                   | 행사 목록과 지도 (E1)       |
| 6   | GET    | `/api/events/{eventId}`                                         | 행사 상세 (E2)              |
| 7   | GET    | `/api/events/{eventId}/discrepancies`                           | 안내 상이 (E3)              |
| 8   | POST   | `/api/search/parse`                                             | 자연어를 검색 조건으로 (E4) |
| 9   | GET    | `/api/places/search`                                            | 출발지 장소 검색 (E14)      |
| 10  | PUT    | `/api/me/favorites/{eventId}`                                   | 관심 행사 담기 (E19)        |
| 11  | DELETE | `/api/me/favorites/{eventId}`                                   | 관심 행사 해제 (E20)        |
| 12  | POST   | `/api/itineraries`                                              | 하루 일정 생성 (E5)         |
| 13  | GET    | `/api/itineraries/{itineraryId}`                                | 일정 조회                   |
| 14  | POST   | `/api/itineraries/{itineraryId}/slots`                          | 슬롯 추가                   |
| 15  | DELETE | `/api/itineraries/{itineraryId}/slots/{slotId}`                 | 슬롯 삭제                   |
| 16  | PUT    | `/api/itineraries/{itineraryId}/slots/{slotId}`                 | 슬롯 교체                   |
| 17  | GET    | `/api/itineraries/{itineraryId}/slots/{slotId}/alternatives`    | 교체 후보 (행사)            |
| 18  | GET    | `/api/itineraries/{itineraryId}/slots/{slotId}/meal-candidates` | 식사 후보                   |
| 19  | PATCH  | `/api/itineraries/{itineraryId}/slots/order`                    | 슬롯 순서 변경              |
| 20  | POST   | `/api/itineraries/{itineraryId}/regenerate`                     | 조건 바꿔 재추천            |
| 21  | POST   | `/api/itineraries/{itineraryId}/share`                          | 공유 링크 만들기            |
| 22  | GET    | `/api/shared/{shareId}`                                         | 공유 일정 미리보기          |
| 23  | POST   | `/api/me/courses`                                               | 내 코스 저장                |
| 24  | GET    | `/api/me/courses`                                               | 내 코스 목록                |
| 25  | DELETE | `/api/me/courses/{courseId}`                                    | 내 코스 삭제                |
| 26  | GET    | `/api/me/calendar`                                              | 캘린더                      |

## 공통

1. 모든 응답은 `{"data": ..., "error": {"code": ..., "message": ...}}` 모양이다. 성공하면 `error`의 두 값이 null, 실패하면 `data`가 null이다.
2. 값이 없는 필드는 키를 빼지 않고 null로 준다. 예외는 일정 경고의 `slotId`로, 해당 슬롯이 없으면 키가 빠진다.
3. 날짜는 `yyyy-MM-dd`, 시각은 `HH:mm`이다.
4. 로그인이 필요한 API는 `Authorization: Bearer <accessToken>` 헤더를 보낸다. 토큰이 없거나 잘못되면 401 C4011이다.
5. 행사, 검색, 장소, 일정, 내 코스 API의 요청 값 오류(필수 값 누락, 형식 오류, 허용되지 않는 값, 깨진 JSON)는 모두 400 E4001이다. 인증 API는 검증 실패가 C002, 형식 오류가 C001이다.
6. 모든 API에서 서버 내부 오류는 500 C500이다.
7. Swagger UI: `/swagger-ui.html`

---

## 1. 회원가입

### Summary

| 항목        | 내용                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| Endpoint    | `/api/v1/auth/signup`                                                    |
| Method      | POST                                                                     |
| 설명        | 이메일, 이름, 비밀번호로 가입하고 바로 토큰을 발급한다. 권한은 항상 USER |
| 최초 작성일 | 2026-11-12                                                               |
| 최종 수정일 | 2026-11-14                                                               |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Request Body (application/json)

| Key      | Type   | Description        | 필수 | Example          |
| -------- | ------ | ------------------ | ---- | ---------------- |
| email    | String | 이메일 형식        | O    | user@example.com |
| name     | String | 이름 (공백 불가)   | O    | 홍길동           |
| password | String | 8자 이상 64자 이하 | O    | password123      |

### Example

```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "password": "password123"
}
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "email": "user@example.com",
    "name": "홍길동"
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key          | Type   | Description              | Example          |
| ------------ | ------ | ------------------------ | ---------------- |
| accessToken  | String | 액세스 토큰 (1시간 유효) | eyJhbGciOi...    |
| refreshToken | String | 리프레시 토큰 (7일 유효) | eyJhbGciOi...    |
| email        | String | 이메일                   | user@example.com |
| name         | String | 이름                     | 홍길동           |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "C4091",
    "message": "이미 존재하는 이메일입니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황                              |
| ----------- | ----- | ----------------------------- | -------------------------------------- |
| 400         | C002  | 유효하지 않은 파라미터입니다. | 이메일 형식 오류, 빈 값, 비밀번호 길이 |
| 400         | C001  | 잘못된 요청입니다.            | 깨진 JSON                              |
| 409         | C4091 | 이미 존재하는 이메일입니다.   | 가입된 이메일                          |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류                         |

---

## 2. 로그인

### Summary

| 항목        | 내용                                           |
| ----------- | ---------------------------------------------- |
| Endpoint    | `/api/v1/auth/signin`                          |
| Method      | POST                                           |
| 설명        | 이메일과 비밀번호로 로그인하고 토큰을 발급한다 |
| 최초 작성일 | 2026-11-12                                     |
| 최종 수정일 | 2026-11-14                                     |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Request Body (application/json)

| Key      | Type   | Description | 필수 | Example          |
| -------- | ------ | ----------- | ---- | ---------------- |
| email    | String | 이메일 형식 | O    | user@example.com |
| password | String | 비밀번호    | O    | password123      |

### Example

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Response

### 요청 성공 (200 OK)

회원가입과 같은 모양이다 (`accessToken`, `refreshToken`, `email`, `name`).

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "C4012",
    "message": "비밀번호가 일치하지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황               |
| ----------- | ----- | ----------------------------- | ----------------------- |
| 400         | C002  | 유효하지 않은 파라미터입니다. | 이메일 형식 오류, 빈 값 |
| 401         | C4012 | 비밀번호가 일치하지 않습니다. | 비밀번호 틀림           |
| 404         | C4041 | 사용자를 찾을 수 없습니다.    | 가입되지 않은 이메일    |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류          |

---

## 3. 토큰 재발급

### Summary

| 항목        | 내용                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/v1/auth/reissue`                                                                        |
| Method      | POST                                                                                          |
| 설명        | 리프레시 토큰으로 액세스 토큰과 리프레시 토큰을 새로 발급한다. 이전 리프레시 토큰은 즉시 무효 |
| 최초 작성일 | 2026-11-12                                                                                    |
| 최종 수정일 | 2026-11-14                                                                                    |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Request Body (application/json)

| Key          | Type   | Description                  | 필수 | Example       |
| ------------ | ------ | ---------------------------- | ---- | ------------- |
| refreshToken | String | 로그인 때 받은 리프레시 토큰 | O    | eyJhbGciOi... |

### Example

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

## Response

### 요청 성공 (200 OK)

회원가입과 같은 모양이다 (`accessToken`, `refreshToken`, `email`, `name`).

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "C4013",
    "message": "유효하지 않은 토큰입니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황                                          |
| ----------- | ----- | ----------------------------- | -------------------------------------------------- |
| 400         | C002  | 유효하지 않은 파라미터입니다. | refreshToken 누락                                  |
| 401         | C4013 | 유효하지 않은 토큰입니다.     | 만료, 위조, 로그아웃된 토큰, 이미 재발급에 쓴 토큰 |
| 404         | C4041 | 사용자를 찾을 수 없습니다.    | 토큰의 사용자가 없음                               |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류                                     |

---

## 4. 로그아웃

### Summary

| 항목        | 내용                                             |
| ----------- | ------------------------------------------------ |
| Endpoint    | `/api/v1/auth/logout`                            |
| Method      | POST                                             |
| 설명        | 액세스 토큰과 리프레시 토큰을 모두 무효로 만든다 |
| 최초 작성일 | 2026-11-12                                       |
| 최종 수정일 | 2026-11-14                                       |

## Request

### Headers

| Key           | Type   | Description        | Example              |
| ------------- | ------ | ------------------ | -------------------- |
| Authorization | String | 액세스 토큰 (필수) | Bearer eyJhbGciOi... |

### Request Body

없음

## Response

### 요청 성공 (200 OK)

```json
{
  "data": null,
  "error": {
    "code": null,
    "message": null
  }
}
```

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "C4013",
    "message": "유효하지 않은 토큰입니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                        | 발생 상황                       |
| ----------- | ----- | ------------------------------ | ------------------------------- |
| 401         | C4011 | 인증 정보가 유효하지 않습니다. | 토큰 없음                       |
| 401         | C4013 | 유효하지 않은 토큰입니다.      | 만료되거나 이미 로그아웃된 토큰 |
| 500         | C500  | 오류가 발생하였습니다.         | 서버 내부 오류                  |

---

## 5. 행사 목록과 지도 (E1)

### Summary

| 항목        | 내용                                                                                                                              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/events`                                                                                                                     |
| Method      | GET                                                                                                                               |
| 설명        | 조건에 맞는 행사를 목록(페이지) 또는 지도(전체)로 반환. 행사 기간이 조회 기간과 하루라도 겹치면 포함. 결과가 없어도 200과 빈 배열 |
| 최초 작성일 | 2026-11-13                                                                                                                        |
| 최종 수정일 | 2026-11-14                                                                                                                        |

## Request

### Headers

| Key           | Type   | Description                                            | Example              |
| ------------- | ------ | ------------------------------------------------------ | -------------------- |
| Authorization | String | 선택. 있으면 `isLiked`가 로그인 사용자 기준으로 채워짐 | Bearer eyJhbGciOi... |

### Query Parameters

| Key           | Type   | Description                                                                | 필수 | Example       |
| ------------- | ------ | -------------------------------------------------------------------------- | ---- | ------------- |
| dateFrom      | String | 조회 시작일 (yyyy-MM-dd)                                                   | O    | 2026-11-14    |
| dateTo        | String | 조회 종료일. 생략하면 dateFrom과 같음                                      | X    | 2026-11-15    |
| district      | String | 처인구 / 기흥구 / 수지구. 여러 개는 콤마로                                 | X    | 수지구,기흥구 |
| dong          | String | 동 이름, 여러 개는 콤마로. 주소에 동 이름이 있는 행사만 (주소 없으면 제외) | X    | 신갈동        |
| companion     | String | alone / couple / friends / family / kids. 값만 검사하고 필터에는 쓰지 않음 | X    | kids          |
| budget        | String | any / free. free는 무료로 확인된 행사만                                    | X    | free          |
| indoorOutdoor | String | indoor / outdoor / any. 값만 검사하고 필터에는 쓰지 않음                   | X    | outdoor       |
| sort          | String | date(기본) / distance                                                      | X    | date          |
| lat           | Number | 기준 위도. 거리순이면 필수. 있으면 distanceKm 계산                         | X    | 37.275        |
| lng           | Number | 기준 경도. 거리순이면 필수                                                 | X    | 127.115       |
| view          | String | list(기본) / map. map은 페이지 없이 전체                                   | X    | list          |
| page          | Number | 페이지 (0부터, 기본 0)                                                     | X    | 0             |
| size          | Number | 페이지 크기 (기본 20, 1 이상 100 이하)                                     | X    | 20            |

### Example

```
GET /api/events?dateFrom=2026-11-14&dateTo=2026-11-15&district=수지구&sort=date&view=list&page=0&size=20
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "totalCount": 1,
    "page": 0,
    "size": 20,
    "events": [
      {
        "eventId": "YI-1714",
        "name": "가을 음악회",
        "summary": null,
        "category": "공연",
        "subCategory": "공연",
        "themeLabel": null,
        "startDate": "2026-11-14",
        "endDate": "2026-11-14",
        "dateStatus": "확정",
        "time": "11:00 ~ 12:00",
        "placeName": "수지구청 대강당",
        "address": "경기도 용인시 수지구 포은대로 435",
        "district": "수지구",
        "indoorOutdoor": null,
        "lat": 37.322,
        "lng": 127.098,
        "coordPrecision": "place",
        "fee": "무료",
        "isFree": true,
        "applyType": null,
        "applyUrl": null,
        "tags": ["무료"],
        "sourceUrl": "https://www.yongin.go.kr/...",
        "thumbnailUrl": null,
        "distanceKm": null,
        "hasDiscrepancy": false,
        "isLiked": false
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                                     | Type           | Description                                  | Example       |
| --------------------------------------- | -------------- | -------------------------------------------- | ------------- |
| totalCount                              | Number         | 조건에 맞는 전체 건수 (list와 map이 같음)    | 1             |
| page                                    | Number         | 현재 페이지. map이면 0                       | 0             |
| size                                    | Number         | 페이지 크기. map이면 totalCount              | 20            |
| events[].eventId                        | String         | 행사 ID                                      | YI-1714       |
| events[].name                           | String         | 행사명                                       | 가을 음악회   |
| events[].summary                        | String / null  | 한 줄 소개. 데이터가 없어 항상 null          | null          |
| events[].category                       | String         | 공연 / 행사                                  | 공연          |
| events[].subCategory                    | String / null  | 원본 분류 (도서관 프로그램, 전시, 축제 등)   | 공연          |
| events[].themeLabel                     | String / null  | 항상 null                                    | null          |
| events[].startDate / endDate            | String / null  | 행사 기간                                    | 2026-11-14    |
| events[].dateStatus                     | String         | 확정 / 예정 / 연간 계획 / 미확인             | 확정          |
| events[].time                           | String / null  | 시간 원문                                    | 11:00 ~ 12:00 |
| events[].placeName / address / district | String / null  | 장소, 주소, 구                               | 수지구        |
| events[].indoorOutdoor                  | String / null  | 항상 null                                    | null          |
| events[].lat / lng                      | Number / null  | 좌표. null이면 지도에 표시하지 않음          | 37.322        |
| events[].coordPrecision                 | String / null  | place(정확) / area(대략)                     | place         |
| events[].fee                            | String / null  | 요금 원문                                    | 무료          |
| events[].isFree                         | Boolean / null | 무료 확인 true, 유료 확인 false, 모르면 null | true          |
| events[].applyType                      | String / null  | apply(신청 링크 있음) 또는 null              | null          |
| events[].applyUrl                       | String / null  | 신청 링크                                    | null          |
| events[].tags                           | Array          | 무료, 신청 필요 중 해당하는 것               | ["무료"]      |
| events[].sourceUrl                      | String         | 대표 출처 링크                               | https://...   |
| events[].thumbnailUrl                   | String / null  | 항상 null (프론트 기본 이미지)               | null          |
| events[].distanceKm                     | Number / null  | 기준 좌표에서 직선거리 (소수 둘째 자리)      | 1.25          |
| events[].hasDiscrepancy                 | Boolean        | 안내 상이 여부. 항상 false                   | false         |
| events[].isLiked                        | Boolean        | 로그인 사용자가 담은 행사면 true             | false         |

정렬: `sort=date`는 진행 중, 시작 예정, 연간 계획, 날짜 없음 순. `sort=distance`는 가까운 순이고 좌표 없는 행사는 맨 뒤.

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4002",
    "message": "거리순 정렬에는 좌표가 필요합니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                            | 발생 상황                                                                              |
| ----------- | ----- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다.       | dateFrom 누락, 날짜 형식 오류, dateFrom이 dateTo보다 늦음, 허용되지 않는 값, size 범위 |
| 400         | E4002 | 거리순 정렬에는 좌표가 필요합니다. | sort=distance인데 lat, lng 없음                                                        |
| 500         | C500  | 오류가 발생하였습니다.             | 서버 내부 오류                                                                         |

---

## 6. 행사 상세 (E2)

### Summary

| 항목        | 내용                                                    |
| ----------- | ------------------------------------------------------- |
| Endpoint    | `/api/events/{eventId}`                                 |
| Method      | GET                                                     |
| 설명        | 행사 하나의 핵심 정보, 신청 안내, 프로그램, 출처를 반환 |
| 최초 작성일 | 2026-11-13                                              |
| 최종 수정일 | 2026-11-14                                              |

## Request

### Headers

| Key           | Type   | Description                 | Example              |
| ------------- | ------ | --------------------------- | -------------------- |
| Authorization | String | 선택. 있으면 `isLiked` 반영 | Bearer eyJhbGciOi... |

### Path Parameters

| Key     | Type   | Description | 필수 | Example |
| ------- | ------ | ----------- | ---- | ------- |
| eventId | String | 행사 ID     | O    | YI-0003 |

### Example

```
GET /api/events/YI-0003
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "eventId": "YI-0003",
    "name": "흥.화. 잊혀진 교실을 열다",
    "summary": null,
    "category": "행사",
    "subCategory": "전시",
    "district": "기흥구",
    "indoorOutdoor": null,
    "imageUrl": null,
    "tags": [],
    "hasDiscrepancy": false,
    "isLiked": false,
    "keyInfo": {
      "startDate": "2025-05-27",
      "endDate": "2026-02-08",
      "dateStatus": "확정",
      "time": null,
      "runningTimeMin": null,
      "placeName": "용인시박물관 1층 기획전시실",
      "address": "경기도 용인시 기흥구 동백3로 79",
      "district": "기흥구",
      "indoorOutdoor": null,
      "lat": 37.27387098,
      "lng": 127.15721472,
      "coordPrecision": "place",
      "fee": null,
      "isFree": null,
      "target": null
    },
    "notice": null,
    "apply": {
      "type": null,
      "text": null,
      "channelType": null,
      "label": null,
      "url": null,
      "receiptStart": null,
      "receiptEnd": null,
      "status": null
    },
    "programs": [],
    "sources": [
      {
        "name": "용인시청 문화관광포털",
        "type": "official",
        "url": "https://www.yongin.go.kr/..."
      },
      {
        "name": "공공데이터포털 용인시 문화행사공연 CSV",
        "type": "official",
        "url": "https://www.data.go.kr/..."
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                                    | Type           | Description                                 | Example               |
| -------------------------------------- | -------------- | ------------------------------------------- | --------------------- |
| eventId / name                         | String         | 행사 ID, 행사명                             | YI-0003               |
| summary                                | String / null  | 항상 null                                   | null                  |
| category                               | String         | 공연 / 행사                                 | 행사                  |
| subCategory                            | String / null  | 원본 분류                                   | 전시                  |
| district                               | String / null  | 구                                          | 기흥구                |
| indoorOutdoor                          | String / null  | 항상 null                                   | null                  |
| imageUrl                               | String / null  | 대표 이미지. 항상 null (프론트 기본 이미지) | null                  |
| tags                                   | Array          | 무료, 신청 필요 중 해당하는 것              | []                    |
| hasDiscrepancy                         | Boolean        | 항상 false                                  | false                 |
| isLiked                                | Boolean        | 로그인 사용자가 담은 행사면 true            | false                 |
| keyInfo.startDate / endDate            | String / null  | 행사 기간                                   | 2025-05-27            |
| keyInfo.dateStatus                     | String         | 확정 / 예정 / 연간 계획 / 미확인            | 확정                  |
| keyInfo.time                           | String / null  | 시간 원문                                   | null                  |
| keyInfo.runningTimeMin                 | Number / null  | 항상 null                                   | null                  |
| keyInfo.placeName / address / district | String / null  | 장소                                        | 용인시박물관          |
| keyInfo.indoorOutdoor                  | String / null  | 항상 null                                   | null                  |
| keyInfo.lat / lng                      | Number / null  | 좌표                                        | 37.27                 |
| keyInfo.coordPrecision                 | String / null  | place / area                                | place                 |
| keyInfo.fee                            | String / null  | 요금 원문                                   | null                  |
| keyInfo.isFree                         | Boolean / null | 무료 여부                                   | null                  |
| keyInfo.target                         | String / null  | 대상                                        | null                  |
| notice                                 | String / null  | 항상 null                                   | null                  |
| apply.type                             | String / null  | apply 또는 null                             | null                  |
| apply.text                             | String / null  | type이 apply면 "신청 필요"                  | null                  |
| apply.channelType / label              | String / null  | 항상 null                                   | null                  |
| apply.url                              | String / null  | 신청 링크. null이면 신청 버튼 숨김          | null                  |
| apply.receiptStart / receiptEnd        | String / null  | 접수 기간 (yyyy-MM-dd HH:mm)                | 2025-12-03 10:00      |
| apply.status                           | String / null  | 접수 상태 원문                              | 신청하기              |
| programs                               | Array          | 데이터가 없어 항상 []                       | []                    |
| sources[].name                         | String         | 출처 이름                                   | 용인시청 문화관광포털 |
| sources[].type                         | String         | official / blog / etc. 공식 출처가 먼저     | official              |
| sources[].url                          | String         | 출처 링크                                   | https://...           |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4041",
    "message": "행사를 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                  | 발생 상황      |
| ----------- | ----- | ------------------------ | -------------- |
| 404         | E4041 | 행사를 찾을 수 없습니다. | 없는 eventId   |
| 500         | C500  | 오류가 발생하였습니다.   | 서버 내부 오류 |

---

## 7. 안내 상이 (E3)

### Summary

| 항목        | 내용                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| Endpoint    | `/api/events/{eventId}/discrepancies`                                       |
| Method      | GET                                                                         |
| 설명        | 출처마다 다르게 적힌 값을 반환. 출처별 값 데이터가 아직 없어 항상 차이 없음 |
| 최초 작성일 | 2026-11-13                                                                  |
| 최종 수정일 | 2026-11-14                                                                  |

## Request

### Headers

| Key           | Type   | Description | Example              |
| ------------- | ------ | ----------- | -------------------- |
| Authorization | String | 선택        | Bearer eyJhbGciOi... |

### Path Parameters

| Key     | Type   | Description | 필수 | Example |
| ------- | ------ | ----------- | ---- | ------- |
| eventId | String | 행사 ID     | O    | YI-0003 |

### Example

```
GET /api/events/YI-0003/discrepancies
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "eventId": "YI-0003",
    "hasDiscrepancy": false,
    "items": []
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                         | Type          | Description                                         | Example     |
| --------------------------- | ------------- | --------------------------------------------------- | ----------- |
| eventId                     | String        | 행사 ID                                             | YI-0003     |
| hasDiscrepancy              | Boolean       | 차이가 있으면 true. 지금은 항상 false               | false       |
| items[].field               | String        | date / time / place / fee / apply (데이터가 생기면) | date        |
| items[].label               | String        | 화면 표시용 항목명                                  | 일시        |
| items[].values[].sourceName | String        | 출처 이름                                           | 용인시청    |
| items[].values[].sourceUrl  | String / null | 출처 링크                                           | https://... |
| items[].values[].value      | String / null | 그 출처에 적힌 값                                   | 11월 14일   |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4041",
    "message": "행사를 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                  | 발생 상황      |
| ----------- | ----- | ------------------------ | -------------- |
| 404         | E4041 | 행사를 찾을 수 없습니다. | 없는 eventId   |
| 500         | C500  | 오류가 발생하였습니다.   | 서버 내부 오류 |

---

## 8. 자연어를 검색 조건으로 (E4)

### Summary

| 항목        | 내용                                                                                                                                                                                                                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/search/parse`                                                                                                                                                                                                                                                                                               |
| Method      | POST                                                                                                                                                                                                                                                                                                              |
| 설명        | 사용자가 문장으로 입력하면 AI가 날짜, 지역(구, 동), 동행, 예산, 실내외 조건으로 변환해 반환. 문장에 없는 조건은 추측하지 않고 null로 둠. "무료 야외"처럼 한 번에 말한 값은 예산(budget)과 실내외(indoorOutdoor)로 나눠 담음. 상대 날짜(이번 주말, 다음 주 토요일 등)와 동의 소속 구는 서버가 계산한 값으로 덮어씀 |
| 최초 작성일 | 2026-11-12                                                                                                                                                                                                                                                                                                        |
| 최종 수정일 | 2026-11-14                                                                                                                                                                                                                                                                                                        |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Request Body (application/json)

| Key   | Type   | Description                                                  | 필수 | Example                                         |
| ----- | ------ | ------------------------------------------------------------ | ---- | ----------------------------------------------- |
| query | String | 사용자가 입력한 문장 (최대 200자, 공백만 있으면 안 됨)       | O    | 이번 주말 아이랑 신갈동에서 무료로 야외로 갈 곳 |
| today | String | 기준일(yyyy-MM-dd). 상대 날짜 해석에 사용, 생략 시 서버 날짜 | X    | 2026-11-12                                      |

### Example

```json
{
  "query": "이번 주말 아이랑 신갈동에서 무료로 야외로 갈 곳",
  "today": "2026-11-12"
}
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "parsed": true,
    "conditions": {
      "dateFrom": "2026-11-14",
      "dateTo": "2026-11-15",
      "district": ["기흥구"],
      "dong": ["신갈동"],
      "companion": "kids",
      "kidsAge": null,
      "budget": "free",
      "indoorOutdoor": "outdoor"
    },
    "unresolved": [],
    "message": null
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                          | Type          | Description                                                                                           | Example    |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| parsed                       | Boolean       | 하나 이상의 조건을 뽑았으면 true, 하나도 못 뽑았으면 false (오류가 아닌 정상 응답)                    | true       |
| conditions.dateFrom / dateTo | String / null | 조회 기간                                                                                             | 2026-11-14 |
| conditions.district          | Array / null  | 처인구, 기흥구, 수지구. 동이나 읍면만 말해도 소속 구를 채움                                           | ["기흥구"] |
| conditions.dong              | Array / null  | 용인시 동 이름 중 문장에 나온 것                                                                      | ["신갈동"] |
| conditions.companion         | String / null | alone / couple / friends / family / kids                                                              | kids       |
| conditions.kidsAge           | Number / null | 아이 나이                                                                                             | null       |
| conditions.budget            | String / null | any / free. 말하지 않으면 null                                                                        | free       |
| conditions.indoorOutdoor     | String / null | indoor / outdoor                                                                                      | outdoor    |
| unresolved                   | Array         | dateFrom, district, companion, budget, indoorOutdoor 중 뽑지 못한 것. 해당 칩을 비워 두고 선택을 유도 | []         |
| message                      | String / null | parsed가 false일 때 "조건을 이해하지 못했어요. 아래에서 직접 골라 주세요."                            | null       |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E5021",
    "message": "AI 서버 호출에 실패했습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                        | 발생 상황                                               |
| ----------- | ----- | ------------------------------ | ------------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다.   | query 누락, 빈 문자열, 200자 초과, today 형식 오류      |
| 502         | E5021 | AI 서버 호출에 실패했습니다.   | API 키 없음, LLM 연결 실패, 오류 응답, JSON이 아닌 출력 |
| 504         | E5041 | AI 응답 시간이 초과되었습니다. | LLM 응답이 15초를 넘음                                  |
| 500         | C500  | 오류가 발생하였습니다.         | 서버 내부 오류                                          |

---

## 9. 출발지 장소 검색 (E14)

### Summary

| 항목        | 내용                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/places/search`                                                                                                      |
| Method      | GET                                                                                                                       |
| 설명        | 출발지 장소나 역을 카카오 로컬 키워드 검색으로 찾아 이름, 주소, 좌표를 반환. 고른 값이 일정 생성의 origin이 됨. 최대 15건 |
| 최초 작성일 | 2026-11-13                                                                                                                |
| 최종 수정일 | 2026-11-14                                                                                                                |

## Request

### Headers

없음

### Query Parameters

| Key   | Type   | Description                                                | 필수 | Example |
| ----- | ------ | ---------------------------------------------------------- | ---- | ------- |
| query | String | 검색어 (100자 이하, 공백만 있으면 안 됨, 앞뒤 공백은 지움) | O    | 기흥역  |

### Example

```
GET /api/places/search?query=기흥역
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "places": [
      {
        "name": "기흥역 수인분당선",
        "address": "경기 용인시 기흥구 구갈로 지하 1",
        "lat": 37.275,
        "lng": 127.115
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key              | Type   | Description                   | Example                          |
| ---------------- | ------ | ----------------------------- | -------------------------------- |
| places[].name    | String | 장소 이름                     | 기흥역 수인분당선                |
| places[].address | String | 도로명 주소, 없으면 지번 주소 | 경기 용인시 기흥구 구갈로 지하 1 |
| places[].lat     | Number | 위도                          | 37.275                           |
| places[].lng     | Number | 경도                          | 127.115                          |

결과가 없으면 `places`는 `[]`이다.

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E5022",
    "message": "장소 검색에 실패했습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황                                      |
| ----------- | ----- | ---------------------------- | ---------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | query 누락, 공백만 있음, 100자 초과            |
| 502         | E5022 | 장소 검색에 실패했습니다.    | 카카오 키 없음, 연결 실패, 오류 응답, 5초 초과 |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류                                 |

---

## 10. 관심 행사 담기 (E19)

### Summary

| 항목        | 내용                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint    | `/api/me/favorites/{eventId}`                                                                                                              |
| Method      | PUT                                                                                                                                        |
| 설명        | 행사를 관심 행사로 담는다. 로그인 필수. 이미 담은 행사를 또 담아도 같은 응답 (멱등). 담은 행사는 행사 목록, 상세의 isLiked와 캘린더에 반영 |
| 최초 작성일 | 2026-11-13                                                                                                                                 |
| 최종 수정일 | 2026-11-14                                                                                                                                 |

## Request

### Headers

| Key           | Type   | Description        | Example              |
| ------------- | ------ | ------------------ | -------------------- |
| Authorization | String | 액세스 토큰 (필수) | Bearer eyJhbGciOi... |

### Path Parameters

| Key     | Type   | Description | 필수 | Example |
| ------- | ------ | ----------- | ---- | ------- |
| eventId | String | 행사 ID     | O    | YI-0003 |

### Example

```
PUT /api/me/favorites/YI-0003
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "eventId": "YI-0003",
    "favorited": true
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key       | Type    | Description      | Example |
| --------- | ------- | ---------------- | ------- |
| eventId   | String  | 행사 ID          | YI-0003 |
| favorited | Boolean | 담기면 항상 true | true    |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "C4011",
    "message": "인증 정보가 유효하지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                        | 발생 상황                  |
| ----------- | ----- | ------------------------------ | -------------------------- |
| 401         | C4011 | 인증 정보가 유효하지 않습니다. | 토큰 없음 또는 잘못된 토큰 |
| 404         | E4041 | 행사를 찾을 수 없습니다.       | 없는 eventId               |
| 500         | C500  | 오류가 발생하였습니다.         | 서버 내부 오류             |

---

## 11. 관심 행사 해제 (E20)

### Summary

| 항목        | 내용                                                                        |
| ----------- | --------------------------------------------------------------------------- |
| Endpoint    | `/api/me/favorites/{eventId}`                                               |
| Method      | DELETE                                                                      |
| 설명        | 관심 행사에서 뺀다. 로그인 필수. 담지 않은 행사를 해제해도 같은 응답 (멱등) |
| 최초 작성일 | 2026-11-13                                                                  |
| 최종 수정일 | 2026-11-14                                                                  |

## Request

### Headers

| Key           | Type   | Description        | Example              |
| ------------- | ------ | ------------------ | -------------------- |
| Authorization | String | 액세스 토큰 (필수) | Bearer eyJhbGciOi... |

### Path Parameters

| Key     | Type   | Description | 필수 | Example |
| ------- | ------ | ----------- | ---- | ------- |
| eventId | String | 행사 ID     | O    | YI-0003 |

### Example

```
DELETE /api/me/favorites/YI-0003
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "eventId": "YI-0003",
    "favorited": false
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key       | Type    | Description       | Example |
| --------- | ------- | ----------------- | ------- |
| eventId   | String  | 행사 ID           | YI-0003 |
| favorited | Boolean | 해제면 항상 false | false   |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4041",
    "message": "행사를 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                        | 발생 상황                  |
| ----------- | ----- | ------------------------------ | -------------------------- |
| 401         | C4011 | 인증 정보가 유효하지 않습니다. | 토큰 없음 또는 잘못된 토큰 |
| 404         | E4041 | 행사를 찾을 수 없습니다.       | 없는 eventId               |
| 500         | C500  | 오류가 발생하였습니다.         | 서버 내부 오류             |

---

## 12. 하루 일정 생성 (E5)

### Summary

| 항목        | 내용                                                                                                                                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries`                                                                                                                                                                                                                           |
| Method      | POST                                                                                                                                                                                                                                         |
| 설명        | 기준 행사와 조건(출발지, 이동수단, 시간대, 동행, 예산, 하고 싶은 것)으로 하루 일정을 만든다. 근처 행사와 식사 슬롯을 채우고 마지막은 항상 귀가. 시간대를 넘어도 자르지 않고 경고만 넣음. 이동시간은 직선거리 추정. 로그인 없이 쓰는 데모 API |
| 최초 작성일 | 2026-11-13                                                                                                                                                                                                                                   |
| 최종 수정일 | 2026-11-14                                                                                                                                                                                                                                   |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Request Body (application/json)

| Key              | Type   | Description                                                 | 필수 | Example          |
| ---------------- | ------ | ----------------------------------------------------------- | ---- | ---------------- |
| baseEventId      | String | 기준 행사 ID                                                | O    | YI-1714          |
| date             | String | 일정 날짜 (yyyy-MM-dd)                                      | O    | 2026-11-14       |
| companion        | String | alone / couple / friends / family / kids. 생략하면 상관없음 | X    | kids             |
| kidsAge          | Number | 0 이상. companion이 kids가 아니면 무시                      | X    | 5                |
| origin.type      | String | current(내 위치) / manual(직접 입력)                        | O    | manual           |
| origin.lat       | Number | 출발지 위도 (-90 ~ 90)                                      | O    | 37.275           |
| origin.lng       | Number | 출발지 경도 (-180 ~ 180)                                    | O    | 127.115          |
| origin.address   | String | 출발지 이름이나 주소                                        | X    | 기흥역           |
| transport        | String | car / transit / walk                                        | O    | transit          |
| timeWindow.start | String | 시작 시각 (HH:mm)                                           | O    | 10:00            |
| timeWindow.end   | String | 끝 시각 (HH:mm). start보다 늦어야 함                        | O    | 18:00            |
| budget           | String | any / free                                                  | X    | free             |
| wants            | Array  | food / experience / rest / performance 중 여러 개           | X    | ["food", "rest"] |

### Example

```json
{
  "baseEventId": "YI-1714",
  "date": "2026-11-14",
  "companion": "kids",
  "kidsAge": 5,
  "origin": {
    "type": "manual",
    "lat": 37.275,
    "lng": 127.115,
    "address": "기흥역"
  },
  "transport": "transit",
  "timeWindow": { "start": "10:00", "end": "18:00" },
  "budget": "free",
  "wants": ["food", "rest"]
}
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "itineraryId": "itn_a1b2c3d4",
    "title": "가을 음악회 중심 하루",
    "baseEventId": "YI-1714",
    "date": "2026-11-14",
    "transport": "transit",
    "timeWindow": { "start": "10:00", "end": "18:00" },
    "totalCost": 0,
    "costUnknownCount": 1,
    "coverImageUrl": null,
    "isSaved": false,
    "slots": [
      {
        "slotId": "slt_1",
        "order": 1,
        "type": "event",
        "title": "가을 음악회",
        "eventId": "YI-1714",
        "startTime": "11:00",
        "endTime": "12:00",
        "durationMin": 60,
        "costAmount": 0,
        "costText": "무료",
        "description": null,
        "timeBasis": "official",
        "place": {
          "name": "수지구청 대강당",
          "address": "경기도 용인시 수지구 포은대로 435",
          "lat": 37.322,
          "lng": 127.098
        },
        "isUserAdded": false,
        "moveFromPrev": {
          "mode": "transit",
          "distanceKm": 6.1,
          "estimatedMinutes": 25,
          "isEstimate": true,
          "mapLink": "https://map.kakao.com/link/to/수지구청 대강당,37.322,127.098"
        }
      },
      {
        "slotId": "slt_2",
        "order": 2,
        "type": "meal",
        "title": "식사",
        "eventId": null,
        "startTime": "12:05",
        "endTime": "13:05",
        "durationMin": 60,
        "costAmount": null,
        "costText": null,
        "description": null,
        "timeBasis": "suggested",
        "place": null,
        "isUserAdded": false,
        "moveFromPrev": null
      },
      {
        "slotId": "slt_3",
        "order": 3,
        "type": "return",
        "title": "집으로 돌아가기",
        "eventId": null,
        "startTime": "13:05",
        "endTime": "13:30",
        "durationMin": 25,
        "costAmount": null,
        "costText": null,
        "description": null,
        "timeBasis": "suggested",
        "place": {
          "name": "기흥역",
          "address": "기흥역",
          "lat": 37.275,
          "lng": 127.115
        },
        "isUserAdded": false,
        "moveFromPrev": {
          "mode": "transit",
          "distanceKm": 6.1,
          "estimatedMinutes": 25,
          "isEstimate": true,
          "mapLink": "https://map.kakao.com/link/to/기흥역,37.275,127.115"
        }
      }
    ],
    "warnings": [
      {
        "code": "NO_NEARBY_EVENT",
        "message": "조건에 맞는 근처 행사가 없어요."
      }
    ],
    "crowdLevel": null,
    "crowdLabel": null
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                                   | Type                  | Description                                                                          | Example                           |
| ------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| itineraryId                           | String                | 일정 ID (itn_ + 8자)                                                                 | itn_a1b2c3d4                      |
| title                                 | String / null         | 일정 제목 (기준 행사명 + " 중심 하루")                                               | 가을 음악회 중심 하루             |
| baseEventId                           | String                | 기준 행사 ID                                                                         | YI-1714                           |
| date                                  | String                | 일정 날짜                                                                            | 2026-11-14                        |
| transport                             | String / null         | 이동수단                                                                             | transit                           |
| timeWindow.start / end                | String / null         | 시간대                                                                               | 10:00                             |
| totalCost                             | Number                | costAmount가 있는 슬롯의 합계                                                        | 0                                 |
| costUnknownCount                      | Number                | 비용을 모르는 슬롯 수 (귀가 제외)                                                    | 1                                 |
| coverImageUrl                         | String / null         | 대표 이미지. 데이터가 없어 항상 null                                                 | null                              |
| isSaved                               | Boolean               | 내 코스에 저장했는지                                                                 | false                             |
| slots[].slotId                        | String                | 슬롯 ID (slt_ + 번호)                                                                | slt_1                             |
| slots[].order                         | Number                | 순서 (1부터)                                                                         | 1                                 |
| slots[].type                          | String                | event(기준 행사) / nearbyEvent / program / meal / custom / return(귀가, 항상 마지막) | event                             |
| slots[].title                         | String / null         | 슬롯 제목                                                                            | 가을 음악회                       |
| slots[].eventId                       | String / null         | 행사 슬롯이면 행사 ID                                                                | YI-1714                           |
| slots[].startTime / endTime           | String / null         | HH:mm. 자정을 넘으면 24:10처럼                                                       | 11:00                             |
| slots[].durationMin                   | Number / null         | 머무는 시간(분)                                                                      | 60                                |
| slots[].costAmount                    | Number / null         | 비용(원). null이면 모름, 합계에서 제외                                               | 0                                 |
| slots[].costText                      | String / null         | 비용 원문                                                                            | 무료                              |
| slots[].description                   | String / null         | 설명 (대부분 null)                                                                   | null                              |
| slots[].timeBasis                     | String / null         | official(행사 공식 시간) / suggested(제안 시간)                                      | official                          |
| slots[].place                         | Object / null         | 장소. 없으면 null                                                                    |                                   |
| slots[].place.name / address          | String / null         | 장소 이름, 주소                                                                      | 수지구청 대강당                   |
| slots[].place.lat / lng               | Number / null         | 좌표                                                                                 | 37.322                            |
| slots[].isUserAdded                   | Boolean               | 사용자가 추가한 슬롯                                                                 | false                             |
| slots[].moveFromPrev                  | Object / null         | 앞 슬롯에서 이동. 없으면 null                                                        |                                   |
| slots[].moveFromPrev.mode             | String                | 이동수단                                                                             | transit                           |
| slots[].moveFromPrev.distanceKm       | Number / null         | 직선거리                                                                             | 6.1                               |
| slots[].moveFromPrev.estimatedMinutes | Number / null         | 예상 이동시간(분)                                                                    | 25                                |
| slots[].moveFromPrev.isEstimate       | Boolean               | 항상 true (직선거리 추정)                                                            | true                              |
| slots[].moveFromPrev.mapLink          | String / null         | 카카오맵 길찾기 링크                                                                 | https://map.kakao.com/link/to/... |
| warnings[].code                       | String                | TIME_EXCEEDED / NO_NEARBY_EVENT / TIME_UNKNOWN / COORD_MISSING                       | NO_NEARBY_EVENT                   |
| warnings[].message                    | String                | 화면 표시 문구                                                                       | 조건에 맞는 근처 행사가 없어요.   |
| warnings[].slotId                     | String                | 해당 슬롯 ID. 해당 슬롯이 없으면 키가 빠짐                                           | slt_2                             |
| crowdLevel / crowdLabel               | Number, String / null | 항상 null                                                                            | null                              |

경고 문구: TIME_EXCEEDED는 "설정한 시간대(10:00~18:00)를 넘었어요.", NO_NEARBY_EVENT는 "조건에 맞는 근처 행사가 없어요.", TIME_UNKNOWN은 "행사 시간 정보가 없어 시간을 제안값으로 배치했어요.", COORD_MISSING은 "위치 정보가 없어 이동 시간을 계산하지 못했어요."

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4001",
    "message": "요청 값이 올바르지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황                                                                    |
| ----------- | ----- | ---------------------------- | ---------------------------------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | 필수 값 누락, 허용되지 않는 값, 좌표 범위, 끝 시각이 시작 시각과 같거나 이름 |
| 404         | E4041 | 행사를 찾을 수 없습니다.     | 없는 baseEventId                                                             |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류                                                               |

---

## 13. 일정 조회

### Summary

| 항목        | 내용                             |
| ----------- | -------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}` |
| Method      | GET                              |
| 설명        | 저장된 일정을 다시 계산해서 반환 |
| 최초 작성일 | 2026-11-13                       |
| 최종 수정일 | 2026-11-14                       |

## Request

### Headers

없음

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |

### Example

```
GET /api/itineraries/itn_a1b2c3d4
```

## Response

### 요청 성공 (200 OK)

하루 일정 생성(12번)의 응답과 같은 모양이다.

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4042",
    "message": "일정을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                  | 발생 상황        |
| ----------- | ----- | ------------------------ | ---------------- |
| 404         | E4042 | 일정을 찾을 수 없습니다. | 없는 itineraryId |
| 500         | C500  | 오류가 발생하였습니다.   | 서버 내부 오류   |

---

## 14. 슬롯 추가

### Summary

| 항목        | 내용                                                                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/slots`                                                                                                                                                                    |
| Method      | POST                                                                                                                                                                                                      |
| 설명        | 근처 행사, 프로그램, 식사, 직접 입력 슬롯을 추가하고 재계산된 일정 전체를 반환. 식사 추가 때 빈 식사 슬롯이 있으면 새로 만들지 않고 그 슬롯을 채움. 추가한 슬롯은 isUserAdded가 true이고 재추천 때 버려짐 |
| 최초 작성일 | 2026-11-13                                                                                                                                                                                                |
| 최종 수정일 | 2026-11-14                                                                                                                                                                                                |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |

### Request Body (application/json)

| Key         | Type   | Description                                                         | 필수   | Example                  |
| ----------- | ------ | ------------------------------------------------------------------- | ------ | ------------------------ |
| type        | String | nearbyEvent / program / meal / custom                               | O      | meal                     |
| eventId     | String | type이 nearbyEvent, program이면 필수                                | 조건부 | YI-0003                  |
| programId   | String | type이 program이면 필수. 지금 데이터에는 프로그램이 없어 쓸 수 없음 | 조건부 | prg_1                    |
| title       | String | type이 meal, custom이면 필수 (50자 이하)                            | 조건부 | 점심                     |
| durationMin | Number | 머무는 시간 (1 이상 300 이하)                                       | X      | 60                       |
| costText    | String | 비용 문구                                                           | X      | 10,000원                 |
| address     | String | 주소                                                                | X      | 경기도 용인시 기흥구 ... |
| afterSlotId | String | 이 슬롯 뒤에 넣음. 생략하거나 귀가 슬롯이면 귀가 바로 앞            | X      | slt_1                    |

### Example

```json
{
  "type": "meal",
  "title": "점심",
  "durationMin": 60,
  "afterSlotId": "slt_1"
}
```

## Response

### 요청 성공 (200 OK)

하루 일정 생성(12번)의 응답과 같은 모양이다 (재계산된 일정 전체).

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4043",
    "message": "일정 항목을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황                                                                              |
| ----------- | ----- | ----------------------------- | -------------------------------------------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다.  | type 누락이나 허용되지 않는 값, 조건부 필수 값 누락, title 50자 초과, durationMin 범위 |
| 404         | E4041 | 행사를 찾을 수 없습니다.      | 없는 eventId                                                                           |
| 404         | E4042 | 일정을 찾을 수 없습니다.      | 없는 itineraryId                                                                       |
| 404         | E4043 | 일정 항목을 찾을 수 없습니다. | 없는 afterSlotId                                                                       |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류                                                                         |

---

## 15. 슬롯 삭제

### Summary

| 항목        | 내용                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/slots/{slotId}`                               |
| Method      | DELETE                                                                        |
| 설명        | 슬롯을 지우고 재계산된 일정 전체를 반환. 기준 행사와 귀가 슬롯은 지울 수 없음 |
| 최초 작성일 | 2026-11-13                                                                    |
| 최종 수정일 | 2026-11-14                                                                    |

## Request

### Headers

없음

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |
| slotId      | String | 슬롯 ID     | O    | slt_2        |

### Example

```
DELETE /api/itineraries/itn_a1b2c3d4/slots/slt_2
```

## Response

### 요청 성공 (200 OK)

하루 일정 생성(12번)의 응답과 같은 모양이다 (재계산된 일정 전체).

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4003",
    "message": "삭제할 수 없는 항목입니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황                               |
| ----------- | ----- | ----------------------------- | --------------------------------------- |
| 400         | E4003 | 삭제할 수 없는 항목입니다.    | 기준 행사(event) 또는 귀가(return) 슬롯 |
| 404         | E4042 | 일정을 찾을 수 없습니다.      | 없는 itineraryId                        |
| 404         | E4043 | 일정 항목을 찾을 수 없습니다. | 없는 slotId                             |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류                          |

---

## 16. 슬롯 교체

### Summary

| 항목        | 내용                                                                                                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/slots/{slotId}`                                                                                                      |
| Method      | PUT                                                                                                                                                  |
| 설명        | 슬롯을 후보(17, 18번에서 받은 candidateId)나 지정한 행사로 바꾸고 재계산된 일정 전체를 반환. 둘 중 하나만 보냄. 기준 행사와 귀가 슬롯은 바꿀 수 없음 |
| 최초 작성일 | 2026-11-13                                                                                                                                           |
| 최종 수정일 | 2026-11-14                                                                                                                                           |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |
| slotId      | String | 슬롯 ID     | O    | slt_2        |

### Request Body (application/json)

| Key                    | Type   | Description                                                                                       | 필수       | Example |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------- | ---------- | ------- |
| replaceWithCandidateId | String | 후보 ID. 식사 후보(cnd_m으로 시작)는 식사 슬롯에만, 행사 후보(cnd_ + 번호)는 식사가 아닌 슬롯에만 | 둘 중 하나 | cnd_m1  |
| replaceWithEventId     | String | 직접 지정한 행사 ID. 식사 슬롯에는 못 씀                                                          | 둘 중 하나 | YI-0003 |

### Example

```json
{
  "replaceWithCandidateId": "cnd_m1"
}
```

## Response

### 요청 성공 (200 OK)

하루 일정 생성(12번)의 응답과 같은 모양이다 (재계산된 일정 전체).

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4001",
    "message": "요청 값이 올바르지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황                                                                           |
| ----------- | ----- | ----------------------------- | ----------------------------------------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다.  | 둘 다 보내거나 둘 다 없음, 기준 행사나 귀가 슬롯, 슬롯 종류와 후보 종류가 맞지 않음 |
| 404         | E4041 | 행사를 찾을 수 없습니다.      | 없는 replaceWithEventId                                                             |
| 404         | E4042 | 일정을 찾을 수 없습니다.      | 없는 itineraryId                                                                    |
| 404         | E4043 | 일정 항목을 찾을 수 없습니다. | 없는 slotId, 없는 후보 ID                                                           |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류                                                                      |

---

## 17. 교체 후보 (행사)

### Summary

| 항목        | 내용                                                                                |
| ----------- | ----------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/slots/{slotId}/alternatives`                        |
| Method      | GET                                                                                 |
| 설명        | 슬롯을 바꿀 근처 행사 후보를 가까운 순으로 반환. 받은 candidateId로 슬롯 교체(16번) |
| 최초 작성일 | 2026-11-13                                                                          |
| 최종 수정일 | 2026-11-14                                                                          |

## Request

### Headers

없음

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |
| slotId      | String | 슬롯 ID     | O    | slt_2        |

### Query Parameters

| Key   | Type   | Description                      | 필수 | Example |
| ----- | ------ | -------------------------------- | ---- | ------- |
| limit | Number | 후보 수 (기본 3, 1 이상 10 이하) | X    | 3       |

### Example

```
GET /api/itineraries/itn_a1b2c3d4/slots/slt_2/alternatives?limit=3
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "slotId": "slt_2",
    "type": "nearbyEvent",
    "candidates": [
      {
        "candidateId": "cnd_1",
        "kind": "event",
        "eventId": "YI-0003",
        "name": "흥.화. 잊혀진 교실을 열다",
        "category": "행사",
        "placeName": "용인시박물관 1층 기획전시실",
        "lat": 37.27387098,
        "lng": 127.15721472,
        "time": null,
        "durationMin": 60,
        "costAmount": null,
        "costText": null,
        "distanceKmFromPrev": 2.3,
        "estimatedMinutes": 12,
        "description": null,
        "source": "event"
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                             | Type          | Description                                        | Example                   |
| ------------------------------- | ------------- | -------------------------------------------------- | ------------------------- |
| slotId                          | String        | 대상 슬롯 ID                                       | slt_2                     |
| type                            | String        | 대상 슬롯 종류                                     | nearbyEvent               |
| candidates[].candidateId        | String        | 후보 ID. 슬롯 교체에 사용                          | cnd_1                     |
| candidates[].kind               | String        | event / meal                                       | event                     |
| candidates[].eventId            | String / null | 행사 ID                                            | YI-0003                   |
| candidates[].name               | String        | 이름                                               | 흥.화. 잊혀진 교실을 열다 |
| candidates[].category           | String / null | 분류 (행사 후보는 공연 / 행사, 식사 후보는 먹거리) | 행사                      |
| candidates[].placeName          | String / null | 장소                                               | 용인시박물관              |
| candidates[].lat / lng          | Number / null | 좌표                                               | 37.27                     |
| candidates[].time               | String / null | 시간 원문                                          | null                      |
| candidates[].durationMin        | Number / null | 머무는 시간                                        | 60                        |
| candidates[].costAmount         | Number / null | 비용(원)                                           | null                      |
| candidates[].costText           | String / null | 비용 원문                                          | null                      |
| candidates[].distanceKmFromPrev | Number / null | 앞 슬롯에서 거리                                   | 2.3                       |
| candidates[].estimatedMinutes   | Number / null | 예상 이동시간(분)                                  | 12                        |
| candidates[].description        | String / null | 설명                                               | null                      |
| candidates[].source             | String        | event(행사 DB) / sample(샘플)                      | event                     |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4043",
    "message": "일정 항목을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황        |
| ----------- | ----- | ----------------------------- | ---------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다.  | limit 범위       |
| 404         | E4042 | 일정을 찾을 수 없습니다.      | 없는 itineraryId |
| 404         | E4043 | 일정 항목을 찾을 수 없습니다. | 없는 slotId      |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류   |

---

## 18. 식사 후보

### Summary

| 항목        | 내용                                                                          |
| ----------- | ----------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/slots/{slotId}/meal-candidates`               |
| Method      | GET                                                                           |
| 설명        | 식사 슬롯을 채울 후보를 반환. 실제 식당 데이터가 없어 서버에 넣어 둔 샘플이다 |
| 최초 작성일 | 2026-11-13                                                                    |
| 최종 수정일 | 2026-11-14                                                                    |

## Request

### Headers

없음

### Path Parameters

| Key         | Type   | Description  | 필수 | Example      |
| ----------- | ------ | ------------ | ---- | ------------ |
| itineraryId | String | 일정 ID      | O    | itn_a1b2c3d4 |
| slotId      | String | 식사 슬롯 ID | O    | slt_2        |

### Query Parameters

| Key   | Type   | Description                     | 필수 | Example |
| ----- | ------ | ------------------------------- | ---- | ------- |
| limit | Number | 후보 수 (기본 3, 1 이상 5 이하) | X    | 3       |

### Example

```
GET /api/itineraries/itn_a1b2c3d4/slots/slt_2/meal-candidates?limit=2
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "slotId": "slt_2",
    "type": "meal",
    "candidates": [
      {
        "candidateId": "cnd_m1",
        "kind": "meal",
        "eventId": null,
        "name": "물빛 국수집",
        "category": "먹거리",
        "placeName": "물빛 국수집",
        "lat": null,
        "lng": null,
        "time": null,
        "durationMin": 50,
        "costAmount": 9000,
        "costText": "9,000원",
        "distanceKmFromPrev": 0.7,
        "estimatedMinutes": null,
        "description": "아이와 함께 먹기 좋은 메뉴를 가정한 곳이에요.",
        "source": "sample"
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

교체 후보(17번)와 같은 모양이다. 식사 후보는 `kind`가 meal, `candidateId`가 cnd_m으로 시작, `category`가 먹거리, `source`가 sample이다. 샘플이라 `lat`, `lng`, `eventId`, `time`, `estimatedMinutes`는 항상 null이다.

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4001",
    "message": "요청 값이 올바르지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                       | 발생 상황        |
| ----------- | ----- | ----------------------------- | ---------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다.  | limit 범위       |
| 404         | E4042 | 일정을 찾을 수 없습니다.      | 없는 itineraryId |
| 404         | E4043 | 일정 항목을 찾을 수 없습니다. | 없는 slotId      |
| 500         | C500  | 오류가 발생하였습니다.        | 서버 내부 오류   |

---

## 19. 슬롯 순서 변경

### Summary

| 항목        | 내용                                                                                   |
| ----------- | -------------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/slots/order`                                           |
| Method      | PATCH                                                                                  |
| 설명        | 슬롯 순서를 바꾸고 재계산된 일정 전체를 반환. 귀가 슬롯은 빼고 보내며 항상 마지막에 둠 |
| 최초 작성일 | 2026-11-13                                                                             |
| 최종 수정일 | 2026-11-14                                                                             |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |

### Request Body (application/json)

| Key     | Type  | Description                                                     | 필수 | Example            |
| ------- | ----- | --------------------------------------------------------------- | ---- | ------------------ |
| slotIds | Array | 귀가 슬롯을 뺀 모든 슬롯 ID를 원하는 순서로. 빠짐이나 중복 없이 | O    | ["slt_2", "slt_1"] |

### Example

```json
{
  "slotIds": ["slt_2", "slt_1"]
}
```

## Response

### 요청 성공 (200 OK)

하루 일정 생성(12번)의 응답과 같은 모양이다 (재계산된 일정 전체).

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4001",
    "message": "요청 값이 올바르지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황                                                     |
| ----------- | ----- | ---------------------------- | ------------------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | slotIds 누락, 슬롯이 빠지거나 중복, 없는 슬롯, 귀가 슬롯 포함 |
| 404         | E4042 | 일정을 찾을 수 없습니다.     | 없는 itineraryId                                              |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류                                                |

---

## 20. 조건 바꿔 재추천

### Summary

| 항목        | 내용                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/regenerate`                                                                                                                             |
| Method      | POST                                                                                                                                                                    |
| 설명        | 바꿀 조건만 보내면 일정을 다시 만든다. itineraryId, title, coverImageUrl과 저장된 코스 연결은 유지하고 슬롯은 새 slotId로 모두 새로 만듦. 사용자가 추가한 슬롯은 버려짐 |
| 최초 작성일 | 2026-11-13                                                                                                                                                              |
| 최종 수정일 | 2026-11-14                                                                                                                                                              |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |

### Request Body (application/json)

하루 일정 생성(12번)과 같은 필드에서 **바꿀 것만** 보낸다. 모두 선택이고 본문을 생략해도 된다. 보낸 항목만 생성과 같은 규칙으로 검사한다 (kidsAge는 0 이상).

### Example

```json
{
  "transport": "car",
  "timeWindow": { "start": "13:00", "end": "20:00" }
}
```

## Response

### 요청 성공 (200 OK)

하루 일정 생성(12번)의 응답과 같은 모양이다.

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4042",
    "message": "일정을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황                                             |
| ----------- | ----- | ---------------------------- | ----------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | 보낸 항목의 형식 오류나 허용되지 않는 값, 시간대 역전 |
| 404         | E4041 | 행사를 찾을 수 없습니다.     | 없는 baseEventId                                      |
| 404         | E4042 | 일정을 찾을 수 없습니다.     | 없는 itineraryId                                      |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류                                        |

---

## 21. 공유 링크 만들기

### Summary

| 항목        | 내용                                                                              |
| ----------- | --------------------------------------------------------------------------------- |
| Endpoint    | `/api/itineraries/{itineraryId}/share`                                            |
| Method      | POST                                                                              |
| 설명        | 일정의 공유 링크를 만든다. 일정 하나에 공유 링크는 하나 (다시 요청하면 같은 링크) |
| 최초 작성일 | 2026-11-13                                                                        |
| 최종 수정일 | 2026-11-14                                                                        |

## Request

### Headers

없음

### Path Parameters

| Key         | Type   | Description | 필수 | Example      |
| ----------- | ------ | ----------- | ---- | ------------ |
| itineraryId | String | 일정 ID     | O    | itn_a1b2c3d4 |

### Example

```
POST /api/itineraries/itn_a1b2c3d4/share
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "shareId": "shr_x7k2pq",
    "shareUrl": "https://example.com/shared/shr_x7k2pq",
    "title": "가을 음악회 중심 하루"
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key      | Type          | Description                                                             | Example                               |
| -------- | ------------- | ----------------------------------------------------------------------- | ------------------------------------- |
| shareId  | String        | 공유 ID (shr_ + 6자)                                                    | shr_x7k2pq                            |
| shareUrl | String        | 공유 주소. 서버 설정 app.share-base-url + "/" + shareId (지금은 임시값) | https://example.com/shared/shr_x7k2pq |
| title    | String / null | 일정 제목                                                               | 가을 음악회 중심 하루                 |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4042",
    "message": "일정을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                  | 발생 상황        |
| ----------- | ----- | ------------------------ | ---------------- |
| 404         | E4042 | 일정을 찾을 수 없습니다. | 없는 itineraryId |
| 500         | C500  | 오류가 발생하였습니다.   | 서버 내부 오류   |

---

## 22. 공유 일정 미리보기

### Summary

| 항목        | 내용                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/shared/{shareId}`                                                                                                         |
| Method      | GET                                                                                                                             |
| 설명        | 공유받은 일정을 읽기 전용으로 반환. 일정을 그때 다시 계산하므로 원래 일정이 바뀌면 미리보기도 바뀜. slotId와 출발지 정보는 없음 |
| 최초 작성일 | 2026-11-13                                                                                                                      |
| 최종 수정일 | 2026-11-14                                                                                                                      |

## Request

### Headers

없음

### Path Parameters

| Key     | Type   | Description | 필수 | Example    |
| ------- | ------ | ----------- | ---- | ---------- |
| shareId | String | 공유 ID     | O    | shr_x7k2pq |

### Example

```
GET /api/shared/shr_x7k2pq
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "shareId": "shr_x7k2pq",
    "title": "가을 음악회 중심 하루",
    "date": "2026-11-14",
    "companion": "kids",
    "slotCount": 3,
    "totalCost": 0,
    "costUnknownCount": 1,
    "coverImageUrl": null,
    "slots": [
      {
        "order": 1,
        "type": "event",
        "title": "가을 음악회",
        "startTime": "11:00",
        "endTime": "12:00",
        "durationMin": 60,
        "costText": "무료",
        "place": { "name": "수지구청 대강당", "lat": 37.322, "lng": 127.098 }
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                         | Type          | Description                        | Example               |
| --------------------------- | ------------- | ---------------------------------- | --------------------- |
| shareId                     | String        | 공유 ID                            | shr_x7k2pq            |
| title                       | String / null | 일정 제목                          | 가을 음악회 중심 하루 |
| date                        | String        | 일정 날짜                          | 2026-11-14            |
| companion                   | String / null | 동행                               | kids                  |
| slotCount                   | Number        | 슬롯 수                            | 3                     |
| totalCost                   | Number        | 비용 합계                          | 0                     |
| costUnknownCount            | Number        | 비용을 모르는 슬롯 수              | 1                     |
| coverImageUrl               | String / null | 항상 null                          | null                  |
| slots[].order               | Number        | 순서                               | 1                     |
| slots[].type                | String        | 슬롯 종류                          | event                 |
| slots[].title               | String / null | 제목                               | 가을 음악회           |
| slots[].startTime / endTime | String / null | 시각                               | 11:00                 |
| slots[].durationMin         | Number / null | 머무는 시간                        | 60                    |
| slots[].costText            | String / null | 비용 원문                          | 무료                  |
| slots[].place               | Object / null | 장소 (name, lat, lng). 없으면 null |                       |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4044",
    "message": "공유된 일정을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                         | 발생 상황      |
| ----------- | ----- | ------------------------------- | -------------- |
| 404         | E4044 | 공유된 일정을 찾을 수 없습니다. | 없는 shareId   |
| 500         | C500  | 오류가 발생하였습니다.          | 서버 내부 오류 |

---

## 23. 내 코스 저장

### Summary

| 항목        | 내용                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Endpoint    | `/api/me/courses`                                                                                                |
| Method      | POST                                                                                                             |
| 설명        | 일정을 내 코스에 저장한다. 일정 하나에 코스는 하나. 로그인 없이 쓰는 데모 API (서버에 하나뿐인 데모 사용자 기준) |
| 최초 작성일 | 2026-11-13                                                                                                       |
| 최종 수정일 | 2026-11-14                                                                                                       |

## Request

### Headers

| Key          | Type   | Description    | Example          |
| ------------ | ------ | -------------- | ---------------- |
| Content-Type | String | 요청 본문 타입 | application/json |

### Request Body (application/json)

| Key         | Type   | Description                                   | 필수 | Example       |
| ----------- | ------ | --------------------------------------------- | ---- | ------------- |
| itineraryId | String | 저장할 일정 ID                                | O    | itn_a1b2c3d4  |
| title       | String | 코스 제목. 생략하거나 빈 문자열이면 일정 제목 | X    | 아이랑 토요일 |

### Example

```json
{
  "itineraryId": "itn_a1b2c3d4",
  "title": "아이랑 토요일"
}
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "courseId": "crs_1",
    "itineraryId": "itn_a1b2c3d4",
    "title": "아이랑 토요일",
    "isSaved": true,
    "savedAt": "2026-11-14T10:30:00"
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key         | Type          | Description                     | Example             |
| ----------- | ------------- | ------------------------------- | ------------------- |
| courseId    | String        | 코스 ID (crs_ + 숫자)           | crs_1               |
| itineraryId | String        | 일정 ID                         | itn_a1b2c3d4        |
| title       | String / null | 코스 제목                       | 아이랑 토요일       |
| isSaved     | Boolean       | 항상 true                       | true                |
| savedAt     | String        | 저장 시각 (yyyy-MM-ddTHH:mm:ss) | 2026-11-14T10:30:00 |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4042",
    "message": "일정을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황        |
| ----------- | ----- | ---------------------------- | ---------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | itineraryId 누락 |
| 404         | E4042 | 일정을 찾을 수 없습니다.     | 없는 itineraryId |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류   |

---

## 24. 내 코스 목록

### Summary

| 항목        | 내용                        |
| ----------- | --------------------------- |
| Endpoint    | `/api/me/courses`           |
| Method      | GET                         |
| 설명        | 저장한 코스를 페이지로 반환 |
| 최초 작성일 | 2026-11-13                  |
| 최종 수정일 | 2026-11-14                  |

## Request

### Headers

없음

### Query Parameters

| Key  | Type   | Description                            | 필수 | Example |
| ---- | ------ | -------------------------------------- | ---- | ------- |
| page | Number | 페이지 (0부터, 기본 0)                 | X    | 0       |
| size | Number | 페이지 크기 (기본 20, 1 이상 100 이하) | X    | 20      |

### Example

```
GET /api/me/courses?page=0&size=20
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "totalCount": 1,
    "page": 0,
    "size": 20,
    "courses": [
      {
        "courseId": "crs_1",
        "itineraryId": "itn_a1b2c3d4",
        "title": "아이랑 토요일",
        "date": "2026-11-14",
        "companion": "kids",
        "transport": "transit",
        "slotCount": 3,
        "summary": "가을 음악회 (가운데점) 주변 먹거리 (가운데점) 볼거리 (가운데점) 귀가까지 3개 일정",
        "mealSummary": null,
        "coverImageUrl": null,
        "savedAt": "2026-11-14T10:30:00"
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                             | Type          | Description                                                                                                                         | Example             |
| ------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| totalCount                      | Number        | 전체 코스 수                                                                                                                        | 1                   |
| page / size                     | Number        | 현재 페이지, 크기                                                                                                                   | 0                   |
| courses[].courseId              | String        | 코스 ID                                                                                                                             | crs_1               |
| courses[].itineraryId           | String        | 일정 ID                                                                                                                             | itn_a1b2c3d4        |
| courses[].title                 | String / null | 코스 제목                                                                                                                           | 아이랑 토요일       |
| courses[].date                  | String        | 일정 날짜                                                                                                                           | 2026-11-14          |
| courses[].companion / transport | String / null | 동행, 이동수단                                                                                                                      | kids                |
| courses[].slotCount             | Number        | 슬롯 수                                                                                                                             | 3                   |
| courses[].summary               | String        | 기준 행사명, 주변 먹거리, 볼거리, 귀가까지 N개 일정을 가운데점(U+00B7)으로 이은 문자열. 예시에서는 가운데점을 "(가운데점)"으로 적음 |                     |
| courses[].mealSummary           | String / null | 채워진 식사 슬롯의 제목 (첫 번째). 식사가 비어 있으면 null                                                                          | 물빛 국수집         |
| courses[].coverImageUrl         | String / null | 항상 null                                                                                                                           | null                |
| courses[].savedAt               | String        | 저장 시각                                                                                                                           | 2026-11-14T10:30:00 |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4001",
    "message": "요청 값이 올바르지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황            |
| ----------- | ----- | ---------------------------- | -------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | page 음수, size 범위 |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류       |

---

## 25. 내 코스 삭제

### Summary

| 항목        | 내용                                          |
| ----------- | --------------------------------------------- |
| Endpoint    | `/api/me/courses/{courseId}`                  |
| Method      | DELETE                                        |
| 설명        | 저장한 코스를 지운다. 일정 자체는 지우지 않음 |
| 최초 작성일 | 2026-11-13                                    |
| 최종 수정일 | 2026-11-14                                    |

## Request

### Headers

없음

### Path Parameters

| Key      | Type   | Description           | 필수 | Example |
| -------- | ------ | --------------------- | ---- | ------- |
| courseId | String | 코스 ID (crs_ + 숫자) | O    | crs_1   |

### Example

```
DELETE /api/me/courses/crs_1
```

## Response

### 요청 성공 (200 OK)

```json
{
  "data": {
    "courseId": "crs_1",
    "deleted": true
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key      | Type    | Description | Example |
| -------- | ------- | ----------- | ------- |
| courseId | String  | 코스 ID     | crs_1   |
| deleted  | Boolean | 항상 true   | true    |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4042",
    "message": "일정을 찾을 수 없습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                  | 발생 상황                                                     |
| ----------- | ----- | ------------------------ | ------------------------------------------------------------- |
| 404         | E4042 | 일정을 찾을 수 없습니다. | 형식이 crs_ + 숫자가 아니거나 없는 코스 (코스 없음도 이 코드) |
| 500         | C500  | 오류가 발생하였습니다.   | 서버 내부 오류                                                |

---

## 26. 캘린더

### Summary

| 항목        | 내용                                                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Endpoint    | `/api/me/calendar`                                                                                                                         |
| Method      | GET                                                                                                                                        |
| 설명        | 월(month) 또는 날짜(date) 기준으로 관심 행사와 저장한 코스를 반환. 둘 중 하나만 보냄. 관심 행사는 토큰이 있을 때만 그 사용자 기준으로 나옴 |
| 최초 작성일 | 2026-11-13                                                                                                                                 |
| 최종 수정일 | 2026-11-14                                                                                                                                 |

## Request

### Headers

| Key           | Type   | Description                                                | Example              |
| ------------- | ------ | ---------------------------------------------------------- | -------------------- |
| Authorization | String | 선택. 있으면 events에 관심 행사가 나옴, 없으면 events는 [] | Bearer eyJhbGciOi... |

### Query Parameters

| Key   | Type   | Description            | 필수       | Example    |
| ----- | ------ | ---------------------- | ---------- | ---------- |
| month | String | 조회 월 (yyyy-MM)      | 둘 중 하나 | 2026-11    |
| date  | String | 조회 날짜 (yyyy-MM-dd) | 둘 중 하나 | 2026-11-14 |

### Example

```
GET /api/me/calendar?month=2026-11
GET /api/me/calendar?date=2026-11-14
```

## Response

### 요청 성공 (200 OK, month 조회)

```json
{
  "data": {
    "month": "2026-11",
    "events": [
      {
        "eventId": "YI-0003",
        "name": "흥.화. 잊혀진 교실을 열다",
        "startDate": "2025-05-27",
        "endDate": "2026-02-08"
      }
    ],
    "courses": [
      {
        "itineraryId": "itn_a1b2c3d4",
        "title": "아이랑 토요일",
        "date": "2026-11-14"
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### 요청 성공 (200 OK, date 조회)

```json
{
  "data": {
    "date": "2026-11-14",
    "eventCount": 0,
    "courseCount": 1,
    "events": [],
    "courses": [
      {
        "itineraryId": "itn_a1b2c3d4",
        "title": "아이랑 토요일",
        "slotCount": 3
      }
    ]
  },
  "error": {
    "code": null,
    "message": null
  }
}
```

### Response Body

| Key                          | Type          | Description                    | Example       |
| ---------------------------- | ------------- | ------------------------------ | ------------- |
| month                        | String        | (month 조회) 조회 월           | 2026-11       |
| date                         | String        | (date 조회) 조회 날짜          | 2026-11-14    |
| eventCount / courseCount     | Number        | (date 조회) 건수               | 1             |
| events[].eventId / name      | String        | 관심 행사 중 기간이 겹치는 것  | YI-0003       |
| events[].category            | String        | (date 조회만) 공연 / 행사      | 행사          |
| events[].startDate / endDate | String / null | 행사 기간                      | 2025-05-27    |
| courses[].itineraryId        | String        | 일정 ID                        | itn_a1b2c3d4  |
| courses[].title              | String / null | 코스 제목 (바꿨으면 바꾼 제목) | 아이랑 토요일 |
| courses[].date               | String        | (month 조회만) 일정 날짜       | 2026-11-14    |
| courses[].slotCount          | Number        | (date 조회만) 슬롯 수          | 3             |

### 요청 실패

```json
{
  "data": null,
  "error": {
    "code": "E4001",
    "message": "요청 값이 올바르지 않습니다."
  }
}
```

### 발생할 수 있는 오류 코드

| HTTP Status | Code  | Message                      | 발생 상황                                           |
| ----------- | ----- | ---------------------------- | --------------------------------------------------- |
| 400         | E4001 | 요청 값이 올바르지 않습니다. | month와 date를 둘 다 보내거나 둘 다 없음, 형식 오류 |
| 500         | C500  | 오류가 발생하였습니다.       | 서버 내부 오류                                      |
