# 용인데이 장소 사진

대표 명소 6곳에 해당 장소의 실제 사진을 제공한다. 카카오 Local 검색은 사진을 반환하지 않으므로, 사진 파일은 재사용 조건을 확인한 별도 자료를 사용한다. 카드에 저작자, 원본 출처 및 이용 조건 링크를 표시한다. 장소명, 주소와 좌표 등 장소 정보는 계속 카카오 실제 검색 결과를 쓴다.

## 사진 출처

2026-11-14 확인. 사진은 촬영 당시 모습이며 현재의 계절, 전시 및 운영 상태를 보증하지 않는다.

| 장소             | 배포 파일                          | 저작자                       | 원본 설명 페이지                                                                                                                                       | 사진 이용 조건                                                  |
| ---------------- | ---------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 에버랜드         | `/landmarks/everland.webp`         | Wikiwater2020                | [Everland Magic tree](https://commons.wikimedia.org/wiki/File:Everland_Magic_tree.jpg)                                                                 | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) |
| 한국민속촌       | `/landmarks/folk-village.webp`     | ChenGui                      | [Korea Yongin Folk Village](https://commons.wikimedia.org/wiki/File:Korea_Yongin_Folk_Village.jpg)                                                     | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 호암미술관       | `/landmarks/hoam.webp`             | Jocelyndurrey                | [Hoammuseum](https://commons.wikimedia.org/wiki/File:Hoammuseum.jpg)                                                                                   | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) |
| 와우정사         | `/landmarks/wawoojeongsa.webp`     | 이주형 / 경기도 꿈나무기자단 | [풍경 소리 가득한 와우정사](https://gnews.gg.go.kr/news/news_detail.do?number=201803141646176262C076&s_code=C076), 대웅전 사진                         | [공공누리 제1유형](https://www.kogl.or.kr/info/licenseType1.do) |
| 용인농촌테마파크 | `/landmarks/rural-theme-park.webp` | 용인특례시                   | [27~28일 농촌테마파크로 봄 소풍 오세요](https://www.yongin.go.kr/user/bbs/BD_selectBbs.do?q_bbsCode=1020&q_bbscttSn=20240418094853066), 봄꽃 전경 사진 | [공공누리 제1유형](https://www.kogl.or.kr/info/licenseType1.do) |
| 한택식물원       | `/landmarks/hantaek.webp`          | JKD                          | [한택식물원](https://commons.wikimedia.org/wiki/File:%ED%95%9C%ED%83%9D%EC%8B%9D%EB%AC%BC%EC%9B%90.jpg)                                                | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)       |

배포본은 원본의 비율을 유지한 크기 축소 및 WebP 변환본이다. UI는 카드 비율에 맞게 일부를 잘라 표시한다. 변환된 사진에는 표의 원본 라이선스를 그대로 적용한다. 이 사진 라이선스는 서비스 코드 전체의 라이선스와 별개다. 사진에 합성이나 생성형 편집을 하지 않았다.

배포 파일과 함께 `public/landmarks/credits.json`에 원본 이미지 URL과 출처를 보관한다. 출처를 제거하거나 원본의 저작자가 서비스를 보증하는 것처럼 표시하지 않는다.

## BE 이미지 필드 연결

`src/domain/images.ts`의 `photoCandidates`와 `src/components/PlacePhoto.tsx`를 공통으로 사용한다. 기존 카카오 응답에 아래 선택 필드를 추가하거나, BE DTO를 FE 표시 모델로 변환할 때 그대로 전달하면 된다.

```json
{
  "imageUrl": "https://images.example.com/place-123/main.webp",
  "thumbnailUrl": "https://images.example.com/place-123/thumb.webp",
  "imageCredit": {
    "author": "사진 저작자 또는 제공기관",
    "sourceUrl": "https://example.com/photos/123",
    "license": "사용 허락 조건",
    "licenseUrl": "https://example.com/photo-license"
  }
}
```

1. 표시 우선순위는 `imageUrl`, `thumbnailUrl`, 이름이 정확히 일치하는 기본 명소 사진이다. 먼저 선택한 URL이 로딩 실패하면 다음 후보로 넘어간다.
2. `null`, 빈 문자열 또는 유효하지 않은 URL은 건너뛴다. HTTPS와 로컬 루트 경로만 허용하고 data, javascript, 프로토콜 생략 URL 및 인증정보가 포함된 URL은 사용하지 않는다.
3. BE 사진을 사용할 때는 BE에서 전달한 출처를 표시한다. 기본 사진의 저작자 표시를 BE 사진에 붙이지 않는다. 출처 정보가 없다면 기본 사진의 출처로 대체하지 않는다.
4. 모르는 장소에 임의의 명소 사진을 붙이지 않는다. 사진이 모두 실패하면 카드에서는 사진 영역을 제거하고, 코스에서는 사진 준비 중을 표시한다. 검색, 코스 생성 및 저장은 계속 가능하다.
5. 실제 장소를 코스로 만들 때 선택한 사진과 출처를 코스에 담는다. 저장, 공유 스냅샷에도 보존한다. 기존에 저장한 대표 명소 코스는 사진 필드가 없어도 이름이 정확히 일치하면 기본 사진을 표시한다.
6. 실제 행사 카드와 상세 화면도 `imageUrl`과 `thumbnailUrl`을 받아 같은 실패 처리를 사용한다. BE EventItem 타입은 이 선택 필드를 허용한다. 기존 Figma 시연 이미지는 유지한다.
7. BE 전체 API의 운영 UI 전환은 별도 작업이다. 이 변경은 이미지 표시 계층과 필드 수용을 준비한 것이며, BE 주소만 넣어서 전체 API가 연결되는 것은 아니다. 현재 상태는 [팀 BE 연동 안내](TEAM_BACKEND_INTEGRATION.md)를 본다.

BE 담당자는 브라우저가 접근할 수 있는 HTTPS 이미지 주소와 사용 가능한 출처 정보를 제공해야 한다. 브라우저 이미지 요청에 Bearer 헤더를 붙이지 않는다. 인증이 필요한 이미지라면 공개 이미지 또는 갱신 가능한 서명 URL을 제공하는 계약을 먼저 정한다.

## 검증

1. 대표 명소 6곳의 사진 로딩 및 출처 링크
2. BE 원본 우선, 원본 실패 시 썸네일, 썸네일 실패 시 기본 명소 사진
3. 미등록 장소의 깨진 이미지 제거와 코스 선택 유지
4. 사진과 저작자 정보가 코스 생성 및 새로고침 뒤에도 유지됨
5. 안전하지 않은 URL 차단 및 주차장에 명소 사진을 잘못 붙이지 않음
