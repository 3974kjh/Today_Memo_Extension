/**
 * 값이 비어있는지 확인합니다.
 * @param {any} val - 확인할 값
 * @returns {boolean} 비어있으면 true, 아니면 false
 */
export const isEmptyValue = (val) => {
  // null, undefined, 빈 문자열 체크
  if (val == null || val === "") return true;

  // 빈 객체 체크
  if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true;

  return false;
};

/**
 * 전체 메모 정보에서 빈 메모를 제거하여 정리합니다.
 * @param {Object} data - 정리할 메모 데이터 객체
 * @returns {Object} 빈 메모가 제거된 정리된 데이터 객체
 */
export const cleanTotalMemoInfo = (data) => {
  // data가 null/undefined/빈 문자열/빈 객체면 빈 객체 반환
  if (!data || (typeof data === "object" && Object.keys(data).length === 0)) return {};

  // 비어있지 않은 메모만 필터링하여 반환
  return Object.fromEntries(
    Object.entries(data)
      .filter(
        ([_, obj]) =>
          obj &&
          typeof obj === "object" &&
          !isEmptyValue(obj.memo)
      )
  );
};

/**
 * 지정된 시간만큼 지연시키는 Promise를 반환합니다.
 * @param {number} delayMille - 지연 시간 (밀리초)
 * @returns {Promise<boolean>} 지연 Promise
 */
export const delayPromise = (delayMille) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, delayMille);
  });
};

/**
 * 현재 모달 위치를 기준으로 브라우저 경계까지의 최대 크기를 계산합니다.
 * @returns {Object} maxWidth와 maxHeight를 포함한 객체
 */
export const getMaxDimensions = () => {
  // 메모 확장 프로그램 컨테이너 요소 찾기
  const container = document.getElementById('chrome-memo-extension');
  if (!container) {
    // 컨테이너가 없으면 기본 여유 공간 반환
    return { maxWidth: window.innerWidth - 40, maxHeight: window.innerHeight - 120 };
  }
  
  // 현재 컨테이너의 위치 정보 가져오기
  const rect = container.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // 모달 현재 위치에서 브라우저 경계까지의 여유 공간 계산
  const rightSpace = viewportWidth - rect.left - 20; // 오른쪽 여유공간
  const bottomSpace = viewportHeight - rect.top - 80; // 아래쪽 여유공간 (헤더 고려)
  
  return {
    maxWidth: Math.max(300, rightSpace), // 최소 300px 보장
    maxHeight: Math.max(250, bottomSpace) // 최소 250px 보장
  };
};

/**
 * 메모 텍스트를 클립보드에 복사합니다.
 * @param {string} memoText - 복사할 메모 텍스트
 * @returns {Promise<boolean>} 복사 성공 여부
 */
export const copyToClipboard = async (memoText) => {
  try {
    await navigator.clipboard.writeText(memoText);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * 디바운스 함수를 생성합니다.
 * @param {Function} func - 디바운스할 함수
 * @param {number} delay - 지연 시간 (밀리초)
 * @returns {Function} 디바운스된 함수
 */
export const createDebounce = (func, delay) => {
  let timeoutId;
  
  return function debounced(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}; 