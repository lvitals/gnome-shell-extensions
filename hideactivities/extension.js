/* © Leandro Vital <leavitals@gmail.com> */

const Main = imports.ui.main;

function enable() {
    let indicator = Main.panel.statusArea['activities'];
    if(indicator != null) {
        indicator.container.hide();
    }
}

function disable() {
    let indicator = Main.panel.statusArea['activities'];
    if(indicator != null) {
        indicator.container.show();
    }
}
