<script>
  import { onMount, createEventDispatcher, tick, onDestroy } from 'svelte';
  
  // Utility imports
  import { parseMarkdown } from './utils/markdownUtils.js';
  import { 
    getMemoModalPosition, 
    saveMemoModalPosition, 
    saveMemoModalSize, 
    getMemoModalSize,
    getTodayMemo,
    getTotalMemo
  } from './utils/storageUtils.js';
  import { 
    cleanTotalMemoInfo, 
    getMaxDimensions 
  } from './utils/commonUtils.js';
  import { ResizeManager, applySizeToElement } from './utils/resizeUtils.js';
  import { 
    MessageManager, 
    copyMemoText, 
    debounceHandleInput, 
    saveMemosWithMessage, 
    preventEventPropagation
  } from './utils/uiUtils.js';

  // Export props
  export let isDragging = false;
  export let isOpenPanelFlag = false;
  export let todayMemoInput = '';
  export let modalPosition = 'TL';
  export let isLeftPosition = false;
  export let isResizeJustCompleted = false; // 리사이즈 완료 직후 플래그 (외부 접근용)
  export let isResizing = false; // 리사이즈 중 플래그 (외부 접근용)
  export let skipPositionAdjustment = false; // 위치 조정 스킵 플래그 (content.js에서 설정)

  const dispatch = createEventDispatcher();

  // UI state variables
  let isShowCloseButton = false;
  let totalMemoInfo = {};
  let isPreviewMode = false;
  let isShowMarkdownHelp = false;
  let toggleDebounceTimer;
  let dragEndTimer; // 드래그 종료 후 호버 감지를 위한 타이머

  // Size related variables
  let textareaWidth = '300px';
  let textareaHeight = '250px';
  let textareaElement;
  let initialTextareaWidth = 300; // 초기 크기 저장 (리사이즈 제한용)
  let initialTextareaHeight = 250;
  let maxTextareaWidth = 800;
  let maxTextareaHeight = 600;

  // Observer variables
  let resizeObserver;
  let mutationObserver;

  // Utility instances
  const resizeManager = new ResizeManager();
  const messageManager = new MessageManager();
  const debounceState = { timer: null };

  // 반응형 최대 크기 계산
  $: dynamicMaxDimensions = getMaxDimensions();
  $: maxTextareaWidth = dynamicMaxDimensions.maxWidth;
  $: maxTextareaHeight = dynamicMaxDimensions.maxHeight;
  $: isResizing = resizeManager.isResizing;
  $: isResizeJustCompleted = resizeManager.isResizeJustCompleted;

  // 메시지 상태 반응성
  let isShowSaveText = false;
  let successMsg = '';
  messageManager.on('messageChanged', (data) => {
    isShowSaveText = data.isShow;
    successMsg = data.message;
  });

  /**
   * 프리뷰 모드와 편집 모드 간의 전환을 처리합니다.
   * 이벤트 버블링을 방지하고 크기를 보존하면서 모드를 전환합니다.
   * @param {Event} event - 클릭 이벤트 객체
   */
  const togglePreviewMode = async (event) => {
    // 이벤트 전파 차단 - 모달 닫힘 방지
    preventEventPropagation(event);
    
    // 디바운스: 빠른 연속 클릭 방지
    if (toggleDebounceTimer) {
      clearTimeout(toggleDebounceTimer);
    }
    
    toggleDebounceTimer = setTimeout(async () => {
      // 저장된 크기를 먼저 확인
      const savedSize = await getMemoModalSize();
      
      // 현재 모드에 따라 크기 저장 (모드 전환 전에 미리 계산)
      let nextWidth = textareaWidth;
      let nextHeight = textareaHeight;
      
      if (savedSize) {
        // 저장된 크기가 있으면 항상 그것을 사용
        nextWidth = `${savedSize.width}px`;
        nextHeight = `${savedSize.height}px`;
        console.log('Using saved size for mode toggle:', savedSize.width, 'x', savedSize.height);
      } else {
        // 저장된 크기가 없으면 현재 요소의 크기 사용
        if (isPreviewMode) {
          // 프리뷰 모드에서 편집 모드로 전환 시: 프리뷰 div 크기 저장
          const previewDiv = document.getElementById('markdown-preview-div');
          if (previewDiv && previewDiv.offsetWidth > 0 && previewDiv.offsetHeight > 0) {
            const actualWidth = Math.max(initialTextareaWidth, Math.min(previewDiv.offsetWidth, maxTextareaWidth));
            const actualHeight = Math.max(initialTextareaHeight, Math.min(previewDiv.offsetHeight, maxTextareaHeight));
            
            nextWidth = `${actualWidth}px`;
            nextHeight = `${actualHeight}px`;
          }
        } else {
          // 편집 모드에서 프리뷰 모드로 전환 시: textarea 크기 저장
          const aliveMemoTextAreaDocument = document.getElementById('alive-memo-textarea');
          if (aliveMemoTextAreaDocument && aliveMemoTextAreaDocument.offsetWidth > 0 && aliveMemoTextAreaDocument.offsetHeight > 0) {
            const actualWidth = Math.max(initialTextareaWidth, Math.min(aliveMemoTextAreaDocument.offsetWidth, maxTextareaWidth));
            const actualHeight = Math.max(initialTextareaHeight, Math.min(aliveMemoTextAreaDocument.offsetHeight, maxTextareaHeight));
            
            nextWidth = `${actualWidth}px`;
            nextHeight = `${actualHeight}px`;
          }
        }
      }
      
      // 크기 미리 업데이트 (깜빡임 방지)
      textareaWidth = nextWidth;
      textareaHeight = nextHeight;
      
      // DOM 업데이트를 위한 tick 대기
      await tick();
      
      // 모드 전환
      isPreviewMode = !isPreviewMode;
      
      // 편집 모드로 전환된 경우 확실한 크기 적용
      if (!isPreviewMode) {
        await tick();
        
        // requestAnimationFrame을 사용하여 더 부드러운 전환
        requestAnimationFrame(() => {
          const textareaElement = document.getElementById('alive-memo-textarea');
          if (textareaElement) {
            console.log('Applying size in toggle to edit mode:', textareaWidth, textareaHeight);
            
            const width = parseInt(textareaWidth.replace('px', ''));
            const height = parseInt(textareaHeight.replace('px', ''));
            
            applySizeToElement(textareaElement, width, height, true);
            
            console.log('Applied size to textarea in toggle (edit mode):', textareaWidth, textareaHeight);
          }
          
          // 한 번 더 지연 적용
          setTimeout(() => {
            const textareaElement = document.getElementById('alive-memo-textarea');
            if (textareaElement) {
              const width = parseInt(textareaWidth.replace('px', ''));
              const height = parseInt(textareaHeight.replace('px', ''));
              
              applySizeToElement(textareaElement, width, height, true);
              
              console.log('Final size application in toggle completed');
            }
          }, 50);
        });
      }
    }, 100); // 디바운스 시간 100ms
  }

  /**
   * 마크다운 도움말 모달의 표시/숨김을 토글합니다.
   * @param {Event} event - 클릭 이벤트 객체
   */
  const toggleMarkdownHelp = (event) => {
    // 이벤트 전파 차단 - 모달 닫힘 방지
    preventEventPropagation(event);
    
    // 도움말 표시 상태 토글
    isShowMarkdownHelp = !isShowMarkdownHelp;
  }

  /**
   * 메모 저장을 처리합니다.
   * @param {string} todayMemoText - 저장할 메모 텍스트
   */
  const save = async (todayMemoText) => {
    const currentWidth = parseInt(textareaWidth.replace('px', ''));
    const currentHeight = parseInt(textareaHeight.replace('px', ''));
    
    const modalInfo = {
      position: modalPosition,
      width: currentWidth,
      height: currentHeight
    };

    totalMemoInfo = await saveMemosWithMessage(
      todayMemoText,
      totalMemoInfo,
      saveMemoModalPosition,
      saveMemoModalSize,
      cleanTotalMemoInfo,
      messageManager,
      modalInfo
    );
  }

  /**
   * 디바운스된 입력 핸들러
   * @param {Event} event - input 이벤트 객체
   */
  const handleDebounceInput = (event) => {
    debounceHandleInput(event, save, debounceState);
  }

  /**
   * 클립보드 복사 핸들러
   * @param {string} memoText - 복사할 메모 텍스트
   */
  const handleCopyMemo = async (memoText) => {
    await copyMemoText(memoText, messageManager);
  }

  /**
   * 리사이즈 크기 업데이트 콜백
   * @param {number} newWidth - 새로운 너비
   * @param {number} newHeight - 새로운 높이
   * @param {HTMLElement} targetElement - 대상 요소
   * @param {boolean} isPreviewMode - 프리뷰 모드 여부
   * @param {number} maxWidth - 최대 너비
   * @param {number} maxHeight - 최대 높이
   */
  const updateResizeSize = (newWidth, newHeight, targetElement, isPreviewMode, maxWidth, maxHeight) => {
    // 크기 적용
    textareaWidth = `${newWidth}px`;
    textareaHeight = `${newHeight}px`;
    
    // 편집모드와 프리뷰모드 모두 동일한 경계 제한 적용
    if (!isPreviewMode && targetElement.tagName === 'TEXTAREA') {
      console.log('Updating textarea size during resize:', textareaWidth, textareaHeight, 'max:', maxWidth, 'x', maxHeight);
      applySizeToElement(targetElement, newWidth, newHeight, true, maxWidth, maxHeight);
    } else {
      // 프리뷰 모드도 경계 제한 적용
      console.log('Updating preview div size during resize:', textareaWidth, textareaHeight, 'max:', maxWidth, 'x', maxHeight);
      applySizeToElement(targetElement, newWidth, newHeight, false, maxWidth, maxHeight);
    }
    
    // 리사이즈 중에도 위치 재조정 (편집모드와 프리뷰모드 모두)
    setTimeout(() => {
      adjustModalPosition(newWidth, newHeight);
    }, 10); // 즉시 위치 조정
  };

  /**
   * 리사이즈 시작 핸들러
   * @param {MouseEvent} event - 마우스 이벤트
   * @param {string} direction - 리사이즈 방향
   */
  const startResize = (event, direction) => {
    resizeManager.startResize(
      event, 
      direction, 
      isPreviewMode, 
      updateResizeSize, 
      saveMemoModalSize
    );
  }

  // 드래그 종료 후 호버 상태 재확인을 위한 reactive statement
  $: if (!isDragging && dragEndTimer) {
    clearTimeout(dragEndTimer);
    dragEndTimer = setTimeout(() => {
      // 드래그가 끝난 후 마우스 위치를 확인하여 호버 상태 업데이트
      const modalElement = document.getElementById('chrome-memo-extension');
      if (modalElement) {
        const rect = modalElement.getBoundingClientRect();
        const isMouseOver = (
          window.mouseX >= rect.left && 
          window.mouseX <= rect.right && 
          window.mouseY >= rect.top && 
          window.mouseY <= rect.bottom
        );
        if (isMouseOver) {
          isShowCloseButton = true;
        }
      }
    }, 100); // 드래그 완료 후 100ms 후에 체크
  }

  // 드래그 시작 시 타이머 설정
  $: if (isDragging) {
    dragEndTimer = setTimeout(() => {}, 0); // 플래그 설정용 더미 타이머
  }

  // 전역 마우스 위치 추적 (드래그 후 호버 감지용)
  const trackMousePosition = (event) => {
    window.mouseX = event.clientX;
    window.mouseY = event.clientY;
  };

  onMount(async () => {
    await tick();

    // 저장된 크기 정보 불러오기
    const savedSize = await getMemoModalSize();
    
    // textarea 렌더링 완료까지 기다린 후 크기 설정
    const initializeTextareaSize = async () => {
      // 여러 번 체크해서 textarea가 완전히 렌더링될 때까지 기다림
      for (let i = 0; i < 15; i++) { // 체크 횟수 증가
        await tick();
        const aliveMemoTextAreaDocument = document.getElementById('alive-memo-textarea');
        
        if (aliveMemoTextAreaDocument && aliveMemoTextAreaDocument.offsetWidth > 0 && aliveMemoTextAreaDocument.offsetHeight > 0) {
          console.log('Textarea found, applying size...');
          
          // resize 속성 설정
          aliveMemoTextAreaDocument.style.setProperty('resize', 'both', 'important');
          
          // 저장된 크기가 있으면 사용, 없으면 실제 렌더링된 크기 사용
          let actualWidth, actualHeight;
          if (savedSize) {
            actualWidth = savedSize.width;
            actualHeight = savedSize.height;
            console.log('Using saved size:', actualWidth, 'x', actualHeight);
          } else {
            actualWidth = aliveMemoTextAreaDocument.offsetWidth;
            actualHeight = aliveMemoTextAreaDocument.offsetHeight;
            console.log('Using rendered size:', actualWidth, 'x', actualHeight);
          }
          
          // 크기 변수 업데이트
          textareaWidth = `${actualWidth}px`;
          textareaHeight = `${actualHeight}px`;
          
          // textarea에 크기 적용
          applySizeToElement(aliveMemoTextAreaDocument, actualWidth, actualHeight, true);
          
          // 초기 크기 저장 (리사이즈 제한용) - 저장된 크기가 있어도 최소값은 원래 기본값 사용
          initialTextareaWidth = savedSize ? Math.min(300, actualWidth) : actualWidth;
          initialTextareaHeight = savedSize ? Math.min(250, actualHeight) : actualHeight;
          
          // 최대 크기 설정 (초기 크기의 3배 또는 화면 크기 제한)
          const { maxWidth, maxHeight } = getMaxDimensions();
          maxTextareaWidth = Math.min(actualWidth * 3, maxWidth);
          maxTextareaHeight = Math.min(actualHeight * 3, maxHeight);
          
          // ResizeObserver 설정
          if (window.ResizeObserver) {
            const updateSize = () => {
              // 커스텀 리사이즈 중일 때는 업데이트하지 않음
              if (isResizing) return;
              
              if (aliveMemoTextAreaDocument.offsetWidth > 0 && aliveMemoTextAreaDocument.offsetHeight > 0) {
                // 초기 크기를 최소값으로, 저장된 최대값을 사용
                const actualWidth = Math.max(initialTextareaWidth, Math.min(aliveMemoTextAreaDocument.offsetWidth, maxTextareaWidth));
                const actualHeight = Math.max(initialTextareaHeight, Math.min(aliveMemoTextAreaDocument.offsetHeight, maxTextareaHeight));
                
                textareaWidth = `${actualWidth}px`;
                textareaHeight = `${actualHeight}px`;
              }
            };
            
            resizeObserver = new ResizeObserver(entries => {
              updateSize();
            });
            resizeObserver.observe(aliveMemoTextAreaDocument);
            
            // MutationObserver로 스타일 변화도 감지
            mutationObserver = new MutationObserver(() => {
              updateSize();
            });
            mutationObserver.observe(aliveMemoTextAreaDocument, {
              attributes: true,
              attributeFilter: ['style']
            });
          }
          
          break; // 성공하면 루프 종료
        }
        
        // 체크 간격을 점진적으로 증가
        const delay = i < 5 ? 50 : (i < 10 ? 100 : 200);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    };

    // textarea가 존재할 때까지 기다림
    const waitForTextarea = async () => {
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        if (document.getElementById('alive-memo-textarea')) {
          await initializeTextareaSize();
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    };

    waitForTextarea();

    // 팝업 열릴 때 메모 모달 표시 위치 정보 불러오기
    modalPosition = await getMemoModalPosition();
    // 팝업 열릴 때 오늘의 메모 불러오기
    todayMemoInput = await getTodayMemo();
    // 팝업 열릴 때 전체 메모 불러오기
    totalMemoInfo = await getTotalMemo();

    // 전역 마우스 위치 추적 시작
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', trackMousePosition);
    }
  })

  onDestroy(() => {
    // 메모리 누수 방지를 위해 observer들 정리
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    if (toggleDebounceTimer) {
      clearTimeout(toggleDebounceTimer);
    }
    if (debounceState.timer) {
      clearTimeout(debounceState.timer);
    }
    if (dragEndTimer) {
      clearTimeout(dragEndTimer);
    }
    
    // 전역 마우스 이벤트 리스너 정리
    if (typeof window !== 'undefined') {
      window.removeEventListener('mousemove', trackMousePosition);
    }
  })

  /**
   * 모달 위치를 재조정합니다 (content.js의 함수 호출)
   * @param {number} width - 현재 또는 예상 너비 (옵션)
   * @param {number} height - 현재 또는 예상 높이 (옵션)
   */
  const adjustModalPosition = (width = null, height = null) => {
    // 크기가 제공되지 않은 경우 현재 크기 사용
    if (!width || !height) {
      const currentWidth = parseInt(textareaWidth.replace('px', ''));
      const currentHeight = parseInt(textareaHeight.replace('px', ''));
      width = width || currentWidth;
      height = height || currentHeight;
    }
    
    // content.js의 calcPositionForPopup 함수 호출 (크기 정보 포함)
    if (typeof window !== 'undefined' && window.calcPositionForPopup) {
      console.log('Adjusting modal position with size:', width, 'x', height);
      window.calcPositionForPopup(width, height);
    }
  };

  /**
   * 외부에서 호출 가능한 저장된 크기 적용 함수
   * @param {number} width - 적용할 너비
   * @param {number} height - 적용할 높이
   */
  export const applySavedSize = async (width, height) => {
    console.log('applySavedSize called:', width, 'x', height);
    
    // 크기 변수 업데이트 (이것이 HTML 템플릿의 reactive 값들을 업데이트함)
    textareaWidth = `${width}px`;
    textareaHeight = `${height}px`;
    
    // 저장된 크기에 맞춰 제한 값들도 업데이트 (프리뷰 모드처럼 동작하게)
    const savedWidth = width;
    const savedHeight = height;
    
    // 최소값은 저장된 크기로, 최대값은 저장된 크기보다 크게 설정
    initialTextareaWidth = Math.min(initialTextareaWidth, savedWidth);
    initialTextareaHeight = Math.min(initialTextareaHeight, savedHeight);
    
    // 최대값을 저장된 크기보다 충분히 크게 설정 (리사이즈 가능하도록)
    const { maxWidth, maxHeight } = getMaxDimensions();
    maxTextareaWidth = Math.max(savedWidth * 2, maxWidth);
    maxTextareaHeight = Math.max(savedHeight * 2, maxHeight);
    
    // DOM 업데이트 대기
    await tick();
    
    // textarea와 preview div에 크기 적용
    const textareaElement = document.getElementById('alive-memo-textarea');
    if (textareaElement) {
      applySizeToElement(textareaElement, width, height, true);
    }

    const previewDiv = document.getElementById('markdown-preview-div');
    if (previewDiv) {
      applySizeToElement(previewDiv, width, height, false);
    }

    // 크기 적용 후 모달 위치 재조정 (오른쪽 경계를 벗어나지 않도록)
    if (!skipPositionAdjustment) {
      setTimeout(() => {
        adjustModalPosition(width, height);
        console.log('Modal position adjusted after size application');
      }, 100); // 크기 적용이 완료된 후 위치 조정
    } else {
      console.log('Position adjustment skipped due to skipPositionAdjustment flag');
    }

    console.log('Successfully applied saved size:', width, 'x', height);
  };

  // 패널이 열릴 때 저장된 크기 적용을 위한 reactive statement
  $: if (isOpenPanelFlag && typeof window !== 'undefined' && !skipPositionAdjustment) {
    // 패널이 열렸을 때 저장된 크기 적용 (content.js에서 처리하지 않는 경우에만)
    setTimeout(async () => {
      const savedSize = await getMemoModalSize();
      if (savedSize && savedSize.width && savedSize.height) {
        console.log('Panel opened, applying saved size from reactive statement:', savedSize.width, 'x', savedSize.height);
        await applySavedSize(savedSize.width, savedSize.height);
      }
    }, 50); // 패널 렌더링 완료를 위한 짧은 지연
  }
</script>

<style>
  .resizable-container {
    position: relative;
    display: inline-block;
  }

  /* 리사이즈 중일 때 커서 고정 */
  :global(body.resizing) {
    cursor: inherit !important;
    user-select: none !important;
  }
</style>

<svelte:options accessors={true} />
<div
  aria-hidden="true"
  id="chrome-memo-extension"
  style="
    flex-direction: column;
    padding: 5px;
    position: relative;
  "
  on:mouseenter={() => {
    isShowCloseButton = true;
  }}
  on:mouseleave={() => {
    isShowCloseButton = false;
  }}
>
  <div
    aria-hidden={true}
    style="
      display: flex;
      flex-direction: row;
      width: {isOpenPanelFlag ? '100%' : '165px'};
      min-width: 165px;
      height: 30px;
      align-items: center;
      justify-content: {isOpenPanelFlag ? 'center' : 'center'};
      position: relative;
    "
  >
    {#if isOpenPanelFlag}
      <div style="display: flex; align-items: center; gap: 8px;">
        <p
          style="
            font-weight: bold;
            font-size: 20px;
            line-height: 30px;
            cursor: pointer;
            white-space: nowrap;
            margin: 0;
            "
          >{`Today's Memo`}</p>
        <button
          style="
            width: 24px;
            height: 24px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            pointer-events: auto;
          "
          on:click|capture|stopPropagation|preventDefault={(e) => toggleMarkdownHelp(e)}
          on:mousedown|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
          on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
          title="마크다운 사용법"
        >💡</button>
      </div>
      <div
          style="
            display: flex;
            flex-grow: 1;
            justify-content: flex-end;
            align-items: center;
          "
        >
        <button
          style="
            width: 24px;
            height: 24px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            pointer-events: auto;
          "
          on:click|capture|stopPropagation={() => handleCopyMemo(todayMemoInput)}
          title="메모 복사"
        >{'📋'}</button>
      </div>
    {:else}
      <p
        style="
          font-weight: bold;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          white-space: nowrap;
          margin: 0;
          text-align: center;
          "
        >{`Today's Memo`}</p>
    {/if}
  </div>
  {#if isOpenPanelFlag}
    {#if isShowMarkdownHelp}
      <div
        style="
          background: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 6px;
          padding: 12px;
          margin-top: 8px;
          font-size: 14px;
        "
      >
        <h4 style="font-weight: bold; margin-bottom: 8px; color: #1e40af;">📝 마크다운 사용법</h4>
        <div style="color: #374151; line-height: 1.4;">
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;"># 제목1</code> → <strong>큰 제목</strong></div>
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">## 제목2</code> → <strong>중간 제목</strong></div>
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">**굵게**</code> → <strong>굵게</strong></div>
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">*기울임*</code> → <em>기울임</em></div>
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">- 리스트</code> → • 리스트</div>
          <div style="margin-left: 8px; margin-bottom: 4px; font-size: 12px; color: #6b7280;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">&nbsp;&nbsp;- 하위 리스트</code> → ○ 하위 리스트</div>
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">`코드`</code> → <code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">코드</code></div>
          <div style="margin-bottom: 4px;"><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">&gt; 인용</code> → 인용문</div>
          <div><code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">[링크](URL)</code> → 링크</div>
        </div>
      </div>
    {/if}
    <div style="position: relative; margin-top: 5px;">
      {#if isPreviewMode}
        <div class="resizable-container">
          <div
            id="markdown-preview-div"
            style="
              background: #fffae3 !important;
              border: 1px solid #d1d5db;
              border-radius: 5px;
              padding: 8px;
              padding-right: 48px;
              font-size: 16px;
              width: {textareaWidth};
              height: {textareaHeight};
              overflow-y: auto;
              color: #374151;
              line-height: 1.4;
              box-sizing: border-box;
              resize: none;
              min-width: {initialTextareaWidth}px;
              max-width: {maxTextareaWidth}px;
              min-height: {initialTextareaHeight}px;
              max-height: {maxTextareaHeight}px;
            "
            on:click|capture|stopPropagation
            on:mousemove|capture|stopPropagation
            on:mousedown|capture|stopPropagation
          >
            {@html parseMarkdown(todayMemoInput)}
          </div>
          
          <!-- 커스텀 리사이즈 핸들들 -->
          <!-- 하단 -->
          <div 
            style="
              position: absolute;
              background: transparent;
              z-index: 15;
              pointer-events: auto;
              bottom: -5px;
              left: 10px;
              right: 10px;
              height: 10px;
              cursor: s-resize;
            "
            on:mousedown|capture|stopPropagation|preventDefault={(e) => startResize(e, 's')}
            on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
            on:mouseenter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
            on:mouseleave={(e) => e.target.style.background = 'transparent'}
            title="하단 크기 조정"
          ></div>
          <!-- 우측 -->
          <div 
            style="
              position: absolute;
              background: transparent;
              z-index: 15;
              pointer-events: auto;
              top: 10px;
              bottom: 10px;
              right: -5px;
              width: 10px;
              cursor: e-resize;
            "
            on:mousedown|capture|stopPropagation|preventDefault={(e) => startResize(e, 'e')}
            on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
            on:mouseenter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
            on:mouseleave={(e) => e.target.style.background = 'transparent'}
            title="우측 크기 조정"
          ></div>
          <!-- 우하단 모서리 -->
          <div 
            style="
              position: absolute;
              background: transparent;
              z-index: 15;
              pointer-events: auto;
              bottom: -5px;
              right: -5px;
              width: 10px;
              height: 10px;
              cursor: se-resize;
            "
            on:mousedown|capture|stopPropagation|preventDefault={(e) => startResize(e, 'se')}
            on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
            on:mouseenter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
            on:mouseleave={(e) => e.target.style.background = 'transparent'}
            title="우하단 크기 조정"
          ></div>
        </div>
      {:else}
        <div class="resizable-container">
    <textarea
        bind:this={textareaElement}
        id="alive-memo-textarea"
        autofocus={true}
        style="
          background: #fffae3 !important;
          border: 1px solid #d1d5db;
          border-radius: 5px;
          padding: 8px;
          padding-right: 48px;
          font-size: 16px;
          resize: none;
          min-width: 200px;
          max-width: {maxTextareaWidth}px;
          min-height: 150px;
          max-height: {maxTextareaHeight}px;
          box-sizing: border-box;
      " 
      bind:value={todayMemoInput}
      on:click|capture|stopPropagation
      on:mousemove|capture|stopPropagation
      on:mousedown|capture|stopPropagation
      on:input={handleDebounceInput}
            placeholder="write memo (supports markdown)"/>
          
          <!-- 커스텀 리사이즈 핸들들 -->
          <!-- 하단 -->
          <div 
            style="
              position: absolute;
              background: transparent;
              z-index: 15;
              pointer-events: auto;
              bottom: -5px;
              left: 10px;
              right: 10px;
              height: 10px;
              cursor: s-resize;
            "
            on:mousedown|capture|stopPropagation|preventDefault={(e) => startResize(e, 's')}
            on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
            on:mouseenter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
            on:mouseleave={(e) => e.target.style.background = 'transparent'}
            title="하단 크기 조정"
          ></div>
          <!-- 우측 -->
          <div 
            style="
              position: absolute;
              background: transparent;
              z-index: 15;
              pointer-events: auto;
              top: 10px;
              bottom: 10px;
              right: -5px;
              width: 10px;
              cursor: e-resize;
            "
            on:mousedown|capture|stopPropagation|preventDefault={(e) => startResize(e, 'e')}
            on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
            on:mouseenter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
            on:mouseleave={(e) => e.target.style.background = 'transparent'}
            title="우측 크기 조정"
          ></div>
          <!-- 우하단 모서리 -->
          <div 
            style="
              position: absolute;
              background: transparent;
              z-index: 15;
              pointer-events: auto;
              bottom: -5px;
              right: -5px;
              width: 10px;
              height: 10px;
              cursor: se-resize;
            "
            on:mousedown|capture|stopPropagation|preventDefault={(e) => startResize(e, 'se')}
            on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
            on:mouseenter={(e) => e.target.style.background = 'rgba(59, 130, 246, 0.2)'}
            on:mouseleave={(e) => e.target.style.background = 'transparent'}
            title="우하단 크기 조정"
          ></div>
        </div>
      {/if}
      <button
        style="
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
          z-index: 10;
          pointer-events: auto;
        "
        on:click|capture|stopPropagation|preventDefault={(e) => togglePreviewMode(e)}
        on:mousedown|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
        on:mouseup|capture|stopPropagation|preventDefault={(e) => e.stopImmediatePropagation()}
        title={isPreviewMode ? '편집 모드로 전환' : '프리뷰 모드로 전환'}
      >⇆</button>
    </div>
    <div
      style="
        position: absolute;
        bottom: 15px;
        right: 5px;
      "
    >
      {#if isShowSaveText}
        <p
          style="
            color: #7dd3fc;
          "
          >{successMsg}</p>
      {/if}
    </div>
  {/if}
  {#if isOpenPanelFlag === false && isDragging === false && isShowCloseButton}
    <div
      style="
        position: absolute;
        top: -12px;
        right: {isLeftPosition ? 0 : 155}px;
        background: #000000;
        border: 1px solid #FFFFFF;
        border-radius: 9999px;
        width: 20px;
        height: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 13px;
        line-height: 0;
      "
      aria-hidden="true"
      on:click|stopPropagation={() => {
        dispatch('onCloseMemoModal');
      }}
    >{'⨉'}
    </div>
  {/if}
</div>