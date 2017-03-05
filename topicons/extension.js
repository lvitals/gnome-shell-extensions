/* © Leandro Vital <leavitals@gmail.com> */

const Clutter = imports.gi.Clutter;
const Shell = imports.gi.Shell;
const St = imports.gi.St;
const Main = imports.ui.main;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Panel = imports.ui.panel;
const PanelMenu = imports.ui.panelMenu;
const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;
const NotificationDaemon = imports.ui.notificationDaemon;

const ExtensionUtils = imports.misc.extensionUtils;
const Extension = ExtensionUtils.getCurrentExtension();
const Convenience = Extension.imports.convenience;

let hiddenWmClasses = [];
let trayAddedId = 0;
let trayRemovedId = 0;
let getSource = null;
let icons = [];
let iconWmClasses = [];
let iconSize = 0;
let iconStyle = "";
let notificationDaemon;
let schema;

function init() {
	if (Main.legacyTray) {
		notificationDaemon = Main.legacyTray;
		NotificationDaemon.STANDARD_TRAY_ICON_IMPLEMENTATIONS = imports.ui.legacyTray.STANDARD_TRAY_ICON_IMPLEMENTATIONS;
	}
	else if (Main.notificationDaemon._fdoNotificationDaemon) {
		notificationDaemon = Main.notificationDaemon._fdoNotificationDaemon;
		getSource = Lang.bind(notificationDaemon, NotificationDaemon.FdoNotificationDaemon.prototype._getSource);
	}
	else {
		notificationDaemon = Main.notificationDaemon;
		getSource = Lang.bind(notificationDaemon, NotificationDaemon.NotificationDaemon.prototype._getSource);
	}

	schema = Convenience.getSettings();
	// we need to refresh icons when user changes settings
	schema.connect("changed::icon-size", Lang.bind(this, refresh));
	schema.connect("changed::icon-padding", Lang.bind(this, refresh));
	schema.connect("changed::hidden-icons", Lang.bind(this, refresh));

	refresh();
}

function enable() {
	GLib.idle_add(GLib.PRIORITY_LOW, moveToTop);
}

function disable() {
	moveToTray();
}

function createSource(title, pid, ndata, sender, trayIcon) {
	if (trayIcon) {
		onTrayIconAdded(this, trayIcon, title);
		return null;
	}

	return getSource(title, pid, ndata, sender, trayIcon);
}

function onTrayIconAdded(o, icon, role) {
	let wmClass = getWmClass(icon);
	iconWmClasses.push(wmClass);
	schema.set_strv("current-icons", iconWmClasses);
	if (NotificationDaemon.STANDARD_TRAY_ICON_IMPLEMENTATIONS[wmClass] !== undefined)
		return;

	let timeout = 500;

	// Delay showing Pidgin icon by 10 seconds
	if (wmClass == "pidgin") {
		timeout = 10000;
	}

	Mainloop.timeout_add(timeout, function() {
		addTrayIcon(icon, role);
		if (hiddenWmClasses.indexOf(wmClass) > -1)
			hideTrayIcon(icon);
	});
}

function addTrayIcon(icon, role) {
	let buttonBox = new PanelMenu.ButtonBox();
	let box = buttonBox.actor;
	let parent = box.get_parent();

	iconSize = getIconSize();
	icon.set_size(iconSize, iconSize);
	icon.reactive = true;

	box.add_actor(icon);
	box.set_style(iconStyle);
	if (parent)
		parent.remove_actor(box);

	icons.push(icon);
	Main.panel._rightBox.insert_child_at_index(box, 0);

	let clickProxy = new St.Bin({
		width: iconSize
	});
	clickProxy.reactive = true;
	Main.uiGroup.add_actor(clickProxy);

	icon._proxyAlloc = Main.panel._rightBox.connect("allocation-changed", function() {
		Meta.later_add(Meta.LaterType.BEFORE_REDRAW, function() {
			let [x, y] = icon.get_transformed_position();
			clickProxy.set_position(x, y);
			clickProxy.set_height(Main.panel._rightBox.get_height());
		});
	});

	icon.connect("destroy", function() {
		Main.panel._rightBox.disconnect(icon._proxyAlloc);
		clickProxy.destroy();
	});

	clickProxy.connect("button-release-event", function(actor, event) {
		icon.click(event);
	});

	icon._box = box;
	icon._clickProxy = clickProxy;
}

function showTrayIcon(icon) {
	icon._box.show();
}
function hideTrayIcon(icon) {
	icon._box.hide();
}

function onTrayIconRemoved(o, icon) {
	let parent = icon.get_parent();
	parent.destroy();
	icon.destroy();
	icons.splice(icons.indexOf(icon), 1);

	iconWmClasses.splice(iconWmClasses.indexOf(getWmClass(icon)), 1);
	schema.set_strv("current-icons", iconWmClasses);
}

function moveToTop() {
	notificationDaemon._trayManager.disconnect(notificationDaemon._trayIconAddedId);
	notificationDaemon._trayManager.disconnect(notificationDaemon._trayIconRemovedId);
	trayAddedId = notificationDaemon._trayManager.connect("tray-icon-added", onTrayIconAdded);
	trayRemovedId = notificationDaemon._trayManager.connect("tray-icon-removed", onTrayIconRemoved);

	notificationDaemon._getSource = createSource;

	let toDestroy = [];
	if (notificationDaemon._sources) {
		for (let i = 0; i < notificationDaemon._sources.length; i++) {
			let source = notificationDaemon._sources[i];
			if (!source.trayIcon)
				continue;
			let parent = source.trayIcon.get_parent();
			parent.remove_actor(source.trayIcon);
			onTrayIconAdded(this, source.trayIcon, source.initialTitle);
			toDestroy.push(source);
		}
	}
	else {
		for (let i = 0; i < notificationDaemon._iconBox.get_n_children(); i++) {
			let button = notificationDaemon._iconBox.get_child_at_index(i);
			let icon = button.child;
			button.remove_actor(icon);
			onTrayIconAdded(this, icon, "");
			toDestroy.push(button);
		}
	}

	for (let i = 0; i < toDestroy.length; i++) {
		toDestroy[i].destroy();
	}
}

function moveToTray() {
	if (trayAddedId !== 0) {
		notificationDaemon._trayManager.disconnect(trayAddedId);
		trayAddedId = 0;
	}

	if (trayRemovedId !== 0) {
		notificationDaemon._trayManager.disconnect(trayRemovedId);
		trayRemovedId = 0;
	}

	notificationDaemon._trayIconAddedId = notificationDaemon._trayManager.connect("tray-icon-added",
		Lang.bind(notificationDaemon, notificationDaemon._onTrayIconAdded));
	notificationDaemon._trayIconRemovedId = notificationDaemon._trayManager.connect("tray-icon-removed",
		Lang.bind(notificationDaemon, notificationDaemon._onTrayIconRemoved));
	notificationDaemon._getSource = getSource;

	for (let i = 0; i < icons.length; i++) {
		let icon = icons[i];
		let parent = icon.get_parent();
		if (icon._clicked) {
			icon.disconnect(icon._clicked);
		}
		icon._clicked = undefined;
		if (icon._proxyAlloc) {
			Main.panel._rightBox.disconnect(icon._proxyAlloc);
		}
		icon._clickProxy.destroy();
		parent.remove_actor(icon);
		parent.destroy();
		notificationDaemon._onTrayIconAdded(notificationDaemon, icon);
	}

	icons = [];
	iconWmClasses = [];
	schema.set_strv("current-icons", iconWmClasses);
}

function refresh() {
	iconSize = getIconSize();
	iconStyle = getIconStyle();
	hiddenWmClasses = schema.get_strv("hidden-icons") || [];

	for (let i = 0; i < icons.length; i++) {
		let icon = icons[i];
		if (hiddenWmClasses.indexOf(getWmClass(icon)) > -1) {
			hideTrayIcon(icon);
			continue;
		} else {
			showTrayIcon(icon, null);
		}

		icon.set_size(iconSize, iconSize);
		icon.get_parent().set_style(iconStyle);
		icon._clickProxy.set_width(iconSize);
	}
}

function getIconSize() {
	let scaleFactor = St.ThemeContext.get_for_stage(global.stage).scale_factor;
	return schema.get_int("icon-size") * scaleFactor;
}
function getIconStyle() {
	return "-natural-hpadding: %dpx".format(schema.get_int("icon-padding"));
}

function getWmClass(icon) {
	return icon.wm_class ? icon.wm_class.toLowerCase() : "";
}
