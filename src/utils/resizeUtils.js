import { getMaxDimensions } from './commonUtils.js';

/**
 * 리사이즈 상태를 관리하는 클래스
 */
export class ResizeManager {
  constructor() {
    this.isResizing = false;
    this.resizeDirection = '';
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.isResizeJustCompleted = false;
    this.eventListeners = new Map();
  }

  /**
   * 리사이즈 중 클릭 이벤트를 차단합니다.
   * @param {Event} event - 클릭 이벤트
   */
  preventClickDuringResize = (event) => {
    if (this.isResizing || this.isResizeJustCompleted) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  };

  /**
   * 커스텀 리사이즈를 시작합니다.
   * @param {MouseEvent} event - 마우스 이벤트
   * @param {string} direction - 리사이즈 방향 ('e', 's', 'se'만 지원)
   * @param {boolean} isPreviewMode - 프리뷰 모드 여부
   * @param {Function} updateSizeCallback - 크기 업데이트 콜백
   * @param {Function} saveSizeCallback - 크기 저장 콜백
   */
  startResize(event, direction, isPreviewMode, updateSizeCallback, saveSizeCallback) {
    // 지원하는 방향만 허용
    if (!['e', 's', 'se'].includes(direction)) {
      return;
    }
    
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // 현재 크기 저장 및 검증
    const targetElement = isPreviewMode 
      ? document.getElementById('markdown-preview-div')
      : document.getElementById('alive-memo-textarea');
    
    if (!targetElement) return;
    
    const currentWidth = targetElement.offsetWidth;
    const currentHeight = targetElement.offsetHeight;
    
    // 크기가 유효하지 않으면 리사이즈 시작하지 않음
    if (currentWidth <= 0 || currentHeight <= 0) {
      console.warn('Invalid element dimensions, resize cancelled');
      return;
    }
    
    this.isResizing = true;
    this.resizeDirection = direction;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = currentWidth;
    this.startHeight = currentHeight;
    
    // 이벤트 핸들러 바인딩
    const handleResize = (e) => this.handleResize(e, isPreviewMode, updateSizeCallback, saveSizeCallback);
    const stopResize = (e) => this.stopResize(e);
    
    // 이벤트 리스너 저장
    this.eventListeners.set('mousemove', handleResize);
    this.eventListeners.set('mouseup', stopResize);
    this.eventListeners.set('click', this.preventClickDuringResize);
    
    // 문서 레벨에서 마우스 이벤트 리스너 추가
    document.addEventListener('mousemove', handleResize, { passive: false, capture: true });
    document.addEventListener('mouseup', stopResize, { passive: false, capture: true });
    document.addEventListener('click', this.preventClickDuringResize, { passive: false, capture: true });
    
    // 드래그 중 텍스트 선택 방지
    document.body.style.userSelect = 'none';
    document.body.classList.add('resizing');
  }

  /**
   * 리사이즈를 처리합니다.
   * @param {MouseEvent} event - 마우스 이벤트
   * @param {boolean} isPreviewMode - 프리뷰 모드 여부
   * @param {Function} updateSizeCallback - 크기 업데이트 콜백
   * @param {Function} saveSizeCallback - 크기 저장 콜백
   */
  handleResize(event, isPreviewMode, updateSizeCallback, saveSizeCallback) {
    if (!this.isResizing) return;
    
    event.preventDefault();
    
    const targetElement = isPreviewMode 
      ? document.getElementById('markdown-preview-div')
      : document.getElementById('alive-memo-textarea');
    
    if (!targetElement) return;
    
    const container = document.getElementById('chrome-memo-extension');
    if (!container) return;
    
    // 현재 마우스 위치와 시작 위치의 차이 계산
    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;
    
    // 새로운 크기 계산
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    
    // 방향별 리사이즈 로직
    if (this.resizeDirection.includes('e')) {
      // 오른쪽: 너비 증가
      newWidth = this.startWidth + deltaX;
    }
    
    if (this.resizeDirection.includes('s')) {
      // 아래쪽: 높이 증가
      newHeight = this.startHeight + deltaY;
    }
    
    // 절대 최소 크기
    const absoluteMinWidth = 200;
    const absoluteMinHeight = 150;
    
    // 실시간으로 현재 모달 위치를 기준으로 최대 크기 계산
    const { maxWidth, maxHeight } = getMaxDimensions();
    
    // 추가 여유공간을 고려한 실제 최대 크기 (브라우저 경계를 절대 넘지 않도록)
    const safeMaxWidth = Math.max(absoluteMinWidth, maxWidth - 10); // 10px 여유공간
    const safeMaxHeight = Math.max(absoluteMinHeight, maxHeight - 10); // 10px 여유공간
    
    // 크기 제한 적용 (더 엄격한 경계 체크)
    newWidth = Math.max(absoluteMinWidth, Math.min(newWidth, safeMaxWidth));
    newHeight = Math.max(absoluteMinHeight, Math.min(newHeight, safeMaxHeight));
    
    // 크기가 유효한 경우에만 적용
    if (newWidth > 0 && newHeight > 0) {
      // 콜백을 통해 크기 업데이트 (실시간 경계 정보 전달)
      updateSizeCallback(newWidth, newHeight, targetElement, isPreviewMode, safeMaxWidth, safeMaxHeight);
      
      // 리사이즈할 때마다 크기 정보 자동 저장
      saveSizeCallback(newWidth, newHeight);
    }
  }

  /**
   * 리사이즈를 종료합니다.
   * @param {MouseEvent} event - 마우스 이벤트
   */
  stopResize(event) {
    if (!this.isResizing) return;
    
    // 이벤트 전파 차단
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
    
    // 최종 크기 정보 캡처 (위치 조정용)
    const targetElement = document.getElementById('markdown-preview-div') || document.getElementById('alive-memo-textarea');
    const finalWidth = targetElement ? targetElement.offsetWidth : null;
    const finalHeight = targetElement ? targetElement.offsetHeight : null;
    
    this.isResizing = false;
    this.resizeDirection = '';
    
    // 리사이즈 완료 플래그 설정 (모달 클릭 방지용)
    this.isResizeJustCompleted = true;
    
    // 이벤트 리스너 제거
    const handleResize = this.eventListeners.get('mousemove');
    const stopResize = this.eventListeners.get('mouseup');
    const preventClick = this.eventListeners.get('click');
    
    if (handleResize) {
      document.removeEventListener('mousemove', handleResize, { passive: false, capture: true });
    }
    if (stopResize) {
      document.removeEventListener('mouseup', stopResize, { passive: false, capture: true });
    }
    
    // 텍스트 선택 복원
    document.body.style.userSelect = '';
    document.body.classList.remove('resizing');
    
    // 리사이즈 완료 후 모달 위치 재조정 (최종 크기 정보 포함)
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.calcPositionForPopup && finalWidth && finalHeight) {
        console.log('Adjusting modal position after resize completion with final size:', finalWidth, 'x', finalHeight);
        window.calcPositionForPopup(finalWidth, finalHeight);
      }
    }, 50); // 리사이즈 완료 후 위치 조정
    
    // 300ms 후 클릭 차단 해제
    setTimeout(() => {
      if (preventClick) {
        document.removeEventListener('click', preventClick, { passive: false, capture: true });
      }
      this.isResizeJustCompleted = false;
      this.eventListeners.clear();
    }, 300);
  }
}

/**
 * 요소에 크기를 적용합니다.
 * @param {HTMLElement} element - 크기를 적용할 요소
 * @param {number} width - 너비
 * @param {number} height - 높이
 * @param {boolean} isTextarea - textarea 요소 여부
 * @param {number} maxWidth - 최대 너비 (옵션)
 * @param {number} maxHeight - 최대 높이 (옵션)
 */
export const applySizeToElement = (element, width, height, isTextarea = false, maxWidth = null, maxHeight = null) => {
  if (!element) return;
  
  const widthPx = `${width}px`;
  const heightPx = `${height}px`;
  
  // 최대 크기가 제공되지 않은 경우 동적으로 계산
  if (maxWidth === null || maxHeight === null) {
    const dimensions = getMaxDimensions();
    maxWidth = maxWidth || dimensions.maxWidth;
    maxHeight = maxHeight || dimensions.maxHeight;
  }
  
  if (isTextarea) {
    // textarea의 경우 완전한 스타일 적용
    element.removeAttribute('style');
    
    const newStyle = `
      background: #fffae3 !important;
      border: 1px solid #d1d5db !important;
      border-radius: 5px !important;
      padding: 8px !important;
      padding-right: 48px !important;
      font-size: 16px !important;
      resize: none !important;
      box-sizing: border-box !important;
      width: ${widthPx} !important;
      height: ${heightPx} !important;
      min-width: 200px !important;
      min-height: 150px !important;
      max-width: ${maxWidth}px !important;
      max-height: ${maxHeight}px !important;
    `;
    
    element.style.cssText = newStyle;
    
    // rows, cols 속성도 업데이트
    const avgCharWidth = 8;
    const avgLineHeight = 20;
    const cols = Math.floor(width / avgCharWidth);
    const rows = Math.floor(height / avgLineHeight);
    
    element.setAttribute('cols', cols.toString());
    element.setAttribute('rows', rows.toString());
  } else {
    // 일반 div의 경우 크기 적용 (max 제한도 포함)
    element.style.width = widthPx;
    element.style.height = heightPx;
    element.style.maxWidth = `${maxWidth}px`;
    element.style.maxHeight = `${maxHeight}px`;
    element.style.minWidth = '200px';
    element.style.minHeight = '150px';
  }
}; 