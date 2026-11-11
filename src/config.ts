/**
 * 앱 설정값 모음
 * 웹 도메인이 바뀌거나 탭 메뉴 경로가 정해지면 이 파일만 수정하면 됩니다.
 */

/** 앱을 열었을 때 처음 보여줄 웹 주소 */
export const START_URL = 'https://www.kyobodasomcare.com';

/**
 * 앱 안(웹뷰)에서 열 도메인 목록
 * 여기 있는 도메인과 그 하위 도메인(www. 등)은 앱 안에서 열리고,
 * 그 외 도메인 링크를 누르면 Safari로 열립니다.
 */
export const INTERNAL_HOSTS: string[] = ['kyobodasomcare.com'];

/**
 * User-Agent 끝에 붙는 앱 식별자
 * 웹 서버/프론트에서 navigator.userAgent 에 이 값이 있으면 앱으로 접속한 것입니다.
 */
export const USER_AGENT_SUFFIX = 'KDCHealthcareApp/iOS';

/**
 * 고객센터 전화번호 (더보기 > 고객센터 전화, 웹 브리지 'call' 액션의 기본값)
 * 번호는 이 한 곳에서만 바꾸면 됩니다. (1588-7524 로 확정)
 */
export const CUSTOMER_CENTER = '1588-7524';

/** 더보기 > 문의하기 (웹 메뉴 '고객센터 > 문의하기') */
export const CONTACT_PATH = '/CSCT0010M.do?menuId=CS0403';

/** 더보기 > 서비스안내 (웹 메뉴 '서비스소개 > 주요서비스') */
export const SERVICE_INFO_PATH = '/HCCT0010M.do?menuId=CS0201';

/**
 * 개인정보처리방침 / 이용약관 주소
 * 비어 있으면 웹사이트 첫 화면 하단의 약관 팝업(viewBottom)을 띄웁니다.
 * 웹팀이 고정 주소를 만들면 여기에 넣으세요. (예: 'https://www.kyobodasomcare.com/privacy.do')
 */
export const PRIVACY_POLICY_URL = '';
export const TERMS_URL = '';

/** 생체인증 잠금: 백그라운드에 이 시간 이상 있다가 돌아오면 다시 잠급니다. (밀리초) */
export const APP_LOCK_AFTER_MS = 5 * 60 * 1000;

/** 브랜드 색상 (하단 탭 활성 색, 로딩 바 등) */
export const BRAND_COLOR = '#4AB035';

/**
 * 하단 네이티브 탭 메뉴 사용 여부
 * false 로 두면 탭 바를 숨기고 웹 화면만 전체로 보여줍니다.
 */
export const TABS_ENABLED = true;

export type TabItem = {
  /** 탭 이름 */
  title: string;
  /** Ionicons 아이콘 이름 (https://icons.expo.fyi 에서 검색) */
  icon: string;
  /** 선택됐을 때 아이콘 */
  activeIcon: string;
  /** 탭을 눌렀을 때 이동할 웹 경로 (START_URL 기준). 네이티브 탭은 빈 문자열 */
  path: string;
  /** 웹 화면이 아닌 네이티브 화면 탭 */
  native?: 'more';
};

/**
 * 웹 메뉴 주소 만들기
 * 웹사이트 메뉴(goMenu)는 menuId 를 쿼리로 넘겨 상단 메뉴 선택 표시를 합니다.
 * menuName 은 넘기지 않습니다: 서버가 한글 쿼리를 ISO-8859-1 로 해석해 화면 제목이 깨집니다. (웹팀 확인 필요)
 * 두 번째 인자(메뉴 이름)는 참고용으로만 남겨 둡니다.
 */
const menu = (path: string, menuId: string, _menuName: string) => `${path}?menuId=${menuId}`;

/**
 * 하단 탭 메뉴 목록 (2026-11-11 웹사이트 메뉴 기준으로 확인한 실제 주소)
 * - 홈        /                          (공개)
 * - 건강검진   /ReMd0020/REMD0020M.do      (로그인 필요, 웹 메뉴 '회원서비스 > 건강검진신청')
 * - 건강정보   /HcCi0010/HCCI0010M.do      (로그인 필요, 웹 메뉴 '회원서비스 > 건강정보')
 * - 마이페이지 /HcIt0010/HCIT0010R.do      (로그인 필요, 웹 메뉴 '회원서비스 > 나의서비스')
 * - 더보기     네이티브 화면 (알림·생체인증 설정, 고객센터, 문의하기, 서비스안내, 약관, 앱 버전)
 * 웹사이트에 '병원검색', '심리케어', '마이페이지' 메뉴는 아직 없어서 가장 가까운 메뉴로 연결했습니다.
 * 현재 웹 주소의 경로가 path 로 시작하면 해당 탭이 선택 표시됩니다. (쿼리는 비교하지 않음)
 */
export const TABS: TabItem[] = [
  { title: '홈', icon: 'home-outline', activeIcon: 'home', path: '/' },
  { title: '건강검진', icon: 'medkit-outline', activeIcon: 'medkit', path: menu('/ReMd0020/REMD0020M.do', 'CS0304', '건강검진신청') },
  { title: '건강정보', icon: 'heart-outline', activeIcon: 'heart', path: menu('/HcCi0010/HCCI0010M.do', 'CS0302', '건강정보') },
  { title: '마이페이지', icon: 'person-outline', activeIcon: 'person', path: menu('/HcIt0010/HCIT0010R.do', 'CS0301', '나의서비스') },
  { title: '더보기', icon: 'ellipsis-horizontal-circle-outline', activeIcon: 'ellipsis-horizontal-circle', path: '', native: 'more' },
];

/** 스플래시(시작 화면)를 최대로 보여줄 시간 (밀리초). 웹 첫 로딩이 늦어도 이 시간이 지나면 닫힙니다. */
export const SPLASH_MAX_MS = 3000;

/** 앱 버전 확인용 App Store 조회 주소 */
export const APP_STORE_LOOKUP_URL =
  'https://itunes.apple.com/lookup?bundleId=com.kyobodasomcare.app&country=kr';

/**
 * 회원가입 화면 숨김/차단 (App Store 심사: 이 앱은 기존 회원 전용, 앱에서 계정을 만들 수 없음)
 * 2026-11-11 확인: 로그인 화면(/login.do) 하단 '회원가입' 버튼 → /UsSb0010/USSB0010M.do (약관) → /UsSb0011/USSB0011M.do
 * - texts: 링크·버튼 글자(공백 무시)에 이 말이 들어가면 숨깁니다. 약관 본문 같은 일반 글자는 숨기지 않습니다.
 * - safeTexts: 이 말이 들어간 링크·버튼은 절대 숨기지 않습니다. (로그인, 본인확인, 아이디/비밀번호 찾기 보호)
 * - promoTexts: 가입 권유 안내 문구 (짧은 문단만 숨김)
 * - urlPatterns: 주소(경로+쿼리, 대소문자 무시) 정규식. 링크 href/onclick 숨김과 화면 이동 차단에 함께 씁니다.
 *   주의: 'join' 만 쓰면 웹 스크립트의 .join( 과 겹치므로 '/join' 처럼 경로 형태로 적습니다.
 * - redirectPath: 차단했을 때 보낼 화면
 */
export const SIGNUP_GUARD = {
  texts: ['회원가입', '가입하기', '신규가입', '신규등록', '회원등록', '계정생성', '계정만들기'],
  safeTexts: ['로그인', '본인확인', '인증', '찾기', '탈퇴'],
  promoTexts: ['회원이 되어'],
  urlPatterns: ['/ussb\\d', '/join', 'signup', 'sign-up', 'memberjoin', 'joinmember'],
  redirectPath: '/login.do',
};
