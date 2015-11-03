/**
 * Brainfock - community & issue management software
 * Copyright (c) 2015, Sergii Gamaiunov (�Webkadabra�)  All rights reserved.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @link http://www.brainfock.com/
 * @copyright Copyright (c) 2015 Sergii Gamaiunov <hello@webkadabra.com>
 */

import * as actions from '../topics/actions';
import * as commentsActions from '../comments/actions';
import Todo from './board';
import FormRecord from './form';
import TopicGroup from './topic-group';
import Comment from '../comments/comment';
import getRandomString from '../lib/getRandomString';
import {List, Record, Map} from 'immutable';

const InitialState = Record({
  list: List(),
  listFilters: List(),
  formFields: new (Record({
    loading: true,
    group: '',
    fields: List()
  })),
  // represents form to create/edit topic
  newTopic: new Todo,
  // TODO: add 'updateTopic' store, or else update & create forms have conflict
  viewPage: new Todo,
  board: new Todo,
  viewTopic: new Todo,
  group: new TopicGroup,
  groups: new Map(),

  // `meta` represents meta state of a list
  meta: new (Record({
    groupKey: '', // group key of a list, changes only on request end (success or error)
    queryString: '',
    // TODO: clean up using of 'loading' in favor of more descriptiove 'isFetching'
    loading: true,
    count: 0,
    isSubmitting: false,
    isFetching: false,
    error: '',
    errors: new Map()
  })),
  form: new FormRecord
});

const initialState = new InitialState;

// Note how JSON from server is revived to immutable record.
const revive = (state) => initialState.merge({
  list: state.list.map(todo => new Todo(todo)),
  listFilters: state.listFilters.map(todo => (new Record(todo))),
  newTopic: new Todo(state.newTopic),
  viewPage: new Todo(state.viewPage || {}),
  board: new Todo(),
  viewTopic: new Todo({loading: false}),
  group: new TopicGroup
});

export default function boardsReducer(state = initialState, action) {
  if (!(state instanceof InitialState)) return revive(state);

  switch (action.type) {

    case actions.FIND:

      if (action.meta.groupKey && state.meta.groupKey
        && action.meta.groupKey !== state.meta.groupKey) {
        state.update('list', list => list.clear());
      }

      return state
        .setIn(['meta', 'loading'], true)
        .setIn(['meta', 'isFetching'], true)
        .deleteIn(['meta', 'error']); // reset list errors (e.g. there was problem fetchin sometihng and user switched lists)

    case actions.FIND_ERROR: {

      if (action.meta.groupKey && (!state.meta.groupKey || (state.meta.groupKey
        && action.meta.groupKey !== state.meta.groupKey))) {
        // clear list, or else user may see error message with items of another list
        state = state.update('list', list => list.clear());
      }

      if (action.error === true) {

        if (action.payload.error) {
          return state
            .setIn(['meta', 'error'], action.payload.error.message || 'Unknown Error!')
            .setIn(['meta', 'isFetching'], false)
            .setIn(['meta', 'loading'], false);
        } else {
          return state
            .setIn(['meta', 'error'], action.payload.message.length > 0 && action.payload.message || 'Unknown Error!')
            .setIn(['meta', 'isFetching'], false)
            .setIn(['meta', 'loading'], false);
        }
      } else {
        return state
          .setIn(['meta', 'loading'], false)
          .setIn(['meta', 'isFetching'], false);
      }
    }

    case actions.FIND_SUCCESS: {

      const newlist = action.payload.map((item) => {
        item.cid = getRandomString();
        return new Todo(item);
      });
      return state
        .update('list', list => list.clear())
        .update('list', list => list.push(...newlist))

        .setIn(['meta', 'groupKey'], action.meta.groupKey)
        //.setIn(['meta', 'queryString'],  action.meta.queryString || '')

        .setIn(['meta', 'isFetching'], false)
        .setIn(['meta', 'loading'], false)
        // cleanup list fetch errors after list is loaded successfully
        .deleteIn(['meta', 'error'])
        .deleteIn(['meta', 'errors']);
    }

    case actions.FIND_ONE:
      return state
        .set('board', {'isFetching': true})
        .set('board', {'loading': true});
    // todo: board.meta.isFetching - if fetching form serer
    // todo: board.meta.isLoaded - if model has been loaded (redundant if we have id)

    case actions.FIND_ONE_SUCCESS:
      return state
        .set('board', new Todo(action.payload))
        .setIn(['board', 'isFetching'], false)
        .setIn(['board', 'loading'], false);

    case actions.LOAD_TOPIC:
      return state
        .setIn(['viewTopic', 'isFetching'], true)
        .setIn(['viewTopic', 'loading'], true);

    case actions.SET_CURRENT_TOPIC:
      return state
        .setIn(['viewTopic', 'id'], action.payload);

    case actions.LOAD_TOPIC_SUCCESS: {
      // payload *may* be an array if we were looking for topic inside of another topic e.g. ``/api/topics/SomeTopic/topics/?filter...``
      const data = action.payload.length && action.payload.length > 0 ? action.payload[0] : action.payload;
      return state
        .set('viewTopic', new Todo(data))
        .setIn(['viewTopic', 'isFetching'], false)
        .setIn(['viewTopic', 'loading'], false);
    }

    // load all comments
    case commentsActions.LOAD_COMMENTS_SUCCESS: {
      const newlist = action.payload.map((item) => {
        item.cid = getRandomString();
        return new Comment(item);
      });
      return state
        .updateIn(['viewTopic', 'comments'], list => list.clear())
        .updateIn(['viewTopic', 'comments'], list => list.push(...newlist));
    }

    // post or catch new comment via sockets:
    case commentsActions.ADD_ONE_COMMENT:
      return state
        .updateIn(['viewTopic', 'comments'], comments => comments.push(Comment(action.payload)));

    case actions.LOAD_TOPIC_GROUP:
      return state
        // TODO: set group as a part of topic if there is topicId in action.meta ?
        //.setIn(['board', 'group'],new TopicGroup())
        .set('group', new TopicGroup());

    case actions.LOAD_TOPIC_GROUP_SUCCESS: {
      if (action.meta.groupKey && !state.groups.get(action.meta.groupKey)) {
        state = state.setIn(['groups', action.meta.groupKey], new TopicGroup(action.payload));
      }

      return state
        //.setIn(['board', 'group'], new TopicGroup(action.payload))
        .set('group', new TopicGroup(action.payload));
    }

    case action.LOAD_TOPIC_GROUP_ERROR:
      return state;

    case actions.COUNT_SUCCESS:
      return state
        .setIn(['meta', 'count'], action.payload.count);

    case actions.LOAD_FILTERS_SUCCESS: {
      const newlist = action.payload.filters.map((item) => {
        item.cid = getRandomString();
        return new (Record(item));
      });
      return state
        .update('listFilters', list => list.clear())
        .update('listFilters', list => list.push(...newlist))
        ;
    }

    case actions.LOAD_FORM_FIELDS:
      return state
        .setIn(['formFields', 'loading'], true)
        ;

    case actions.LOAD_FORM_FIELDS_SUCCESS: {
      const newlist = action.payload.filters.map((item) => {
        item.cid = getRandomString();
        return new (Record(item));
      });
      return state
        .updateIn(['formFields', 'fields'], list => list.clear())
        .updateIn(['formFields', 'fields'], list => list.push(...newlist))
        .setIn(['formFields', 'group'], action.meta.group)
        .setIn(['formFields', 'loading'], false)
        ;
    }

    case actions.SET_NEW_TOPIC:
      return state.set('newTopic', action.payload);

    case actions.SET_NEW_TOPIC_FIELD: {
      const {name, value} = action.payload;
      return state.setIn(['newTopic', name], value)
        .deleteIn(['form', 'meta', 'errors', name]);
    }

    case actions.CREATE:
      return state
        // lockform submit buttons etc.
       // .setIn(['formFields', 'loading'], true)
        .setIn(['form', 'meta', 'isSubmitting'], true)
        .deleteIn(['form', 'meta', 'error']);


    case actions.CREATE_SUCCESS:
      return state
        .update('list', list => list.unshift(Todo(action.payload)))
        //.setIn(['formFields', 'loading'], false)
        ;

    case actions.CLEAN_FORM_GENERAL_ERRORS:
      return state
        .deleteIn(['form', 'meta', 'error']);

    case actions.CREATE_ERROR: {

      // TODO: review, cleanup:
      state.setIn(['newTopic', 'loading'], false);

      if (action.error === true) {

        if (action.payload.error && action.payload.error.details) {
          let errorDetails = {};
          // loop
          for (let fieldName in action.payload.error.details.messages) {
            if (action.payload.error.details.messages.hasOwnProperty(fieldName)) {
              const message = action.payload.error.details.messages[fieldName];
              errorDetails[fieldName] = message.join('; ');
            }
          }

          return state
            .setIn(['form', 'meta', 'errors'], Map(errorDetails))
            .setIn(['form', 'meta', 'isSubmitting'], false)
            //.setIn(['formFields', 'loading'], false);

        } else if (action.payload.error) {
          return state
            .setIn(['form', 'meta', 'error'], action.payload.error.message || 'Unknown Error!')
            .setIn(['form', 'meta', 'isSubmitting'], false)
            //.setIn(['formFields', 'loading'], false);
        } else {
          return state
            .setIn(['form', 'meta', 'error'], action.payload.message.length > 0 && action.payload.message || 'Unknown Error!')
            .setIn(['form', 'meta', 'isSubmitting'], false)
            //.setIn(['formFields', 'loading'], false);
        }
      } else {
        return state
          .setIn(['form', 'meta', 'isSubmitting'], false);
      }
    }

    case actions.SAVE:
      return state
        .setIn(['newTopic', 'loading'], true);

    case actions.SAVE_SUCCESS:
      return state
        .setIn(['newTopic', 'loading'], false);

    case actions.SAVE_ERROR:
      return state
        // TODO: isSubmitting rather
        .setIn(['newTopic', 'loading'], false);


    case actions.RUN_OPERATION:
      return state
        .setIn(['viewTopic', 'loading'], true)
        .setIn(['viewTopic', 'isFetching'], true);

    case actions.RUN_OPERATION_SUCCESS:
      return state
        //  .set('viewTopic', new Todo(action.payload.topic))
        .setIn(['viewTopic', 'wfStatus'], action.payload.topic.wfStatus)
        .setIn(['viewTopic', 'wfStage'], action.payload.topic.wfStage)
        .setIn(['viewTopic', 'operations'], action.payload.topic.operations)
        .setIn(['viewTopic', 'isFetching'], false)
        .setIn(['viewTopic', 'loading'], false);

    case actions.RUN_OPERATION_ERROR:
      return state
        .setIn(['viewTopic', 'isFetching'], false)
        .setIn(['viewTopic', 'loading'], false);

    case actions.DELETE_TOPIC: {

      if (action.meta.topicId && state.viewTopic && state.viewTopic.id === action.meta.topicId) {
        return state
          .setIn(['viewTopic', 'meta', 'isDeleting'], false);
      }
      return state;
    }

    case actions.DELETE_TOPIC_ERROR: {

      if (action.meta.topicId && state.viewTopic && state.viewTopic.id === action.meta.topicId) {
        return state
          .setIn(['viewTopic', 'data', 'deletedYn'], 0)
          .setIn(['viewTopic', 'meta', 'isDeleting'], false)
          .setIn(['viewTopic', 'meta', 'error'], action.payload.error.message);

        // deleting from project's settings pagedd
      } else if (action.meta.topicId && state.newTopic && state.newTopic.id === action.meta.topicId) {

        return state
          .setIn(['newTopic', 'data', 'deletedYn'], 0)
          .setIn(['newTopic', 'meta', 'isDeleting'], false)
          .setIn(['newTopic', 'meta', 'error'], (action.payload.error.message
            ? action.payload.error.message
            : (action.payload.message ? action.payload.message : 'ERROR')
          ));
      }
      return state;
    }

    case actions.DELETE_TOPIC_SUCCESS: {

      if (action.meta.topicId && state.viewTopic && state.viewTopic.id === action.meta.topicId) {
        return state
          .setIn(['viewTopic', 'deletedYn'], 1)
          .setIn(['viewTopic', 'data', 'deletedYn'], 1)
          .setIn(['viewTopic', 'meta', 'isDeleting'], false)
          .setIn(['viewTopic', 'meta', 'error'], '')
          .update('list', list =>
            list.update(list.findIndex(function(item) {
              return item.id === action.meta.topicId;
            }), function(v) {
              return v.set('deletedYn', 1);
            })
        );
      }
      return state;
    }
  }

  return state;
}
