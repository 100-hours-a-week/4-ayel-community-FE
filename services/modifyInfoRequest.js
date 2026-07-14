import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

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

// 회원 정보 수정
export const userModify = async (userId, changeData) => {
    return requestJson(`${getServerUrl()}/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(changeData),
    });
};

// 회원 탈퇴
export const userDelete = async userId => {
    return requestJson(`${getServerUrl()}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
    });
};