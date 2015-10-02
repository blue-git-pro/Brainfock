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

import {mergeQuery} from 'loopback-datasource-juggler/lib/utils';

module.exports = function(app) {
  var Role = app.models.Role;

  /*Role.registerResolver('teamMember', function(role, context, cb) {
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // if the target model is not project
    if (context.modelName !== 'project') {
      return reject();
    }

    // do not allow anonymous users
    var userId = context.accessToken.userId;
    if (!userId) {
      return reject();
    }

    // check if userId is in team table for the given project id
    context.model.findById(context.modelId, function(err, project) {
      if (err || !project)
        return reject();

      var Team = app.models.Team;
      Team.count({
        ownerId: project.ownerId,
        memberId: userId
      }, function(err, count) {
        if (err) {
          console.log(err);
          return cb(null, false);
        }

        cb(null, count > 0); // true = is a team member
      });
    });
  });*/

  Role.registerResolver('topicEntityAccess', function(role, context, cb) {

    var userId = context.accessToken.userId;
    console.log('[RBAC] Validate access to  operation `'+context.remotingContext.method.name+'` of model `'+context.modelName+'`, user:'+userId)
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // if the target model is not project
    if (context.modelName !== 'Topic'
      && context.modelName !== 'Comment'
      && context.modelName !== 'WikiPage'
      && context.modelName !== 'Entity'
    ) {
      console.log('[RBAC] Model ['+context.modelName+'] is not supported by `topicEntityAccess` resolver')
      return reject();
    }

    // TODO: currently, even if user does not have access to entity, he will be able to fetch EMPTY comments list like /api/entities/1699/comments
    if(context.remotingContext.method.name == 'find'
      || context.remotingContext.method.name == '__get__comments'
      || context.remotingContext.method.name == '__get__topics'
    ) {

      if(userId) {
        var allowedEntities = [];

        app.models.EntityAccessAssign.find({where:{
            auth_type:0,
            auth_id:userId,
          }},
            function(err,data)
            {
              if (err) {
                // apply base
                context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                  {where: {
                    or: [
                      {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                      {accessPrivateYn: "0"}
                    ]
                    //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                  }});
                return cb(null, true);
              }

              function final() {

                if(allowedEntities.length>0) {
                  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                    {where: {
                      or: [
                        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                        {accessPrivateYn: "0"},
                        {entityId:{inq:allowedEntities}}
                      ]
                      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                    }});
                } else {
                  // base constraints: do not show private topics of other users:
                  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                    {where: {
                      or: [
                        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                        {accessPrivateYn: "0"}
                      ]
                      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                    }});

                }


                //context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                //  {where: {
                //    or: [
                //      {entityId:{inq:allowedEntities}}
                //    ]
                //  }});
                //console.log('context.remotingContext.args.filter:',context.remotingContext.args.filter);

                return cb(null, true);
              }
              function populateValue($modelInstance, callback) {
                allowedEntities.push($modelInstance.entity_id);
                return callback();
              }

              let resCount = data.length;
              let lopRes = [];
              data.forEach(function(/*SettingsField model instance*/ item){
                populateValue(item, function(result){
                  lopRes.push(1);
                  if(lopRes.length == (resCount)) {
                    //console.log('allowedEntities:',allowedEntities);

                    return final();
                  }
                });
              })


          });
      } else {


        // base constraints: do not show private topics of other users:
        context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
          {where: {
            accessPrivateYn: "0"
            //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
          }});


        return cb(null, true);
      }

      //if(1==2 && context.remotingContext.args.filter.group) {
      //  console.log('yes');
      //  //app.models.TopicGroup.findOne({where:{groupKey:context.remotingContext.args.filter.group}},
      //  //  function(err,groupInstance)
      //  //  {
      //  //    if (err) {
      //  //      return reject();
      //  //      //return callback(err);
      //  //    }
      //  //  //console.log('find method');
      //  //  delete context.remotingContext.args.filter.group;
      //  //    console.log('!!!!',context.remotingContext.args.filter);
      //  //  context.remotingContext.args.filter.group_id = groupInstance.id;
      //  //  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
      //  //    {where: {
      //  //      or: [
      //  //        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
      //  //        {accessPrivateYn: "0"}
      //  //      ]
      //  //      // TODO: add validationvia au
      //  //      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
      //  //    }});
      //  //  return cb(null, true);
      //  //})
      //} else {
        //console.log('find method');

      //}
      return;
    }

    // these methods expect `context.remotingContext.args.where`, not `context.remotingContext.args.filter.where`
    else if(context.remotingContext.method.name == '__count__topics'
        || context.remotingContext.method.name == 'count'
    ) {
      if(userId) {
        var allowedEntities = [];

        app.models.EntityAccessAssign.find({where:{
            auth_type:0,
            auth_id:userId,
          }},
          function(err,data)
          {
            if (err) {
              // apply base
              context.remotingContext.args = mergeQuery(context.remotingContext.args,
                {where: {
                  or: [
                    {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                    {accessPrivateYn: "0"}
                  ]
                  //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                }});
              return cb(null, true);
            }
            function final() {

              if(allowedEntities.length>0) {
                context.remotingContext.args = mergeQuery(context.remotingContext.args,
                  {where: {
                    or: [
                      {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                      {accessPrivateYn: "0"},
                      {entityId:{inq:allowedEntities}}
                    ]
                    //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                  }});
              } else {
                // base constraints: do not show private topics of other users:
                context.remotingContext.args = mergeQuery(context.remotingContext.args,
                  {where: {
                    or: [
                      {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                      {accessPrivateYn: "0"}
                    ]
                    //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                  }});

              }


              //context.remotingContext.args = mergeQuery(context.remotingContext.args,
              //  {where: {
              //    or: [
              //      {entityId:{inq:allowedEntities}}
              //    ]
              //  }});
              //console.log('context.remotingContext.args:',context.remotingContext.args);

              return cb(null, true);
            }
            function populateValue($modelInstance, callback) {
              allowedEntities.push($modelInstance.entity_id);
              return callback();
            }

            let resCount = data.length;
            let lopRes = [];
            data.forEach(function(/*SettingsField model instance*/ item){
              populateValue(item, function(result){
                lopRes.push(1);
                if(lopRes.length == (resCount)) {
                  //console.log('allowedEntities:',allowedEntities);

                  return final();
                }
              });
            })


          });
      } else {


        // base constraints: do not show private topics of other users:
        context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
          {where: {
            accessPrivateYn: "0"
            //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
          }});


        return cb(null, true);
      }

      //if(1==2 && context.remotingContext.args.filter.group) {
      //  console.log('yes');
      //  //app.models.TopicGroup.findOne({where:{groupKey:context.remotingContext.args.filter.group}},
      //  //  function(err,groupInstance)
      //  //  {
      //  //    if (err) {
      //  //      return reject();
      //  //      //return callback(err);
      //  //    }
      //  //  //console.log('find method');
      //  //  delete context.remotingContext.args.filter.group;
      //  //    console.log('!!!!',context.remotingContext.args.filter);
      //  //  context.remotingContext.args.filter.group_id = groupInstance.id;
      //  //  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
      //  //    {where: {
      //  //      or: [
      //  //        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
      //  //        {accessPrivateYn: "0"}
      //  //      ]
      //  //      // TODO: add validationvia au
      //  //      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
      //  //    }});
      //  //  return cb(null, true);
      //  //})
      //} else {
      //console.log('find method');

      //}
      return;
    }

    // do not allow anonymous users

    if (!userId) {
      //console.log('reject 2!')
      return reject();
    }


    var afterFindCb = function(err, Topic) {
      if (err || !Topic){
        return reject();
      }

      //console.log('Topic:',Topic);
      if(Topic.accessPrivateYn !== 1
        || Topic.ownerUserId == userId)
        return cb(null, true);

      //----------------------------------------------------

      if(userId) {

        var allowedEntities = [];

        let whereFilter = {
          auth_type:0,
          auth_id:userId,
        };

        if (context.modelName == 'Entity') {
          whereFilter.entity_id = Topic.id;
        } else {
          whereFilter.entity_id=Topic.entityId;
        }

        app.models.EntityAccessAssign.findOne({where:whereFilter},
          function(err,data)
          {
            if (err || !data) {
              return cb(null, false);
            }

            // console.log('data (Topic.entityId='+Topic.entityId+':',data);
            return cb(null, true);


          });
      }
      else {
        return cb(null, false);
      }
      //------------------------------------------------------
      //console.log('[DENY#4]:Topic.access_private_yn=',Topic.accessPrivateYn,'Topic.owner_user_id=',Topic.ownerUserId)

    };

    /* when api request is like /api/someModel/findOne/123 */
    if(context.modelId) {
      console.log('[RBAC] Lookup with `findById`, model id:', context.modelId);
      context.model.findById(context.modelId, afterFindCb);
    }
    /* when api request is like /api/wikiPage/findOne/?filter[where][pageUid]=SomeWikiPage */
    else if(context.remotingContext.args.filter) {
      console.log('[RBAC] Lookup with `findOne`, model id:', context.remotingContext.args);
      context.model.findOne(context.remotingContext.args.filter, afterFindCb);
    }
    else {
        return cb(null, false);
    }
  });

  Role.registerResolver('createWikiPage', function(role, context, cb) {
    console.log('[RBAC] Validate access to  operation `'+context.remotingContext.method.name+'` of model `'+context.modelName+'`')
    var userId = context.accessToken.userId;

    function reject() {
      //console.log('[RBAC] Reject access to ['+context.modelName+'] operation `'+context.remotingContext.method.name+'`')
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // if the target model is not project
    if (context.modelName !== 'WikiPage'
    ) {
      //console.log('[RBAC] Model ['+context.modelName+'] is not supported by `topicEntityAccess` resolver')
      return reject();
    }

    if(context.remotingContext.method.name == 'upsert'
    ) {
      //console.log('context.remotingContext:',context.remotingContext);

      return cb(null, true);

      // TODO: we must validate if user can create pages in selected contextEntityId space
      if(userId) {
        var allowedEntities = [];

        app.models.EntityAccessAssign.find({where:{
            auth_type:0,
            auth_id:userId,
          }},
            function(err,data)
            {
              if (err) {
                //console.log('err:',err)
                // apply base
                context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                  {where: {
                    or: [
                      {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                      {accessPrivateYn: "0"}
                    ]
                    //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                  }});
                return cb(null, true);
              }

              function final() {

                if(allowedEntities.length>0) {
                  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                    {where: {
                      or: [
                        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                        {accessPrivateYn: "0"},
                        {entityId:{inq:allowedEntities}}
                      ]
                      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                    }});
                } else {
                  // base constraints: do not show private topics of other users:
                  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                    {where: {
                      or: [
                        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                        {accessPrivateYn: "0"}
                      ]
                      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                    }});

                }


                //context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                //  {where: {
                //    or: [
                //      {entityId:{inq:allowedEntities}}
                //    ]
                //  }});
                //console.log('context.remotingContext.args.filter:',context.remotingContext.args.filter);

                return cb(null, true);
              }
              function populateValue($modelInstance, callback) {
                allowedEntities.push($modelInstance.entity_id);
                return callback();
              }

              let resCount = data.length;
              let lopRes = [];
              data.forEach(function(/*SettingsField model instance*/ item){
                populateValue(item, function(result){
                  lopRes.push(1);
                  if(lopRes.length == (resCount)) {
                    //console.log('allowedEntities:',allowedEntities);

                    return final();
                  }
                });
              })


          });
      } else {


        // base constraints: do not show private topics of other users:
        context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
          {where: {
            accessPrivateYn: "0"
            //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
          }});


        return cb(null, true);
      }

      //if(1==2 && context.remotingContext.args.filter.group) {
      //  console.log('yes');
      //  //app.models.TopicGroup.findOne({where:{groupKey:context.remotingContext.args.filter.group}},
      //  //  function(err,groupInstance)
      //  //  {
      //  //    if (err) {
      //  //      return reject();
      //  //      //return callback(err);
      //  //    }
      //  //  //console.log('find method');
      //  //  delete context.remotingContext.args.filter.group;
      //  //    console.log('!!!!',context.remotingContext.args.filter);
      //  //  context.remotingContext.args.filter.group_id = groupInstance.id;
      //  //  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
      //  //    {where: {
      //  //      or: [
      //  //        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
      //  //        {accessPrivateYn: "0"}
      //  //      ]
      //  //      // TODO: add validationvia au
      //  //      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
      //  //    }});
      //  //  return cb(null, true);
      //  //})
      //} else {
        //console.log('find method');

      //}
      return;
    }else {
      return reject();
    }

  });

  Role.registerResolver('commentEntityAccess', function(role, context, cb) {
    console.log('[RBAC] Validate access to  operation `'+context.remotingContext.method.name+'` of model `'+context.modelName)
    var userId = context.accessToken.userId;
    //console.log('[topicEntityAccess]: userId='+userId)
    //console.log('context.result',context.remotingContext.result);
    //console.log('context.remotingContext.req',context.remotingContext.req);
    //console.log('context.remotingContext.method.name',context.remotingContext.method.name);
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // if the target model is not project
    if (context.modelName !== 'Comment') {
      //console.log('Not Comment')
      return reject();
    }
//


    if(context.remotingContext.method.name == 'find') {

      if(userId) {
        var allowedEntities = [];

        app.models.EntityAccessAssign.find({where:{
            auth_type:0,
            auth_id:userId,
          }},
          function(err,data)
          {
            if (err) {
              //console.log('err:',err)
              // apply base
              context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                {where: {
                  or: [
                    {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                    {accessPrivateYn: "0"}
                  ]
                  //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                }});
              return cb(null, true);
            }

            function final() {

              if(allowedEntities.length>0) {
                context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                  {where: {
                    or: [
                      {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                      {accessPrivateYn: "0"},
                     // {entityId:{inq:allowedEntities}}
                    ]
                    //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                  }});
              } else {
                // base constraints: do not show private topics of other users:
                context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
                  {where: {
                    or: [
                      {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
                      {accessPrivateYn: "0"}
                    ]
                    //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
                  }});

              }


              //context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
              //  {where: {
              //    or: [
              //      {entityId:{inq:allowedEntities}}
              //    ]
              //  }});
              //console.log('context.remotingContext.args.filter:',context.remotingContext.args.filter);

              return cb(null, true);
            }
            function populateValue($modelInstance, callback) {
              allowedEntities.push($modelInstance.entity_id);
              return callback();
            }

            let resCount = data.length;
            let lopRes = [];
            data.forEach(function(/*SettingsField model instance*/ item){
              populateValue(item, function(result){
                lopRes.push(1);
                if(lopRes.length == (resCount)) {
                  //console.log('allowedEntities:',allowedEntities);

                  return final();
                }
              });
            })


          });
      } else {


        // base constraints: do not show private topics of other users:
        context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
          {where: {
            accessPrivateYn: "0"
            //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
          }});


        return cb(null, true);
      }

      //if(1==2 && context.remotingContext.args.filter.group) {
      //  console.log('yes');
      //  //app.models.TopicGroup.findOne({where:{groupKey:context.remotingContext.args.filter.group}},
      //  //  function(err,groupInstance)
      //  //  {
      //  //    if (err) {
      //  //      return reject();
      //  //      //return callback(err);
      //  //    }
      //  //  //console.log('find method');
      //  //  delete context.remotingContext.args.filter.group;
      //  //    console.log('!!!!',context.remotingContext.args.filter);
      //  //  context.remotingContext.args.filter.group_id = groupInstance.id;
      //  //  context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
      //  //    {where: {
      //  //      or: [
      //  //        {and: [{accessPrivateYn: "1", "ownerUserId": userId}]},
      //  //        {accessPrivateYn: "0"}
      //  //      ]
      //  //      // TODO: add validationvia au
      //  //      //or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]
      //  //    }});
      //  //  return cb(null, true);
      //  //})
      //} else {
      //console.log('find method');

      //}
      return;
    }

    // do not allow anonymous users

    if (!userId) {
      //console.log('reject 2!')
      return reject();
    }

    // check if userId is in team table for the given project id
    context.model.findById(context.modelId, function(err, Topic) {
      if (err || !Topic){
        //console.log('reject 3!')
        return reject();
      }
      //console.log('Topic:',Topic);


      if(Topic.accessPrivateYn == 0
        || Topic.ownerUserId == userId)
        return cb(null, true);

      //------------------------------------------------------

      if(userId) {
        var allowedEntities = [];

        app.models.EntityAccessAssign.findOne({where:{
            auth_type:0,
            auth_id:userId,
            entity_id:Topic.entityId,
          }},
          function(err,data)
          {
            if (err || !data) {
              return cb(null, false);
            }

            //console.log('data:',data);
            return cb(null, true);


          });
      }
      else {
        return cb(null, false);
      }
      //------------------------------------------------------
      //console.log('[DENY#4]:Topic.access_private_yn=',Topic.accessPrivateYn,'Topic.owner_user_id=',Topic.ownerUserId)

    });


  });

  Role.registerResolver('groupTopicEntityAccess', function(role, context, cb) {
    var userId = context.accessToken.userId;
    //console.log('[topicEntityAccess]: userId='+userId)
    //console.log('context.result',context.remotingContext.result);
    //console.log('context.remotingContext.req',context.remotingContext.req);
    //console.log('context.remotingContext.method.name',context.remotingContext.method.name);
    function reject() {
      process.nextTick(function() {
        cb(null, false);
      });
    }

    // if the target model is not project
    if (context.modelName !== 'TopicGroup') {
      //console.log('Not TOPIC')
      return reject();
    }
//
    if(context.remotingContext.method.name == 'find') {
      context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
        {
          where: {or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]}
        }
      );
      return cb(null, true);
    }

    else if(context.remotingContext.method.name == 'findOne') {
      context.remotingContext.args.filter = mergeQuery(context.remotingContext.args.filter,
        {
          include: {
            relation: 'topics', // include the owner object
            scope: { // further filter the owner object
              where: {or: [{accessPrivateYn: '0'}, {ownerUserId: userId}]}
            }
          }
        });




      return cb(null, true);
    }
    else
        return reject();
    // do not allow anonymous users

    if (!userId) {
      //console.log('reject 2!')
      return reject();
    }

    // check if userId is in team table for the given project id
    context.model.findById(context.modelId, function(err, Topic) {
      if (err || !Topic){
        //console.log('reject 3!')
        return reject();
      }
      //console.log('Topic:',Topic);


      if(Topic.accessPrivateYn == 0
        || Topic.ownerUserId == userId)
        return cb(null, true);

      //console.log('[DENY#4]:Topic.access_private_yn=',Topic.accessPrivateYn,'Topic.owner_user_id=',Topic.ownerUserId)
      return cb(null, false);
    });


  });
}