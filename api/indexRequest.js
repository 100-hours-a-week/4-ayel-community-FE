import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = (cursor, limit) => {
    const query = new URLSearchParams();

    if (cursor !== null) {
        query.append('cursor', cursor);
    }

    query.append('limit', limit);

    return requestJson(
        `${getServerUrl()}/posts?${query.toString()}`,
        {
            credentials: 'include',
        },
    );
};

export const searchPosts = (
    keyword,
    cursor = null,
    limit = 5,
) => {
    const query = new URLSearchParams();

    query.append('keyword', keyword);

    if (cursor !== null) {
        query.append('cursor', cursor);
    }

    query.append('limit', limit);

    return requestJson(
        `${getServerUrl()}/posts/search?${query.toString()}`,
        {
            credentials: 'include',
        },
    );
};