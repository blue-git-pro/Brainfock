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

import React from 'react';
import Select from 'react-select';
require('isomorphic-fetch');

var RemoteSelectField = React.createClass({
  timer:null,
  displayName: 'RemoteSelectField',
  propTypes: {
    hint: React.PropTypes.string,
    label: React.PropTypes.string,
    endpoint:React.PropTypes.string,
    options:React.PropTypes.array,
    endpointQueryString:React.PropTypes.string
  },
  loadOptions (input, callback) {

    if (!input.length) {
      return callback(null, {
        options: this.props.options || [],
        complete:false
        });
    }

    if (this.timer !== null)
      clearTimeout(this.timer);

    let endpoint = [this.props.endpoint];
    if (input) {
      if (this.props.endpointQueryString) {
        const query = encodeURI('%' + input + '%');
        endpoint.push(`${this.props.endpointQueryString}=${query}`);
      }
    }


    this.timer=setTimeout(function() {
      fetch(endpoint.join('&'), {
        headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
        method: 'get',
        credentials: 'include', // accept cookies from server, for authentication
      })
        .then(response => {
          if (response.status === 200) {
            return response.json();
          }
          throw response;
        })
        .then(function(response) {
          let resp= response.map(item => { return {
            value:(item.value || item.id),
            label:(item.label || item.summary || item.name),
          }});
          return callback(null, {
            options:resp || [],
            complete: false
          });
        });
    }.bind(this),400);
  },
  renderHint () {
    if (!this.props.hint) return null;
    return (
      <div className="hint">{this.props.hint}</div>
    );
  },
  renderError () {
    if (!this.props.errorText) return null;
    return (
      <div style={{fontSize:12,color:'red',padding:'10px 0 0 0'}}>{this.props.errorText}</div>
    );
  },
  render () {

    const {...props} = this.props;
    if (this.props.endpoint) {
      props.asyncOptions = this.loadOptions;
    }
    return (
      <div className="section">
        <h3 className="section-heading">{this.props.label}</h3>
        <Select {...props} className="remote-example"/>
        {this.renderError()}
        {this.renderHint()}
      </div>
    );
  }
});

module.exports = RemoteSelectField;