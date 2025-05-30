<script>
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';

  let todayMemoInput = "";
  let totalMemoInfo = {};
  let isShowSuccessOpenModalText = false;
  let successMsg = '';

  let modalPosition = 'TL';

  onMount(() => {
    // 크롬 로컬 스토리지 정보 재점검
    onReSettingChromeLocalStorage();
    // 팝업 열릴 때 메모 모달 표시 위치 정보 불러오기
    getMemoModalPosition();
    // 팝업 열릴 때 오늘의 메모 불러오기
    getTodayMemo();
    // 팝업 열릴 때 전체 메모 불러오기
    getTotalMemo();
  })

  const delayPromise = async (delayMille) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(true);
      }, delayMille)
    })
  }

  const onReSettingChromeLocalStorage = () => {
    chrome.runtime.sendMessage({ type: "reSettingChromeLocalStorage" }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });
  }

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

  const save = async () => {
    const todayDate = new Date().toISOString().slice(0, 10);

    saveMemoModalPosition(modalPosition);

    chrome.runtime.sendMessage({ type: "saveMemo", text: todayMemoInput }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });

    totalMemoInfo[todayDate] = {
      memo: todayMemoInput
    };

    totalMemoInfo = cleanTotalMemoInfo(totalMemoInfo);

    chrome.runtime.sendMessage({ type: "updateTotalMemo", info: JSON.stringify(totalMemoInfo) }, (response) => {
      // 저장 후 처리 (필요시)
      if (response.status === "ok") {
        // 저장 성공 알림 등
      }
    });

    successMsg = 'save success';
    isShowSuccessOpenModalText = true;

    await delayPromise(1000);

    isShowSuccessOpenModalText = false;
  }

  const getTodayMemo = () => {
    const todayDate = new Date().toISOString().slice(0, 10);

    console.log('readTodayMemo', todayDate);

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

  const sortByList = (memoList) => {
    return memoList.sort((a, b) => new Date(b) - new Date(a));
  }

  const openBrowserMemoModal = (positionType) => {
    modalPosition = positionType;

    saveMemoModalPosition(modalPosition);

    chrome.runtime.sendMessage({ type: "openBrowserMemoModal", position: modalPosition }, async (response) => {
      if (response?.isOpen !== true) {
        return;
      }

      successMsg = 'open success';
      isShowSuccessOpenModalText = true;

      await delayPromise(1000);

      isShowSuccessOpenModalText = false;
    });
  }

  const copyMemoText = async (memoText) => {
    successMsg = 'copy success';
    isShowSuccessOpenModalText = true;

    // 클립보드에 복사
    navigator.clipboard.writeText(memoText);

    await delayPromise(1000);

    isShowSuccessOpenModalText = false;
  }
</script>

<div class="flex flex-col w-[300px] p-2 rounded-md relative border border-dashed border-black bg-white">
  <div class="flex flex-col p-2 space-y-1 border rounded-md border-gray-200 {Object.keys(totalMemoInfo).length > 0 ? 'mb-2' : ''}">
    <p class="flex h-[50px] justify-center items-center text-xl font-bold italic border-b">{`TODAY MEMO`}</p>
    <textarea style="background: #fffae3" class="scrollbar-thin-custom border rounded-md p-1 border-gray-50" bind:value={todayMemoInput} rows="5" cols="30" placeholder="write memo"></textarea>
    <div class="flex flex-row w-full justify-center items-center space-x-1">
      <button class="w-full h-[30px] bg-sky-200 hover:bg-sky-400 border rounded-md border-gray-50 font-bold" on:click={save}>{'SAVE'}</button>
      <div class="flex flex-row h-[30px] w-full p-0.5 bg-gray-200 border border-gray-50 space-x-0.5 rounded-md">
        <button class="w-full bg-white hover:bg-gray-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('TL')}>{'↖'}</button>
        <button class="w-full bg-white hover:bg-gray-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('TR')}>{'↗'}</button>
        <button class="w-full bg-white hover:bg-gray-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('BL')}>{'↙'}</button>
        <button class="w-full bg-white hover:bg-gray-400 border rounded-md border-gray-100 font-bold" on:click={() => openBrowserMemoModal('BR')}>{'↘'}</button>
      </div>
    </div>
  </div>
  {#if Object.keys(totalMemoInfo).length > 0}
    <div transition:slide class="border rounded-md border-gray-200 w-full max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin-custom">
      <div class="flex flex-col w-full space-y-2 p-2">
        {#each sortByList(Object.keys(totalMemoInfo)) as memoInfo}
          <div class="flex flex-col w-full space-y-1 border rounded-md border-gray-50">
            <div class="flex flex-row w-full h-auto px-2 border-b border-gray-50 bg-sky-50">
              <p class="font-bold text-lg">{memoInfo}</p>
              <div class="flex grow justify-end items-center">
                <button class="cursor-pointer" on:click={() => copyMemoText(totalMemoInfo[memoInfo].memo)}>{'📋'}</button>
              </div>
            </div>
            <div class="p-1 w-full h-[100px] overflow-y-auto overflow-x-hidden scrollbar-thin-custom text-wrap break-words">
              {@html totalMemoInfo[memoInfo].memo?.replaceAll('\n', '<br/>')}
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
</style>