import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, getQueryString, getServerUrl, prependChild, resolveImageUrl } from '../utils/function.js';
import { createPost, updatePost, getBoardItem, getPresignedUrl } from '../services/board-writeRequest.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const MAX_TITLE_LENGTH = 26;
const MAX_CONTENT_LENGTH = 1500;
const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';

const submitButton = document.querySelector('#submit');
const titleInput = document.querySelector('#title');
const contentInput = document.querySelector('#content');
const imageInput = document.querySelector('#image');
const imagePreviewList = document.getElementById('imagePreviewList');
const contentHelpElement = document.querySelector('.inputBox p[name="content"]');

const boardWrite = {
    title: '',
    content: '',
};

let isModifyMode = false;
let modifyData = {};
let selectedFiles = [];
let existingFiles = [];

const renderPreview = () => {imagePreviewList.innerHTML = '';

    // 기존 이미지
    existingFiles.forEach((fileUrl, index) => {
        const item = document.createElement('div');
        item.className = 'previewItem';

        const img = document.createElement('img');
        img.src = fileUrl;

        const button = document.createElement('button');
        button.textContent = '✕';

        button.onclick = () => {
            existingFiles.splice(index, 1);
            renderPreview();
        };

        item.appendChild(img);
        item.appendChild(button);
        imagePreviewList.appendChild(item);
    });

    // 새 이미지
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'previewItem';

        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);

        const button = document.createElement('button');
        button.textContent = '✕';

        button.onclick = () => {
            selectedFiles.splice(index, 1);
            renderPreview();
        };

        item.appendChild(img);
        item.appendChild(button);
        imagePreviewList.appendChild(item);
    });
};

const observeSignupData = () => {
    const { title, content } = boardWrite;
    if (!title || !content || title === '' || content === '') {
        submitButton.disabled = true;
        submitButton.style.backgroundColor = '#ACA0EB';
    } else {
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#7F6AEE';
    }
};

// 엘리먼트 값 가져오기 title, content
const getBoardData = () => {
    return {
        title: boardWrite.title,
        content: boardWrite.content,
    };
};

// 버튼 클릭시 이벤트
const addBoard = async () => {
    console.log('addBoard 실행');

    const boardData = getBoardData();

    if (!boardData) {
        return Dialog('게시글', '게시글을 입력해주세요.');
    }

    if (boardData.title.length > MAX_TITLE_LENGTH) {
        return Dialog('게시글', '제목은 26자 이하로 입력해주세요.');
    }

    // S3 업로드
    const uploadFilesToS3 = async () => {
        const fileUrls = [...existingFiles];

        for (const file of selectedFiles) {
            const { ok, data } = await getPresignedUrl(file);

            if (!ok) {
                Dialog(
                    '업로드 실패',
                    '파일 업로드에 실패했습니다.'
                );
                return null;
            }

            const uploadResponse = await fetch(data.presignedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': file.type,
                },
                body: file,
            });

            if (!uploadResponse.ok) {
                Dialog(
                    '업로드 실패',
                    '파일 업로드에 실패했습니다.'
                );
                return null;
            }

            fileUrls.push(data.fileUrl);
        }

        return fileUrls;
    };

    const fileUrls = await uploadFilesToS3();

    if (!Array.isArray(fileUrls)) {
        return;
    }

    if (!isModifyMode) {
        const { ok, status, data } = await createPost({
            title: boardData.title,
            content: boardData.content,
            fileUrls,
        });

        console.log('createPost 결과=', {
            ok,
            status,
            data,
        });

        if (!ok) {
            throw new Error('서버 응답 오류');
        }

        if (status === HTTP_CREATED) {
            window.location.href = `/html/board.html?id=${data.postId}`;
        } else {
            contentHelpElement.textContent =
                '제목, 내용을 모두 작성해주세요.';
        }
    } else {
        const postId = getQueryString('postId');

        const result = await updatePost(postId, {
            title: boardData.title,
            content: boardData.content,
            fileUrls,
        });

        console.log('===== PATCH RESULT =====');
        console.log(result);

        if (!result.ok) {
            console.log('status =', result.status);
            console.log('code =', result.code);
            console.log('body =', result.body);

            Dialog('게시글 수정 실패', JSON.stringify(result.body));
            return;
        }

        window.location.href = `/html/board.html?id=${postId}`;
    }
};

const changeEventHandler = async (event, uid) => {
    if (uid == 'title') {
        const value = event.target.value;
        const helperElement = contentHelpElement;

        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '제목을 입력해주세요.';
        } else if (value.length > MAX_TITLE_LENGTH) {
            helperElement.textContent = '제목은 26자 이하로 입력해주세요.';
            titleInput.value = value.substring(0, MAX_TITLE_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_TITLE_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }

    } else if (uid == 'content') {
        const value = event.target.value;
        const helperElement = contentHelpElement;

        if (!value || value == '') {
            boardWrite[uid] = '';
            helperElement.textContent = '내용을 입력해주세요.';
        } else if (value.length > MAX_CONTENT_LENGTH) {
            helperElement.textContent = '내용은 1500자 이하로 입력해주세요.';
            contentInput.value = value.substring(0, MAX_CONTENT_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_CONTENT_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }

    } else if (uid == 'image') {
        const newFiles = Array.from(event.target.files);

        if (newFiles.length === 0) {
            return;
        }

        // 기존 파일 유지 + 새 파일 추가
        selectedFiles.push(...newFiles);

        const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024;

        const totalSize = selectedFiles.reduce(
            (sum, file) => sum + file.size,
            0
        );

        if (totalSize > MAX_TOTAL_FILE_SIZE) {

            Dialog(
                '파일',
                '첨부 파일의 총 용량은 10MB를 초과할 수 없습니다.'
            );

            // 방금 추가한 파일만 제거
            selectedFiles.splice(selectedFiles.length - newFiles.length);

            renderPreview();

            imageInput.value = '';

            return;
        }

        renderPreview();

        // 같은 파일도 다시 선택 가능하도록 초기화
        imageInput.value = '';
    }

    observeSignupData();
};

// 수정모드시 사용하는 게시글 단건 정보 가져오기
const getBoardModifyData = async postId => {
    const { ok, data } = await getBoardItem(postId);
    if (!ok) throw new Error('서버 응답 오류');
    return data;
};

// 수정 모드인지 확인
const checkModifyMode = () => {
    const postId = getQueryString('postId');
    if (!postId) return false;
    return postId;
};

// 이벤트 등록
const addEvent = () => {
    submitButton.addEventListener('click', addBoard);
    titleInput.addEventListener('input', event => changeEventHandler(event, 'title'));
    contentInput.addEventListener('input', event => changeEventHandler(event, 'content'));
    imageInput.addEventListener('change', event => changeEventHandler(event, 'image'));
};

const setModifyData = data => {
    titleInput.value = data.title;
    contentInput.value = data.content;

    if (data.fileUrls && data.fileUrls.length > 0) {
        existingFiles = [...data.fileUrls];
        renderPreview();

    } else {
        // 이미지 파일이 없으면 미리보기 숨김
        imagePreviewList.innerHTML = '';
    }

    boardWrite.title = data.title;
    boardWrite.content = data.content;

    observeSignupData();
};

const init = async () => {
    const dataResponse = await authCheck();
    const data = await dataResponse.json();
    const modifyId = checkModifyMode();

    let url = data.data.profileFileUrl ?? null;
    if (url) {
        url = url.replace(/\\/g, '/');
        if (!url.startsWith('/') && !url.startsWith('blob:')) {
            url = '/' + url;
        }
    }

    const profileImage = resolveImageUrl(url, DEFAULT_PROFILE_IMAGE);

    prependChild(document.body, Header('커뮤니티', 1, profileImage, true));

    if (modifyId) {
        isModifyMode = true;
        modifyData = await getBoardModifyData(modifyId);

        if (parseInt(data.data.userId, 10) !== parseInt(modifyData.userId, 10)) {
            Dialog('권한 없음', '권한이 없습니다.', () => {
                window.location.href = '/';
            });
        } else {
            setModifyData(modifyData);
        }
    }

    addEvent();
};

init();