const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const iconPath = Me.path + '/icons/quickapp-icons-symbolic.svg';


const QuickLaunch = new Lang.Class({
    Name: 'QuickLaunch',
    Extends: PanelMenu.Button,

    _init: function(){
        this.parent(0.0, _("QuickLaunch"));        

        // let hbox = new St.BoxLayout({ style_class: 'panel-status-menu-box' });

        this._icon = new St.Icon({ 
                            gicon: Gio.icon_new_for_string(iconPath),
                            style_class: 'launch-icon',
                        });

        // hbox.add_child(this._icon);
        // this.actor.add_actor(hbox);

        this.actor.add_actor(this._icon);
        this.actor.connect('button-press-event', Lang.bind(this, this._showApps));

        this.old_x = Main.overview.viewSelector.actor.x;
        this.old_width = Main.overview.viewSelector.actor.get_width();

        this._hideDash();

    },
    _showApps: function() {
        if (Main.overview.visible) {
            Main.overview.toggle();
        } else { 
            Main.overview.viewSelector.showApps();
        }

    },
    _hideDash: function() {
        // Hide usual Dash
        Main.overview._dash.actor.hide();
        Main.overview.viewSelector.actor.set_x(0);
	    Main.overview.viewSelector.actor.set_width(0);
	    Main.overview.viewSelector.actor.queue_redraw();

    },
    _showDash: function() {
        // Show usual Dash
        Main.overview._controls.dash.actor.show();
        Main.overview.viewSelector.actor.set_x(this.old_x);
        Main.overview.viewSelector.actor.set_width(this.old_width);
        Main.overview.viewSelector.actor.queue_redraw();
        
    },
    destroy: function() {
        this._showDash();
        this.parent();
    },

});

let _quickLaunch;

function enable() {
    _quickLaunch = new QuickLaunch();
    Main.panel.addToStatusArea('QuickLaunch', _quickLaunch, 1, 'left');

    let indicator = Main.panel.statusArea['activities'];

    if(indicator != null) {
        indicator.container.hide();
    }

}

function disable() {

    _quickLaunch.destroy();

	let indicator = Main.panel.statusArea['activities'];

    if(indicator != null) {
        indicator.container.show();
    }
  
}

function init(metadata) {

}










