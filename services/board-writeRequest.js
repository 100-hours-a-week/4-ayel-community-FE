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

// 게시글 작성
export const createPost = body => {
    return requestJson(`${getServerUrl()}/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
};

// 게시글 수정
export const updatePost = (postId, body) => {
    return requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });
};

export const getBoardItem = postId => {
    return requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'GET',
        credentials: 'include',
    });
};