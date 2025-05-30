import AliveMemo from './AliveMemo.svelte';

let aliveMemoDocument = null;
let isDragging = false;
let dragStart = false;

let left = 0;
let top = 0;
let isLeftPosition = false;

const container = document.createElement('div');
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
container.style.zIndex = '9999'
document.body.appendChild(container);

const openModalStyle = () => {
  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = '5px';
  container.style.background = '#ffffff';
  container.style.removeProperty('borderLeft');
  container.style.removeProperty('borderRight');
}
const moveStyle = () => {
  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = '5px';
  container.style.background = '#fffae3';
  container.style.removeProperty('borderLeft');
  container.style.removeProperty('borderRight');
}

const fixStyle = () => {
  if (aliveMemoDocument?.isOpenPanelFlag) {
    return;
  }

  isLeftPosition = getLeftRightPosition();

  container.style.border = '1px';
  container.style.borderStyle = 'dashed';
  container.style.borderColor = '#000000';
  container.style.borderRadius = isLeftPosition ? '0px 9999px 9999px 0px' : '9999px 0px 0px 9999px';
  container.style.background = '#fffae3';
  if (isLeftPosition) {
    container.style.borderLeft = 'none';
    container.style.removeProperty('borderRight');
  } else {
    container.style.borderRight = 'none';
    container.style.removeProperty('borderLeft');
  }

  if (!!aliveMemoDocument) aliveMemoDocument.isLeftPosition = isLeftPosition;
}

const applyMemoPosition = (position) => {
  const rect = container.getBoundingClientRect();

  left = left < 0 ? 0 : left;
  left = left < document.documentElement.clientWidth - rect.width ? left : document.documentElement.clientWidth - rect.width;

  top = top < 0 ? 0 : top;
  top = top < document.documentElement.clientHeight - rect.height ? top : document.documentElement.clientHeight - rect.height;

  // 위 + 오른쪽
  if (position === 'TR') {
    top = 10;
    left = document.documentElement.clientWidth - rect.width;
  // 아래 + 오른쪽
  } else if (position === 'BR') {
    top = document.documentElement.clientHeight - rect.height - 10;
    left = document.documentElement.clientWidth - rect.width;
  // 아래 + 왼쪽
  } else if (position === 'BL') {
    top = document.documentElement.clientHeight - rect.height - 10;
    left = 0;
  // 위 + 왼쪽
  } else {
    top = 10;
    left = 0;
  }

  calcPositionForPopup();
}

const getMemoModalPosition = () => {
  chrome.runtime.sendMessage({ type: "getMemoPosition" }, (response) => {
    if (!!!container) {
      return;
    }
    
    applyMemoPosition(response?.position?.memoPosition);
    fixStyle();
  });
}

// 예: 웹페이지에 오늘의 메모를 표시
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (chrome.runtime.lastError) {
    // 수신자가 없을 때의 에러 처리
    console.warn('No receiving end:', chrome.runtime.lastError.message);
    return;
  }

  if (msg.type === "memoSaved") {
    showMemo(msg.text ?? '', msg.position);
    sendResponse({ result: 'ok' }); // 응답 보내기
    return true; // 비동기 응답 시 필요
  }

  if (msg.type === "positionChanged") {
    changePosition(msg.text ?? '', msg.position);
    sendResponse({ result: 'ok' }); // 응답 보내기
    return true; // 비동기 응답 시 필요
  }
});

// 웹페이지에 메모 표시 함수 예시
const showMemo = (text, position) => {
  // 브라우저에 띄운 메모 있는지 확인
  if (!!aliveMemoDocument) {
    aliveMemoDocument.todayMemoInput = text;
    // aliveMemoDocument.modalPosition = position;
    return;
  } else {
    aliveMemoDocument = new AliveMemo({
      target: container,
      props: {
        isOpenPanelFlag: false,
        todayMemoInput: text,
        modalPosition: position
      }
    });

    aliveMemoDocument.$on('onCloseMemoModal', (event) => {
      container.style.border = '0px';
      container.style.background = 'transparent';
    
      aliveMemoDocument.$destroy();
      aliveMemoDocument = null;
    })
  }

  applyMemoPosition(position);
  fixStyle();
}

const changePosition = (text, position) => {
  // 브라우저에 띄운 메모 있는지 확인
  if (!!aliveMemoDocument) {
    aliveMemoDocument.todayMemoInput = text;
    aliveMemoDocument.modalPosition = position;
    aliveMemoDocument.isOpenPanelFlag = true;
  } else {
    aliveMemoDocument = new AliveMemo({
      target: container,
      props: {
        isOpenPanelFlag: true,
        todayMemoInput: text,
        modalPosition: position
      }
    });

    aliveMemoDocument.$on('onCloseMemoModal', (event) => {
      container.style.border = '0px';
      container.style.background = 'transparent';
    
      aliveMemoDocument.$destroy();
      aliveMemoDocument = null;
    })
  }

  applyMemoPosition(position);
  openModalStyle();
}

aliveMemoDocument = new AliveMemo({
  target: container,
  props: {
    isOpenPanelFlag: false,
    todayMemoInput: '',
    isLeftPosition: isLeftPosition
  }
});

aliveMemoDocument.$on('onCloseMemoModal', (event) => {
  container.style.border = '0px';
  container.style.background = 'transparent';

  aliveMemoDocument.$destroy();
  aliveMemoDocument = null;
})

const onMouseUp = (event) => {
  dragStart = false;

  fixStyle();
  
  if (isDragging) return;

  isDragging = false;
  if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;
};

const onMouseMove = (event) => {
  if (dragStart) {
    event.preventDefault();
    event.stopPropagation();

    isDragging = true;
    if (!!aliveMemoDocument) aliveMemoDocument.isDragging = true;
  } else {
    return;
  }

  if (!isDragging) return;
  
  if (!!aliveMemoDocument) aliveMemoDocument.isOpenPanelFlag = false;
  left += event.movementX;
  top += event.movementY;

  moveStyle();
  calcPositionForPopup();
}

const onMouseLeave = (event) => {
  dragStart = false;
  
  if (isDragging) return;

  isDragging = false;
  if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;
}

container.addEventListener('click', (event) => {
  const getTodayMemo = () => {
    const todayDate = new Date().toISOString().slice(0, 10);
  
    chrome.runtime.sendMessage({ type: "getTodayMemo" }, (response) => {
      if (!!aliveMemoDocument) aliveMemoDocument.isOpenPanelFlag = !aliveMemoDocument.isOpenPanelFlag;
      if (!!aliveMemoDocument) aliveMemoDocument.todayMemoInput = response?.text[todayDate] ?? '';

      if (aliveMemoDocument?.isOpenPanelFlag) {
        calcPositionForPopup();
        openModalStyle();
      } else {
        fixStyle();
      }
    });
  }

  if (isDragging) {
    isDragging = false;
    if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;
    return;
  };

  getTodayMemo();
});

container.addEventListener('mousedown', (event) => {
  event.preventDefault();
  event.stopPropagation();

  dragStart = true;
  isDragging = false;
  if (!!aliveMemoDocument) aliveMemoDocument.isDragging = false;

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.addEventListener('mouseleave', onMouseLeave)
});

const calcPositionForPopup = () => {
  const rect = container.getBoundingClientRect();

  left = left < 0 ? 0 : left;
  left = left < document.documentElement.clientWidth - rect.width ? left : document.documentElement.clientWidth - rect.width;

  top = top < 0 ? 0 : top;
  top = top < document.documentElement.clientHeight - rect.height ? top : document.documentElement.clientHeight - rect.height;

  container.style.top = `${top}px`;
  container.style.left = `${left}px`;
};

const getLeftRightPosition = () => {
  let isLeft = true;

  isLeft = left < (document.documentElement.clientWidth - 155) / 2 ? true : false;

  left = isLeft ? 0 : document.documentElement.clientWidth - 155;

  container.style.left = `${left}px`;

  return isLeft; 
}

getMemoModalPosition();