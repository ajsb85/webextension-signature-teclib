chrome.runtime.onInstalled.addListener(function() {
    // Replace all rules ...
    // chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
    //     // With a new rule ...
    //     chrome.declarativeContent.onPageChanged.addRules([
    //         {
    //             // That fires when a page's URL contains a 'g' ...
    //             conditions: [
    //                 new chrome.declarativeContent.PageStateMatcher({
    //                     pageUrl: { hostEquals: 'mail.google.com' }
    //                 })
    //             ],
    //             // And shows the extension's page action.
    //             actions: [ new chrome.declarativeContent.ShowPageAction() ]
    //         }
    //     ]);
    // });

    //auto open a new tab goes to gmail
    chrome.tabs.create({url: 'https://gmail.com', active: false, selected: true});

    // Run update info alarms
    chrome.alarms.onAlarm.addListener(function(alarm) {
        if (alarm.name == 'update_thumb') {

            chrome.storage.sync.get({ user_name: '' }, function(items) {
                if ( items.user_name ) {
                    fetchUserInfo(items.user_name);
                    return true;

                }
            });

        }
    });
    chrome.storage.onChanged.addListener(function(obj, areaName) {
        if ( obj.user_name ) {
            // run it every 7 days
            chrome.alarms.get('update_thumb', function(alarm) {
                if (alarm) {
                    chrome.alarms.clear('update_thumb');
                }
                chrome.alarms.create('update_thumb', {
                    when: Date.now() + 604800000, periodInMinutes: 10080
                });
            });
        }
    });

});
//lisener for calling aboutme user info api
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.message === 'get:aboutme:user_info') {
            if (request.user_name) {
                fetchUserInfo(request.user_name, sendResponse);
                return true;
            }
        }
    }
);
//promise function to call about.me api to get user info
function fetchUserInfo(user_name, sendResponse) {
    if (! user_name) return;
    $.ajax({
        url: 'https://about.me/n/'+ user_name +'/emailsignature'
    })
    .done(function(data) {
        var show_photo = (data.thumb_url)? true: false;

        chrome.storage.sync.set({
          user_name: data.user_name,
          first_name: data.first_name,
          last_name: data.last_name,
          thumb_url: data.thumb_url,
          site_domain: data.site_domain,
          mapped_domain: data.mapped_domain || '',
          mapped: data.mapped,
          show_photo: show_photo
      }, function() {
        console.log('Set user info successfully!');
        if (sendResponse) {
            sendResponse({ message: 'send:aboutme:user_info:success', data: data});
        }
      });
    })
    .fail(function(data) {
        console.log('Failed to set user info!');
        if (sendResponse) {
            sendResponse({ message: 'send:aboutme:user_info:fail', data: data});
        }
    });
}
