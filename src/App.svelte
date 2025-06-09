<script>
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  
  // Utility imports
  import { parseMarkdown } from './utils/markdownUtils.js';
  import { 
    getMemoModalPosition, 
    saveMemoModalPosition,
    getTodayMemo,
    getTotalMemo,
    saveMemo,
    saveTotalMemo
  } from './utils/storageUtils.js';
  import { 
    cleanTotalMemoInfo, 
    copyToClipboard
  } from './utils/commonUtils.js';
  import { MessageManager } from './utils/uiUtils.js';

  let todayMemoInput = "";
  let totalMemoInfo = {};
  let isPreviewMode = false;
  let isShowMarkdownHelp = false;
  let modalPosition = 'TL';

  // UI state variables
  let isShowSuccessOpenModalText = false;
  let successMsg = '';

  // Utility instances
  const messageManager = new MessageManager();

  // 메시지 상태 반응성
  messageManager.on('messageChanged', (data) => {
    isShowSuccessOpenModalText = data.isShow;
    successMsg = data.message;
  });

  onMount(async () => {
    // 크롬 로컬 스토리지 정보 재점검
    onReSettingChromeLocalStorage();
    // 팝업 열릴 때 메모 모달 표시 위치 정보 불러오기
    modalPosition = await getMemoModalPosition();
    // 팝업 열릴 때 오늘의 메모 불러오기
    todayMemoInput = await getTodayMemo();
    // 팝업 열릴 때 전체 메모 불러오기
    totalMemoInfo = await getTotalMemo();
  })

  /**
   * 크롬 로컬 스토리지 정보를 재설정합니다.
   */
  const onReSettingChromeLocalStorage = () => {
    chrome.runtime.sendMessage({ type: "reSettingChromeLocalStorage" }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });
  }

  /**
   * 메모를 저장합니다.
   */
  const save = async () => {
    const todayDate = new Date().toISOString().slice(0, 10);

    await saveMemoModalPosition(modalPosition);
    await saveMemo(todayMemoInput);

    totalMemoInfo[todayDate] = {
      memo: todayMemoInput
    };

    totalMemoInfo = cleanTotalMemoInfo(totalMemoInfo);
    await saveTotalMemo(totalMemoInfo);
    
    await messageManager.showSuccessMessage('save success');
  }

  /**
   * 날짜별 메모 목록을 날짜 역순으로 정렬합니다.
   * @param {Array} memoList - 정렬할 메모 목록
   * @returns {Array} 정렬된 메모 목록
   */
  const sortByList = (memoList) => {
    return memoList.sort((a, b) => new Date(b) - new Date(a));
  }

  /**
   * 브라우저에서 메모 모달을 엽니다.
   * @param {string} positionType - 모달 위치 타입
   */
  const openBrowserMemoModal = async (positionType) => {
    modalPosition = positionType;

    await saveMemoModalPosition(modalPosition);

    chrome.runtime.sendMessage({ type: "openBrowserMemoModal", position: modalPosition }, async (response) => {
      if (response?.isOpen === true) {
        await messageManager.showSuccessMessage('open success');
      }
    });
  }

  /**
   * 메모 텍스트를 클립보드에 복사합니다.
   * @param {string} memoText - 복사할 메모 텍스트
   */
  const copyMemoText = async (memoText) => {
    const success = await copyToClipboard(memoText);
    
    if (success) {
      await messageManager.showSuccessMessage('copy success');
    } else {
      await messageManager.showSuccessMessage('copy failed');
    }
  }

  /**
   * 프리뷰 모드를 토글합니다.
   */
  const togglePreviewMode = () => {
    isPreviewMode = !isPreviewMode;
  }

  /**
   * 마크다운 도움말을 토글합니다.
   */
  const toggleMarkdownHelp = () => {
    isShowMarkdownHelp = !isShowMarkdownHelp;
  }
</script>

<div class="flex flex-col w-[300px] p-2 rounded-md relative border border-dashed border-black bg-white">
  <div class="flex flex-col p-2 space-y-1 border rounded-md border-gray-200 {Object.keys(totalMemoInfo).length > 0 || isShowMarkdownHelp ? 'mb-2' : ''}">
    <div class="flex h-[50px] justify-center items-center text-xl font-bold border-b relative">
      <span>{`TODAY'S MEMO`}</span>
      <button 
        class="absolute right-2 w-7 h-7 bg-white border border-gray-300 rounded-full hover:bg-gray-100 flex items-center justify-center text-xs font-bold shadow-sm"
        on:click={toggleMarkdownHelp}
        title="마크다운 사용법"
      >
        💡
      </button>
    </div>
    {#if isShowMarkdownHelp}
      <div class="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm" transition:slide>
        <h4 class="font-bold mb-2 text-blue-800">📝 마크다운 사용법</h4>
        <div class="space-y-1 text-gray-700">
          <div><code># 제목1</code> → <strong>큰 제목</strong></div>
          <div><code>## 제목2</code> → <strong>중간 제목</strong></div>
          <div><code>**굵게**</code> → <strong>굵게</strong></div>
          <div><code>*기울임*</code> → <em>기울임</em></div>
          <div><code>- 리스트</code> → • 리스트</div>
          <div class="ml-2 text-xs text-gray-600">
            <code>&nbsp;&nbsp;- 하위 리스트</code> → ○ 하위 리스트
          </div>
          <div><code>1. 번호 리스트</code> → 1. 번호 리스트</div>
          <div class="ml-2 text-xs text-gray-600">
            <code>&nbsp;&nbsp;1. 하위 번호</code> → a. 하위 번호
          </div>
          <div><code>`코드`</code> → <code style="background:#f3f4f6;padding:2px 4px;border-radius:3px;">코드</code></div>
          <div><code>&gt; 인용</code> → 인용문</div>
          <div><code>[링크](URL)</code> → 링크</div>
        </div>
      </div>
    {/if}
    <div class="relative">
      {#if isPreviewMode}
        <div class="border rounded-md p-2 min-h-[120px] prose prose-sm max-w-none" style="background: #fffae3">
          {@html parseMarkdown(todayMemoInput)}
        </div>
      {:else}
        <textarea 
          style="background: #fffae3" 
          class="scrollbar-thin-custom border rounded-md p-2 pr-12 border-gray-50 w-full min-h-[120px] resize-none" 
          bind:value={todayMemoInput} 
          placeholder="write memo (supports markdown)"
        ></textarea>
      {/if}
      <button 
        class="absolute top-2 right-2 w-7 h-7 bg-white border border-gray-300 rounded-full hover:bg-gray-100 flex items-center justify-center text-xs font-bold shadow-sm z-10"
        on:click={togglePreviewMode}
        title={isPreviewMode ? '편집 모드로 전환' : '프리뷰 모드로 전환'}
      >
        ⇆
      </button>
    </div>
    <div class="flex flex-row w-full justify-center items-center space-x-1">
      <button class="w-full h-[30px] bg-sky-200 hover:bg-sky-400 border rounded-md border-gray-50 font-bold" on:click={save}>{'SAVE'}</button>
      <div class="flex flex-row h-[30px] w-full p-0.5 bg-sky-50 border border-gray-200 space-x-0.5 rounded-md">
        <button class="w-full bg-sky-200 hover:bg-sky-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('TL')}>{'↖'}</button>
        <button class="w-full bg-sky-200 hover:bg-sky-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('TR')}>{'↗'}</button>
        <button class="w-full bg-sky-200 hover:bg-sky-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('BL')}>{'↙'}</button>
        <button class="w-full bg-sky-200 hover:bg-sky-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('BR')}>{'↘'}</button>
      </div>
    </div>
  </div>
  {#if Object.keys(totalMemoInfo).length > 0}
    <div transition:slide class="border rounded-md border-gray-200 w-full max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin-custom">
      <div class="flex flex-col w-full space-y-2 p-2">
        {#each sortByList(Object.keys(totalMemoInfo)) as memoInfo}
          <div class="flex flex-col w-full space-y-1 border rounded-md border-gray-50">
            <div class="flex flex-row w-full h-auto p-1 border-b border-gray-50 bg-sky-50">
              <p class="font-bold text-lg">{memoInfo}</p>
              <div class="flex grow justify-end items-center">
                <button 
                  class="w-7 h-7 bg-white border border-gray-300 rounded-full hover:bg-gray-100 flex items-center justify-center text-xs font-bold shadow-sm"
                  on:click={() => copyMemoText(totalMemoInfo[memoInfo].memo)}
                  title="메모 복사"
                >
                  📋
                </button>
              </div>
            </div>
            <div class="p-2 w-full min-h-[100px] overflow-y-auto overflow-x-hidden scrollbar-thin-custom text-wrap break-words prose prose-sm max-w-none">
              {@html parseMarkdown(totalMemoInfo[memoInfo].memo)}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
  <div class="absolute" style="top:5px; left:5px">
    {#if isShowSuccessOpenModalText}
      <p 
        class="text-sky-500"
        transition:slide
      >
      {successMsg}</p>
    {/if}
  </div>
</div>

<style>
  /* Firefox용 */
  .scrollbar-thin-custom {
    scrollbar-width: thin;           /* 얇은 스크롤바 */
    scrollbar-color: #000000 transparent; /* 썸 색상, 트랙은 투명 */
  }
  /* Webkit(크롬, 사파리 등)용 */
  .scrollbar-thin-custom::-webkit-scrollbar {
    height: 6px;                     /* 가로 스크롤바 두께 */
    background: transparent;         /* 트랙(배경) 투명 */
  }
  .scrollbar-thin-custom::-webkit-scrollbar-thumb {
    background: #000000;                /* 썸(움직이는 부분) 색상 */
    border-radius: 4px;              /* 둥근 모서리 */
  }
  .scrollbar-thin-custom::-webkit-scrollbar-thumb:hover {
    background: #555;                /* 썸 호버 시 색상 */
  }

  /* 마크다운 스타일링 - 동적 생성된 HTML에 적용하기 위해 :global() 사용 */
  :global(.prose) {
    color: #374151;
    line-height: 1.4;
  }
  
  :global(.prose h1), :global(.prose h2), :global(.prose h3), :global(.prose h4), :global(.prose h5), :global(.prose h6) {
    font-weight: bold;
    margin-top: 0.5em;
    margin-bottom: 0.2em;
  }
  
  :global(.prose h1) { font-size: 1.5em; }
  :global(.prose h2) { font-size: 1.3em; }
  :global(.prose h3) { font-size: 1.1em; }
  :global(.prose h4) { font-size: 1.05em; }
  :global(.prose h5) { font-size: 1em; }
  :global(.prose h6) { font-size: 0.95em; }
  
  :global(.prose p) {
    margin-bottom: 0.5em;
    margin-top: 0;
  }
  
  :global(.prose ul), :global(.prose ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }
  
  :global(.prose ul) {
    list-style-type: disc;
  }
  
  :global(.prose ol) {
    list-style-type: decimal;
  }
  
  :global(.prose li) {
    margin: 0.1em 0;
    display: list-item;
  }

  /* 중첩된 리스트 스타일링 */
  :global(.prose ul ul) {
    list-style-type: circle;
    margin: 0.2em 0;
  }
  
  :global(.prose ul ul ul) {
    list-style-type: square;
  }
  
  :global(.prose ol ol) {
    list-style-type: lower-alpha;
  }
  
  :global(.prose ol ol ol) {
    list-style-type: lower-roman;
  }
  
  :global(.prose blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    margin: 0.5em 0;
    font-style: italic;
    color: #6b7280;
  }
  
  :global(.prose code) {
    background-color: #f3f4f6;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
  }
  
  :global(.prose pre) {
    background-color: #f3f4f6;
    padding: 0.8em;
    border-radius: 5px;
    overflow-x: auto;
    margin: 0.5em 0;
  }
  
  :global(.prose pre code) {
    background-color: transparent;
    padding: 0;
  }
  
  :global(.prose a) {
    color: #3b82f6;
    text-decoration: underline;
  }
  
  :global(.prose a:hover) {
    color: #1d4ed8;
  }
  
  :global(.prose strong) {
    font-weight: bold;
  }
  
  :global(.prose em) {
    font-style: italic;
  }
  
  :global(.prose hr) {
    border: none;
    height: 1px;
    background-color: #e5e7eb;
    margin: 1em 0;
  }

  :global(.prose table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0.5em 0;
  }
  
  :global(.prose th), :global(.prose td) {
    border: 1px solid #e5e7eb;
    padding: 0.4em;
    text-align: left;
  }
  
  :global(.prose th) {
    background-color: #f9fafb;
    font-weight: bold;
  }

  /* 첫 번째와 마지막 요소의 마진 제거 */
  :global(.prose > *:first-child) {
    margin-top: 0 !important;
  }
  
  :global(.prose > *:last-child) {
    margin-bottom: 0 !important;
  }
</style>