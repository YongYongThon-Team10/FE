# Figma 전체 화면 대응표

대상 파일: [용용톤](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=192-2). `ui` 페이지 앱 화면 36개와 사용자가 포함을 요청한 `Page 1`의 이전 시설 화면 14개, 총 **50개 제품 프레임**을 비교했다. 리서치 포스터·브랜딩 보드·색상 견본은 화면 구현 대상에서 제외했다. 같은 이름의 프레임도 원본 노드별로 기록한다.

`npm run dev` 후 [화면 비교 목록](http://localhost:5173/#/design-review)에서 50개 프레임을 각각 열 수 있다. `frame` 쿼리는 시연 모드에서만 적용되며 고정된 날짜·계정·코스·팝업 상태를 만든다. 미리보기 상태는 일반 사용자의 localStorage와 분리되며 저장하지 않는다. 운영 API 모드에서는 이 시연 상태를 사용하지 않는다.

2026-11-14 홈 변경: 파란 배너 `294:1930`과 코랄 배너 `332:828`의 대안 시안 중 다리 그래픽이 추가된 `333:1021`을 현재 홈으로 사용한다. 검색창·추천 행사를 유지하고 랜딩의 조건 칩·별도 조건 확인/검색·시설 바로가기를 제거했다. 조건 변경은 결과 화면에서 제공한다.

## 프레임별 대응

‘기존 보완’은 기존 화면을 디자인·동작 기준으로 보완한 경우, ‘신규/완성’은 없거나 일부만 있던 화면을 완성한 경우다. 모든 행은 별도 스크린샷으로 검토하고 경로·에셋·가로 넘침을 검사했다. 동일한 기능의 중복 프레임은 하나의 동작 화면을 공유한다.

| 페이지 | 원본 노드                                                                        | 원본 이름                       | 구현 경로                                                                   | 변경      | 최종      |
| ------ | -------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- | --------- | --------- |
| ui     | [333:1021](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=333-1021) | 01 홈 · 앱                      | `/`                                                                         | 기존 보완 | 구현·검증 |
| ui     | [215:4150](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=215-4150) | 00온보딩                        | `/splash`                                                                   | 신규/완성 | 구현·검증 |
| ui     | [215:4356](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=215-4356) | 00온보딩                        | `/onboarding`                                                               | 신규/완성 | 구현·검증 |
| ui     | [215:5397](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=215-5397) | 00 로그인 · 게스트 입장         | `/login`                                                                    | 기존 보완 | 구현·검증 |
| ui     | [199:3027](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=199-3027) | 02 행사 찾기 · 앱               | `/events`                                                                   | 기존 보완 | 구현·검증 |
| ui     | [199:3170](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=199-3170) | 03 행사 상세 · 앱               | `/events/lake-market`                                                       | 기존 보완 | 구현·검증 |
| ui     | [199:3275](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=199-3275) | 04 코스 설정 · 앱               | `/configure/lake-market`                                                    | 기존 보완 | 구현·검증 |
| ui     | [199:3417](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=199-3417) | 05 하루 일정 · 앱               | `/course/design-course`                                                     | 기존 보완 | 구현·검증 |
| ui     | [199:3598](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=199-3598) | 06 내 코스 · 앱                 | `/saved`                                                                    | 기존 보완 | 구현·검증 |
| ui     | [308:4253](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=308-4253) | 06 내 코스 · 앱                 | `/saved`                                                                    | 기존 보완 | 구현·검증 |
| ui     | [308:4316](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=308-4316) | 06 내 코스 · 앱                 | `/calendar`                                                                 | 신규/완성 | 구현·검증 |
| ui     | [236:136](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=236-136)   | 06 설정 · 앱                    | `/settings`                                                                 | 기존 보완 | 구현·검증 |
| ui     | [236:199](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=236-199)   | 06 설정 · 앱                    | `/settings`                                                                 | 기존 보완 | 구현·검증 |
| ui     | [199:3650](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=199-3650) | 07 이용 가이드 · 앱             | `/guide`                                                                    | 기존 보완 | 구현·검증 |
| ui     | [205:2](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-2)       | 08 검색 조건 수정 · 앱          | `/conditions`                                                               | 신규/완성 | 구현·검증 |
| ui     | [205:45](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-45)     | 09 일정 생성 중 · 앱            | `/generating/lake-market`                                                   | 신규/완성 | 구현·검증 |
| ui     | [205:88](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-88)     | 10 장소 교체 · 앱               | `/replace/design-course?stop=meal`                                          | 기존 보완 | 구현·검증 |
| ui     | [205:131](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-131)   | 11 식사 직접 입력 · 앱          | `/manual/design-course?stop=meal`                                           | 신규/완성 | 구현·검증 |
| ui     | [205:174](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-174)   | 12 저장과 공유 · 앱             | `/share/design-course`                                                      | 신규/완성 | 구현·검증 |
| ui     | [205:217](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-217)   | 13 저장된 내 코스 · 앱          | `/saved-courses`                                                            | 신규/완성 | 구현·검증 |
| ui     | [205:260](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-260)   | 14 동선 확인 · 앱               | `/course-map/design-course`                                                 | 기존 보완 | 구현·검증 |
| ui     | [205:303](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-303)   | 15 신청과 출처 · 앱             | `/sources/lake-market`                                                      | 기존 보완 | 구현·검증 |
| ui     | [205:346](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-346)   | 16 안내 차이 확인 · 앱          | `/differences/lake-market`                                                  | 신규/완성 | 구현·검증 |
| ui     | [205:389](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-389)   | 17 출발지 설정 · 앱             | `/origin/lake-market`                                                       | 신규/완성 | 구현·검증 |
| ui     | [205:714](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-714)   | 18 내 코스 삭제 확인 · 앱       | `/delete-course/design-course`                                              | 신규/완성 | 구현·검증 |
| ui     | [205:783](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=205-783)   | 19 예외 상황과 공유 가이드 · 앱 | `/help`                                                                     | 신규/완성 | 구현·검증 |
| ui     | [237:36](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-36)     | 07 로그인 정보 · 앱             | `/account`                                                                  | 신규/완성 | 구현·검증 |
| ui     | [237:103](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-103)   | 08 알림 설정 · 앱               | `/notifications`                                                            | 기존 보완 | 구현·검증 |
| ui     | [237:170](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-170)   | 09 개인정보 관리 · 앱           | `/privacy`                                                                  | 기존 보완 | 구현·검증 |
| ui     | [237:237](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-237)   | 10 공지사항 · 앱                | `/notices`                                                                  | 기존 보완 | 구현·검증 |
| ui     | [237:304](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-304)   | 11 공지사항 상세 · 앱           | `/notices/update`                                                           | 신규/완성 | 구현·검증 |
| ui     | [237:371](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-371)   | 12 문의하기 · 앱                | `/contact`                                                                  | 기존 보완 | 구현·검증 |
| ui     | [237:438](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-438)   | 13 문의 접수 완료 · 앱          | `/contact-complete`                                                         | 신규/완성 | 구현·검증 |
| ui     | [237:505](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-505)   | 14 로그아웃 확인 · 앱           | `/settings?dialog=logout`                                                   | 기존 보완 | 구현·검증 |
| ui     | [237:572](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-572)   | 15 로그아웃 완료 · 앱           | `/logout-complete`                                                          | 신규/완성 | 구현·검증 |
| ui     | [237:639](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=237-639)   | 16 회원 탈퇴 확인 · 앱          | `/privacy?dialog=delete`                                                    | 기존 보완 | 구현·검증 |
| Page 1 | [96:2](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-2)         | 12 이용 안내 및 데이터 안내     | `/facilities/guide`                                                         | 신규/완성 | 구현·검증 |
| Page 1 | [96:92](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-92)       | 11 검색 결과 없음               | `/facilities/results?q=테니스장&cat=운동·체육&town=구갈동`                  | 신규/완성 | 구현·검증 |
| Page 1 | [96:139](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-139)     | 10 시설 상세 — 정보 미제공      | `/facilities/detail/gym-unknown`                                            | 신규/완성 | 구현·검증 |
| Page 1 | [96:201](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-201)     | 09 행사 상세                    | `/facilities/event/swim`                                                    | 신규/완성 | 구현·검증 |
| Page 1 | [96:252](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-252)     | 08 주변 행사 목록               | `/facilities/events`                                                        | 신규/완성 | 구현·검증 |
| Page 1 | [96:317](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-317)     | 07 주차 정보 상세               | `/facilities/parking/pool`                                                  | 신규/완성 | 구현·검증 |
| Page 1 | [96:374](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-374)     | 06 이용 현황 상세               | `/facilities/usage/pool`                                                    | 신규/완성 | 구현·검증 |
| Page 1 | [96:437](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-437)     | 05 시설 상세 — 기흥 생활수영장  | `/facilities/detail/pool`                                                   | 신규/완성 | 구현·검증 |
| Page 1 | [96:505](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-505)     | 04 전체 시설 목록               | `/facilities/all`                                                           | 신규/완성 | 구현·검증 |
| Page 1 | [96:666](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-666)     | 03 필터 화면                    | `/facilities/filters?q=구갈동&cat=운동·체육&town=구갈동&type=수영장,체육관` | 신규/완성 | 구현·검증 |
| Page 1 | [96:744](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-744)     | 02 검색 결과 목록               | `/facilities/results?q=구갈동`                                              | 신규/완성 | 구현·검증 |
| Page 1 | [96:816](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-816)     | 01 검색 화면                    | `/facilities/search?q=구갈동`                                               | 신규/완성 | 구현·검증 |
| Page 1 | [96:867](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=96-867)     | 기흥 여가지도 모바일            | `/facilities`                                                               | 신규/완성 | 구현·검증 |
| Page 1 | [105:1422](https://www.figma.com/design/7h3RrrQLKuxoRTn70jSLn3?node-id=105-1422) | 기흥 여가지도 모바일            | `/facilities`                                                               | 신규/완성 | 구현·검증 |

## 디자인 적용과 의도적인 정리

- Noto Sans KR 300/400/500/700, Gugi와 원본 내비게이션의 Pretendard, Noto Emoji를 로컬 번들로 사용한다. 원본 색상·배경·카드·선·탭·간격과 로고·아이콘·지도 도형 에셋을 반영했다. 에셋 출처는 `design-assets.json`에 기록했다.
- 앱 원본 390px, 시설 원본 393px를 기준으로 구성했다. 일반 웹은 최대 430px이며 화면 비교 모드에서는 원본 폭과 iOS 상태 표시줄·홈 인디케이터를 재현한다. 실제 웹에서는 브라우저 상태 표시줄을 사용한다.
- 요청대로 홈 중복 콘텐츠를 정리하고 달력 날짜·요일·월 경계를 실제 날짜 계산으로 교정했다. 월간·주간 달력은 날짜 선택 시 연결된 행사와 코스를 표시한다.
- 기능명세서의 기본 5칸 코스를 유지한다. 부족한 장소·좌표·가격은 지어내지 않고 미확인 상태와 다음 행동을 표시한다.
- 앱 지도는 좌표 기반 실제 지도와 클릭 가능한 마커·정보 카드로 구현했다. 이전 시설의 가상 배치는 원본 도형을 사용하며 ‘가상 배치도’로 구분한다. 서버 시설 데이터는 실제 좌표 지도로 전환된다.
- 고정된 프레임은 디자인 비교용 상태다. 일반 화면의 이름·날짜·관측값·목록은 사용자의 입력과 API 응답에 따라 달라진다. 전체 화면을 이미지로 덮는 방식은 사용하지 않았다.

## 상태·흐름 검증

- 검색·조건 수정 → 행사 상세·출처 차이 → 코스 설정·출발지 → 생성 대기·오류·재시도·취소 → 일정 → 교체·직접 입력 → 지도 → 저장·공유·삭제.
- 저장 없음/있음, 주간·월간 달력, 잘못된 공유 링크, 좌표 없음, 위치 권한 거부, 후보 부족, 종료 시간 초과, 저장 실패.
- 로그인·게스트·시연 계정, 계정 정보, 알림 선호, 공지 목록·상세, 문의 입력·완료, 로그아웃 확인·취소·완료, 탈퇴 확인·취소.
- 시설 검색·필터·전체 목록·상세·이용 현황·주차·주변 행사·행사 상세·빈 결과·정보 미제공·이용 안내. 서버 수치 갱신과 갱신 실패 시 마지막 정상 데이터 유지.
- 50개 프레임의 320/390/1280px 가로 넘침·에셋 표시와 일반 서비스 여정은 Playwright로 확인한다. 원본 디자인과의 일치는 스크린샷 육안 비교이며 자동 픽셀 일치 검사는 아니다.

## 다음 연동 범위

실제 백엔드 인증·문의 접수·AI·실측 수집·n8n·클라우드 코스·푸시 발송은 연결 전이다. 시연 계정 및 문의 완료에는 시연임을 표시하며 실제 접수로 처리하지 않는다. 서버 모드는 정상 응답 후에만 완료로 이동한다. 시설·행사 갱신과 호출 필드는 `API_CONTRACT.md`, 전체 사용 흐름은 `USER_FLOW.md`를 참고한다.
