import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { serverSessionCheck, prependChild, resolveImageUrl, getDefaultProfileImage, } from '../utils/function.js';
import { getPosts, searchPosts, getWeeklyPopularPosts, } from '../services/indexRequest.js';

const DEFAULT_PROFILE_IMAGE = getDefaultProfileImage();
const SCROLL_THRESHOLD = 0.9;
const ITEMS_PER_LOAD = 5;
const DEFAULT_SORT = 'LATEST';
const SORT_TYPES = ['LATEST', 'LIKE', 'VIEW'];
const DEFAULT_SEARCH_TYPE = 'TITLE';
const SEARCH_TYPES = ['TITLE', 'TITLE_CONTENT', 'AUTHOR'];
const params = new URLSearchParams(window.location.search);
const requestedSort = params.get('sort');
const BOARD_MODES = {ALL: 'ALL', POPULAR: 'POPULAR',};
const BOARD_STATE_KEY = 'boardListState';

let currentBoardMode = BOARD_MODES.ALL;
let currentKeyword = '';
let currentSearchType = DEFAULT_SEARCH_TYPE;
let currentSort =
    SORT_TYPES.includes(requestedSort)
        ? requestedSort
        : DEFAULT_SORT;
let cursor = null;
let isEnd = false;
let isProcessing = false;

const updateSortVisibility = () => {
    const sortRow =
        document.querySelector('#searchSortRow');

    const sortSelect =
        document.querySelector('#searchSortSelect');

    if (!sortRow || !sortSelect) return;

    sortRow.classList.remove('isHidden');
    sortRow.setAttribute('aria-hidden', 'false');
    sortSelect.disabled = false;
    sortSelect.value = currentSort;
};

const updateSortQuery = sort => {
    const urlParams =
        new URLSearchParams(window.location.search);

    urlParams.set('sort', sort);

    history.replaceState(
        null,
        '',
        `${window.location.pathname}?${urlParams.toString()}`
    );
};

// getBoardItem 함수
const getBoardItem = async (
    cursorValue = null,
    limitValue = 5
) => {

    if (currentKeyword.trim() === '') {
        return getPosts(
            currentSort,
            cursorValue?.sortValue ?? null,
            cursorValue?.postId ?? null,
            limitValue
        );
    }

    return searchPosts(
        currentKeyword,
        currentSearchType,
        currentSort,
        cursorValue?.sortValue ?? null,
        cursorValue?.postId ?? null,
        limitValue
    );
};

const setBoardItem = boardData => {
    const boardList = document.querySelector('.boardList');
    if (boardList && boardData) {
        const itemsHtml = boardData
            .map(data => BoardItem(
                data.postId,
                data.createdAt,
                data.title,
                data.contentPreview,
                data.viewCount,
                data.profileFileUrl || null,
                data.nickname,
                data.commentCount,
                data.likeCount,
            ))
            .join('');
        boardList.innerHTML += ` ${itemsHtml}`;
    }
};

const resetBoardList = () => {
    const boardList = document.querySelector('.boardList');
    if (boardList) boardList.innerHTML = '';
};

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;
    isProcessing = true;

    try {
        if (reset) {
            cursor = null;
            isEnd = false;
            resetBoardList();
        }

        const result =
            await getBoardItem(
                cursor,
                ITEMS_PER_LOAD
            );

        const pageData =
            result.data ?? result;

        const items =
            pageData.posts ?? [];

        if (items.length === 0) {
            isEnd = !pageData.hasNext;
            return;
        }

        setBoardItem(items);

        cursor =
            pageData.nextCursor;

        isEnd =
            !pageData.hasNext;

    } catch (error) {
        console.error(
            'Error fetching items:',
            error
        );

        isEnd = true;

    } finally {
        isProcessing = false;
    }
};

const loadWeeklyPopularPosts = async () => {
    if (isProcessing) return;

    isProcessing = true;

    try {
        resetBoardList();

        const result =
            await getWeeklyPopularPosts();

        const items =
            result.data ?? result;

        setBoardItem(items);

        cursor = null;
        isEnd = true;
    } catch (error) {
        console.error(
            '주간 인기글 조회 실패:',
            error,
        );
    } finally {
        isProcessing = false;
    }
};

const addSearchEvent = () => {
    const searchInput = document.querySelector('#searchInput');
    const searchButton = document.querySelector('.searchButton');
    if (!searchInput || !searchButton) return;

    const runSearch = async () => {
        const trimmedKeyword =
            searchInput.value.trim();

        if (trimmedKeyword.length < 2) {
            Dialog(
                '검색 실패',
                '검색어는 2글자 이상 입력해주세요.'
            );
            return;
        }

        currentKeyword = trimmedKeyword;
        switchToAllPostsMode();

        updateSortVisibility();

        await loadBoardItems({ reset: true });
    };

    searchButton.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
    });
};

const addSearchTypeEvent = () => {
    const searchTypeSelect =
        document.querySelector(
            '#searchTypeSelect'
        );

    if (!searchTypeSelect) return;

    searchTypeSelect.value =
        currentSearchType;

    searchTypeSelect.addEventListener(
        'change',
        async () => {

            const selectedSearchType =
                searchTypeSelect.value;

            currentSearchType =
                SEARCH_TYPES.includes(selectedSearchType)
                    ? selectedSearchType
                    : DEFAULT_SEARCH_TYPE;

            // 검색 결과를 보고 있는 경우
            // 검색 범위 변경 즉시 다시 조회
            if (currentKeyword.trim() !== '') {
                switchToAllPostsMode();
                await loadBoardItems({
                    reset: true
                });
            }
        }
    );
};

const addSortEvent = () => {
    const sortSelect = document.querySelector('#searchSortSelect');

    if (!sortSelect) return;

    sortSelect.value = currentSort;

    sortSelect.addEventListener('change', async () => {
        const selectedSort =
            sortSelect.value || DEFAULT_SORT;

        currentSort =
            SORT_TYPES.includes(selectedSort)
                ? selectedSort
                : DEFAULT_SORT;

        switchToAllPostsMode();
        updateSortQuery(currentSort);

        await loadBoardItems({
            reset: true
        });
    });
};

// 스크롤 이벤트 추가
const addInfinityScrollEvent = () => {
    window.addEventListener('scroll', async () => {
        if (currentBoardMode === BOARD_MODES.POPULAR) {
            return;
        }

        const hasScrolledToThreshold =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight *
            SCROLL_THRESHOLD;

        if (hasScrolledToThreshold) {
            loadBoardItems();
        }
    });
};

const addWriteEvent = isLoggedIn => {
    const writeBtn = document.querySelector('#writeBtn')
        || document.querySelector('.writeBtn')
        || document.querySelector('.searchButton + button')
        || document.querySelector('.searchButton + a')
        || Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('게시글 작성'));

    if (!writeBtn) return;

    writeBtn.addEventListener('click', event => {
        if (!isLoggedIn) {
            event.preventDefault();
            Dialog('로그인 필요', '로그인이 필요한 기능입니다. 로그인 하시겠습니까?', () => {
                window.location.href = '/html/login.html';
            });
        }
    });
};

const addBoardTabEvent = () => {
    const allPostsTab =
        document.querySelector('#allPostsTab');

    const weeklyPopularTab =
        document.querySelector('#weeklyPopularTab');

    if (!allPostsTab || !weeklyPopularTab) return;

    allPostsTab.addEventListener(
        'click',
        async () => {

            if (currentBoardMode === BOARD_MODES.ALL) {
                return;
            }

            currentKeyword = '';
            document.querySelector('#searchInput').value = '';
            switchToAllPostsMode();
            await loadBoardItems({
                reset: true,
            });
        },
    );

    weeklyPopularTab.addEventListener(
        'click',
        async () => {
            if (
                currentBoardMode ===
                BOARD_MODES.POPULAR
            ) {
                return;
            }

            switchToPopularMode();
            await loadWeeklyPopularPosts();
        },
    );
};

const switchToAllPostsMode = () => {
    currentBoardMode = BOARD_MODES.ALL;

    cursor = null;
    isEnd = false;

    document
        .querySelector('#allPostsTab')
        ?.classList.add('active');

    document
        .querySelector('#weeklyPopularTab')
        ?.classList.remove('active');
};

const switchToPopularMode = () => {
    currentBoardMode = BOARD_MODES.POPULAR;

    cursor = null;
    isEnd = true;

    document
        .querySelector('#weeklyPopularTab')
        ?.classList.add('active');

    document
        .querySelector('#allPostsTab')
        ?.classList.remove('active');
};


const saveBoardState = () => {
    const boardList =
        document.querySelector('.boardList');

    if (!boardList) return;

    sessionStorage.setItem(
        BOARD_STATE_KEY,
        JSON.stringify({
            boardMode: currentBoardMode,
            scrollY: window.scrollY,
            cursor,
            isEnd,
            keyword: currentKeyword,
            searchType: currentSearchType,
            sort: currentSort,
            html: boardList.innerHTML,
        })
    );
};

const addBoardItemClickEvent = () => {
    document.addEventListener('click', event => {
        const boardItem =
            event.target.closest('.boardItem');

        if (!boardItem) return;

        saveBoardState();
    });
};

const restoreBoardState = () => {
    const savedState =
        sessionStorage.getItem(
            BOARD_STATE_KEY
        );

    if (!savedState) {
        return false;
    }

    try {
        const state = JSON.parse(savedState);

        currentBoardMode = state.boardMode ?? BOARD_MODES.ALL;

        currentKeyword = state.keyword ?? '';

        currentSearchType = state.searchType ?? DEFAULT_SEARCH_TYPE;

        currentSort =
            SORT_TYPES.includes(state.sort)
                ? state.sort
                : DEFAULT_SORT;

        cursor = state.cursor ?? null;

        isEnd = state.isEnd ?? false;

        const boardList = document.querySelector('.boardList');

        if (boardList) {
            boardList.innerHTML = state.html ?? '';
        }

        const searchInput = document.querySelector('#searchInput');

        if (searchInput) {
            searchInput.value = currentKeyword;
        }

        const searchTypeSelect = document.querySelector('#searchTypeSelect');

        if (searchTypeSelect) {
            searchTypeSelect.value = currentSearchType;
        }

        const sortSelect =
            document.querySelector('#searchSortSelect');

        if (sortSelect) {
            sortSelect.value = currentSort;
        }

        if (
            currentBoardMode === BOARD_MODES.POPULAR
        ) {
            switchToPopularMode();
        } else {
            switchToAllPostsMode();

            // switchToAllPostsMode에서 cursor/isEnd를 초기화하므로 복원
            cursor = state.cursor ?? null;

            isEnd = state.isEnd ?? false;
        }

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.scrollTo({
                    top: state.scrollY ?? 0,
                    left: 0,
                    behavior: 'auto',
                });
            });
        });

        sessionStorage.removeItem(
            BOARD_STATE_KEY
        );

        return true;

    } catch (error) {
        console.error(
            '게시글 목록 상태 복원 실패:',
            error
        );

        sessionStorage.removeItem(
            BOARD_STATE_KEY
        );

        return false;
    }
};

const init = async () => {
    try {
        const res = await serverSessionCheck();

        let profileFileUrl = DEFAULT_PROFILE_IMAGE;
        let isLoggedIn = false;

        if (requestedSort && !SORT_TYPES.includes(requestedSort)) {
            updateSortQuery(DEFAULT_SORT);
        }

        if (res && res.ok) {
            const data = await res.json();

            profileFileUrl = resolveImageUrl(
                data.data.profileFileUrl,
                DEFAULT_PROFILE_IMAGE
            );

            isLoggedIn = true;
        }

        prependChild(
            document.body,
            Header('LOVEY DOGGY', 0, profileFileUrl, isLoggedIn)
        );

        updateSortVisibility();

        const restored =
            restoreBoardState();

        if (!restored) {
            await loadBoardItems({
                reset: true
            });
        }

        addSearchEvent();
        addSearchTypeEvent();
        addSortEvent();
        addInfinityScrollEvent();
        addWriteEvent(isLoggedIn);
        addBoardTabEvent();
        addBoardItemClickEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();