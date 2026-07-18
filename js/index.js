import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { serverSessionCheck, prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts, searchPosts } from '../services/indexRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const SCROLL_THRESHOLD = 0.9;
const ITEMS_PER_LOAD = 5;
const DEFAULT_SORT = 'recent';
let currentKeyword = '';
let currentSort = DEFAULT_SORT;
let cursor = null;
let isEnd = false;
let isProcessing = false;

const updateSortVisibility = () => {
    const sortRow = document.querySelector('#searchSortRow');
    if (!sortRow) return;
    const isSearching = currentKeyword.trim().length > 0;
    sortRow.classList.toggle('isHidden', !isSearching);
    sortRow.setAttribute('aria-hidden', String(!isSearching));
};

// getBoardItem 함수
const getBoardItem = async (cursorValue = null, limitValue = 5) => {
    const result = currentKeyword.trim() === ''
        ? await getPosts(cursorValue, limitValue)
        : await searchPosts(currentKeyword, cursorValue, limitValue, currentSort);

    if (!result.ok) throw new Error('Failed to load post list.');
    return result.data;
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

        const result = await getBoardItem(cursor, ITEMS_PER_LOAD);


        const items = result.posts ?? [];
        if (!items || items.length === 0) {
            isEnd = !result.hasNext;
            return;
        }

        setBoardItem(items);
        cursor = result.nextCursor;
        isEnd = !result.hasNext;
    } catch (error) {
        console.error('Error fetching items:', error);
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
        const trimmedKeyword = searchInput.value.trim();
        if (trimmedKeyword.length > 0 && trimmedKeyword.length < 2) {
            Dialog('검색 실패', '검색어는 2글자 이상 입력해주세요.');
            return;
        }
        currentKeyword = trimmedKeyword;
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

const addSortEvent = () => {
    const sortSelect = document.querySelector('#searchSortSelect');
    if (!sortSelect) return;
    sortSelect.value = currentSort;

    sortSelect.addEventListener('change', async () => {
        currentSort = sortSelect.value || DEFAULT_SORT;
        if (currentKeyword.trim().length === 0) return;
        await loadBoardItems({ reset: true });
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
        addSortEvent();
        addInfinityScrollEvent();
        addWriteEvent(isLoggedIn);
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();