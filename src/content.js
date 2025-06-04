import AliveMemo from './AliveMemo.svelte';

// 전역 변수 선언
let aliveMemoDocument = null; // AliveMemo 컴포넌트 인스턴스
let isDragging = false; // 드래깅 상태
let dragStart = false; // 드래그 시작 상태

let left = 0; // 모달의 x 좌표
let top = 0; // 모달의 y 좌표
let isLeftPosition = false; // 왼쪽 위치 여부

let container; // 컨테이너를 초기화 함수에서 생성하도록 변경

/**
 * 확장 프로그램의 컨테이너 DOM 요소를 생성합니다.
 * 중복 생성을 방지하고 DOM 준비 상태를 확인합니다.
 */
const createContainer = () => {
  if (container) {
    return; // 이미 생성되었으면 중복 생성 방지
  }

  // 컨테이너 요소 생성 및 스타일 설정
  container = document.createElement('div');
  container.id = 'my-svelte-extension-root';
  container.style.position = 'fixed';
  container.style.top = '10px';
  container.style.left = '0px';
  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = '5px';
  container.style.background = '#ffffff';
  container.style.padding = '2px';
  container.style.zIndex = '9999';
  
  // DOM에 추가하기 전에 body가 존재하는지 확인
  if (document.body) {
    document.body.appendChild(container);
  } else {
    // body가 아직 없으면 DOMContentLoaded를 기다림
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body && !document.body.contains(container)) {
        document.body.appendChild(container);
      }
    });
  }
};

/**
 * 모달이 열렸을 때의 스타일을 적용합니다.
 */
const openModalStyle = () => {
  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = '5px';
  container.style.background = '#ffffff';
  container.style.removeProperty('borderLeft');
  container.style.removeProperty('borderRight');
}

/**
 * 모달을 드래그할 때의 스타일을 적용합니다.
 */
const moveStyle = () => {
  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = '5px';
  container.style.background = '#fffae3';
  container.style.removeProperty('borderLeft');
  container.style.removeProperty('borderRight');
}

/**
 * 모달이 고정되었을 때의 스타일을 적용합니다.
 * 위치에 따라 반원형 스타일을 적용합니다.
 */
const fixStyle = () => {
  if (aliveMemoDocument?.isOpenPanelFlag) {
    return; // 패널이 열려있으면 스타일 변경 안함
  }

  // 현재 컨테이너 위치 확인
  if (container) {
    const rect = container.getBoundingClientRect();
    
    // 현재 위치를 전역 변수에 저장
    left = rect.left;
    top = rect.top;
    
    // 화면 경계를 벗어나지 않도록 보정
    const modalMinWidth = 165;
    top = Math.max(10, Math.min(top, window.innerHeight - rect.height - 20));
    left = Math.max(0, Math.min(left, window.innerWidth - modalMinWidth));
  }

  // 왼쪽/오른쪽 위치 결정 (현재 위치 기준)
  const screenCenter = document.documentElement.clientWidth / 2;
  isLeftPosition = left < screenCenter;

  // 가장자리로 이동 (left만 조정, top은 현재 위치 유지)
  const modalMinWidth = 165;
  if (isLeftPosition) {
    left = 0; // 왼쪽 가장자리
  } else {
    left = document.documentElement.clientWidth - modalMinWidth; // 오른쪽 가장자리
  }

  // 최종 위치 적용
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;

  // 스타일 적용
  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = isLeftPosition ? '0px 9999px 9999px 0px' : '9999px 0px 0px 9999px';
  container.style.background = '#fffae3';
  
  // 위치에 따른 테두리 제거
  if (isLeftPosition) {
    container.style.borderLeft = 'none';
    container.style.removeProperty('borderRight');
  } else {
    container.style.borderRight = 'none';
    container.style.removeProperty('borderLeft');
  }

  // AliveMemo 컴포넌트에 위치 정보 전달
  if (!!aliveMemoDocument) aliveMemoDocument.isLeftPosition = isLeftPosition;
}

/**
 * 초기 모달 위치를 설정합니다 (modalPosition 기반)
 * @param {string} position - 위치 코드 ('TL', 'TR', 'BL', 'BR')
 */
const setInitialModalPosition = (position) => {
  const rect = container.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const safeMargin = 10;

  // 위치 코드에 따른 좌표 설정
  if (position === 'TR') {
    // 위 + 오른쪽
    top = safeMargin;
    left = Math.max(safeMargin, viewportWidth - rect.width - safeMargin);
  } else if (position === 'BR') {
    // 아래 + 오른쪽
    top = Math.max(safeMargin, viewportHeight - rect.height - safeMargin);
    left = Math.max(safeMargin, viewportWidth - rect.width - safeMargin);
  } else if (position === 'BL') {
    // 아래 + 왼쪽
    top = Math.max(safeMargin, viewportHeight - rect.height - safeMargin);
    left = safeMargin;
  } else {
    // 위 + 왼쪽 (기본값)
    top = safeMargin;
    left = safeMargin;
  }

  // 최종 경계 체크
  left = Math.max(safeMargin, Math.min(left, viewportWidth - rect.width - safeMargin));
  top = Math.max(safeMargin, Math.min(top, viewportHeight - rect.height - safeMargin));

  // 계산된 위치를 DOM에 적용
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
  
  console.log('Initial modal position set:', position, '→', left, top);
};

/**
 * 지정된 위치에 따라 모달의 위치를 설정합니다.
 * @param {string} position - 위치 코드 ('TL', 'TR', 'BL', 'BR')
 */
const applyMemoPosition = (position) => {
  // 현재 컨테이너의 크기 정보 가져오기
  const rect = container.getBoundingClientRect();

  // 화면 경계를 벗어나지 않도록 위치 조정
  left = left < 0 ? 0 : left;
  left = left < document.documentElement.clientWidth - rect.width ? left : document.documentElement.clientWidth - rect.width;

  top = top < 0 ? 0 : top;
  top = top < document.documentElement.clientHeight - rect.height ? top : document.documentElement.clientHeight - rect.height;

  // 초기 위치 설정 (position 기반)
  setInitialModalPosition(position);
}

/**
 * chrome.runtime에서 메모 모달 위치 정보를 가져와 적용합니다.
 */
const getMemoModalPosition = () => {
  chrome.runtime.sendMessage({ type: "getMemoPosition" }, (response) => {
    if (!!!container) {
      return; // 컨테이너가 없으면 종료
    }
    
    // 응답받은 위치 정보로 모달 위치 적용
    applyMemoPosition(response?.position?.memoPosition);
    fixStyle();
  });
}

// chrome.runtime 메시지 리스너 등록
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (chrome.runtime.lastError) {
    // 수신자가 없을 때의 에러 처리
    console.warn('No receiving end:', chrome.runtime.lastError.message);
    return;
  }

  // 메모 저장 메시지 처리
  if (msg.type === "memoSaved") {
    showMemo(msg.text ?? '', msg.position);
    sendResponse({ result: 'ok' }); // 응답 보내기
    return true; // 비동기 응답 시 필요
  }

  // 위치 변경 메시지 처리
  if (msg.type === "positionChanged") {
    changePosition(msg.text ?? '', msg.position).then(() => {
      sendResponse({ result: 'ok' }); // 응답 보내기
    }).catch((error) => {
      console.error('Error in changePosition:', error);
      sendResponse({ result: 'error' }); // 에러 응답
    });
    return true; // 비동기 응답 시 필요
  }
});

/**
 * 웹페이지에 메모를 표시합니다.
 * @param {string} text - 표시할 메모 텍스트
 * @param {string} position - 모달 위치
 */
const showMemo = (text, position) => {
  // 브라우저에 띄운 메모 있는지 확인
  if (!!aliveMemoDocument) {
    // 이미 있으면 텍스트만 업데이트
    aliveMemoDocument.todayMemoInput = text;
    // aliveMemoDocument.modalPosition = position;
    return;
  } else {
    // 새로운 AliveMemo 컴포넌트 생성
    aliveMemoDocument = new AliveMemo({
      target: container,
      props: {
        isOpenPanelFlag: false,
        todayMemoInput: text,
        modalPosition: position
      }
    });

    // 모달 닫기 이벤트 리스너 등록
    aliveMemoDocument.$on('onCloseMemoModal', (event) => {
      container.style.border = '0px';
      container.style.background = 'transparent';
    
      aliveMemoDocument.$destroy();
      aliveMemoDocument = null;
    })
  }

  // 위치 적용 및 스타일 설정
  applyMemoPosition(position);
  fixStyle();
}

/**
 * 모달 위치를 변경하고 패널을 엽니다.
 * @param {string} text - 표시할 메모 텍스트
 * @param {string} position - 새로운 모달 위치
 */
const changePosition = async (text, position) => {
  // 브라우저에 띄운 메모 있는지 확인
  if (!!aliveMemoDocument) {
    // 이미 있으면 데이터 업데이트하고 패널 열기
    aliveMemoDocument.todayMemoInput = text;
    aliveMemoDocument.modalPosition = position;
    aliveMemoDocument.isOpenPanelFlag = true;
  } else {
    // 새로운 AliveMemo 컴포넌트 생성 (패널 열린 상태로)
    aliveMemoDocument = new AliveMemo({
      target: container,
      props: {
        isOpenPanelFlag: true,
        todayMemoInput: text,
        modalPosition: position
      }
    });

    // 모달 닫기 이벤트 리스너 등록
    aliveMemoDocument.$on('onCloseMemoModal', (event) => {
      container.style.border = '0px';
      container.style.background = 'transparent';
    
      aliveMemoDocument.$destroy();
      aliveMemoDocument = null;
    })
  }

  // 초기 위치 설정
  applyMemoPosition(position);
  
  // 저장된 크기 불러와서 적용
  chrome.runtime.sendMessage({ type: "getMemoSize" }, async (sizeResponse) => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to get saved size for position change:', chrome.runtime.lastError);
      openModalStyle();
      return;
    }
    
    const savedSize = sizeResponse?.size;
    if (savedSize && savedSize.width && savedSize.height) {
      console.log('Position changed, applying saved size:', savedSize.width, 'x', savedSize.height);
      
      // 통합된 크기 및 위치 적용
      await applySavedSizeAndPosition(savedSize);
      openModalStyle();
    } else {
      console.log('No saved size found for position change');
      openModalStyle();
    }
  });
}

/**
 * 마우스 업 이벤트를 처리합니다.
 * @param {MouseEvent} event - 마우스 이벤트 객체
 */
const onMouseUp = (event) => {
  dragStart = false; // 드래그 시작 상태 해제

  fixStyle(); // 고정 스타일 적용
  
  if (isDragging) return; // 드래깅 중이면 종료

  // 드래깅 상태 해제
  isDragging = false;
  if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;
};

/**
 * 드래그 중에 사용할 기본 위치 계산 (동기적)
 */
const calcBasicPosition = () => {
  if (!container) return;

  // 기본 경계 체크 (기존 로직)
  const rect = container.getBoundingClientRect();

  // 좌우 경계 체크 및 조정
  left = left < 0 ? 0 : left;
  left = left < document.documentElement.clientWidth - rect.width ? left : document.documentElement.clientWidth - rect.width;

  // 상하 경계 체크 및 조정
  top = top < 0 ? 0 : top;
  top = top < document.documentElement.clientHeight - rect.height ? top : document.documentElement.clientHeight - rect.height;

  // 계산된 위치를 DOM에 적용
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
};

/**
 * 마우스 이동 이벤트를 처리합니다.
 * @param {MouseEvent} event - 마우스 이벤트 객체
 */
const onMouseMove = (event) => {
  if (dragStart) {
    // 드래그 시작된 경우 기본 동작 방지
    event.preventDefault();
    event.stopPropagation();

    // 드래깅 상태로 전환
    isDragging = true;
    if (!!aliveMemoDocument) aliveMemoDocument.isDragging = true;
  } else {
    return; // 드래그 시작되지 않았으면 종료
  }

  if (!isDragging) return; // 드래깅 상태가 아니면 종료
  
  // 패널 닫기 및 위치 업데이트
  if (!!aliveMemoDocument) aliveMemoDocument.isOpenPanelFlag = false;
  left += event.movementX; // x축 이동량 적용
  top += event.movementY; // y축 이동량 적용

  moveStyle(); // 이동 중 스타일 적용
  calcBasicPosition(); // 기본 위치 재계산 및 적용 (동기적)
}

/**
 * 마우스가 화면을 벗어났을 때의 이벤트를 처리합니다.
 * @param {MouseEvent} event - 마우스 이벤트 객체
 */
const onMouseLeave = (event) => {
  dragStart = false; // 드래그 시작 상태 해제
  
  if (isDragging) return; // 드래깅 중이면 종료

  // 드래깅 상태 해제
  isDragging = false;
  if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;
}

/**
 * DOM과 확장 프로그램이 완전히 로드될 때까지 기다리는 초기화 함수입니다.
 */
const initializeExtension = () => {
  // 이미 초기화되었으면 중복 실행 방지
  if (aliveMemoDocument) {
    console.log('Extension already initialized');
    return;
  }

  try {
    console.log('Starting extension initialization...');
    
    // 먼저 컨테이너 생성
    createContainer();
    
    // 컨테이너가 실제로 DOM에 추가될 때까지 잠시 기다림
    setTimeout(() => {
      if (!container || !document.body.contains(container)) {
        console.warn('Container not ready, retrying...');
        // 컨테이너가 준비되지 않았으면 재시도
        setTimeout(initializeExtension, 500);
        return;
      }

      console.log('Container ready, creating AliveMemo component...');

      // AliveMemo 컴포넌트 생성
      aliveMemoDocument = new AliveMemo({
        target: container,
        props: {
          isOpenPanelFlag: false,
          todayMemoInput: '',
          isLeftPosition: isLeftPosition
        }
      });

      // 모달 닫기 이벤트 리스너 등록
      aliveMemoDocument.$on('onCloseMemoModal', (event) => {
        console.log('Modal closing...');
        container.style.border = '0px';
        container.style.background = 'transparent';

        aliveMemoDocument.$destroy();
        aliveMemoDocument = null;
      });

      console.log('AliveMemo component created successfully');

      // 초기화 완료 후 위치 설정
      getMemoModalPosition();
      
      // 이벤트 리스너들을 초기화 완료 후에 추가
      setupEventListeners();
      
      // 초기화 완료 후 저장된 메모 불러와서 표시
      setTimeout(() => {
        loadAndShowSavedMemo();
      }, 200);
      
      console.log('Extension initialization completed');
    }, 50);
  } catch (error) {
    console.error('Failed to initialize extension:', error);
    // 실패 시 재시도
    setTimeout(initializeExtension, 1000);
  }
};

/**
 * 저장된 메모를 불러와서 모달에 표시합니다.
 */
const loadAndShowSavedMemo = () => {
  if (!aliveMemoDocument) {
    console.warn('AliveMemo component not ready');
    return;
  }
  
  const todayDate = new Date().toISOString().slice(0, 10);
  
  chrome.runtime.sendMessage({ type: "getTodayMemo" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('Failed to get today memo:', chrome.runtime.lastError);
      return;
    }
    
    const todayMemo = response?.text[todayDate] ?? '';
    console.log('Loaded today memo:', todayMemo.length > 0 ? 'Found memo' : 'No memo');
    
    if (aliveMemoDocument) {
      aliveMemoDocument.todayMemoInput = todayMemo;
      
      // 메모가 있으면 모달이 보이도록 설정
      if (todayMemo.length > 0) {
        console.log('Showing modal with saved memo');
        fixStyle(); // 고정 스타일 적용
      }
    }
  });
};

/**
 * 컨테이너에 이벤트 리스너를 설정합니다.
 */
const setupEventListeners = () => {
  if (!container) {
    return; // 컨테이너가 없으면 종료
  }

  // 클릭 이벤트 리스너
  container.addEventListener('click', (event) => {
    /**
     * 오늘의 메모를 가져와서 패널 토글을 처리합니다.
     */
    const getTodayMemo = () => {
      // 오늘 날짜를 ISO 형식으로 생성
      const todayDate = new Date().toISOString().slice(0, 10);
    
      chrome.runtime.sendMessage({ type: "getTodayMemo" }, (response) => {
        // 패널 상태 토글
        if (!!aliveMemoDocument) aliveMemoDocument.isOpenPanelFlag = !aliveMemoDocument.isOpenPanelFlag;
        // 오늘의 메모 데이터 설정
        if (!!aliveMemoDocument) aliveMemoDocument.todayMemoInput = response?.text[todayDate] ?? '';

        // 패널이 열리는 경우 저장된 크기도 적용
        if (aliveMemoDocument?.isOpenPanelFlag) {
          console.log('Panel opening, applying saved size...');
          
          // 저장된 크기 불러오기
          chrome.runtime.sendMessage({ type: "getMemoSize" }, async (sizeResponse) => {
            if (chrome.runtime.lastError) {
              console.warn('Failed to get saved size:', chrome.runtime.lastError);
              calcBasicPosition();
              openModalStyle();
              return;
            }
            
            const savedSize = sizeResponse?.size;
            if (savedSize && savedSize.width && savedSize.height) {
              console.log('Panel opening with saved size:', savedSize.width, 'x', savedSize.height);
              
              // 통합된 크기 및 위치 적용
              await applySavedSizeAndPosition(savedSize);
              openModalStyle();
            } else {
              console.log('No saved size found for opened panel');
              calcBasicPosition();
              openModalStyle();
            }
          });
        } else {
          fixStyle();
        }
      });
    }

    if (isDragging) {
      // 드래깅 중이면 드래깅 상태만 해제하고 클릭 무시
      isDragging = false;
      if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;
      return;
    };

    // 리사이즈 완료 직후인지 확인 (AliveMemo 컴포넌트에서 접근)
    if (!!aliveMemoDocument && aliveMemoDocument.isResizeJustCompleted) {
      return; // 리사이즈 완료 직후면 클릭 무시
    }

    // 메모 가져오기 및 패널 토글 실행
    getTodayMemo();
  });

  // 마우스 다운 이벤트 리스너 (드래그 시작)
  container.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();

    // 드래그 상태 초기화
    dragStart = true;
    isDragging = false;
    if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;

    // 문서 레벨에서 마우스 이벤트 리스너 등록
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mouseleave', onMouseLeave)
  });
};

/**
 * 저장된 크기를 고려하여 스마트한 모달 위치를 계산합니다.
 * @param {number} expectedWidth - 예상 너비 (옵션)
 * @param {number} expectedHeight - 예상 높이 (옵션)
 */
const calcSmartModalPosition = async (expectedWidth = null, expectedHeight = null) => {
  if (!container || !aliveMemoDocument) return;

  // 현재 컨테이너의 크기 정보 가져오기
  const rect = container.getBoundingClientRect();
  
  // 예상 크기가 제공되지 않은 경우 현재 크기 또는 저장된 크기 사용
  let targetWidth = expectedWidth || rect.width;
  let targetHeight = expectedHeight || rect.height;
  
  // 저장된 크기 정보가 있으면 사용
  if (!expectedWidth || !expectedHeight) {
    try {
      const savedSizeResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "getMemoSize" }, resolve);
      });
      
      if (savedSizeResponse?.size) {
        targetWidth = expectedWidth || savedSizeResponse.size.width || targetWidth;
        targetHeight = expectedHeight || savedSizeResponse.size.height || targetHeight;
        console.log('Using saved size for position calculation:', targetWidth, 'x', targetHeight);
      }
    } catch (error) {
      console.warn('Failed to get saved size for position calculation:', error);
    }
  }

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const safeMargin = 10; // 안전 여백
  
  // 현재 위치를 기준으로 시작 (그 자리에서 확장)
  let newLeft = rect.left;
  let newTop = rect.top;
  
  console.log('Current position:', newLeft, newTop, 'Target size:', targetWidth, 'x', targetHeight);

  // 오른쪽 경계 체크 및 조정
  const rightOverflow = (newLeft + targetWidth + safeMargin) - viewportWidth;
  if (rightOverflow > 0) {
    newLeft = Math.max(safeMargin, newLeft - rightOverflow);
    console.log('Adjusted left for right overflow:', newLeft);
  }

  // 하단 경계 체크 및 조정
  const bottomOverflow = (newTop + targetHeight + safeMargin) - viewportHeight;
  if (bottomOverflow > 0) {
    newTop = Math.max(safeMargin, newTop - bottomOverflow);
    console.log('Adjusted top for bottom overflow:', newTop);
  }

  // 왼쪽 경계 체크 (혹시 위에서 조정하면서 왼쪽으로 너무 밀린 경우)
  if (newLeft < safeMargin) {
    newLeft = safeMargin;
    console.log('Adjusted left for left boundary:', newLeft);
  }

  // 상단 경계 체크 (혹시 위에서 조정하면서 위로 너무 밀린 경우)
  if (newTop < safeMargin) {
    newTop = safeMargin;
    console.log('Adjusted top for top boundary:', newTop);
  }

  // 최종 위치 업데이트
  left = newLeft;
  top = newTop;

  // 계산된 위치를 DOM에 적용
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
  
  console.log('Smart position applied (in-place expansion):', left, top, 'for size:', targetWidth, 'x', targetHeight);
};

/**
 * 모달의 위치를 계산하고 화면 경계를 벗어나지 않도록 조정합니다.
 * @param {number} expectedWidth - 예상 너비 (옵션)
 * @param {number} expectedHeight - 예상 높이 (옵션)
 */
const calcPositionForPopup = async (expectedWidth = null, expectedHeight = null) => {
  if (!container) return;

  // 크기가 제공된 경우 스마트 계산 사용 (리사이즈/확장 시)
  if (expectedWidth && expectedHeight) {
    await calcSmartModalPosition(expectedWidth, expectedHeight);
    return;
  }

  // 크기가 제공되지 않은 경우 기본 경계 체크만 수행 (드래그 등)
  const rect = container.getBoundingClientRect();

  // 좌우 경계 체크 및 조정
  left = left < 0 ? 0 : left;
  left = left < document.documentElement.clientWidth - rect.width ? left : document.documentElement.clientWidth - rect.width;

  // 상하 경계 체크 및 조정
  top = top < 0 ? 0 : top;
  top = top < document.documentElement.clientHeight - rect.height ? top : document.documentElement.clientHeight - rect.height;

  // 계산된 위치를 DOM에 적용
  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
};

// 전역으로 노출하여 AliveMemo.svelte에서 호출 가능하도록 함
window.calcPositionForPopup = calcPositionForPopup;

/**
 * DOM 로드 상태를 확인하고 초기화를 진행합니다.
 */
const waitForDOMAndInitialize = () => {
  if (document.readyState === 'loading') {
    // DOM이 아직 로딩 중이면 DOMContentLoaded 이벤트를 기다림
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeExtension, 100); // 약간의 지연 추가
    });
  } else {
    // DOM이 이미 로드되었으면 바로 초기화 (하지만 약간의 지연 추가)
    setTimeout(initializeExtension, 100);
  }
};

// 확장 프로그램 런타임이 준비될 때까지 기다린 후 초기화 시작
if (chrome.runtime && chrome.runtime.id) {
  waitForDOMAndInitialize();
} else {
  // 런타임이 준비되지 않았으면 조금 더 기다림
  setTimeout(() => {
    if (chrome.runtime && chrome.runtime.id) {
      waitForDOMAndInitialize();
    }
  }, 500);
}

/**
 * 저장된 크기와 위치를 통합적으로 적용합니다.
 * @param {Object} savedSize - 저장된 크기 정보
 */
const applySavedSizeAndPosition = async (savedSize) => {
  if (!savedSize || !savedSize.width || !savedSize.height) {
    console.log('No saved size to apply');
    calcBasicPosition();
    return;
  }

  console.log('Applying saved size and calculating position:', savedSize.width, 'x', savedSize.height);
  
  // 1. AliveMemo 컴포넌트에 크기 적용 요청 (위치 조정 없이)
  if (aliveMemoDocument && aliveMemoDocument.applySavedSize) {
    // applySavedSize 내부의 위치 조정을 일시적으로 비활성화하기 위해 플래그 설정
    aliveMemoDocument.skipPositionAdjustment = true;
    await aliveMemoDocument.applySavedSize(savedSize.width, savedSize.height);
    
    // 크기 적용 완료 후 위치 조정 실행
    setTimeout(async () => {
      await calcPositionForPopup(savedSize.width, savedSize.height);
      aliveMemoDocument.skipPositionAdjustment = false;
      console.log('Unified size and position application completed');
    }, 50); // 크기 적용이 완전히 완료된 후 위치 조정
  }
};