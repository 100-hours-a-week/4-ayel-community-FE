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

// Presigned URL 발급
export const getPresignedUrl = file => {
    const params = new URLSearchParams({
        fileName: file.name,
        contentType: file.type,
    });

    return requestJson(
        `${getServerUrl()}/files/presigned-url?${params.toString()}`,
        {
            method: 'POST',
            credentials: 'include',
        }
    );
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