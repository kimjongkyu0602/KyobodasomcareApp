import { SIGNUP_GUARD } from '../config';

const urlRegexes = SIGNUP_GUARD.urlPatterns.map((p) => new RegExp(p, 'i'));

/** 회원가입 화면 주소인지 (경로 + 쿼리로 판단) */
export function isSignupUrl(url: string): boolean {
  const m = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]+([^#]*)/i.exec(url);
  const pathAndQuery = m ? m[1] : url;
  return urlRegexes.some((r) => r.test(pathAndQuery));
}

/**
 * 웹 화면에서 회원가입 링크·버튼과 가입 권유 문구를 숨기는 스크립트
 * - 링크/버튼(a, button, input 버튼, onclick, role=button)만 대상. 약관 표의 '회원가입' 같은 일반 글자는 건드리지 않습니다.
 * - 화면이 바뀌어도(MutationObserver) 다시 검사합니다.
 */
export const SIGNUP_GUARD_SCRIPT = `
(function () {
  if (window.__kdcSignupGuard) { return; }
  window.__kdcSignupGuard = true;
  var C = ${JSON.stringify({
    texts: SIGNUP_GUARD.texts,
    safeTexts: SIGNUP_GUARD.safeTexts,
    promoTexts: SIGNUP_GUARD.promoTexts,
    urlPatterns: SIGNUP_GUARD.urlPatterns,
    faqItems: SIGNUP_GUARD.faqItems,
  })};
  var urlRes = C.urlPatterns.map(function (p) { return new RegExp(p, 'i'); });
  var CLICKABLE = 'a, button, input[type=button], input[type=submit], [onclick], [role=button]';
  function norm(s) { return (s || '').replace(/\\s+/g, ''); }
  function has(list, t) { for (var i = 0; i < list.length; i++) { if (t.indexOf(norm(list[i])) >= 0) return true; } return false; }
  function urlHit(s) { if (!s) return false; for (var i = 0; i < urlRes.length; i++) { if (urlRes[i].test(s)) return true; } return false; }
  function hide(el) {
    if (el.getAttribute('data-kdc-hidden')) return;
    el.setAttribute('data-kdc-hidden', '1');
    el.style.setProperty('display', 'none', 'important');
  }
  function visibleText(el) {
    var t = '';
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3) t += n.nodeValue;
      else if (n.nodeType === 1 && !n.getAttribute('data-kdc-hidden')) t += n.textContent;
    }
    return norm(t);
  }
  function hideEmptyParent(el) {
    var p = el.parentElement;
    if (!p || p === document.body || p === document.documentElement) return;
    if (p.matches && p.matches('form, section, main, header, footer, nav, ul, table')) return;
    if (visibleText(p) === '' && !p.querySelector('input:not([type=hidden]), select, textarea, img')) hide(p);
  }
  function scan() {
    if (!document.body) return;
    var els = document.querySelectorAll(CLICKABLE);
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.getAttribute('data-kdc-hidden')) continue;
      var text = norm(el.textContent || el.value || '');
      if (text.length > 30 || has(C.safeTexts, text)) continue;
      var target = (el.getAttribute('href') || '') + ' ' + (el.getAttribute('onclick') || '') + ' ' + (el.getAttribute('formaction') || '');
      if (has(C.texts, text) || urlHit(target)) { hide(el); hideEmptyParent(el); }
    }
    var ps = document.querySelectorAll('p, span, div, strong, em');
    for (var j = 0; j < ps.length; j++) {
      var q = ps[j];
      if (q.getAttribute('data-kdc-hidden')) continue;
      var t = norm(q.textContent);
      if (t.length > 0 && t.length <= 60 && has(C.promoTexts, t) && !q.querySelector(CLICKABLE)) { hide(q); hideEmptyParent(q); }
    }
    for (var k = 0; k < C.faqItems.length; k++) {
      var items = document.querySelectorAll(C.faqItems[k].item);
      for (var m = 0; m < items.length; m++) {
        var it = items[m];
        if (it.getAttribute('data-kdc-hidden')) continue;
        var tt = it.querySelector(C.faqItems[k].title);
        if (tt && has(C.texts, norm(tt.textContent))) hide(it);
      }
    }
  }
  var timer = null;
  function schedule() { if (timer) return; timer = setTimeout(function () { timer = null; scan(); }, 30); }
  try { new MutationObserver(schedule).observe(document, { childList: true, subtree: true }); } catch (e) {}
  document.addEventListener('DOMContentLoaded', scan);
  window.addEventListener('load', scan);
  scan();
})();
true;
`;
