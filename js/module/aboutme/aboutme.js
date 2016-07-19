var Aboutme = {

    init: function() {
        if (! AboutMe) return;
        if (! AboutMe.viewer.logged_in) return;
        if (! AboutMe.viewer.get('user_name')) return;

        document.dispatchEvent(new CustomEvent('aboutme:user_name', {
            detail: {
                user_name: AboutMe.viewer.get('user_name')
            }
        }));
    }
};

Aboutme.init();
