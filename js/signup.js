import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheckReverse, prependChild, validEmail, validPassword, validNickname } from '../utils/function.js';
import { userSignup, checkEmail, checkNickname, getPresignedUrl, } from '../services/signupRequest.js';

const MAX_PASSWORD_LENGTH = 20;
const HTTP_CREATED = 201;

let selectedFile = null;
let isEmailValid = false;
let isNicknameValid = false;

const signupData = {
    email: '',
    password: '',
    nickname: '',
    passwordConfirm: '',
    profileFileUrl: undefined,
};

const getSignupData = (event) => {
    if (event) event.preventDefault();

    const { email, password, passwordConfirm, nickname } = signupData;
    if (!email || !password || !passwordConfirm || !nickname || !isEmailValid || !isNicknameValid) {
        Dialog('필수 입력 사항', '모든 값을 입력해주세요.');
        return false;
    }

    sendSignupData();
};

const sendSignupData = async () => {
    const props = { ...signupData };

    if (props.password.length > MAX_PASSWORD_LENGTH) {
        Dialog('비밀번호', '비밀번호는 20자 이하로 입력해주세요.');
        return;
    }

    // 프로필 업로드
    if (selectedFile) {

        const { ok, data } =
            await getPresignedUrl(selectedFile);

        if (!ok) {
            return Dialog(
                '업로드 실패',
                '파일 업로드에 실패했습니다.'
            );
        }

        const uploadResponse =
            await fetch(data.presignedUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': selectedFile.type,
                },
                body: selectedFile,
            });

        if (!uploadResponse.ok) {
            return Dialog(
                '업로드 실패',
                '파일 업로드에 실패했습니다.'
            );
        }

        props.profileFileUrl = data.fileUrl;
    }

    const { status, body } =
        await userSignup(props);

    if (status === HTTP_CREATED) {

        location.href = '/html/login.html';

    } else {

        Dialog(
            '회원 가입 실패',
            body?.message ??
            '잠시 뒤 다시 시도해 주세요'
        );
    }
};

const signupClick = () => {
    const signupBtn = document.querySelector('#signupBtn');
    signupBtn.addEventListener('click', (event) => getSignupData(event));
};

const changeEventHandler = async (event, uid) => {
    if (uid == 'profile') {
        const file = event.target.files[0];
        if (!file) return;

        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);
        helperElement.textContent = '';
    }
    observeSignupData();
};

const inputEventHandler = async (event, uid) => {
    if (uid == 'email') {
        const value = event.target.value;
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);

        if (!helperElement) return;

        if (!value) {
            helperElement.textContent = '*이메일을 입력해주세요.';
            isEmailValid = false;
            signupData.email = '';
        } else if (!validEmail(value)) {
            helperElement.textContent =
                '*올바른 이메일 주소 형식을 입력해주세요.';
            isEmailValid = false;
            signupData.email = '';
        } else {
            signupData.email = value;

            try {
                const result = await checkEmail(value);

                if (result.data === true) {
                    helperElement.textContent = '*중복된 이메일 입니다.';
                    isEmailValid = false;
                } else {
                    helperElement.textContent = '';
                    isEmailValid = true;
                }
            } catch {
                isEmailValid = false;
            }
        }
    } else if (uid == 'pw') {
        const value = event.target.value;
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);
        const helperElementCheck = document.querySelector(`.inputBox p[name="pwck"]`);

        if (!helperElement) return;

        if (!value) {
            helperElement.textContent = '*비밀번호를 입력해주세요.';
            helperElementCheck.textContent = '';
        } else if (!validPassword(value)) {
            helperElement.textContent =
                '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
            helperElementCheck.textContent = '';
        } else {
            helperElement.textContent = '';
            signupData.password = value;
        }
    } else if (uid == 'pwck') {
        const value = event.target.value;
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);
        const password = signupData.password;

        if (!value) {
            helperElement.textContent = '*비밀번호 한번 더 입력해주세요.';
        } else if (password !== value) {
            helperElement.textContent = '*비밀번호가 다릅니다.';
        } else {
            signupData.passwordConfirm = value;
            helperElement.textContent = '';
        }
    } else if (uid == 'nickname') {
        const value = event.target.value;
        const helperElement = document.querySelector(`.inputBox p[name="${uid}"]`);

        if (!value) {
            helperElement.textContent = '*닉네임을 입력해주세요.';
            isNicknameValid = false;
            signupData.nickname = '';
        } else if (value.includes(' ')) {
            helperElement.textContent = '*띄어쓰기를 없애주세요.';
            isNicknameValid = false;
            signupData.nickname = '';
        } else if (value.length > 10) {
            helperElement.textContent = '*닉네임은 최대 10자까지 작성 가능합니다.';
            isNicknameValid = false;
            signupData.nickname = '';
        } else if (!validNickname(value)) {
            helperElement.textContent = '*닉네임에 특수 문자는 사용할 수 없습니다.';
            isNicknameValid = false;
            signupData.nickname = '';
        } else {
            signupData.nickname = value;

            try {
                const result = await checkNickname(value);

                if (result.data === true) {
                    helperElement.textContent = '*중복된 닉네임 입니다.';
                    isNicknameValid = false;
                } else {
                    helperElement.textContent = '';
                    isNicknameValid = true;
                }
            } catch {
                isNicknameValid = false;
            }
        }
    }

    observeSignupData();
};

const addEventForInputElements = () => {
    const InputElement = document.querySelectorAll('input');

    InputElement.forEach(element => {
        const id = element.id;

        if (id === 'profile') {
            element.addEventListener(
                'change',
                event => changeEventHandler(event, id)
            );
        } else {
            element.addEventListener(
                'input',
                event => inputEventHandler(event, id)
            );
        }
    });
};

const observeSignupData = () => {
    const { email, password, passwordConfirm, nickname } = signupData;
    const button = document.querySelector('#signupBtn');

    if (!email || !validEmail(email) || !isEmailValid || !password || !validPassword(password) || !nickname || !validNickname(nickname) || !isNicknameValid || !passwordConfirm || password !== passwordConfirm) {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    } else {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    }
};

const uploadProfileImage = () => {
    document
        .getElementById('profile')
        .addEventListener('change', event => {

            const file = event.target.files[0];

            if (!file) {
                return;
            }

            selectedFile = file;
        });
};

const init = async () => {
    await authCheckReverse();
    prependChild(document.body, Header('커뮤니티', 1));
    observeSignupData();
    addEventForInputElements();
    signupClick();
    uploadProfileImage();
};

init();