// ==UserScript==
// @name          DistFilt
// @namespace     8bit
// @description   Filter. Distributively.
// @license       ¯\_(ツ)_/¯
// @author        8bit
// @run-at        document-start
// @match       https://boards.4chan.org/b/*
// @match       http://boards.4chan.org/b/*
// @updateURL     
// @version       0.1.0
// @icon          
// ==/UserScript==

//noinspection ThisExpressionReferencesGlobalObjectJS
(function(){
    var $, c,d,API,DistFilt,CSS;

    $ = {
        ajax : function(method,url,payload,responseType,callbacks){
            var xhReq = new XMLHttpRequest();
            xhReq.open(method,url,true);
            xhReq.responseType = responseType;
            xhReq.timeout = 20000;
            if(method === 'POST')
                xhReq.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
            xhReq.setRequestHeader("X-Requested-With","DistFilt"+c.VERSION);
            if(typeof callbacks.success === 'function')
                xhReq.onloadend = callbacks.success;
            if(typeof callbacks.failure === 'function'){
                xhReq.onerror = callbacks.failure;
                xhReq.ontimeout = callbacks.failure;
            }
            xhReq.send(payload);
        },
        id : function(id){
            return d.getElementById(id);
        },
        el : function(tag, properties){
            return $.extend(d.createElement(tag),properties);
        },
        extend : function(object, properties) {
            var key, val;
            for (key in properties) {
                val = properties[key];
                object[key] = val;
            }
            return object;
        },
        on : function(el, event, func, cap){
            if(el !== null)
                el.addEventListener(event,func,cap ? cap : false);
        },
        off : function(el, event, func){
            el.removeEventListener(event,func);
        },
        append : function(parent, el){
            parent.appendChild(el);
        },
        prepend : function(parent, el){
            parent.insertBefore(el, parent.firstChild);
        },
        remove : function(el){
            if(el !== null)
                el.parentNode.removeChild(el);
        }
    };

    c = {
        NAMESPACE : "DistFilt.",
        VERSION : "0.1.0",
        HOST : "anthrochan.com",
        API : "/distfilt/api.php"
    };

    c.protocol = window.location.protocol;

    d = window.document;

    API = {
        get : function(){
            DistFilt.refreshing = true;
            var lastState = localStorage.getItem("MD5State");
            $.ajax('POST',
                "//"+c.HOST+c.API,"a=get"+"&ls="+lastState+"&v="+c.VERSION,
                "text/html",
                {success: DistFilt.processResponse, failure: DistFilt.handleError });
        },
        send : function(md5){
            var blah = $.id("df_password");
            if($.id("df_password").value == ""){
                alert("No DistFilt passcode set!");
                return;
            }
            $.ajax('POST',
                "//"+c.HOST+c.API,"a=send"+"&md5="+md5+"&p="+$.id("df_password").value+"&v="+c.VERSION,
                "text/html",
                {success: DistFilt.refresh, failure: DistFilt.handleError });
        }
    };

    DistFilt = {
        init : function(){
            DistFilt.refreshing = false;
            DistFilt.createDistFilt();
            setInterval(DistFilt.refresh,30000);
        },
        createDistFilt : function(){
            DistFilt.destroyDistFilt();
            CSS.init();
            DistFilt.md5s = JSON.parse(localStorage.getItem("MD5s"));
            /*
             DistFilt.container = $.el('div',{id:'distFiltContainer',className:'reply',innerHTML:'<strong>DistFilt</strong>'});
             DistFilt.hidden = true;

             DistFilt.threadWrapper = $.el('div',{id:'df_threadWrapper'});
             $.append(DistFilt.container, DistFilt.threadWrapper);

             DistFilt.refreshButton = $.el('input',{type:'button',value:'Refresh'});
             $.on(DistFilt.refreshButton,"click", DistFilt.refresh);
             $.append(DistFilt.container,DistFilt.refreshButton);

             $.append(DistFilt.container,$.el('div',{id:"df_error",className:"dfHidden"}));

             $.append($.id("delform"),DistFilt.container);
             */

            DistFilt.refresh();
        },
        appendQR : function(){
            var QR = $.id('qr');

            var qrDiv = $.el('div',{id:'df_qrAppend'});
            $.append(QR, qrDiv);

            var titleContainerSpan = $.el('span',{id:"df-qrAppend-title-container"});
            $.append(qrDiv, titleContainerSpan)

            var titleSpan = $.el('span',{innerHTML:'<strong>DistFilt</strong>'});
            $.append(titleContainerSpan, titleSpan)
            $.append(titleContainerSpan, $.el('fieldset',{
                innerHTML:'<input id="df_password" type="text" name="Password" placeholder="Access Password">'
            }));

            DistFilt.refreshButton = $.el('input',{type:'button',value:'Refresh'});
            $.on(DistFilt.refreshButton,"click", DistFilt.refresh);
            $.append(qrDiv,DistFilt.refreshButton);
        },
        destroyDistFilt : function(){
            $.remove($.id("distFiltContainer"));
        },
        refresh : function(){
            if(DistFilt.refreshing) return;
            DistFilt.disableRefresh();
            API.get();
        },
        disableRefresh : function(){
            DistFilt.refreshing = true;
            if(DistFilt.refreshButton){
                DistFilt.refreshButton.setAttribute("disabled","disabled");
                DistFilt.refreshButton.setAttribute("value","Loading...");
            }
        },
        enableRefresh : function(){
            DistFilt.refreshing = false;
            if(DistFilt.refreshButton){
                DistFilt.refreshButton.removeAttribute("disabled");
                DistFilt.refreshButton.setAttribute("value","Refresh");
            }
        },
        processResponse : function(e){
            var response = e.target.response;
            var md5s = response.split("\n");
            for(var i = 0; i < md5s.length-1; i++){
                DistFilt.md5s += md5s[i].replace(/(\r\n|\n|\r)/gm,"");
            }
            localStorage.setItem("MD5State", md5s[md5s.length-1]);
            localStorage.setItem("MD5s", JSON.stringify(DistFilt.md5s));
            DistFilt.enableRefresh();
            DistFilt.filterAllPosts();
        },
        handleError : function(e){
            if(e.type === 'timeout')
                DistFilt.err("Error getting filter. (Operation timed out)");
            else
                DistFilt.err("Error getting filter. Try refreshing.");
            DistFilt.enableRefresh();
        },
        filterAllPosts : function(e) {
            var allPosts = d.getElementsByClassName("replyContainer");
            for(var i = 0; i < allPosts.length; i++) {
                //TODO: Already hidden?
                if(allPosts[i].getElementsByClassName("file")[0] && typeof allPosts[i].getElementsByClassName("stub")[0] == "undefined"){
                    var postMD5 = allPosts[i].getElementsByClassName("fileThumb")[0].children[0].dataset["md5"];
                    if(DistFilt.md5s.indexOf(postMD5) >= 0){
                        allPosts[i].children[0].children[0].click();
                    } else if(typeof allPosts[i].getElementsByClassName("filter-button")[0] == "undefined"){
                        var filtButton = $.el('a',{className:'filter-button', href:'javascript:;'});
                        filtButton.innerHTML = "F";
                        $.on(filtButton,"click", DistFilt.addFilt);
                        $.prepend(allPosts[i].getElementsByClassName("postInfo desktop")[0], filtButton);
                    }
                }
            }
        },
        addFilt : function(e) {
            var postNum = e.target.parentNode.parentNode.parentNode.id.slice(2);
            var fileContStr = "f" + postNum;
            var fileCont = $.id(fileContStr);
            var img1 = fileCont.childNodes[1];
            var img2 = img1.childNodes[0];
            var md5 = img2.dataset["md5"];
            API.send(encodeURIComponent(md5+"\n"));
        },
        filterNewPosts : function(e){
            for (var i = 0; i < e.detail["newPosts"].length; i++) {
                var fileContStr = "f" + e.detail["newPosts"].slice(2);
                var fileCont = $.id(fileContStr);
                if(fileCont){
                    var img1 = fileCont.childNodes[1];
                    var img2 = img1.childNodes[0];
                    if(DistFilt.indexOf(img2.dataset["md5"]) >= 0) {
                        fileCont.parentNode.parentNode.childNodes[0].childNodes[0].click();
                    }
                }
            }
        }
    };

    CSS = {
        init: function(){
            var css = "\
        #distFiltContainer { min-height:50px; padding-left:4px; width:24em; margin-top:2px; display:block; z-index: 9; }\
        #distFiltContainer:hover { z-index: 20; }\
        #distFilt a{ text-decoration: none; }\
        #tf_error { min-height: 0px; box-sizing: border-box; -moz-box-sizing: border-box; margin: 0 6px; padding: 2px 5px; border: 1px solid rgba(0,0,0,0.25); border-radius: 3px; display:block; }\
        #tf_error { border-color: #f22; }\
        .dfHidden { visibility: hidden; }\
        #df-qrAppend-title-container {display: inline-block; position: relative; width: 100px; min-width: 74.6%; max-width: 74.6%; margin-right: 0.4%; padding: 2px 1px 0;}";
            $.remove($.id("df_css"));
            $.append(d.body, $.el('style',{textContent: css,id:"df_css"}));
        }
    };

    $.on(d,'ThreadUpdate', DistFilt.filterAllPosts);
    $.on(d,'DOMContentLoaded', DistFilt.init);
    $.on(d,'QRDialogCreation', DistFilt.appendQR)
}).call(this);