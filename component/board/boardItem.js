import { padTo2Digits, resolveImageUrl, getDefaultProfileImage, } from '../../utils/function.js';

const DEFAULT_PROFILE_IMAGE = getDefaultProfileImage();

const formatCount = (count) => {
    const value = Number(count);

    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1).replace('.0', '')}m`;
    }

    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1).replace('.0', '')}k`;
    }

    return String(value);
};

const BoardItem = (
    postId,
    date,
    title,
    contentPreview,
    viewCount,
    imgUrl,
    writer,
    commentCount,
    likeCount,
) => {
    if (
        !date ||
        !title ||
        viewCount === undefined ||
        likeCount === undefined ||
        commentCount === undefined
    ) {
        return;
    }

    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    const seconds = dateObj.getSeconds();

    const formattedDate = `${year}-${padTo2Digits(month)}-${padTo2Digits(day)} ${padTo2Digits(hours)}:${padTo2Digits(minutes)}:${padTo2Digits(seconds)}`;

    const profileImageUrl = resolveImageUrl(imgUrl, DEFAULT_PROFILE_IMAGE);

    const displayWriter = writer && writer.trim() !== '' ? writer : '(알 수 없음)';

    const displayContent = contentPreview || '';

    return `
    <a href="/html/board.html?id=${postId}">
        <div class="boardItem">
            <h2 class="title">${title}</h2>

            ${displayContent
        ? `<p class="contentPreview">${displayContent}</p>`
        : ''
    }
            <div class="info">
                <h3 class="views">좋아요 <b>${formatCount(likeCount)}</b></h3>
                <h3 class="views">댓글 <b>${formatCount(commentCount)}</b></h3>
                <h3 class="views">조회수 <b>${formatCount(viewCount)}</b></h3>
                <p class="date">${formattedDate}</p>
            </div>
            <div class="writerInfo">
                <picture class="img">
                    <img src="${profileImageUrl}" alt="img">
                </picture>
                <h2 class="writer">${displayWriter}</h2>
            </div>
        </div>
    </a>
`;
};

export default BoardItem;