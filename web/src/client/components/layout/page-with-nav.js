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

var React = require('react');
var Loader = require('../Loader');

let { Menu, Mixins, Styles } = require('material-ui-io');

let { Spacing, Colors } = Styles;
let { StyleResizable, StylePropable } = Mixins;

import * as mui from 'material-ui-io';

/**
 * Page With Navigation, based on material-ui's PageWithNav
 */
var PageWithNav = React.createClass({

  mixins: [StyleResizable, StylePropable],

  contextTypes: {
    router: React.PropTypes.func
  },

  getDefaultProps() {
    return {
      menuItems:[]
    }
  },
  getStyles(){
    let subNavWidth = Spacing.desktopKeylineIncrement * 3 + 'px';
    let styles = {
      root: {
        paddingTop: (Spacing.desktopKeylineIncrement/2) + 'px'
      },
      rootWhenMedium: {
        position: 'relative'
      },
      secondaryNav: {
        borderTop: 'solid 1px ' + Colors.grey300,
        overflow: 'hidden'
      },
      content: {
        boxSizing: 'border-box',
        padding: Spacing.desktopGutter + 'px',
        maxWidth: (Spacing.desktopKeylineIncrement * 20) + 'px'
      },
      secondaryNavWhenMedium: {
        borderTop: 'none',
        position: 'absolute',
        top: '64px',
        width: subNavWidth
      },
      contentWhenMedium: {
        marginLeft: subNavWidth,
        borderLeft: 'solid 1px ' + Colors.grey300,
        minHeight: '800px'
      }
    };

    if (this.isDeviceSize(StyleResizable.statics.Sizes.MEDIUM) ||
        this.isDeviceSize(StyleResizable.statics.Sizes.LARGE)) {
      styles.root = this.mergeStyles(styles.root, styles.rootWhenMedium);
      styles.secondaryNav = this.mergeStyles(styles.secondaryNav, styles.secondaryNavWhenMedium);
      styles.content = this.mergeStyles(styles.content, styles.contentWhenMedium);
    }

    return styles;
  },

  _getSelectedIndex: function()
  {
    var currentItem;
    let menuItems = this.props.menuItems;
    for (var i = menuItems.length - 1; i >= 0; i--) {
      currentItem = menuItems[i];
      // multiple routes match support:
      if(currentItem.routes) {
        // see if any *one* route is valid
        for (var i2 = currentItem.routes.length - 1; i2 >= 0; i2--) {
          let _routeName = currentItem.routes[i2];
          if (this.props.history.isActive(_routeName, (currentItem.params?currentItem.params:[]))) return i;

        }
      }
      if (currentItem.route && this.props.history.isActive(currentItem.route, (currentItem.params?currentItem.params:[]))) return i;
    };
  },


  _onMenuItemClick(e, index, payload) {
    this.props.history.pushState(null, payload.route);
  },

  render: function () {

    const {children, ...passProps} = this.props;

    let styles = this.getStyles();
    return (
        <div style={styles.root}>
          <div style={styles.content}>
            {React.cloneElement(children, passProps)}
          </div>
          <div style={styles.secondaryNav}>
            <mui.Menu
                ref="menuItems"
                zDepth={0}
                menuItems={this.props.menuItems}
                selectedIndex={this._getSelectedIndex()}
                onItemTap={this._onMenuItemClick} />
          </div>
        </div>
    );
  }
});
module.exports=PageWithNav;