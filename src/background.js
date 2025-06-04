chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (chrome.runtime.lastError) {
    // 수신자가 없을 때의 에러 처리
    console.warn('No receiving end:', chrome.runtime.lastError.message);
    return;
  }

  // 팝업에서 온 메모 저장 요청
  if (request.type === "saveMemo") {
    let todayDate = new Date().toISOString().slice(0, 10);

    console.log('saveMemo', todayDate);

    chrome.storage.local.set({ [todayDate]: request.text }, () => {
      chrome.storage.local.get('memoPosition', (positionResult) => {
        // 저장 후 content script에 알림
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
          for (let tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { type: "memoSaved", text: request.text, position: positionResult.memoPosition },
            function(response) {
              if (chrome.runtime.lastError) {
                // 수신자가 없을 때 에러 처리
                console.warn('No receiving end:', chrome.runtime.lastError.message);
              } else {
                // 정상 응답 처리
                console.log('Response from content:', response);
              }
            }
          )};
        });
      });
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // 팝업에서 온 전체 메모 정보 업데이트 요청
  if (request.type === "updateTotalMemo") {
    chrome.storage.local.set({ 'totalMemoInfo': request.info }, () => {
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // 팝업에서 온 메모 불러오기 요청
  if (request.type === "getTotalMemoInfo") {
    chrome.storage.local.get('totalMemoInfo', (result) => {
      sendResponse({ info: result });
    });
    return true;
  }

  // 오늘 저장한 메모 불러오기 요청
  if (request.type === "getTodayMemo") {
    let todayDate = new Date().toISOString().slice(0, 10);

    console.log('getTodayMemo', todayDate);

    chrome.storage.local.get([todayDate], (result) => {
      sendResponse({ text: result });
    });
    return true;
  }

  // 브라우저에 메모모달 오픈 요청
  if (request.type === "openBrowserMemoModal") {
    let todayDate = new Date().toISOString().slice(0, 10);
    chrome.storage.local.get([todayDate], (result) => {
      // 저장 후 content script에 알림
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        for (let tab of tabs) {
          chrome.tabs.sendMessage(tab.id, { type: "positionChanged", text: result[todayDate], position: request.position },
          function(response) {
            if (chrome.runtime.lastError) {
              // 수신자가 없을 때 에러 처리
              console.warn('No receiving end:', chrome.runtime.lastError.message);
            } else {
              // 정상 응답 처리
              console.log('Response from content:', response);
            }
          }
        )};
      });
      sendResponse({ isOpen: true });
    });
    return true;
  }

  // 브라우저 메모 표시 위치 정보 저장
  if (request.type === "saveMemoPosition") {
    chrome.storage.local.set({ 'memoPosition': request.position }, () => {
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // 팝업에서 온 메모 불러오기 요청
  if (request.type === "getMemoPosition") {
    chrome.storage.local.get('memoPosition', (result) => {
      sendResponse({ position: result });
    });
    return true;
  }

  if (request.type === "reSettingChromeLocalStorage") {
    chrome.storage.local.get(null, (items) => {
      let todayDate = new Date().toISOString().slice(0, 10);

      console.log('reSettingChromeLocalStorage', todayDate);

      const keys = Object.keys(items);
      const dateKeys = keys.filter((key) => (todayDate !== key && key.includes('-')));

      if (dateKeys.length < 1) {
        sendResponse({ status: "ok" });
      }

      chrome.storage.local.remove(dateKeys, () => {
        sendResponse({ status: "ok" });
      });
    });
    return true;
  }

  // 메모 모달 크기 정보 저장
  if (request.type === "saveMemoSize") {
    chrome.storage.local.set({ 'memoSize': request.size }, () => {
      sendResponse({ status: "ok" });
    });
    return true;
  }

  // 메모 모달 크기 정보 불러오기
  if (request.type === "getMemoSize") {
    chrome.storage.local.get('memoSize', (result) => {
      sendResponse({ size: result.memoSize });
    });
    return true;
  }
});