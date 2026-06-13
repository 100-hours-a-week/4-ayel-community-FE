import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const deleteComment = async (postId, commentId) => {
    const result = await requestJson(
        `${getServerUrl()}/posts/${postId}/comments/${commentId}`,
        {
            method: 'DELETE',
            credentials: 'include',
        },
    );
    return result;
};

export const updateComment = async (postId, commentId, commentContent) => {
    const result = await requestJson(
        `${getServerUrl()}/posts/${postId}/comments/${commentId}`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ content: commentContent }),
        },
    );
    return result;
};