import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = (
    sort = 'LATEST',
    cursorSortValue = null,
    cursorPostId = null,
    limit = 5,
) => {
    const query = new URLSearchParams();

    query.append('sort', sort);

    if (
        cursorSortValue !== null &&
        cursorPostId !== null
    ) {
        query.append(
            'cursorSortValue',
            cursorSortValue,
        );

        query.append(
            'cursorPostId',
            cursorPostId,
        );
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