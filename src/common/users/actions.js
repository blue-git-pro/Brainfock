/**
 * Brainfock - Community & Business Management Solution
 *
 * @link http://www.brainfock.org
 * @copyright Copyright (c) 2015 Sergii Gamaiunov <hello@webkadabra.com>
 */
import {apiGet, apiPost, apiPut} from '../lib/services';
import {toQueryString} from '../utils/model.js';

export const FIND = 'FIND_USERS';
export const FIND_SUCCESS = 'FIND_USERS_SUCCESS';
export const FIND_ERROR = 'FIND_USERS_ERROR';

export const SETUP_USER_UPDATE_FORM = 'SETUP_USER_UPDATE_FORM';

export const SET_USER_UPDATE_FORM_FIELD = 'SET_USER_UPDATE_FORM_FIELD';
export const SAVE_USER_UPDATE_FORM = 'SAVE_USER_UPDATE_FORM';
export const SAVE_USER_UPDATE_FORM_SUCCESS = 'SAVE_USER_UPDATE_FORM_SUCCESS';
export const SAVE_USER_UPDATE_FORM_ERROR = 'SAVE_USER_UPDATE_FORM_ERROR';

export function findUsers(includes, query) {

  let endpoint = 'members/?'+includes;

  if(query) {
    endpoint += '&'+toQueryString({filter:{where:query}},false);
  }

  return ({fetch, validate}) => ({
    type: [
      FIND,
      FIND_SUCCESS,
      FIND_ERROR
    ],
    payload: {
      promise:  apiGet(fetch, endpoint)
        .catch(response => {
          throw response;
        })
    }
  });
}

export function makeUserUpdateFormRecord(userId, formKey, initialValues) {
  return {
    type: SETUP_USER_UPDATE_FORM,
    payload: {
      userId: userId,
      formKey: formKey,
      initialValues
    }
  };
}

export function setUserUpdateFormField({target: {name, value}}, userId, formKey) {
  return {
    type: SET_USER_UPDATE_FORM_FIELD,
    payload: {name, value, userId, formKey}
  };
}

export function saveUserUpdateForm(id, formKey, data) {

  const endpoint = `users/${id}`;

  return ({fetch, validate}) => ({
    type: [
      SAVE_USER_UPDATE_FORM,
      SAVE_USER_UPDATE_FORM_SUCCESS,
      SAVE_USER_UPDATE_FORM_ERROR
    ],
    meta: {
      topicId: id
    },
    payload: {
      promise: apiPut(fetch, endpoint, data)
        .catch(response => {
          // decode validation error messages from server
          if (!response) {
            throw new Error('No response');
          } else if (response.ok === false) return response.json();
          else {
            throw response;
          }
        })
        .then(function (jsonResponce) {
          if (jsonResponce.error) {
            throw jsonResponce;
          }
          else
            return jsonResponce;
        }, function (response) {
          // throw other errors (i.e. 50x) that don't have `.json()` available
          throw response;
        })
    }
  });
}
