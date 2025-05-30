<script>
  import { onMount, createEventDispatcher, tick } from 'svelte';
  import { slide, fade } from 'svelte/transition';

  export let isDragging = false;
  export let isOpenPanelFlag = false;
  export let todayMemoInput = '';
  export let modalPosition = 'TL';
  export let isLeftPosition = false;

  const dispatch = createEventDispatcher();

  let isShowCloseButton = false;
  let totalMemoInfo = {};
  let isShowSaveText = false;
  let debouncedInput = '';
  let debounceTimer;

  let successMsg = '';

  onMount(async () => {
    await tick();

    let aliveMemoTextAreaDocument = document.getElementById('alive-memo-textarea');
    if (!!aliveMemoTextAreaDocument) aliveMemoTextAreaDocument.style.setProperty('resize', 'both', 'important');

    // 팝업 열릴 때 메모 모달 표시 위치 정보 불러오기
    getMemoModalPosition();
    // 팝업 열릴 때 오늘의 메모 불러오기
    getTodayMemo();
    // 팝업 열릴 때 전체 메모 불러오기
    getTotalMemo();
  })

  const getMemoModalPosition = () => {
    chrome.runtime.sendMessage({ type: "getMemoPosition" }, (response) => {
      modalPosition = response?.position?.memoPosition ?? 'TL';
    });
  }

  const saveMemoModalPosition = (position) => {
    chrome.runtime.sendMessage({ type: "saveMemoPosition", position: position }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });
  }

  const getTodayMemo = () => {
    const todayDate = new Date().toISOString().slice(0, 10);

    chrome.runtime.sendMessage({ type: "getTodayMemo" }, (response) => {
      todayMemoInput = response?.text[todayDate] ?? '';
    });
  }

  const getTotalMemo = () => {
    chrome.runtime.sendMessage({ type: "getTotalMemoInfo" }, (response) => {
      totalMemoInfo = (!!response?.info?.totalMemoInfo && Object.keys(response?.info?.totalMemoInfo).length > 0) ? 
        (typeof response?.info?.totalMemoInfo === 'string' ? JSON.parse(response.info.totalMemoInfo) : response.info.totalMemoInfo) : 
        {};
    });
  }

  const isEmptyValue = (val) => {
    // null, undefined, 빈 문자열
    if (val == null || val === "") return true;

    // 빈 객체
    if (typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0) return true;

    return false;
  }

  const cleanTotalMemoInfo = (data) => {
    // data가 null/undefined/빈 문자열/빈 객체면 빈 객체 반환
    if (!data || (typeof data === "object" && Object.keys(data).length === 0)) return {};

    return Object.fromEntries(
      Object.entries(data)
        .filter(
          ([_, obj]) =>
            obj &&
            typeof obj === "object" &&
            !isEmptyValue(obj.memo)
        )
    );
  }

  const save = async (todayMemoText) => {
    const todayDate = new Date().toISOString().slice(0, 10);

    successMsg = 'save success';
    isShowSaveText = true;

    saveMemoModalPosition(modalPosition);

    chrome.runtime.sendMessage({ type: "saveMemo", text: todayMemoText }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });

    totalMemoInfo[todayDate] = {
      memo: todayMemoText
    };

    totalMemoInfo = cleanTotalMemoInfo(totalMemoInfo);

    chrome.runtime.sendMessage({ type: "updateTotalMemo", info: JSON.stringify(totalMemoInfo) }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });

    await delayPromise(1000);

    isShowSaveText = false;
  }

  const delayPromise = async (delayMille) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(true);
      }, delayMille)
    })
  }

  const debounceHandleInput = (event) => {
    debouncedInput = event.target.value;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      save(debouncedInput);
      // 여기서 debouncedValue로 검색, API 호출 등 원하는 작업 실행
    }, 1000); // 1000ms 지연
  }

  const copyMemoText = async (memoText) => {
    successMsg = 'copy success';
    isShowSaveText = true;

    // 클립보드에 복사
    navigator.clipboard.writeText(memoText);

    await delayPromise(1000);

    isShowSaveText = false;
  }
</script>

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
      width: 100%;
      height: 30px;
      align-items: center;
      justify-content: center;
    "
  >
    <p
      style="
        font-weight: bold;
        font-size: 20px;
        line-height: 30px;
        cursor: pointer;
        width: 150px;
      "
    >{`Today’s Memo`}</p>
    <div
        style="
          display: flex;
          flex-grow: 1;
          justify-content: flex-end;
          align-items: center;
        "
      >
      {#if isOpenPanelFlag}
        <button
          style="
            font-weight: bold;
            font-size: 20px;
            line-height: 30px;
          "
          on:click|capture|stopPropagation={() => copyMemoText(todayMemoInput)}
        >{'📋'}</button>
      {/if}
    </div>
  </div>
  {#if isOpenPanelFlag}
    <textarea
      id="alive-memo-textarea"
      autofocus={true}
      transition:fade
      class="resize-both"
      style="
        background: #fffae3;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        padding: 5px;
        font-size: 16px;
        resize: both;
        min-width: 200px;
        max-width: 100vh;
        min-height: 200px;
        max-height: 100vh;
        margin-top: 5px;
      " 
      bind:value={todayMemoInput}
      on:click|capture|stopPropagation
      on:mousemove|capture|stopPropagation
      on:mousedown|capture|stopPropagation
      on:input={debounceHandleInput}
      rows="15" cols="50" placeholder="write memo"/>
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
          transition:slide>{successMsg}</p>
      {/if}
    </div>
  {/if}
  {#if isOpenPanelFlag === false && isDragging === false && isShowCloseButton}
    <div
      style="
        position: absolute;
        top: -12px;
        right: {isLeftPosition ? 0 : 135}px;
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