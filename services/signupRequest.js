import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userSignup = async data => {
    const result = await requestJson(`${getServerUrl()}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    return result;
};

export const fileUpload = async (userId, file) => {
    const formData = new FormData();

    formData.append('file', file);

    const result = await requestJson(
        `${getServerUrl()}/users/${userId}/files`,
        {
            method: 'POST',
            credentials: 'include',
            body: formData,
        }
    );

    return result;
};

export const checkEmail = email => {
    return requestJson(
        `${getServerUrl()}/users/check-email?email=${encodeURIComponent(email)}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );
};

export const checkNickname = nickname => {
    return requestJson(
        `${getServerUrl()}/users/check-nickname?nickname=${encodeURIComponent(nickname)}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );
};