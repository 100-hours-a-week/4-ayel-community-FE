import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userSignup = async data => {
    return requestJson(`${getServerUrl()}/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });
};

export const createPresignedUrl = file => {
    return requestJson(`${getServerUrl()}/files/presigned`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
        }),
    });
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