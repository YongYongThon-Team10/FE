import type { PlacePhotoData } from '@/domain/images'

export const landmarkPhotos: Record<string, PlacePhotoData> = {
  에버랜드: {
    src: '/landmarks/everland.webp',
    position: '50% 52%',
    local: true,
    credit: {
      author: 'Wikiwater2020',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Everland_Magic_tree.jpg',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    },
  },
  한국민속촌: {
    src: '/landmarks/folk-village.webp',
    position: '50% 66%',
    local: true,
    credit: {
      author: 'ChenGui',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:Korea_Yongin_Folk_Village.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  호암미술관: {
    src: '/landmarks/hoam.webp',
    local: true,
    credit: {
      author: 'Jocelyndurrey',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Hoammuseum.jpg',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
  },
  와우정사: {
    src: '/landmarks/wawoojeongsa.webp',
    position: '100% 50%',
    local: true,
    credit: {
      author: '이주형 / 경기도 꿈나무기자단',
      sourceUrl:
        'https://gnews.gg.go.kr/news/news_detail.do?number=201803141646176262C076&s_code=C076',
      license: '공공누리 제1유형',
      licenseUrl: 'https://www.kogl.or.kr/info/licenseType1.do',
    },
  },
  용인농촌테마파크: {
    src: '/landmarks/rural-theme-park.webp',
    local: true,
    credit: {
      author: '용인특례시',
      sourceUrl:
        'https://www.yongin.go.kr/user/bbs/BD_selectBbs.do?q_bbsCode=1020&q_bbscttSn=20240418094853066',
      license: '공공누리 제1유형',
      licenseUrl: 'https://www.kogl.or.kr/info/licenseType1.do',
    },
  },
  한택식물원: {
    src: '/landmarks/hantaek.webp',
    local: true,
    credit: {
      author: 'JKD',
      sourceUrl:
        'https://commons.wikimedia.org/wiki/File:%ED%95%9C%ED%83%9D%EC%8B%9D%EB%AC%BC%EC%9B%90.jpg',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    },
  },
}
