/**
 * Brainfock - community & issue management software
 * Copyright (c) 2015, Sergii Gamaiunov (“Webkadabra”)  All rights reserved.
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
import {mergeQuery} from 'loopback-datasource-juggler/lib/utils';

import app from "../../server/main";
import FieldTypes from '../components/topicFields';
import FieldsHandler from '../components/topicFieldsHandler.js';
import loopback from 'loopback';
module.exports = function(Topic) {

  /**
   * validate workspace/namespace existance and access
   * set owner flags
   */
  Topic.observe('before save', function normalizeUserInput(ctx, next)
  {
    const currentUser = loopback.getCurrentContext().get('currentUser');
    if (ctx.instance) {
      if (ctx.isNewInstance==true) {
        ctx.instance.ownerUserId = currentUser.id;
      }
    }

    if(ctx.instance && ctx.instance.namespace && !ctx.instance.workspaceId)
    {
      // make sure workspace exists
      Topic.app.models.Workspace.findOne({where:{namespace:ctx.instance.namespace}},function(wspcErr,wspcInstance) {

        if (wspcErr) throw wspcErr;

        if (!wspcInstance)
          return next({
            name: 'error',
            status: 404,
            message: `Can not find workspace "${ctx.instance.namespace}"`
          });

        if(wspcInstance.accessPrivateYn === 0 || currentUser && wspcInstance.ownerUserId == currentUser.id) {
          ctx.instance.workspaceId = wspcInstance.id;
          ctx.instance.namespace = wspcInstance.namespace;
          next();
        }
        // TODO: allow users to be invited and granted permission to access private workspaces
        else {
          return next({
            name: 'error',
            status: 403,
            message: 'Authorization Required'
          });
        }
      });
    } else {
      next();
    }
  });

  /**
   * get entityId
   */
  Topic.observe('before save', function normalizeUserInput(ctx, next)
  {
    if (ctx.instance)
    {
      if (ctx.isNewInstance==true)
      {
        Topic.app.models.Entity.create({
          name: ctx.instance.summary,
          accessPrivateYn: ctx.instance.accessPrivateYn,
          owerUserId: ctx.instance.ownerUserId,
          modelClassName: 'Topic',
          modelPk: null,
        }, function (err, entityInstance) {
          if(err) {
            throw err;
          }
          ctx.instance.entityId =  entityInstance.id;
          ctx.instance.entity_id =  entityInstance.id;
          next();
        });
      }
      else {
        next();
      }
    }else {
      next();
    }
  });

  /**
   * update `entity` relation to link back after new `topic` is created and PK is obtained
   */
  Topic.observe('after save', function updateTimestamp(ctx, next)
  {
    // after model has been saved, we have to pass model's ID back to entity registry:
    if (ctx.isNewInstance && ctx.instance.entityId) {
      Topic.app.models.Entity.findById(ctx.instance.entityId, function (err, entityInstance) {
        entityInstance.updateAttributes({modelPk:ctx.instance.id}, function(errE,instance){
          if(errE) {
            throw errE;
          }
          next();
        });
      });
    } else {
      next();
    }
  });

  /**
   * populate topic `type` after remote create
   */
  Topic.afterRemote( 'create', function( ctx, modelInstance, next) {
    modelInstance.type(function(err, type) {
      if (err) return next(err);
      // we can not modify properties of relations directly via `modelInstance.user=[Object]`:
      modelInstance.__data.type = type;
      next(err);
    });
  })

  Topic.on('attached', function() {
    var override = Topic.findOne;
    Topic.findOneCore = override;
    Topic.findOne = function(filter, options, callback) {

      // from dao.js:
      if (options === undefined && callback === undefined) {
        if (typeof filter === 'function') {
          callback = filter;
          filter = {};
        }
      } else if (callback === undefined) {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
      }

      callback = callback || {};
      filter = filter || {};
      options = options || {};
      // END [from dao.js]

      /**
       * allow users to find topics by their contextTopicKey, eg. /api/topics/BF
       * currently this is designed to work with topics that don't have contextTopicId (root topics)
       */
      if(filter.where.id) {

        if(isNaN(filter.where.id))
        {
          let parts = filter.where.id.split('-');
          let last = parts.pop();

          let _filter={key:null,id:null};

          if(!Number.isInteger(last)) {
            _filter.key=null;
            _filter.id=filter.where.id;
          }
          else if (parts.length==0) {
            _filter.key=null;
            _filter.id=last;
          }
          else {
            _filter.key=parts.implode('-');
            _filter.id=last;
          }

          if(!_filter.key && _filter.id)
          {
            delete filter.where.id;
            filter = mergeQuery(filter, {where: {
              and: [
                {or: [{contextTopicId: "0"}, {"contextTopicId": null}]},
                {contextTopicKey: _filter.id}
              ]
            }});
          }
        }
      }

      // go on with regular `findOne` method
      return override.apply(this, [filter, options, callback])
    }
  });

  Topic.afterRemote( 'find', function( ctx, data, next) {
    if(ctx.result && data.length>0) {

      function populateValue($modelInstance, callback) {
        // TODO: remove placeholder/dummy icon

        $modelInstance.logo = {
          icon: 'star',
          background: 'pink'
        }

        if($modelInstance.contextTopicKey) {
          if(!$modelInstance.contextTopicId || $modelInstance.contextTopicId == 0) {
            $modelInstance.uid =  $modelInstance.contextTopicKey;
          }
        } else {
          if($modelInstance.contextTopicNum) {
            $modelInstance.uid= $modelInstance.contextTopicNum;
          }
        }
        // TODO: port completely:
        //public function getUid() {
        //  if($this->context_topic_key) {
        //    if(!$this->context_topic_id || $this->context_topic_id == 0) {
        //      return $this->context_topic_key;
        //    }
        //  else {
        //      return CHtml::value($this,'contextTopic.uid');
        //    }
        //  }
        //  if($this->context_topic_num) {
        //    return $this->context_topic_num;
        //  }
        //}
        //
        callback();
      }

      let resCount = data.length;
      let lopRes = [];
      ctx.result.forEach(function(/*Topic model instance*/ item){
        populateValue(item, function(result){
          lopRes.push(1);
          if(lopRes.length == (resCount)) {
            next();
          }
        });
      })

    } else {
      return next();
    }
  });

  /**
   *
   * @param id
   * @param groupKey
   * @param cb
   */
  Topic.loadFilters = function(id, groupKey, cb) {
    Topic.findOne( {where:{id:id}}, function (err, contextTopic) {

      if(err) throw err;

      if(!contextTopic)
        return cb(null, [])

      // Find DEFAULT topic type scheme
      // TODO: allow to define different topic_type_scheme per root (so, project can have own)
      Topic.app.models.TopicTypeScheme.findOne({},function(typeErr,typeSchemeInstance){

        if(typeErr) throw typeErr;

        if(!typeSchemeInstance)
          return cb(null, [])

        Topic.app.models.TopicGroup.findOne({where:{groupKey:groupKey}},function(groupErr,groupInstance){

          if(groupErr) throw groupErr;

          if(!groupInstance)
            return cb(null, [])

          // contextTopic - root topic, e.g. `project`
          // groupInstance - group instance (e.g. `issues`)
          // typeSchemeInstance

          // basically, we need to get filters for all columns available in a view

          // filter by:
          // - topic type (`issue`, `epic` etc.) - get all available types for this group
          // - workflow stage (stage_id)
          // - summary text (or any text e.g. fulltext)
          // - additional fields:
          //    -- component (relational field, relation to topic of group "component" that has `contextTopic` as parent
          //       API endpoint: `api/topics/:namespace/:topicKey/topics/?where[groupKey]=component
          //    -- priority
          //    -- assignee
          //    -- reported_by

          // we must get all available fields (filterable) for this `groupInstance`
          groupInstance.types({}, function(err, types) {

            let TypeOptions = types.map(item => { return {
              value: item.id,
              label: item.name,
            }});

            let response = [
              {
                id: 'type',
                label:'Type',
                options:TypeOptions,
                type:FieldTypes.multiselect,
              },{
                // draft example
                id: 'affectsVersion',
                label:'Affects Version',
                endpoint:`/api/topics/${id}/topics/?filter[where][groupKey]=version`,
                type:FieldTypes.select,
                options:[],
              },{
                // draft example
                id: 'linledIssue',
                label:'Linked Issue',
                endpoint:'/api/topics?filter[where][groupKey]=issue',
                type:FieldTypes.select,
                options:[],
              },
              //{
              //  id: 'contextTopicId',
              //  defaultValue:id,
              //  defaultOptions: [
              //    {id:id, label:contextTopic.summary}
              //  ],
              //  endpoint:`/api/topics/${id}/?filter[where][groupKey]=project`
              //},
              //{
              //  id: 'field.milestone',
              //  label:"Milestone",
              //  endpoint:`/api/topics/${id}/?filter[where][groupKey]=milestone`
              //},
              //{
              //  id: 'field.assignee_user_id',
              //  label:"Assignee",
              //  endpoint:`/api/topics/${id}/users`,
              //  type:FieldTypes.select,
              //},
            ];

            cb(null, response);
          });
        })
      })
    });
  };


  /**
   * load form fields for topic screen. Currently, supports default (create) screen only
   *
   * @param id
   * @param groupKey
   * @param cb
   */
  Topic.loadFormFields = function(id, groupKey, cb) {
    Topic.findOne( {where:{id:id}}, function (err, contextTopic) {

      if(err) throw err;
      if(!contextTopic)
        return cb(null, [])

      Topic.app.models.TopicGroup.findOne({
        where:{
          groupKey:groupKey
        },
        include: ['parentGroup']
      },function(groupErr,groupInstance){

        if(groupErr) throw groupErr;
        if(!groupInstance)
          return cb(null, [])

        // Find DEFAULT topic type scheme for this group
        // TODO: allow to define different topic_type_scheme per parent context (so, project can have own)
        Topic.app.models.TopicTypeScheme.findOne({where:{topicGroupId:groupInstance.id}},function(typeErr,typeSchemeInstance){

          if(typeErr) throw typeErr;

          if(!typeSchemeInstance)
            return cb(null, [])

          /** @property contextTopic object - root topic, e.g. `project` */
          /** @property groupInstance - group instance (e.g. `issues`) */
          /** @property typeSchemeInstance */

          Topic.app.models.TopicTypeSchemeTopicTypeMap.find({
            where:{
              topicTypeSchemeId:typeSchemeInstance.id
            },
            order:'sortWeight DESC',
            include: [
              'topicType'
            ]

          },function(typeSchemeTypeMapErr,types){

            if(typeSchemeTypeMapErr) throw typeSchemeTypeMapErr;

            if(!types)
              return cb(null, [])

            let TypeOptions = types.map(item => {
              let topicType = item.topicType();
              return {
              value: topicType.id,
              label: topicType.name,
            }});

            const DefaultType = types[0].topicType();
            if(!DefaultType) {
              return cb(null, [])
            }

            // Find DEFAULT screen scheme
            Topic.app.models.ScreenScheme.findOne({
              // TODO: allow to provide non-default scheme
              //where:{...}
            },function(ScreenSchemeErr,ScreenScheme) {

              if (ScreenSchemeErr) throw ScreenSchemeErr;

              if (!ScreenScheme)
                return cb(null, [])

              // Find what screen is configured for `DefaultType` type in `ScreenScheme` scheme
              Topic.app.models.ScreenScheme_TopicTypeScreen_Map.findOne({
                where: {
                  screenSchemeId: ScreenScheme.id,
                  topicTypeId: DefaultType.id
                },
                include: [
                  'screen'
                ]
              },function(ScreenScheme_TopicTypeScreen_MapErr,ScreenScheme_TopicTypeScreen_Map) {

                if (ScreenScheme_TopicTypeScreen_MapErr) throw ScreenScheme_TopicTypeScreen_MapErr;

                if (!ScreenScheme_TopicTypeScreen_Map)
                  return cb(null, [])

                const Screen = ScreenScheme_TopicTypeScreen_Map.screen()

                Screen.screenFields({
                  // provides values to be available at `field.field()`
                  include:['field']
                },function(screenFieldsErr,screenFields){
                  if (screenFieldsErr) throw screenFieldsErr;

                  if (!screenFields)
                    return cb(null, [])

                  let _screenFields = screenFields.map(field => {
                    let fieldConfig = field.field().__data;
                    return {
                      group: groupInstance,
                      contextTopic: contextTopic,
                      ...fieldConfig
                    }
                  });

                  Promise
                    .all(_screenFields.map(FieldsHandler.populateFormField))
                    .then(function(dataDone)
                    {
                      // manually add "group" and "type" select fields, re-using already populated data
                      FieldsHandler.typeIdFieldProps({
                        group: groupInstance,
                        contextTopic: contextTopic,
                        key: 'typeId',
                        options:TypeOptions,
                      })
                      .then(function(moreData){
                          dataDone.unshift(moreData)
                          return cb(null, dataDone);
                        })
                    })
                  ;
                })
              })
            })
          })
        })
      })
    });
  };

  /**
   * REST API endpoint `api/topics/:contextTopicKey/filters`
   */
  Topic.remoteMethod(
    'loadFilters',
    {
      accepts: [
        {arg: 'id', type: 'any', http: { source: 'path' }, required: true },
        {arg: 'groupKey', type: 'string', http: { source: 'path' }, required: true },
      ],
      http: {verb: 'get', path: '/:id/filters/:groupKey'},
      returns: {arg: 'filters', type: 'Array'}
    }
  );

  /**
   * REST API endpoint `api/topics/:contextTopicKey/formFields`
   */
  Topic.remoteMethod(
    'loadFormFields',
    {
      accepts: [
        {arg: 'id', type: 'any', http: { source: 'path' }, required: true },
        {arg: 'groupKey', type: 'string', http: { source: 'path' }, required: true },
      ],
      http: {verb: 'get', path: '/:id/formFields/:groupKey'},
      returns: {arg: 'filters', type: 'Array'}
    }
  );

};
