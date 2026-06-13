import { changePassword } from '../services/modifyPasswordRequest.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, getServerUrl, prependChild, resolveImageUrl, validPassword } from '../utils/function.js';

const button = document.querySelector('#signupBtn');
const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;

let authData = null;

const modifyData = {
    currentPassword: '',
    password: '',
    passwordCheck: '',
};

const observeData = () => {
    const { currentPassword, password, passwordCheck } = modifyData;
    const hasCurrentPwField = !!document.querySelector('#currentPassword');

    if ((hasCurrentPwField && !currentPassword) || !password || !passwordCheck || password !== passwordCheck) {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    } else {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    }
};

const blurEventHandler = async (event, uid) => {
    if (uid == 'currentPassword') {
        const value = event.target.value;
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);

        if (value == '' || value == null) {
            if (helperElement) helperElement.textContent = '*현재 비밀번호를 입력해주세요.';
            modifyData.currentPassword = '';
        } else {
            if (helperElement) helperElement.textContent = '';
            modifyData.currentPassword = value;
        }
    } else if (uid == 'pw') {
        const value = event.target.value;
        const isValidPassword = validPassword(value);
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);
        const helperElementCheck = document.querySelector(`.inputBox p[name="pwck"]`);

        if (!helperElement) return;

        if (value == '' || value == null) {
            helperElement.textContent = '*비밀번호를 입력해주세요.';
            helperElementCheck.textContent = '';
            modifyData.password = '';
        } else if (!isValidPassword) {
            helperElement.textContent = '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
            helperElementCheck.textContent = '';
            modifyData.password = '';
        } else {
            helperElement.textContent = '';
            modifyData.password = value;
        }
    } else if (uid == 'pwck') {
        const value = event.target.value;
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);
        const password = modifyData.password;

        if (value == '' || value == null) {
            helperElement.textContent = '*비밀번호 한번 더 입력해주세요.';
            modifyData.passwordCheck = '';
        } else if (password !== value) {
            helperElement.textContent = '*비밀번호가 다릅니다.';
            modifyData.passwordCheck = '';
        } else {
            modifyData.passwordCheck = value;
            helperElement.textContent = '';
        }
    }

    observeData();
};

const addEventForInputElements = () => {
    const InputElement = document.querySelectorAll('input');
    InputElement.forEach(element => {
        const id = element.id;
        element.addEventListener('input', event => blurEventHandler(event, id));
    });
};

const modifyPassword = async () => {
    const { currentPassword, password } = modifyData;
    const { ok } = await changePassword(authData.data.userId, currentPassword, password);

    if (ok) {
        sessionStorage.setItem('toastMessage', '수정완료');
        window.location.reload();
    } else {
        Dialog('비밀번호 변경 실패', '현재 비밀번호가 틀렸거나 변경 처리 중 오류가 발생했습니다.', () => {
            location.href = '/html/modifyPassword.html';
        });
    }
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

    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.zIndex = '9999';
    toast.style.transition = 'all 0.5s ease';
    toast.style.bottom = '20px';
    toast.style.opacity = '0';

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.bottom = '30px';
    }, 100);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.bottom = '20px';
        setTimeout(() => {
            toast.remove();
            if (callback) callback();
        }, 500);
    }, duration);
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
    const dataResponse = await authCheck();
    authData = await dataResponse.json();

    let url = localStorage.getItem('profileImageUrl') || authData.data.profileFileUrl || authData.data.profileImageUrl || null;
    if (url) {
        url = url.replace(/\\/g, '/');
        if (!url.startsWith('/') && !url.startsWith('blob:')) {
            url = '/' + url;
        }
    }

    const profileImage = resolveImageUrl(url, DEFAULT_PROFILE_IMAGE);

    button.addEventListener('click', modifyPassword);
    prependChild(document.body, Header('커뮤니티', 1, profileImage, true));
    addEventForInputElements();
    observeData();
    displayToastFromStorage();
};

init();