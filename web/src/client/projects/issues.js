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
import React from 'react';
import mui from 'material-ui-io';

import Loader from '../components/Loader';
import ListActions from '../components/UIListActions';
import Form from '../topic/components/create-topic-form';

export default class ProjectIssues extends React.Component{

  constructor(props) {
    super(props);
    this.state = {
      loading:true,
      filters:[],
      count:0,
      filtersOpen:false,
      searchQuery:props.location.query.query
    };
  }

  componentDidMount() {
    // pull all topics (projects) from server - this list is filtered by client
    if(process.env.IS_BROWSER==true) {
      // load TOPICS of this BOARD
      this.props.topic_actions.find('issue', {},this.props.params.board_id);
      this.props.topic_actions.count('issue', {},this.props.params.board_id);
      this.props.topic_actions.loadFilters('issue', {},this.props.params.board_id);
    }
  }

  render()
  {
    const {board, list, meta, listFilters, newTopic, formFields} = this.props.boards;
    if(this.props.boards.meta.loading==true)
    {
      return <div className="row">
        <div style={{marginTop:'5%'}} className="col-md-4 col-md-offset-4">
          <h1><Loader />...</h1>
        </div>
      </div>
    }

    let filterToggleButton = <mui.IconButton iconClassName="fa fa-filter fa-lg" tooltip="Filter" onClick={this.toggleFilters.bind(this)} />
    let filterStyles = {
      margin: '0 -15px',
      padding: '10px 15px'
    };
    if(this.state.filtersOpen==false) {
      filterStyles.display='none';
    }

    const ListActionsRendered = <div className="pull-right">
      <ListActions
        FormComponent={Form}
        newTopic={newTopic}
        formFields={formFields}
        actions={this.props.topic_actions}
        containerStore={board}
        //FormStore={TopicFormStore}
        /* where will we be adding this item to */
       // Actions={TopicActions}
        TITLE='issues_createForm_TITLE'
        BUTTON_ACTION_LABEL='Add New'
        />
      {meta.count} item(s)
    </div>

    let ListView = require('../boards/boards.react');
    let ListViewItem = require('./components/issues-list-item');

    let Filters = require('../components/UISimpleFilters');

    return (
      <div className="bfk-browse">
        <div className="page-header clearfix">
          {ListActionsRendered}

          <mui.TextField
            ref="searchbox"
            hintText={this.state.searchQuery ? null: 'Search in text'}
            defaultValue={this.state.searchQuery}
            onChange={this.searchQueryChanged}
            />

          {filterToggleButton}

         <Filters ref="filters"
                   containerStore={board}
                   filters={listFilters}
                   actions={this.props.topic_actions}
                   onApply={this.onApplyFilters}
                   preselected={this.props.location.query}
                   style={filterStyles}
            />
        </div>
        <div className="clearfix">
        <ListView
          list={this.props.boards.list}
          actions={this.props.topic_actions}
          msg={this.props.msg.todos}
          history={this.props.history}
          itemComponent={ListViewItem}
          params={this.props.params}

        /* who's team do we want to see
        containerStore={this.props.topic}
        /!* message if list is empty /
        EmptyComponent={EmptyComponent}

        ListComponent={ListComponent}
        ListItemComponent={ListItemComponent}

        Actions={TopicActions}
        Store={TopicStore}
        CursorStore={TopicCursorStore}*/
        />
          </div>
      </div>
    )

    return (
      <div className="wiki-wrapper">
        <div className="wiki-page">
          <div className="container-fluid">
            <div className="row">
              ISSUES
            </div>
          </div>
        </div>

      </div>
    );
  }

  toggleFilters() {
    let setVisibility = !this.state.filtersOpen;
    this.setState({filtersOpen: setVisibility})
  }
};
