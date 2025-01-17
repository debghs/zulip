"use strict";

const assert = require("node:assert/strict");

const {addDays} = require("date-fns");

const {mock_esm, zrequire} = require("./lib/namespace.cjs");
const {run_test} = require("./lib/test.cjs");
const {page_params} = require("./lib/zpage_params.cjs");

const desktop_notifications = mock_esm("../src/desktop_notifications");
const util = mock_esm("../src/util");
const timerender = mock_esm("../src/timerender");

const {localstorage} = zrequire("localstorage");
const navbar_alerts = zrequire("navbar_alerts");
const {set_current_user, set_realm} = zrequire("state_data");

const current_user = {};
set_current_user(current_user);
const realm = {};
set_realm(realm);

function test(label, f) {
    run_test(label, (helpers) => {
        window.localStorage.clear();
        f(helpers);
    });
}

test("should_show_desktop_notifications_banner", ({override}) => {
    const ls = localstorage();

    // Show desktop notifications banner when following conditions are suitable:
    // - Notification permission is not already granted.
    // - The user is not a spectator.
    // - The device is not mobile.
    // - Notification permission is not denied.
    // - The user has not said to never show banner on this device again.
    ls.set("dontAskForNotifications", undefined);
    page_params.is_spectator = false;
    override(util, "is_mobile", () => false);
    override(desktop_notifications, "granted_desktop_notifications_permission", () => false);
    override(desktop_notifications, "permission_state", () => "default");
    assert.equal(navbar_alerts.should_show_desktop_notifications_banner(ls), true);

    // Don't ask for permission if user has said to never show banner on this device again.
    ls.set("dontAskForNotifications", true);
    assert.equal(navbar_alerts.should_show_desktop_notifications_banner(ls), false);
    ls.set("dontAskForNotifications", undefined);

    // Don't ask for permission if device is mobile.
    override(util, "is_mobile", () => true);
    assert.equal(navbar_alerts.should_show_desktop_notifications_banner(ls), false);
    override(util, "is_mobile", () => false);

    // Don't ask for permission if notification is denied by user.
    override(desktop_notifications, "permission_state", () => "denied");
    assert.equal(navbar_alerts.should_show_desktop_notifications_banner(ls), false);

    // Don't ask for permission if notification is already granted by user.
    override(desktop_notifications, "granted_desktop_notifications_permission", () => true);
    assert.equal(navbar_alerts.should_show_desktop_notifications_banner(ls), false);

    // Don't ask for permission if user is a spectator.
    page_params.is_spectator = true;
    assert.equal(navbar_alerts.should_show_desktop_notifications_banner(ls), false);
});

test("profile_incomplete_alert", ({override}) => {
    // Don't test time related conditions
    override(timerender, "should_display_profile_incomplete_alert", () => true);

    // Show alert.
    override(current_user, "is_admin", true);
    override(realm, "realm_description", "Organization imported from Slack!");
    assert.equal(navbar_alerts.check_profile_incomplete(), true);

    // Avoid showing if the user is not admin.
    override(current_user, "is_admin", false);
    assert.equal(navbar_alerts.check_profile_incomplete(), false);

    // Avoid showing if the realm description is already updated.
    override(current_user, "is_admin", true);
    assert.equal(navbar_alerts.check_profile_incomplete(), true);
    override(realm, "realm_description", "Organization description already set!");
    assert.equal(navbar_alerts.check_profile_incomplete(), false);
});

test("server_upgrade_alert hide_duration_expired", ({override}) => {
    const ls = localstorage();
    const start_time = 1620327447050; // Thursday 06/5/2021 07:02:27 AM (UTC+0)

    override(Date, "now", () => start_time);
    assert.equal(ls.get("lastUpgradeNagDismissalTime"), undefined);
    assert.equal(navbar_alerts.should_show_server_upgrade_notification(ls), true);
    navbar_alerts.dismiss_upgrade_nag(ls);
    assert.equal(navbar_alerts.should_show_server_upgrade_notification(ls), false);

    override(Date, "now", () => addDays(start_time, 8).getTime()); // Friday 14/5/2021 07:02:27 AM (UTC+0)
    assert.equal(navbar_alerts.should_show_server_upgrade_notification(ls), true);
    navbar_alerts.dismiss_upgrade_nag(ls);
    assert.equal(navbar_alerts.should_show_server_upgrade_notification(ls), false);
});

test("demo_organization_days_remaining", ({override}) => {
    const start_time = new Date(1620327447050); // Thursday 06/5/2021 07:02:27 AM (UTC+0)

    const high_priority_deadline = addDays(start_time, 5);
    override(
        realm,
        "demo_organization_scheduled_deletion_date",
        Math.trunc(high_priority_deadline / 1000),
    );
    override(Date, "now", () => start_time);
    assert.equal(navbar_alerts.get_demo_organization_deadline_days_remaining(), 5);

    const low_priority_deadline = addDays(start_time, 10);
    override(
        realm,
        "demo_organization_scheduled_deletion_date",
        Math.trunc(low_priority_deadline / 1000),
    );
    override(Date, "now", () => start_time);
    assert.equal(navbar_alerts.get_demo_organization_deadline_days_remaining(), 10);
});
