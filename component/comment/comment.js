import { padTo2Digits, resolveImageUrl } from '../../utils/function.js';
import Dialog from '../dialog/dialog.js';
import { deleteComment, updateComment } from '../../services/commentRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;

const CommentItem = (data, writerId, postId, commentId) => {
    const CommentDelete = () => {
        Dialog(
            '댓글을 삭제하시겠습니까?',
            '삭제한 내용은 복구 할 수 없습니다.',
            async () => {
                const { ok, status } = await deleteComment(postId, commentId);

                if (!ok) {
                    Dialog('삭제 실패', '댓글 삭제에 실패하였습니다.');
                    return;
                }

                if (status === HTTP_OK) {
                    location.href = '/html/board.html?id=' + postId;
                }
            },
        );
    };

    const CommentModify = () => {
        const p = commentInfoWrap.querySelector('p');
        if (!p) return;

        const originalContent = p.innerHTML.replace(/<br>/g, '\n');

        const textarea = document.createElement('textarea');
        textarea.className = 'commentEditTextarea';
        textarea.value = originalContent;

        textarea.addEventListener('input', () => {
            if (textarea.value.length > 500) {
                textarea.value = textarea.value.substring(0, 500);
                Dialog('글자 수 제한', '댓글은 최대 500자까지 작성 가능합니다.');
            }
        });

        const editWrap = document.createElement('div');
        editWrap.className = 'commentEditWrap';

        const editActions = document.createElement('div');
        editActions.className = 'commentEditActions';

        const saveButton = document.createElement('button');
        saveButton.className = 'commentEditSave';
        saveButton.textContent = '저장';

        saveButton.onclick = async () => {
            if (textarea.value.length === 0) {
                Dialog('수정 실패', '댓글은 1자 이상 입력해주세요.');
                return;
            }

            const { ok } = await updateComment(postId, commentId, textarea.value);
            if (!ok) {
                Dialog('수정 실패', '댓글 수정에 실패하였습니다.');
                return;
            }

            location.href = '/html/board.html?id=' + postId;
        };

        const cancelButton = document.createElement('button');
        cancelButton.className = 'commentEditCancel';
        cancelButton.textContent = '취소';

        cancelButton.onclick = () => {
            p.innerHTML = originalContent.replace(/\n/g, '<br>');
            commentInfoWrap.replaceChild(p, editWrap);
        };

        editActions.appendChild(cancelButton);
        editActions.appendChild(saveButton);
        editWrap.appendChild(textarea);
        editWrap.appendChild(editActions);

        commentInfoWrap.replaceChild(editWrap, p);
    };

    const commentItem = document.createElement('div');
    commentItem.className = 'commentItem';

    const picture = document.createElement('picture');
    const img = document.createElement('img');
    img.className = 'commentImg';

    const writerImgUrl = data.profileFileUrl || data.profileImageUrl;
    img.src = resolveImageUrl(writerImgUrl, DEFAULT_PROFILE_IMAGE);

    picture.appendChild(img);

    const commentInfoWrap = document.createElement('div');
    commentInfoWrap.className = 'commentInfoWrap';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'commentInfoHeader';

    const displayNickname = data.nickname && data.nickname.trim() !== '' ? data.nickname : '(알 수 없음)';

    const h3 = document.createElement('h3');
    h3.textContent = displayNickname;
    infoDiv.appendChild(h3);

    const h4 = document.createElement('h4');
    const date = new Date(data.createdAt);
    const formattedDate = `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`;

    h4.textContent = formattedDate;
    infoDiv.appendChild(h4);

    if (data.userId === writerId) {
        const buttonWrap = document.createElement('span');

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '삭제';
        deleteButton.onclick = CommentDelete;

        const modifyButton = document.createElement('button');
        modifyButton.textContent = '수정';
        modifyButton.onclick = CommentModify;

        buttonWrap.appendChild(modifyButton);
        buttonWrap.appendChild(deleteButton);
        infoDiv.appendChild(buttonWrap);
    }

    const p = document.createElement('p');
    p.innerHTML = data.content.replace(/(?:\r\n|\r|\n)/g, '<br>');

    commentInfoWrap.appendChild(infoDiv);
    commentInfoWrap.appendChild(p);
    commentItem.appendChild(picture);
    commentItem.appendChild(commentInfoWrap);

    return commentItem;
};

export default CommentItem;