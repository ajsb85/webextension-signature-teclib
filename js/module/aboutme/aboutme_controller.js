var AboutmeController = {
    init: function() {
        AboutmeController.setupListeners();
        AboutmeController.loadScript();
    },
    setupListeners: function() {
        document.addEventListener('aboutme:user_name', function(e) {
            AboutmeController.compareUserinfo(e.detail.user_name);
        });
    },
    loadScript: function() {
        $.getScript(chrome.extension.getURL('js/module/aboutme/aboutme.js')).done(function() {
            console.log('aboutme is loaded on the page.');
        });
    },
    compareUserinfo: function(user_name) {
        if (! user_name.length) return;
        chrome.storage.sync.get({
            user_name: ''
        }, function(items) {
            if (items.user_name && items.user_name !== user_name || ! items.user_name) {
                AboutmeController.saveUserinfo(user_name);
            }
        });
    },
    saveUserinfo: function(user_name) {
        if (! user_name.length) return;

        chrome.runtime.sendMessage({ message: 'get:aboutme:user_info', user_name: user_name }, function(response) {
            console.log('Send User Info request!');
            console.log(response);
        });

    }
};

$(document).ready(AboutmeController.init);
