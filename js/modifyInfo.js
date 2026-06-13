import { checkNickname, fileUpload } from '../api/signupRequest.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, prependChild, getServerUrl, resolveImageUrl, validNickname } from '../utils/function.js';
import { userModify, userDelete } from '../api/modifyInfoRequest.js';
import { requestJson } from '../utils/request.js';

const emailTextElement = document.querySelector('#id');
const nicknameInputElement = document.querySelector('#nickname');
const profileInputElement = document.querySelector('#profile');
const withdrawBtnElement = document.querySelector('#withdrawBtn');
const nicknameHelpElement = document.querySelector('.inputBox p[name="nickname"]');
const resultElement = document.querySelector('.inputBox p[name="result"]');
const modifyBtnElement = document.querySelector('#signupBtn');
const profilePreview = document.querySelector('#profilePreview');
const removeProfileButton = document.querySelector('#removeProfileButton');

let authData = null;
let selectedFile = null;
const changeData = {
    nickname: '',
    profileImageUrl: null,
};

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;

const setData = data => {
    if (emailTextElement) emailTextElement.textContent = data.email;
    if (nicknameInputElement) nicknameInputElement.value = data.nickname;

    if (profilePreview) {
        let url = data.profileFileUrl || data.profileImageUrl;
        if (url) {
            url = url.replace(/\\/g, '/');
            if (!url.startsWith('/')) {
                url = '/' + url;
            }
        }

        if (!url) {
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
            if (removeProfileButton) removeProfileButton.style.display = 'none';
        } else {
            const resolvedUrl = resolveImageUrl(url, DEFAULT_PROFILE_IMAGE);
            profilePreview.src = resolvedUrl;
            if (removeProfileButton) removeProfileButton.style.display = 'flex';
            localStorage.setItem('profileImageUrl', url);

            const fileName = url.split('/').pop();
            try {
                const profileImage = new File([resolvedUrl], fileName, { type: '' });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(profileImage);
                if (profileInputElement) profileInputElement.files = dataTransfer.files;
            } catch (error) {
                console.error(error);
            }
        }
    }
};

const observeData = () => {
    const button = document.querySelector('#signupBtn');
    if (!button || !authData) return;

    const authUrl = authData.data.profileFileUrl || authData.data.profileImageUrl || null;

    if (authData.data.nickname !== changeData.nickname || authUrl !== changeData.profileImageUrl) {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    } else {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    }
};

const changeEventHandler = async (event, uid) => {
    const button = document.querySelector('#signupBtn');
    if (uid == 'nickname') {
        const value = event.target.value;
        const isValidNickname = validNickname(value);
        const helperElement = nicknameHelpElement;

        if (value == '' || value == null) {
            helperElement.textContent = '*닉네임을 입력해주세요.';
            changeData.nickname = '';
        } else if (!isValidNickname) {
            helperElement.textContent = '*닉네임은 2~10자의 영문자, 한글 또는 숫자만 사용할 수 있습니다. 특수 문자와 띄어쓰기는 사용할 수 없습니다.';
            changeData.nickname = '';
        } else {
            helperElement.textContent = '';
            changeData.nickname = value;
        }
    } else if (uid == 'profile') {
        const file = event.target.files[0];
        if (!file) {
            localStorage.removeItem('profileImageUrl');
            if (profilePreview) profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profileImageUrl = null;
            selectedFile = null;
            if (removeProfileButton) removeProfileButton.style.display = 'none';
        } else {
            selectedFile = file;
            if (profilePreview) {
                profilePreview.src = URL.createObjectURL(file);
                changeData.profileImageUrl = profilePreview.src;
            }
            if (removeProfileButton) removeProfileButton.style.display = 'flex';
        }
    }
    observeData();
};

const sendModifyData = async () => {
    const button = document.querySelector('#signupBtn');
    if (button && !button.disabled) {
        if (changeData.nickname === '') {
            Dialog('필수 정보 누락', '닉네임을 입력해주세요.');
        } else {
            const { ok } = await userModify(authData.data.userId, { nickname: changeData.nickname });
            if (ok) {
                const currentAuthUrl = authData.data.profileFileUrl || authData.data.profileImageUrl;
                if (selectedFile) {
                    const uploadResult = await fileUpload(authData.data.userId, selectedFile);
                    if (!uploadResult.ok) {
                        Dialog('업로드 실패', uploadResult.body?.message || '프로필 이미지 업로드에 실패했습니다.');
                        return;
                    }
                } else if (!changeData.profileImageUrl && currentAuthUrl) {
                    const deleteResult = await requestJson(`${getServerUrl()}/users/${authData.data.userId}/files`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    if (!deleteResult.ok) {
                        Dialog('삭제 실패', deleteResult.body?.message || '프로필 이미지 삭제에 실패했습니다.');
                        return;
                    }
                }
                localStorage.removeItem('profileImageUrl');
                saveToastMessage('수정완료');
                location.href = '/html/modifyInfo.html';
            } else {
                localStorage.removeItem('profileImageUrl');
                saveToastMessage('수정실패');
                location.href = '/html/modifyInfo.html';
            }
        }
    }
};

// 회원 탈퇴
const deleteAccount = async () => {
    const callback = async () => {
        const { status } = await userDelete(authData.data.userId);
        if (status === HTTP_OK) {
            try {
                await fetch(`${getServerUrl()}/auth`, {
                    method: 'DELETE',
                    credentials: 'include',
                });
            } catch (error) {
                console.error('로그아웃 요청 실패:', error);
            }
            location.href = '/html/login.html';
        } else {
            Dialog('회원 탈퇴 실패', '회원 탈퇴에 실패했습니다.');
        }
    };
    Dialog('회원탈퇴 하시겠습니까?', '작성된 게시글과 댓글은 보존됩니다.', callback);
};

const addEvent = () => {
    if (nicknameInputElement) {
        nicknameInputElement.addEventListener('input', event => changeEventHandler(event, 'nickname'));
    }
    if (profileInputElement) {
        profileInputElement.addEventListener('change', event => changeEventHandler(event, 'profile'));
    }
    if (removeProfileButton) {
        removeProfileButton.addEventListener('click', () => {
            localStorage.removeItem('profileImageUrl');
            if (profilePreview) profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profileImageUrl = null;
            selectedFile = null;
            if (profileInputElement) profileInputElement.value = '';
            removeProfileButton.style.display = 'none';
            observeData();
        });
    }
    if (modifyBtnElement) {
        modifyBtnElement.addEventListener('click', async (event) => {
            event.preventDefault();
            await sendModifyData();
        });
    }
    if (withdrawBtnElement) withdrawBtnElement.addEventListener('click', async () => deleteAccount());
};

const showToast = (message, duration = 3000, callback = null) => {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.classList.add('toastMessage');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = 1;
        toast.style.bottom = '30px';
    }, 100);

    setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.bottom = '20px';
        setTimeout(() => {
            toast.remove();
            if (callback) callback();
        }, 500);
    }, duration);
};

const saveToastMessage = message => {
    sessionStorage.setItem('toastMessage', message);
};

// 토스트 메시지 표시 및 저장소에서 삭제
const displayToastFromStorage = () => {
    const message = sessionStorage.getItem('toastMessage');
    if (message) {
        showToast(message, 3000, () => {
            sessionStorage.removeItem('toastMessage');
        });
    }
};

const init = async () => {
    const authDataReponse = await authCheck();
    authData = await authDataReponse.json();

    const userResponse = await requestJson(`${getServerUrl()}/users/${authData.data.userId}`, {
        method: 'GET',
        credentials: 'include'
    });

    if (userResponse.ok && userResponse.data) {
        const initialUrl = userResponse.data.profileFileUrl || userResponse.data.profileImageUrl || null;
        changeData.nickname = userResponse.data.nickname;
        changeData.profileImageUrl = initialUrl;

        let url = initialUrl;
        if (url) {
            url = url.replace(/\\/g, '/');
            if (!url.startsWith('/')) {
                url = '/' + url;
            }
        }

        const profileImage = resolveImageUrl(url, DEFAULT_PROFILE_IMAGE);
        prependChild(document.body, Header('커뮤니티', 1, profileImage, true));
        setData(userResponse.data);
    } else {
        const initialUrl = authData.data.profileFileUrl || authData.data.profileImageUrl || null;
        changeData.nickname = authData.data.nickname;
        changeData.profileImageUrl = initialUrl;

        let url = initialUrl;
        if (url) {
            url = url.replace(/\\/g, '/');
            if (!url.startsWith('/')) {
                url = '/' + url;
            }
        }

        const profileImage = resolveImageUrl(url, DEFAULT_PROFILE_IMAGE);
        prependChild(document.body, Header('커뮤니티', 1, profileImage, true));
        setData(authData.data);
    }

    observeData();
    addEvent();
    displayToastFromStorage();
};

init();