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
import Component from 'react-pure-render/component';

import ProjectsEmpty from './components/projects-empty';
import MasterDetailsListView from './components/master-detail.list';

export default class ProjectsIndex extends Component {

  render() {
    const {children, ...passProps} = this.props;
    return (
      <MasterDetailsListView
        containerTopic={null}
        disableDetails
        emptyListFallback={ProjectsEmpty}
        groupKey='project'
        {...passProps}
        />
    );
  }
}
