import { INTERNAL_HOSTS, START_URL, TABS, type TabItem } from '../config';

/** 주소에서 호스트 이름(도메인)만 꺼냅니다. */
export function hostOf(url: string): string | null {
  const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

/** 주소의 경로 부분(/a/b)만 꺼냅니다. */
export function pathOf(url: string): string {
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+(\/[^?#]*)?/i.exec(url);
  return (m && m[1]) || '/';
}

/** 주소의 스킴(http, https, tel 등)을 소문자로 돌려줍니다. */
export function schemeOf(url: string): string {
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  return m ? m[1].toLowerCase() : '';
}

/** 우리 도메인(INTERNAL_HOSTS 와 그 하위 도메인)인지 확인합니다. */
export function isInternalUrl(url: string): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return INTERNAL_HOSTS.some((h) => host === h || host.endsWith('.' + h));
}

/** 상대 경로(/mypage 등)를 START_URL 기준 전체 주소로 바꿉니다. */
export function resolveUrl(pathOrUrl: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(pathOrUrl)) return pathOrUrl;
  const origin = /^([a-z]+:\/\/[^/?#]+)/i.exec(START_URL)?.[1] ?? START_URL;
  return origin + (pathOrUrl.startsWith('/') ? pathOrUrl : '/' + pathOrUrl);
}

/** 현재 주소의 경로와 가장 길게 일치하는 탭의 인덱스를 찾습니다. (없으면 -1) */
export function activeTabIndex(url: string, tabs: TabItem[] = TABS): number {
  if (!isInternalUrl(url)) return -1;
  const path = pathOf(url);
  let best = -1;
  let bestLen = -1;
  tabs.forEach((tab, i) => {
    if (tab.native) return;
    const p = tab.path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    const match =
      p === '/' ? true : path === p || path.startsWith(p + '/');
    const len = p === '/' ? 0 : p.length;
    if (match && len > bestLen) {
      best = i;
      bestLen = len;
    }
  });
  return best;
}
