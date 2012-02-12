jQuery.fn.extend({
    insertAtCaret: function(insert) {
        if (document.selection) {
            alert('IE not supported yet.');
            return;
        }
        
        this.focus();
        var orig = this.val();
        var start = this[0].selectionStart;
        this.val(orig.substring(0, start) + insert + orig.substring(start));
        this[0].selectionStart = this[0].selectionEnd = start;
    },
    
    wrapSelection: function(before, after) {
        if (document.selection) {
            alert('IE not supported yet.');
            return;
        }
        
        this.focus();
        
        if (this[0].selectionStart == undefined) {
            return;
        }
        
        if (after == undefined) {
            after = before;
        }
        
        var orig_start = this[0].selectionStart;
        var orig_end = this[0].selectionEnd;
        var orig = this.val();
        var start = orig_start;
        var end = orig_end;
        
        if (start == end) {
        
            // Grow selection to encapsulate entire word.
            while (start > 0 && orig[start - 1].match(/\w/)) {
                start--;
            }
            while (end < orig.length && orig[end].match(/\w/)) {
                end++;
            }
        }
            
        this.val(orig.substring(0, start) + before + orig.substring(start, end) + after + orig.substring(end));
        this[0].selectionStart = orig_start + before.length;
        this[0].selectionEnd = orig_end + before.length;
    }
});

jQuery(document).ready(function($){

    var rest_tab = $('#content-rest');
    var rest_toolbar = $('#rest-toolbar');
    var rest_container = $('#rest-container');
    var rest_src = $('#rest-container textarea');
    var other_tabs = $('#edButtonHTML, #edButtonPreview');
    var html_tab = $('#edButtonHTML');
    var tinymce_tab = $('#edButtonPreview');
    var all_tabs = $('#edButtonREST, #edButtonHTML, #edButtonPreview');
    var quick_tags = $('#quicktags');
    var html_editor = $('#content');
    var editor_container = $('#wp-content-editor-container');
    var update_rest;
    var editor_content_wrap = $('#wp-content-wrap');
    
    /**
     * Store the original editor switching method.
     */
    switchEditors._orig_go = switchEditors.go;

    /**
     * Override the editor switching method.
     */
    switchEditors.go = function(id, mode) {
        /**
         * Get some reasonable defaults.
         */
        id = id || 'content';
        mode = mode || 'rest';

        var t = this, ed = tinyMCE.get(id), wrap_id, txtarea_el, dom = tinymce.DOM;

        wrap_id = 'wp-'+id+'-wrap';
        txtarea_el = dom.get(id);

        if ( 'toggle' == mode ) {
            if ( ed && !ed.isHidden() )
                mode = 'html';
            else
                mode = 'tmce';
        }
        if ( 'tmce' == mode || 'tinymce' == mode ) {
            if ( ed && ! ed.isHidden() )
                return false;

            if ( typeof(QTags) != 'undefined' )
                QTags.closeAllTags(id);

            if ( tinyMCEPreInit.mceInit[id] && tinyMCEPreInit.mceInit[id].wpautop )
                txtarea_el.value = t.wpautop( txtarea_el.value );

            if ( ed ) {
                ed.show();
            } else {
                ed = new tinymce.Editor(id, tinyMCEPreInit.mceInit[id]);
                ed.render();
            }

            dom.removeClass(wrap_id, 'html-active');
            dom.removeClass(wrap_id, 'rest-active');
            dom.addClass(wrap_id, 'tmce-active');
            setUserSetting('editor', 'tinymce');
        } else if ( 'html' == mode ) {
            if ( ed ) {
                txtarea_el.style.height = ed.getContentAreaContainer().offsetHeight + 20 + 'px';
                ed.hide();
            }

            dom.removeClass(wrap_id, 'tmce-active');
            dom.removeClass(wrap_id, 'rest-active');
            dom.addClass(wrap_id, 'html-active');
            setUserSetting('editor', 'html');
        } else if ( 'rest' == mode ) {

            if ( !ed ) {
                ed = new tinymce.Editor(id, tinyMCEPreInit.mceInit[id]);
                ed.render();
            }
            if ( ed ) {
                txtarea_el.style.height = ed.getContentAreaContainer().offsetHeight + 20 + 'px';
                ed.hide();
            }
            dom.removeClass(wrap_id, 'tmce-active');
            dom.removeClass(wrap_id, 'html-active');
            dom.addClass(wrap_id, 'rest-active');
        
            setUserSetting('editor', 'rest');
            //rest_container.show();
            //rest_toolbar.show();
        }
        return false;
    }

    
    /**
     * Saves reSt source to database for post. Generates new HTML
     * from reSt and updates the HTML editor. Then it autosaves.
     */
    update_rest = function() {
    
        // Force WordPress to autosave if this post has no id.
        if ($('#post_ID').val() < 0) {
        
            // Fake out autosave to think we've edited.
            html_editor.val(html_editor.val() + ' ');
            
            // Intercept the call to autosave_update_post_ID on success.
            var old_autosave_update_post_ID = autosave_update_post_ID;
            autosave_update_post_ID = function(post_ID) {
                old_autosave_update_post_ID(post_ID);
                update_rest();
                autosave_update_post_ID = old_autosave_update_post_ID;
            }
            
            // Call a delayed autosave.
            delayed_autosave();         
            return;
        }

        var src = rest_src.val();
        var post_id = $('#post_ID').val();

        $('#rest-tool-update-HTML').attr({ disabled: 'disabled' });
        autosave_disable_buttons();
        
        $.post(
            ajaxurl, 
            { 
                action: 'rest_update',
                post_id: post_id, 
                src: src 
            }, 
            function(data) {
                var tmp = $('<div>' + data + '</div>');
                var title = $('.title', tmp);
                if (title.length) {
                    title.remove();
                    $('#title').val(title.html());
                    data = tmp.html();
                }
                html_editor.val(data);
                autosave_enable_buttons();
                $('#rest-tool-update-HTML').removeAttr('disabled');
                delayed_autosave();
            }
        );
    }    


    /**
     * Remove active tag from other tabs, which is hard to do in PHP.
     */
    if (editor_content_wrap.hasClass('rest-active')) {
    } else if (editor_content_wrap.hasClass('tmce-active')) {
        var id = 'content';
        var ed = tinyMCE.get(id);
        if ( !ed ) {
            ed = new tinymce.Editor(id, tinyMCEPreInit.mceInit[id]);
            ed.render();
        }
    } else if (editor_content_wrap.hasClass('html-active')) {
    } else {
    }
    
    /**
     * Set up the reSt toolbar.
     */
    var rest_tools = $('<div />').attr({ id: 'rest-tools' }).appendTo(rest_toolbar);
    
    var tool_factory = function(name, container, click) {
        var id = name.replace(/\s+/g, '-');
        $('<input />').attr({
            id: 'rest-tool-' + id,
            type: 'button'
        }).val(name).click(click).appendTo(container);
    }
    
    
    tool_factory('emphasis', rest_tools, function() {
        rest_src.wrapSelection('*');
    });
    
    tool_factory('strong', rest_tools, function() {
        rest_src.wrapSelection('**');
    });
    
    tool_factory('literal', rest_tools, function() {
        rest_src.wrapSelection('``');
    });
    
    // tool_factory('link', rest_tools, function() {});
    
    // tool_factory('image', rest_tools, function() {});
    
    tool_factory('more', rest_tools, function() {
        rest_src.insertAtCaret("\n.. more\n");
    });
    

        
    var rest_controls = $('<div />').attr({ id: 'rest-controls' }).appendTo(rest_tools);

    tool_factory('update HTML', rest_controls, function() {
        $(this).attr({ disabled: 'disabled'});
        update_rest();
    });
    
    var rest_auto_update = $('<input type="checkbox" /><label>auto-update</label>').appendTo(rest_controls);

    
    /**
     * Enable reSt parsing.
     */
    if (rest_src.length) {
        rest_src.change(function () {
            if (rest_auto_update.attr('checked')) {
                update_rest();
            }
        });
    } else {
        $('input', rest_toolbar).attr({ disabled: 'disabled' });
    }

});
