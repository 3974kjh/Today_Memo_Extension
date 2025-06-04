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

  // 위치 코드에 따른 좌표 설정
  if (position === 'TR') {
    // 위 + 오른쪽
    top = 10;
    left = document.documentElement.clientWidth - rect.width;
  } else if (position === 'BR') {
    // 아래 + 오른쪽
    top = document.documentElement.clientHeight - rect.height - 10;
    left = document.documentElement.clientWidth - rect.width;
  } else if (position === 'BL') {
    // 아래 + 왼쪽
    top = document.documentElement.clientHeight - rect.height - 10;
    left = 0;
  } else {
    // 위 + 왼쪽 (기본값)
    top = 10;
    left = 0;
  }

  // 계산된 위치 적용
  calcPositionForPopup();
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
    changePosition(msg.text ?? '', msg.position);
    sendResponse({ result: 'ok' }); // 응답 보내기
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
const changePosition = (text, position) => {
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

  // 위치 적용 및 열린 모달 스타일 설정
  applyMemoPosition(position);
  openModalStyle();
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
  calcPositionForPopup(); // 위치 재계산 및 적용
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
          chrome.runtime.sendMessage({ type: "getMemoSize" }, (sizeResponse) => {
            if (chrome.runtime.lastError) {
              console.warn('Failed to get saved size:', chrome.runtime.lastError);
              calcPositionForPopup();
              openModalStyle();
              return;
            }
            
            const savedSize = sizeResponse?.size;
            if (savedSize && savedSize.width && savedSize.height) {
              console.log('Applying saved size to opened panel:', savedSize.width, 'x', savedSize.height);
              
              // AliveMemo 컴포넌트에 저장된 크기 적용 요청
              if (aliveMemoDocument && aliveMemoDocument.applySavedSize) {
                aliveMemoDocument.applySavedSize(savedSize.width, savedSize.height);
              }
            } else {
              console.log('No saved size found for opened panel');
            }
            
            calcPositionForPopup();
            openModalStyle();
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
 * 모달의 위치를 계산하고 화면 경계를 벗어나지 않도록 조정합니다.
 */
const calcPositionForPopup = () => {
  // 현재 컨테이너의 크기 정보 가져오기
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
 * AliveMemo 컴포넌트에서 모달 위치 변경 시 호출되는 함수
 * @param {number} newLeft - 새로운 left 위치
 * @param {number} newTop - 새로운 top 위치
 */
window.updateModalPosition = (newLeft, newTop) => {
  left = newLeft;
  top = newTop;
};

/**
 * 리사이즈 중이 아닐 때만 위치를 업데이트합니다.
 */
const updatePosition = () => {
  // 리사이즈 중이면 위치 업데이트 건너뛰기
  if (aliveMemoDocument && aliveMemoDocument.isResizing) {
    return;
  }
  
  // 현재 DOM에서 실제 위치 가져오기
  const rect = container.getBoundingClientRect();
  top = rect.top;
  left = rect.left;
  
  calcPositionForPopup();
};

/**
 * 현재 위치를 기준으로 왼쪽/오른쪽 위치를 결정하고 적용합니다.
 * @returns {boolean} 왼쪽 위치이면 true, 오른쪽 위치이면 false
 */
const getLeftRightPosition = () => {
  const modalMinWidth = 165;
  const screenCenter = document.documentElement.clientWidth / 2;
  
  // 현재 위치가 화면 중앙보다 왼쪽에 있는지 확인
  const isLeft = left < screenCenter;
  
  // 가장자리로 이동
  left = isLeft ? 0 : document.documentElement.clientWidth - modalMinWidth;
  
  // 경계 확인
  left = Math.max(0, Math.min(left, document.documentElement.clientWidth - modalMinWidth));
  
  // 위치 적용
  container.style.left = `${left}px`;
  
  return isLeft; 
}

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