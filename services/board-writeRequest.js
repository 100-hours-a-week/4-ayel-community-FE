import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const createPost = post => {
    return requestJson(`${getServerUrl()}/posts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
    });
};

export const updatePost = (postId, post) => {
    return requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
    });
};

export const getBoardItem = postId => {
    return requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'GET',
        credentials: 'include',
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