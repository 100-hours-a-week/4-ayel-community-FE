import CommentItem from '../component/comment/comment.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, prependChild, padTo2Digits, resolveImageUrl } from '../utils/function.js';
import { getPost, deletePost, writeComment, getComments, likePost, unlikePost } from '../services/boardRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const MAX_COMMENT_LENGTH = 500;
const HTTP_NOT_AUTHORIZED = 401;
const HTTP_OK = 200;

const formatCount = value => {
    const count = Number(value);
    if (!Number.isFinite(count)) return value ?? '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
};

const setLikeButtonState = (button, isLiked) => {
    button.classList.toggle('is-active', isLiked);
    button.setAttribute('aria-pressed', isLiked ? 'true' : 'false');
};

const getQueryString = name => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

const getBoardDetail = async postId => {
    const { ok, data } = await getPost(postId);
    if (!ok) throw new Error('게시글 정보를 가져오는데 실패하였습니다.');
    return data;
};

const setBoardDetail = data => {
    // 헤드 정보
    const titleElement = document.querySelector('.title');
    const createdAtElement = document.querySelector('.createdAt');
    const imgElement = document.querySelector('.img');
    const nicknameElement = document.querySelector('.nickname');

    titleElement.textContent = data.title;
    const date = new Date(data.createdAt);
    const formattedDate = `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`;
    createdAtElement.textContent = formattedDate;

    const writerImgUrl = data.profileFileUrl ||
        data.writer?.profileFileUrl ||
        data.user?.profileFileUrl

    imgElement.src = resolveImageUrl(writerImgUrl, DEFAULT_PROFILE_IMAGE);
    nicknameElement.textContent = data.nickname;

    // 바디 정보
    const contentImgElement = document.querySelector('.contentImg');

    // 기존 이미지 제거
    contentImgElement.innerHTML = '';

    if (data.fileUrls && data.fileUrls.length > 0) {

        data.fileUrls.forEach(fileUrl => {

            const img = document.createElement('img');

            img.src = fileUrl;

            contentImgElement.appendChild(img);

        });

    }
    const contentElement = document.querySelector('.content');
    contentElement.textContent = data.content;

    const likeButtonElement = document.querySelector('.likeButton');
    const likeCountElement = likeButtonElement.querySelector('h3');

    let isLiked = data.isLiked ?? false;
    let isLikeLoading = false;

    likeCountElement.textContent = formatCount(data.likeCount);
    setLikeButtonState(likeButtonElement, isLiked);

    likeButtonElement.addEventListener('click', async () => {
        if (isLikeLoading) return;
        isLikeLoading = true;

        try {
            if (!isLiked) {
                const result = await likePost(data.postId);
                if (result.ok) {
                    isLiked = true;
                    const currentCount = Number(likeCountElement.textContent.replace(/,/g, ''));
                    likeCountElement.textContent = formatCount(currentCount + 1);
                    setLikeButtonState(likeButtonElement, isLiked);
                } else if (result.status === 409 || (result.body && result.body.message && result.body.message.includes('이미 좋아요'))) {
                    isLiked = true;
                    setLikeButtonState(likeButtonElement, isLiked);
                } else if (result.status === HTTP_NOT_AUTHORIZED) {
                    Dialog('로그인 필요', '로그인이 필요한 기능입니다. 로그인 하시겠습니까?', () => {
                        window.location.href = '/html/login.html';
                    });
                } else {
                    Dialog('좋아요 실패', '좋아요 처리에 실패하였습니다.');
                }
            } else {
                const result = await unlikePost(data.postId);
                if (result.ok) {
                    isLiked = false;
                    const currentCount = Number(likeCountElement.textContent.replace(/,/g, ''));
                    likeCountElement.textContent = formatCount(Math.max(0, currentCount - 1));
                    setLikeButtonState(likeButtonElement, isLiked);
                } else if (result.status === 409 || (result.body && result.body.message && (result.body.message.includes('누르지 않은') || result.body.message.includes('이미 좋아요 취소')))) {
                    isLiked = false;
                    setLikeButtonState(likeButtonElement, isLiked);
                } else if (result.status === HTTP_NOT_AUTHORIZED) {
                    Dialog('로그인 필요', '로그인이 필요한 기능입니다. 로그인 페이지로 이동하시겠습니까?', () => {
                        window.location.href = '/html/login.html';
                    });
                } else {
                    Dialog('좋아요 취소 실패', '좋아요 취소에 실패하였습니다.');
                }
            }
        } finally {
            isLikeLoading = false;
        }
    });

    const viewCountElement = document.querySelector('.viewCount h3');
    viewCountElement.textContent = formatCount(data.viewCount);

    const commentCountElement = document.querySelector('.commentCount h3');
    commentCountElement.textContent = data.commentCount.toLocaleString();
};

const setBoardModify = async data => {
    const modifyElement = document.querySelector('.hidden');
    modifyElement.classList.remove('hidden');

    const modifyBtnElement = document.querySelector('#deleteBtn');
    const postId = getQueryString('id');
    modifyBtnElement.addEventListener('click', () => {
        Dialog('게시글을 삭제하시겠습니까?', '삭제한 내용은 복구 할 수 없습니다.', async () => {
            const { ok } = await deletePost(postId);
            if (ok) {
                window.location.href = '/';
            } else {
                Dialog('삭제 실패', '게시글 삭제에 실패하였습니다.');
            }
        });
    });

    const modifyBtnElement2 = document.querySelector('#modifyBtn');
    modifyBtnElement2.addEventListener('click', () => {
        window.location.href = `/html/board-modify.html?postId=${data.postId}`;
    });
};

const getBoardComment = async id => {
    const { ok, status, data } = await getComments(id);
    if (!ok) return [];
    if (status !== HTTP_OK) return [];
    return Array.isArray(data) ? data : data?.comments ?? data?.data ?? [];
};

const setBoardComment = (data, myInfo) => {
    const commentListElement = document.querySelector('.commentList');
    if (!commentListElement) return;

    const comments = Array.isArray(data) ? data : [];
    comments.forEach(comment => {
        const commentUrl =
            comment.profileFileUrl ||
            comment.writer?.profileFileUrl ||
            comment.user?.profileFileUrl;

        comment.profileFileUrl = commentUrl;

        const item = CommentItem(comment, myInfo?.userId, getQueryString('id'), comment.commentId);
        commentListElement.appendChild(item);
    });
};

const addComment = async () => {
    const comment = document.querySelector('textarea').value;
    const pageId = getQueryString('id');
    const { ok } = await writeComment(pageId, comment);

    if (ok) {
        window.location.reload();
    } else {
        Dialog('댓글 등록 실패', '댓글 등록에 실패하였습니다.');
    }
};

const inputComment = async () => {
    const textareaElement = document.querySelector('.commentInputWrap textarea');
    const commentBtnElement = document.querySelector('.commentInputBtn');

    if (textareaElement.value.length > MAX_COMMENT_LENGTH) {
        textareaElement.value = textareaElement.value.substring(0, MAX_COMMENT_LENGTH);
        Dialog('글자 수 제한', '댓글은 최대 500자까지 작성 가능합니다.');
    }
    if (textareaElement.value === '') {
        commentBtnElement.disabled = true;
        commentBtnElement.style.backgroundColor = '#ACA0EB';
    } else {
        commentBtnElement.disabled = false;
        commentBtnElement.style.backgroundColor = '#7F6AEE';
    }
};

const init = async () => {
    try {
        const res = await authCheck();
        let myInfo = null;
        let profileImage = DEFAULT_PROFILE_IMAGE;
        let isLoggedIn = false;

        const commentBtnElement = document.querySelector('.commentInputBtn');
        const textareaElement = document.querySelector('.commentInputWrap textarea');

        if (res.status === HTTP_OK) {
            const myInfoResult = await res.json();
            myInfo = myInfoResult.data;

            textareaElement.addEventListener('input', inputComment);
            commentBtnElement.addEventListener('click', addComment);
            commentBtnElement.disabled = true;

            profileImage = resolveImageUrl(
                myInfo.profileFileUrl,
                DEFAULT_PROFILE_IMAGE
            );

            isLoggedIn = true;

        } else {
            textareaElement.placeholder = '로그인 후 댓글을 작성할 수 있습니다.';
            textareaElement.disabled = true;
            commentBtnElement.disabled = true;
        }

        prependChild(document.body, Header('커뮤니티', 2, profileImage, isLoggedIn));

        const pageId = getQueryString('id');
        const pageData = await getBoardDetail(pageId);
        console.log(pageData);

        if (myInfo && parseInt(pageData.userId, 10) === parseInt(myInfo.userId, 10)) {
            setBoardModify(pageData, myInfo);
        }
        setBoardDetail(pageData);

        getBoardComment(pageId).then(data => setBoardComment(data, myInfo));
    } catch (error) {
        console.error(error);
    }
};

init();