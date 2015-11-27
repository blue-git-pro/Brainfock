/**
 * Brainfock - Community & Business Management Solution
 *
 * @link http://www.brainfock.org
 * @copyright Copyright (c) 2015 Sergii Gamaiunov <hello@webkadabra.com>
 */
import React from 'react';
import ListViewItem from '../projects/components/issues-list-item';
import ProjectsEmpty from '../boards/components/boards.empty';
import MasterDetailsListView from '../projects/components/master-detail.list';
import ListView from '../projects/components/plain.list';
let PageWithNav = require('../components/layout/page-with-nav');

const views = {
  'master.detail': MasterDetailsListView,
  'list': ListView,
  'boards.homepage': ListView,
};

module.exports = React.createClass({

  componentWillMount() {
    if (process.env.IS_BROWSER === true) {
      this.props.topic_actions.loadTopicGroup('board');
      //this.props.topic_actions.find('project', {}/*, this.props.parentModel*/);
    }
  },

  render: function()
  {
    let View;
    if (views[this.props.boards.group.view]) {
      View = views[this.props.boards.group.view];
    } else {
      View = MasterDetailsListView;
    }

    View = MasterDetailsListView;

    const {children, ...passProps} = this.props;
    return (
    <PageWithNav  menuItems={this.menuItems()}>
      <View
        containerTopic={null}
        disableDetails_
        browseAll
        emptyListFallback={ProjectsEmpty}
        groupKey='issue'
        listViewItem={ListViewItem}
        groupBy={this.props.location.query && this.props.location.query.groupBy}
        {...passProps}
        />
    </PageWithNav>
    );
  },

  /**
   * @todo i18n
   * @returns {*[]}
   */
    menuItems() {

    let icon;
    if (this.props.boards.board.accessPrivateYn) {
      icon = (<i className="fa fa-eye-slash"></i>);
    }
    return [

    ];
  }
});
