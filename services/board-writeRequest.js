import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const createPost = formData => {
    return requestJson(`${getServerUrl()}/posts`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
    });
};

export const updatePost = (postId, formData) => {
    return requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
    });
};

export const getBoardItem = postId => {
    const result = requestJson(getServerUrl() + `/posts/${postId}`, {
        method: 'GET',
        credentials: 'include',
    });

    return result;
};
