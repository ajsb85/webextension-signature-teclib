var GmailController = Marionette.Object.extend({

    initialize: function() {
        _.bindAll(this, 'loadTemplate', 'buildTopNav', 'fetchData');

        this.templates = {};
        this.setupListeners();
        this.loadScripts();
        this.checkLoggedInuser();
    },

    checkLoggedInuser: function() {
        var _this = this;
        chrome.storage.sync.get({
            user_name: ''
        }, function(items) {
            if (! items.user_name) {
                $.ajax({
                    url: 'https://about.me/n/partner/loggedInUser'
                })
                .done(function(data) {
                    if (data) {
                        var user_name = data;
                        chrome.runtime.sendMessage({ message: 'get:aboutme:user_info', user_name: user_name }, function(response) {
                            console.log('Send user info request');
                            console.log(response);
                        });

                    }
                });
            }
        });
    },

    loadTemplate: function(template_id) {
        var deferred = $.Deferred();
        var promise = deferred.promise();
        var _this = this;

        if (! this.templates[template_id] ) {
            $.get(chrome.extension.getURL("js/templates/" + template_id + ".html"), function(data) {

                _this.templates[template_id] = data;
                deferred.resolve(data);
            });
        } else {
            deferred.resolve(this.templates[template_id]);
        }

        return promise;
    },

    loadScripts: function() {
        var _this = this;

        $.getScript(chrome.extension.getURL('js/lib/jquery.js')).done(function() {
            $.getScript(chrome.extension.getURL('js/plugin/gmail.js')).done(function() {
                $.getScript(chrome.extension.getURL('js/module/gmail/gmail.js')).done(function() {
                    _this.buildTopNav();
                });
            });
        });
    },

    setupListeners: function() {
        var _this = this;

        document.addEventListener('info:request', this.fetchData);

        document.addEventListener('info:update', function(e) {
            chrome.storage.sync.set(e.detail, _this.fetchData);
        });

        //chrome storage listener
        chrome.storage.onChanged.addListener(function(obj, areaName) {
            if ( obj.user_name && _this.top_nav_menu) {
                _this.top_nav_menu.render();
            }
        });
    },

    fetchData: function() {
        var _this = this;

        chrome.storage.sync.get({
            user_name: '',
            first_name: '',
            last_name: '',
            thumb_url: '',
            type: 'thumb',
            site_domain: 'about.me',
            mapped_domain: '',
            mapped: false,
            show_photo: true
      }, function(items) {

          var promise_compose = _this.loadTemplate('compose_menu');
          var promise_text =  _this.loadTemplate('plain_text');
          var promise_thumb = _this.loadTemplate('thumbnail');

          $.when(promise_compose, promise_text, promise_thumb).done(function(compose, text, thumb) {
              var compose_html, text_html, thumb_html;

              //compose emailsig_url based on premium user or not
              var schema = 'https://';
              var url = items.site_domain + '/'+ items.user_name;
              if (items.mapped && items.mapped_domain) {
                  schema = 'http://';
                  url = items.mapped_domain;
              }
              var emailsig_url = schema + url;
              items.schema = schema;
              items.url = url;
              items.emailsig_url = emailsig_url + '?promo=email_sig&utm_source=email_sig&utm_medium=external_link&utm_campaign=chrome_ext';

              compose_html = _.template(compose)(items);
              text_html = _.template(text)(items);
              thumb_html = _.template(thumb)(items);

              document.dispatchEvent(new CustomEvent('info:respond', {
                  detail: {
                      basic_url: 'chrome-extension://'+ chrome.runtime.id + '/',
                      data: items,
                      compose_template: compose_html,
                      text_template: text_html,
                      thumb_template: thumb_html
                  }
              }));

          });

      });

    },

    buildTopNav: function() {
        var self = this;
        if ( $('.aboutme-emailsig-top').length > 0 ) return;

        var TopNav = Marionette.LayoutView.extend({
            className: 'aboutme-emailsig-top gb_R',
            template: _.template('<div class="icon"></div><div class="menu-wrapper"></div>'),
            initialize: function() {
                this.model = new Backbone.Model({
                    active: false
                });
                this.setupListeners();
                this.checkUser();
            },
            setupListeners: function() {
                var _this = this;
                //model changes
                this.listenTo(this.model, 'change:active', this.toggleMenu);
                //dismiss top menu when clicks on the page
                $('body').on('click', function(e) {
                    if (! $('.aboutme-emailsig-top').length) return;
                    if ($(e.target).closest('.aboutme-emailsig-top').length) return;
                    if (_this.model.get('active')) _this.setActive();
                });
            },
            regions: {
                'menu': '.menu-wrapper'
            },
            ui: {
                icon: '.icon'
            },
            events: {
                'click @ui.icon': 'setActive'
            },
            checkUser: function() {
                var _this = this;

                chrome.storage.sync.get({ user_name: '' }, function(item) {
                    //make top menu visible if no username find initially
                    if (! item.user_name) {
                        _this.model.set('active', true);
                    }

                });
            },
            setActive: function(e) {
                if (e) e.stopPropagation();
                var active = this.model.get('active');
                this.model.set('active', ! active);
            },
            toggleMenu: function(model, active) {
                if (active) {
                    this.showMenu();
                } else {
                    this.hideMenu();
                }
            },
            showMenu: function() {
                var menu_view = new TopNavMenu();
                this.menu.show(menu_view);
            },
            hideMenu: function() {
                this.menu.reset();
            }
        });

        var TopNavMenu = Marionette.LayoutView.extend({
            className: 'menu-container',

            initialize: function() {
                this.model = new Backbone.Model({
                    user_name: ''
                });

                this.listenTo(this.model, 'change', function() {
                    this.render();
                    self.fetchData();
                });
            },
            ui: {
                user_name: '#user_name',
                user_error: '#username_error',
                savebutton: '.actions .button'
            },
            events: {
                'click @ui.savebutton': 'saveUsername',
                'input @ui.user_name': 'hideError'
            },
            render: function() {
                var _this = this;
                var promise = self.loadTemplate('top_menu');

                promise.done(function(tpl) {
                    chrome.storage.sync.get({ user_name: '', site_domain: '' }, function(item) {

                        _this.model.set('user_name', item.user_name);

                        template = _.template(tpl);
                        _this.$el.html(template(item));
                    });
                });

                return this;
            },
            showError: function() {
                $(this.ui.user_error).text('Please enter your about.me username.').removeClass('invisible');
            },
            hideError: function() {
                $(this.ui.user_error).addClass('invisible');
            },
            saveUsername: function() {
                if ($(this.ui.savebutton).hasClass('disabled')) return;
                var _this = this;
                $(this.ui.savebutton).addClass('disabled loading');
                var user_name = $(this.ui.user_name).val();
                if (! user_name) {
                    $(this.ui.savebutton).removeClass('disabled loading');
                    this.showError();
                    return;
                }

                chrome.runtime.sendMessage({ message: 'get:aboutme:user_info', user_name: user_name }, function(response) {

                    if (! response || ! response.message || response.message === 'send:aboutme:user_info:fail') {
                        $(_this.ui.savebutton).removeClass('disabled loading');
                        $(_this.ui.user_error).removeClass('invisible').text('Your About.me profile is not found.');
                    } else if (response.message === 'send:aboutme:user_info:success') {

                        $(_this.ui.savebutton).removeClass('loading').end().find('.default-text').text('Saved!');

                        _.delay(function() {
                            _this.model.set('user_name', user_name);
                            $(_this.ui.savebutton).removeClass('disabled').end().find('.default-text').text('Save');
                        }, 600);

                    } else {
                        $(_this.ui.savebutton).removeClass('disabled loading');
                    }

                });

            }
        });

        this.top_nav = new TopNav();

        //find gmail node for banner - todo: find a more reliable way
        var banner_node = $('div[role="banner"] > div:eq(0) > div:eq(0) > div:eq(0) > div:eq(1)');
        banner_node.prepend(this.top_nav.render().el);

    }

});

$(document).ready(new GmailController());
