import { marked } from 'marked';
import DOMPurify from 'dompurify';

// 마크다운 설정 초기화
marked.setOptions({
  breaks: true, // 줄바꿈을 <br>로 변환
  gfm: true,    // GitHub Flavored Markdown 지원
});

/**
 * 마크다운 요소들에 적절한 스타일을 적용합니다.
 * @param {HTMLElement} container - 스타일을 적용할 컨테이너 요소
 */
export const applyElementStyles = (container) => {
  // 헤딩 스타일 적용
  const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(h => {
    h.style.cssText = 'font-weight: bold; margin-top: 0.5em; margin-bottom: 0.2em;';
    // 헤딩 레벨에 따른 폰트 크기 설정
    if (h.tagName === 'H1') h.style.fontSize = '1.5em';
    else if (h.tagName === 'H2') h.style.fontSize = '1.3em';
    else if (h.tagName === 'H3') h.style.fontSize = '1.1em';
    else if (h.tagName === 'H4') h.style.fontSize = '1.05em';
    else if (h.tagName === 'H5') h.style.fontSize = '1em';
    else if (h.tagName === 'H6') h.style.fontSize = '0.95em';
  });

  // 문단 스타일 적용
  const paragraphs = container.querySelectorAll('p');
  paragraphs.forEach(p => {
    p.style.cssText = 'margin-bottom: 0.5em; margin-top: 0;';
  });

  // 리스트 스타일 적용
  const lists = container.querySelectorAll('ul, ol');
  lists.forEach(list => {
    list.style.cssText = 'margin: 0.5em 0; padding-left: 1.5em;';
    // 순서 없는 리스트와 순서 있는 리스트 구분
    if (list.tagName === 'UL') list.style.listStyleType = 'disc';
    else list.style.listStyleType = 'decimal';
  });

  // 중첩 리스트 스타일 적용
  const nestedUls = container.querySelectorAll('ul ul');
  nestedUls.forEach(ul => {
    ul.style.listStyleType = 'circle'; // 2차 중첩은 원형 불릿
    ul.style.margin = '0.2em 0';
  });

  const nestedOls = container.querySelectorAll('ol ol');
  nestedOls.forEach(ol => {
    ol.style.listStyleType = 'lower-alpha'; // 2차 중첩은 알파벳
  });

  // 리스트 아이템 스타일 적용
  const listItems = container.querySelectorAll('li');
  listItems.forEach(li => {
    li.style.cssText = 'margin: 0.1em 0; display: list-item;';
  });

  // 인용문 스타일 적용
  const blockquotes = container.querySelectorAll('blockquote');
  blockquotes.forEach(bq => {
    bq.style.cssText = 'border-left: 4px solid #e5e7eb; padding-left: 1em; margin: 0.5em 0; font-style: italic; color: #6b7280;';
  });

  // 인라인 코드 스타일 적용
  const codes = container.querySelectorAll('code');
  codes.forEach(code => {
    // pre 태그 안의 코드가 아닌 경우에만 인라인 스타일 적용
    if (!code.parentElement || code.parentElement.tagName !== 'PRE') {
      code.style.cssText = 'background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.9em;';
    }
  });

  // 코드 블록 스타일 적용
  const pres = container.querySelectorAll('pre');
  pres.forEach(pre => {
    pre.style.cssText = 'background-color: #f3f4f6; padding: 0.8em; border-radius: 5px; overflow-x: auto; margin: 0.5em 0;';
    const code = pre.querySelector('code');
    if (code) {
      // 코드 블록 내부의 코드는 배경색 제거
      code.style.cssText = 'background-color: transparent; padding: 0;';
    }
  });

  // 링크 스타일 적용
  const links = container.querySelectorAll('a');
  links.forEach(a => {
    a.style.cssText = 'color: #3b82f6; text-decoration: underline;';
  });

  // 강조 스타일 적용
  const strongs = container.querySelectorAll('strong');
  strongs.forEach(s => {
    s.style.fontWeight = 'bold';
  });

  const ems = container.querySelectorAll('em');
  ems.forEach(e => {
    e.style.fontStyle = 'italic';
  });

  // 수평선 스타일 적용
  const hrs = container.querySelectorAll('hr');
  hrs.forEach(hr => {
    hr.style.cssText = 'border: none; height: 1px; background-color: #e5e7eb; margin: 1em 0;';
  });

  // 테이블 스타일 적용
  const tables = container.querySelectorAll('table');
  tables.forEach(table => {
    table.style.cssText = 'width: 100%; border-collapse: collapse; margin: 0.5em 0;';
  });

  // 테이블 헤더 스타일 적용
  const ths = container.querySelectorAll('th');
  ths.forEach(th => {
    th.style.cssText = 'border: 1px solid #e5e7eb; padding: 0.4em; text-align: left; background-color: #f9fafb; font-weight: bold;';
  });

  // 테이블 데이터 셀 스타일 적용
  const tds = container.querySelectorAll('td');
  tds.forEach(td => {
    td.style.cssText = 'border: 1px solid #e5e7eb; padding: 0.4em; text-align: left;';
  });

  // 첫 번째와 마지막 요소 마진 제거
  const firstChild = container.firstElementChild;
  if (firstChild) firstChild.style.marginTop = '0';
  
  const lastChild = container.lastElementChild;
  if (lastChild) lastChild.style.marginBottom = '0';
};

/**
 * HTML에 마크다운 스타일을 인라인으로 적용합니다.
 * @param {string} html - 스타일을 적용할 HTML 문자열
 * @returns {string} 스타일이 적용된 HTML 문자열
 */
export const applyMarkdownStyles = (html) => {
  if (!html) return '';
  
  // 임시 div 생성해서 HTML 파싱
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // 각 요소에 인라인 스타일 적용
  applyElementStyles(tempDiv);
  
  return tempDiv.innerHTML;
};

/**
 * 마크다운 텍스트를 안전한 HTML로 변환합니다.
 * @param {string} text - 변환할 마크다운 텍스트
 * @returns {string} 안전하게 변환된 HTML 문자열
 */
export const parseMarkdown = (text) => {
  if (!text) return '';
  // 마크다운을 HTML로 변환
  const html = marked(text);
  // XSS 공격 방지를 위한 HTML 정화
  const sanitized = DOMPurify.sanitize(html);
  
  // 마크다운 스타일을 적용한 HTML 반환
  return applyMarkdownStyles(sanitized);
}; 