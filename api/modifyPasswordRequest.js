import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const changePassword = async (userId, currentPassword, newPassword) => {
    const result = await requestJson(`${getServerUrl()}/users/${userId}/password`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            currentPassword,
            newPassword
        }),
    });
    return result;
};