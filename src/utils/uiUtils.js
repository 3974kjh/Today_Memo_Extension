import { delayPromise, copyToClipboard } from './commonUtils.js';
import { saveMemo, saveTotalMemo } from './storageUtils.js';

/**
 * 메시지 표시 상태를 관리하는 클래스
 */
export class MessageManager {
  constructor() {
    this.isShowSaveText = false;
    this.successMsg = '';
    this.callbacks = new Map();
  }

  /**
   * 콜백 함수를 등록합니다.
   * @param {string} event - 이벤트 이름
   * @param {Function} callback - 콜백 함수
   */
  on(event, callback) {
    this.callbacks.set(event, callback);
  }

  /**
   * 상태 변경을 알립니다.
   * @param {string} event - 이벤트 이름
   * @param {any} data - 전달할 데이터
   */
  emit(event, data) {
    const callback = this.callbacks.get(event);
    if (callback) {
      callback(data);
    }
  }

  /**
   * 성공 메시지를 표시합니다.
   * @param {string} message - 표시할 메시지
   */
  async showSuccessMessage(message) {
    this.successMsg = message;
    this.isShowSaveText = true;
    this.emit('messageChanged', { isShow: true, message });

    // 1초 후 메시지 숨김
    await delayPromise(1000);

    this.isShowSaveText = false;
    this.emit('messageChanged', { isShow: false, message: '' });
  }
}

/**
 * 메모 텍스트를 클립보드에 복사하고 성공 메시지를 표시합니다.
 * @param {string} memoText - 복사할 메모 텍스트
 * @param {MessageManager} messageManager - 메시지 매니저 인스턴스
 */
export const copyMemoText = async (memoText, messageManager) => {
  const success = await copyToClipboard(memoText);
  
  if (success) {
    await messageManager.showSuccessMessage('copy success');
  } else {
    await messageManager.showSuccessMessage('copy failed');
  }
};

/**
 * 입력 이벤트를 디바운싱하여 자동 저장을 처리합니다.
 * @param {Event} event - input 이벤트 객체
 * @param {Function} saveCallback - 저장 콜백 함수
 * @param {Object} debounceState - 디바운스 상태 객체
 */
export const debounceHandleInput = (event, saveCallback, debounceState) => {
  // 현재 입력값 저장
  const debouncedInput = event.target.value;

  // 이전 타이머가 있으면 취소
  if (debounceState.timer) {
    clearTimeout(debounceState.timer);
  }
  
  // 1초 후 저장 실행
  debounceState.timer = setTimeout(() => {
    saveCallback(debouncedInput);
  }, 1000); // 1000ms 지연
};

/**
 * 메모 저장을 처리합니다.
 * @param {string} todayMemoText - 저장할 메모 텍스트
 * @param {Object} totalMemoInfo - 전체 메모 정보
 * @param {Function} saveMemoModalPosition - 위치 저장 함수
 * @param {Function} saveMemoModalSize - 크기 저장 함수
 * @param {Function} cleanTotalMemoInfo - 메모 정리 함수
 * @param {MessageManager} messageManager - 메시지 매니저
 * @param {Object} modalInfo - 모달 정보 (position, width, height)
 * @returns {Promise<Object>} 정리된 전체 메모 정보
 */
export const saveMemosWithMessage = async (
  todayMemoText,
  totalMemoInfo,
  saveMemoModalPosition,
  saveMemoModalSize,
  cleanTotalMemoInfo,
  messageManager,
  modalInfo
) => {
  // 오늘 날짜를 ISO 형식으로 생성
  const todayDate = new Date().toISOString().slice(0, 10);

  // 모달 위치 정보 저장
  await saveMemoModalPosition(modalInfo.position);
  
  // 현재 크기 정보 저장
  await saveMemoModalSize(modalInfo.width, modalInfo.height);

  // 오늘의 메모 저장
  await saveMemo(todayMemoText);

  // 전체 메모 정보 업데이트
  const updatedTotalMemoInfo = {
    ...totalMemoInfo,
    [todayDate]: {
      memo: todayMemoText
    }
  };

  // 빈 메모 제거 후 정리
  const cleanedMemoInfo = cleanTotalMemoInfo(updatedTotalMemoInfo);

  // 전체 메모 정보 저장
  await saveTotalMemo(cleanedMemoInfo);

  // 성공 메시지 표시
  await messageManager.showSuccessMessage('save success');

  return cleanedMemoInfo;
};

/**
 * 이벤트 전파를 강력하게 차단합니다.
 * @param {Event} event - 차단할 이벤트
 */
export const preventEventPropagation = (event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // 추가적인 이벤트 차단
    if (event.nativeEvent) {
      event.nativeEvent.preventDefault();
      event.nativeEvent.stopPropagation();
      event.nativeEvent.stopImmediatePropagation();
    }
  }
};

/**
 * DOM 요소가 완전히 렌더링될 때까지 기다립니다.
 * @param {string} elementId - 기다릴 요소의 ID
 * @param {number} maxAttempts - 최대 시도 횟수
 * @param {number} delay - 각 시도 간의 지연 시간 (밀리초)
 * @returns {Promise<HTMLElement|null>} 찾은 요소 또는 null
 */
export const waitForElement = async (elementId, maxAttempts = 20, delay = 100) => {
  for (let i = 0; i < maxAttempts; i++) {
    const element = document.getElementById(elementId);
    if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
      return element;
    }
    await delayPromise(delay);
  }
  return null;
}; 