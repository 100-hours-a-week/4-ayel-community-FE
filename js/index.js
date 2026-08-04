import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { serverSessionCheck, prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts, searchPosts } from '../services/indexRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const SCROLL_THRESHOLD = 0.9;
const ITEMS_PER_LOAD = 5;
const DEFAULT_SORT = 'LATEST';
const SORT_TYPES = ['LATEST', 'POPULAR', 'LIKE', 'VIEW'];
const DEFAULT_SEARCH_TYPE = 'TITLE';
const SEARCH_TYPES = ['TITLE', 'TITLE_CONTENT', 'AUTHOR'];
const params = new URLSearchParams(window.location.search);
const requestedSort = params.get('sort');
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

    const popularOption =
        sortSelect.querySelector(
            'option[value="POPULAR"]'
        );

    if (popularOption) {
        popularOption.hidden =
            currentKeyword.trim().length > 0;
    }

    if (
        currentKeyword.trim().length > 0 &&
        currentSort === 'POPULAR'
    ) {
        currentSort = DEFAULT_SORT;
        sortSelect.value = currentSort;
    }
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

        // 검색에서는 주간 인기글 정렬 제외
        if (currentKeyword !== '' && currentSort === 'POPULAR') {
            currentSort = DEFAULT_SORT;
            updateSortQuery(currentSort);
        }

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
        const selectedSort = sortSelect.value || DEFAULT_SORT;

        // 검색 결과에서는 주간 인기글 정렬 제외
        if (
            currentKeyword.trim() !== '' &&
            selectedSort === 'POPULAR'
        ) {
            currentSort = DEFAULT_SORT;
            sortSelect.value = currentSort;
        } else {
            currentSort = selectedSort;
        }

        updateSortQuery(currentSort);

        await loadBoardItems({
            reset: true
        });
    });
};

// 스크롤 이벤트 추가
const addInfinityScrollEvent = () => {
    window.addEventListener('scroll', async () => {
        const hasScrolledToThreshold = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight * SCROLL_THRESHOLD;
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

const init = async () => {
    try {
        const res = await serverSessionCheck();

        let profileFileUrl = DEFAULT_PROFILE_IMAGE;
        let isLoggedIn = false;

        if (requestedSort && !SORT_TYPES.includes(requestedSort)) {
            updateSortQuery(DEFAULT_SORT);
        }

        if (res.ok) {
            const data = await res.json();

            profileFileUrl= resolveImageUrl(
                data.data.profileFileUrl,
                DEFAULT_PROFILE_IMAGE
            );

            isLoggedIn = true;
        }

        prependChild(
            document.body,
            Header('Community', 0, profileFileUrl, isLoggedIn)
        );

        updateSortVisibility();
        await loadBoardItems({ reset: true });

        addSearchEvent();
        addSearchTypeEvent();
        addSortEvent();
        addInfinityScrollEvent();
        addWriteEvent(isLoggedIn);
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();