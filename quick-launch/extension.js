const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const iconPath = Me.path + '/icons/quickapp-icons-symbolic.svg';


let button;

function _showApps() {
    if (Main.overview.visible) {
        Main.overview.toggle();
    } else { 
        Main.overview.viewSelector.showApps();
    }
}

function init() {
    button = new St.Bin({ style_class: 'launch-button',
                          reactive: true,
                          can_focus: true,
                          x_fill: true,
                          y_fill: false,
                          track_hover: true });
    let icon = new St.Icon({ 
                            gicon: Gio.icon_new_for_string(iconPath),
                            style_class: 'launch-icon' });

    button.set_child(icon);
    button.connect('button-press-event', _showApps);


    // store the values we are going to override
    old_x = Main.overview.viewSelector.actor.x;
    old_width = Main.overview.viewSelector.actor.get_width();


}

function enable() {
    Main.panel._leftBox.insert_child_at_index(button, 1);
{
    let indicator = Main.panel.statusArea['activities'];

    // Hide usual Dash
    Main.overview._dash.actor.hide();
    Main.overview.viewSelector.actor.set_x(0);
	Main.overview.viewSelector.actor.set_width(0);
	Main.overview.viewSelector.actor.queue_redraw();

    if(indicator != null) {
        indicator.container.hide();
    }
  }
}

function disable() {
    Main.panel._leftBox.remove_child(button);

    // Show usual Dash
    Main.overview._controls.dash.actor.show();
    Main.overview.viewSelector.actor.set_x(old_x);
    Main.overview.viewSelector.actor.set_width(old_width);
    Main.overview.viewSelector.actor.queue_redraw();

{
	let indicator = Main.panel.statusArea['activities'];
    if(indicator != null) {
        indicator.container.show();
    }
  }
}
