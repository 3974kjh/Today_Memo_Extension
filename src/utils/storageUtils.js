/**
 * 메모 모달의 위치 정보를 chrome.runtime에서 가져옵니다.
 * @returns {Promise<string>} 모달 위치 ('TL', 'TR', 'BL', 'BR')
 */
export const getMemoModalPosition = () => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getMemoPosition" }, (response) => {
      // 응답에서 위치 정보 추출, 기본값은 'TL' (Top Left)
      const position = response?.position?.memoPosition ?? 'TL';
      resolve(position);
    });
  });
};

/**
 * 메모 모달의 위치 정보를 chrome.runtime에 저장합니다.
 * @param {string} position - 저장할 위치 정보 ('TL', 'TR', 'BL', 'BR')
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveMemoModalPosition = (position) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "saveMemoPosition", position: position }, (response) => {
      const success = response?.status === "ok";
      resolve(success);
    });
  });
};

/**
 * 메모 모달의 크기 정보를 chrome.storage에 저장합니다.
 * @param {number} width - 저장할 너비
 * @param {number} height - 저장할 높이
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveMemoModalSize = (width, height) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ 
      type: "saveMemoSize", 
      size: { width: width, height: height }
    }, (response) => {
      const success = response?.status === "ok";
      resolve(success);
    });
  });
};

/**
 * 메모 모달의 크기 정보를 chrome.storage에서 가져옵니다.
 * @returns {Promise<{width: number, height: number} | null>} 크기 정보 또는 null
 */
export const getMemoModalSize = () => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getMemoSize" }, (response) => {
      const savedSize = response?.size;
      if (savedSize && savedSize.width && savedSize.height) {
        resolve({
          width: savedSize.width,
          height: savedSize.height
        });
      } else {
        resolve(null); // 저장된 크기가 없으면 null 반환
      }
    });
  });
};

/**
 * 오늘 날짜의 메모 데이터를 chrome.runtime에서 가져옵니다.
 * @returns {Promise<string>} 오늘의 메모 텍스트
 */
export const getTodayMemo = () => {
  return new Promise((resolve) => {
    // 오늘 날짜를 ISO 형식으로 생성 (YYYY-MM-DD)
    const todayDate = new Date().toISOString().slice(0, 10);

    chrome.runtime.sendMessage({ type: "getTodayMemo" }, (response) => {
      // 오늘 날짜에 해당하는 메모가 있으면 설정, 없으면 빈 문자열
      const memoText = response?.text[todayDate] ?? '';
      resolve(memoText);
    });
  });
};

/**
 * 전체 메모 정보를 chrome.runtime에서 가져옵니다.
 * @returns {Promise<Object>} 전체 메모 정보 객체
 */
export const getTotalMemo = () => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getTotalMemoInfo" }, (response) => {
      // 전체 메모 정보가 있는지 확인하고 파싱
      const totalMemoInfo = (!!response?.info?.totalMemoInfo && Object.keys(response?.info?.totalMemoInfo).length > 0) ? 
        // 문자열인 경우 JSON 파싱, 객체인 경우 그대로 사용
        (typeof response?.info?.totalMemoInfo === 'string' ? JSON.parse(response.info.totalMemoInfo) : response.info.totalMemoInfo) : 
        {};
      resolve(totalMemoInfo);
    });
  });
};

/**
 * 메모를 chrome.runtime에 저장합니다.
 * @param {string} memoText - 저장할 메모 텍스트
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveMemo = (memoText) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "saveMemo", text: memoText }, (response) => {
      const success = response?.status === "ok";
      resolve(success);
    });
  });
};

/**
 * 전체 메모 정보를 chrome.runtime에 저장합니다.
 * @param {Object} totalMemoInfo - 저장할 전체 메모 정보
 * @returns {Promise<boolean>} 저장 성공 여부
 */
export const saveTotalMemo = (totalMemoInfo) => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "updateTotalMemo", info: JSON.stringify(totalMemoInfo) }, (response) => {
      const success = response?.status === "ok";
      resolve(success);
    });
  });
}; 