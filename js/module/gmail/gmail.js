var GmailComposeController = {

    init: function() {
        GmailComposeController.composeEvents();
        GmailComposeController.setupListeners();
    },

    setupListeners: function() {
        document.addEventListener('info:ready', GmailComposeController.setupGmailListeners);

        document.addEventListener('info:respond', function(e) {
            GmailComposeController.data = e.detail.data;
            GmailComposeController.basic_url = e.detail.basic_url;
            GmailComposeController.compose_menu = e.detail.compose_template;
            GmailComposeController.text_template = e.detail.text_template;
            GmailComposeController.thumb_template = e.detail.thumb_template;
            document.dispatchEvent(new Event('info:ready'));
        });

        document.dispatchEvent(new Event('info:request'));
    },

    setupGmailListeners: function() {
        var gmail = new Gmail();
        //for any open mail on page load
        GmailComposeController.checkComposeOpen(gmail);

        gmail.observe.on("compose", function(compose, type) {
            GmailComposeController.buildCompose(compose, type);
        });
    },

    checkComposeOpen: function(gmail) {
        var openedComposes = gmail.dom.composes();
        for(var i = 0; i < openedComposes.length; i++) {
            GmailComposeController.buildCompose(openedComposes[i]);
        }
    },

    selectAction: function(e, compose) {
        var node = $(e.currentTarget), str, parent= node.parent(), prev = parent.find('.aboutme-emailsig-compose .item.check');
        if (node[0] === prev[0]) return;

        node.siblings().removeClass('check').end().toggleClass('check');
        //remove existing email signature in the compose window;
        $('.aboutme-emailsig-text, .aboutme-emailsig-thumb').remove();
        compose.$el.find('table a[href*="utm_campaign=chrome_ext"]').closest('table').remove();

        var active_node = parent.find('.item.check');
        if (! GmailComposeController.data.user_name ) {
            //to be update with default messaging when there is configs
            return;
        }

        if (active_node.hasClass('thumb')) {
            document.dispatchEvent(new CustomEvent('info:update', {
                detail: {
                    show_photo: true
                }
            }));
            str = compose.body() + GmailComposeController.thumb_template;
            compose.body(str);
        } else if ( active_node.hasClass('text')) {
            document.dispatchEvent(new CustomEvent('info:update', {
                detail: {
                    show_photo: false
                }
            }));
            str = compose.body() + GmailComposeController.text_template;
            compose.body(str);
        }
    },

    checkMenuPosition: function(e) {
        //define menu position
        var pos = $(e.currentTarget).offset();
        $(e.currentTarget).find('.menu-container').css({ top: (pos.top - 200)+'px', left: (pos.left - 135)+'px' });
    },

    composeEvents: function() {

        $(window).on('resize', GmailComposeController.checkMenuPosition);

        $('body').on('click', function() {
            if (! $('.aboutme-emailsig-compose .menu-container').length) return;
            $('.aboutme-emailsig-compose .menu-container').addClass('invisible');
        });

        $('body').on('click', '.aboutme-emailsig-compose', function(e) {
            e.stopPropagation();

            GmailComposeController.checkMenuPosition(e);
            $(e.currentTarget).find('.menu-container').toggleClass('invisible');
        });

    },

    buildCompose: function(compose, type) {
        //unbind when each compose window closes
        $('body').off('click', '.aboutme-emailsig-compose .item');

        //compose events hanlder when user change selection from menu
        $('body').on('click', '.aboutme-emailsig-compose .item', function(e) {
            GmailComposeController.selectAction(e, compose);
        });

        window.setTimeout( function() {
            //remove existing one; old thumb table somehow lost the classname
            compose.$el.find('.aboutme-emailsig-compose').remove();
            var old_thumb_node = compose.$el.find('table a[href*="utm_campaign=chrome_ext"]').closest('table');

            //inserting about.me signature thumb by default - change when user selects; not permanetly change;
            var template = '', str = '';
            if ( GmailComposeController.data.show_photo ) {
                template = GmailComposeController.thumb_template;
            } else {
                template = GmailComposeController.text_template;
            }

            if (GmailComposeController.data.user_name) {
                if ( ! type || type === 'compose') {
                    old_thumb_node.remove();
                    str = compose.body() + template;
                } else {
                    if (! old_thumb_node.length) {
                        str = '<br />' + template + compose.body();
                    } else {
                        //reserve the old draft when user may come back later
                        str = compose.body();
                    }
                }
            }

            compose.body(str);

            var remove_button = $(compose.$el.find('.oh.J-Z-I.J-J5-Ji.T-I-ax7').get(0));
            var remove_button_container = remove_button.parent('.J-J5-Ji');
            remove_button.clone().addClass('aboutme-emailsig-compose').attr('data-tooltip', 'Insert about.me signature').appendTo(remove_button_container);
            $('.aboutme-emailsig-compose .J-J5-Ji.J-Z-I-J6-H').html(GmailComposeController.compose_menu);

        }, 300 );

    }

};

$(document).ready(GmailComposeController.init);
