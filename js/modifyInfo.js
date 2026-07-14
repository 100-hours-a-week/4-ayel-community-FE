import {getPresignedUrl, } from '../services/signupRequest.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {authCheck, getServerUrl, prependChild, resolveImageUrl, validNickname,} from '../utils/function.js';
import { userModify, userDelete } from '../services/modifyInfoRequest.js';
import { requestJson } from '../utils/request.js';

const emailTextElement = document.querySelector('#id');
const nicknameInputElement = document.querySelector('#nickname');
const profileInputElement = document.querySelector('#profile');
const withdrawBtnElement = document.querySelector('#withdrawBtn');
const nicknameHelpElement = document.querySelector('.inputBox p[name="nickname"]');
const modifyBtnElement = document.querySelector('#signupBtn');
const profilePreview = document.querySelector('#profilePreview');
const removeProfileButton = document.querySelector('#removeProfileButton');

let authData = null;
let selectedFile = null;

const changeData = {
    nickname: '',
    profileFileUrl: null,
};

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;

const setData = data => {
    if (emailTextElement) {
        emailTextElement.textContent = data.email;
    }

    if (nicknameInputElement) {
        nicknameInputElement.value = data.nickname;
    }

    if (profilePreview) {
        const url = data.profileFileUrl;

        if (!url) {
            profilePreview.src = DEFAULT_PROFILE_IMAGE;

            if (removeProfileButton) {
                removeProfileButton.style.display = 'none';
            }
        } else {
            profilePreview.src = resolveImageUrl(
                url,
                DEFAULT_PROFILE_IMAGE
            );

            if (removeProfileButton) {
                removeProfileButton.style.display = 'flex';
            }
        }
    }
};

const observeData = () => {
    if (!modifyBtnElement || !authData) return;

    const isNicknameChanged =
        authData.data.nickname !== changeData.nickname &&
        changeData.nickname !== '';

    const isProfileRemoved =
        authData.data.profileFileUrl !== null &&
        changeData.profileFileUrl === null;

    const isChanged =
        isNicknameChanged ||
        selectedFile !== null ||
        isProfileRemoved;

    modifyBtnElement.disabled = !isChanged;
    modifyBtnElement.style.backgroundColor =
        isChanged ? '#7F6AEE' : '#ACA0EB';
};

const changeEventHandler = async (event, uid) => {
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
            return;
        }

        selectedFile = file;

        if (profilePreview) {
            profilePreview.src = URL.createObjectURL(file);
        }

        if (removeProfileButton) {
            removeProfileButton.style.display = 'flex';
        }
    }

    observeData();
};

const sendModifyData = async () => {
    if (!modifyBtnElement || modifyBtnElement.disabled) {
        return;
    }

    if (changeData.nickname === '') {
        return Dialog(
            '필수 정보 누락',
            '닉네임을 입력해주세요.'
        );
    }

    let profileFileUrl = null;

    // 새 프로필 선택 시 S3 업로드
    if (selectedFile) {
        const { ok, data } = await getPresignedUrl(selectedFile);
        if (!ok) {
            return Dialog(
                '업로드 실패',
                '업로드에 실패했습니다.'
            );
        }
        const uploadResponse = await fetch(
            data.presignedUrl, {method: 'PUT',
                headers: {
                    'Content-Type': selectedFile.type,
                },
                body: selectedFile,
            });

        if (!uploadResponse.ok) {
            return Dialog(
                '업로드 실패',
                '업로드에 실패했습니다.'
            );
        }

        profileFileUrl = data.fileUrl;
    } else {
        profileFileUrl = changeData.profileFileUrl;
    }

    const result = await userModify(
        authData.data.userId,
        {
            nickname: changeData.nickname,
            profileFileUrl,
        }
    );

    console.log('===== PATCH RESULT =====');
    console.log(result);

    if (result.ok) {
        selectedFile = null;
        changeData.profileFileUrl = profileFileUrl;

        saveToastMessage('수정완료');
        location.href = '/html/modifyInfo.html';
    } else {
        console.log('status =', result.status);
        console.log('code =', result.code);
        console.log('body =', result.body);

        saveToastMessage('수정실패');
        location.href = '/html/modifyInfo.html';
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
            if (profilePreview) {
                profilePreview.src = DEFAULT_PROFILE_IMAGE;
            }

            changeData.profileFileUrl = null;
            selectedFile = null;

            if (profileInputElement) {
                profileInputElement.value = '';
            }

            if (removeProfileButton) {
                removeProfileButton.style.display = 'none';
            }

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
        const initialUrl = userResponse.data.profileFileUrl ?? null;
        changeData.nickname = userResponse.data.nickname;
        changeData.profileFileUrl = initialUrl;

        const profileImage = resolveImageUrl(
            initialUrl,
            DEFAULT_PROFILE_IMAGE
        );
        prependChild(document.body, Header('커뮤니티', 1, profileImage, true));
        setData(userResponse.data);
    } else {
        const initialUrl = authData.data.profileFileUrl ?? null;
        changeData.nickname = authData.data.nickname;
        changeData.profileFileUrl = initialUrl;

        const profileImage = resolveImageUrl(
            initialUrl,
            DEFAULT_PROFILE_IMAGE
        );

        prependChild(document.body, Header('커뮤니티', 1, profileImage, true));
        setData(authData.data);
    }

    observeData();
    addEvent();
    displayToastFromStorage();
};

init();