/*
  save session is a java script for Acrobat Reader
  based on save tabs by Andrey Kartashov found on
  https://stackoverflow.com/questions/12689154/adobe-acrobat-reader-tabs-saving-and-autoloading
  Put it in $HOME/.adobe/Acrobat/9.0/JavaScripts (or in
  the equivalent program files folder under Windows,
  %appdata%/adobe/acrobat/Privileged/DC/JavaScripts, or
  C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\Javascripts)
  and it will automatically
  be loaded.
*/
var sessionManager = {
  /** helper function to get current tab doc */
  currentDocPath: {},/*injected on init*/

  parentMenu: "Window",
  openMenu: "&Open Session",
  updateMenu: "&Update Session",
  deleteMenu: "&Delete Session",
  editMenu: "&Edit Session Data",
  deleteAll: "&Remove All Sessions",

  // Session Edit Dialog Definition
  oDlgEditSession: {
    strSessionData: '[]',
    IsValidJSON: {}/*injected*/,

    initialize: function (dialog) {
      dialog.load({"sese": this.strSessionData});
    },

    commit: function (dialog) {
      var data = dialog.store();
      this.strSessionData = data["sese"];
    },

    validate: function (dialog) {
      var data = dialog.store();
      var error = this.IsValidJSON(data["sese"], true);
      if (true !== error) {
        app.alert(error.message);
        return false;
      }
      return true;
    },

    other: function (dialog) { // other button
      var data = dialog.store();
      var message = '';
      var error = this.IsValidJSON(data["sese"], true);

      if (true !== error) {
        message = error.message;
      } else {
        message = 'Valid JSON';
      }
      app.alert(message);
    },

    description: {
      name: "Session Edit", elements:
        [
          {
            type: "view", elements:
              [
                {name: "Edit Session JSON", type: "static_text",},
                {item_id: "sese", type: "edit_text", multiline: true, char_width: 120, char_height: 80},
                {type: "ok_cancel_other", other_name: "Check Syntax"},
              ]
          },
        ]
    }
  },

  // Session Dialog Definition
  oDlg: {
    strName: "Session Name",
    initialize: function (dialog) {
      dialog.load({"usnm": this.strName});
    },
    commit: function (dialog) {
      var data = dialog.store();
      this.strName = data["usnm"];
    },
    description: {
      name: "Session Dialog", elements:
        [
          {
            type: "view", elements:
              [
                {name: "Enter your name:", type: "static_text",},
                {item_id: "usnm", type: "edit_text", char_width: 40},
                {type: "ok_cancel"}
              ]
          },
        ]
    }
  },

  /**
   * Loads named session into menus
   * @param name
   */
  AddSessionToMenu: function (name) {
    app.addMenuItem({
      cName: "open" + name,
      cUser: name,
      cParent: this.openMenu,
      cExec: "sessionManager.LoadTabs(\"" + name + "\");"
    });

    app.addMenuItem({
      cName: "update" + name,
      cUser: name,
      cParent: this.updateMenu,
      cExec: "sessionManager.UpdateTab(\"" + name + "\", true);"
    });

    app.addMenuItem({
      cName: "del" + name,
      cUser: name,
      cParent: this.deleteMenu,
      cExec: "sessionManager.DeleteTab(\"" + name + "\", true);"
    });

    app.addMenuItem({
      cName: "edit" + name,
      cUser: name,
      cParent: this.editMenu,
      cExec: "sessionManager.EditTab(\"" + name + "\", true);"
    });
  },

  /**
   * Hides named menu item
   * @param name
   */
  HideMenu: function (name) {
    app.hideMenuItem("open" + name);
    app.hideMenuItem("del" + name);
    app.hideMenuItem("edit" + name);
    app.hideMenuItem("update" + name);
  },

  /**
   * Loading Saved Tabs
   * @param name
   */
  LoadTabs: function (name) {
    var session = this.GetSession(name);
    if (session == null || session == []) {

      return;
    }
    var docs = this.trustedActiveDocs();
    var paths = [];
    for (var i = 0; i < docs.length; i++) {
      paths.push(docs[i].path)
    }
    var doc = {};

    // open and apply data
    for (doc in session) {
      try {
        var d = app.openDoc(session[doc].path);
        // if a session doc already open, do not change page, layout or zoom etc
        if (-1 === paths.indexOf(session[doc].path)) {
          // retained for compatibility
          if ('undefined' !== typeof session[doc].pageNum) {
            d.pageNum = session[doc].pageNum;
          }
          if ('undefined' !== typeof session[doc].layout) {
            d.layout = session[doc].layout;
          }
          if ('undefined' !== typeof session[doc].zoom) {
            d.zoom = session[doc].zoom;
          }
          // use viewstate if exists.
          if ('undefined' !== typeof session[doc].viewState) {
            d.viewState = eval(session[doc].viewState); //no other choices but eval.
          }
        }
      } catch (e) {
        console.println('applyViewState: ' + e);
      }
    }
    //focus on doc tagged isFront
    for (doc in session) {
      try {
        if (session[doc].isFront) {
          app.openDoc(session[doc].path);
          break;
        }
      } catch (e) {
        console.println('bringToFront: ' + e);
      }
    }
  },

  /**
   *
   * @param name
   * @param warn
   */
  DeleteTab: function (name, warn) {
    var proceed = true;
    if (undefined !== warn && warn) {
      if (app.alert("Are you sure you want to delete " + name + " ?", 2, 2, "Submit Validation") != 4) {
        proceed = false;
      }
    }
    if (proceed) {
      this.HideMenu(name);
      delete global.tabs_opened[name];
      global.setPersistent("tabs_opened", true);
    }
  },

  /**
   * Function with trusted section returning opened documents
   * @returns {Array|Object[]}
   */
  trustedActiveDocs: app.trustedFunction(function () {
    app.beginPriv();
    var d = app.activeDocs;
    app.endPriv();
    return d;
  }),

  /**
   * Loads session from global store
   * @param name
   * @returns {Array}
   */
  GetSession: function (name) {
    try {
      if (global.tabs_opened[name]) {
        return JSON.parse(global.tabs_opened[name]);
      }
    } catch (ee) {
      console.println('GetSession: ' + ee);
    }

    return [];
  },

  /**
   * Persists session data to global store.
   * if addToMenu true, adds into menu
   * @param sessionName
   * @param sessionData
   * @param addToMenu
   */
  PersistSession: function (sessionName, sessionData, addToMenu) {
    sessionData = (typeof sessionData !== 'undefined') ? sessionData : '[]';
    addToMenu = (typeof addToMenu !== 'undefined') ? addToMenu : true;
    global.tabs_opened[sessionName] = sessionData;
    global.setPersistent("tabs_opened", true);
    if (addToMenu) {
      this.AddSessionToMenu(sessionName)
    }
  },

  /**
   * Gets JSON for all open docs
   * @param trustedActiveDocs {Object}
   * @returns {string}
   */
  GetDocumentsJSON: function (trustedActiveDocs) {
    var docs = [];

    for (var i = 0; i < trustedActiveDocs.length; i++) {
      docs.push(
        {
          'path': trustedActiveDocs[i].path,/*
          'pageNum': trustedActiveDocs[i].pageNum,
          'zoom': trustedActiveDocs[i].zoom,
          'layout': trustedActiveDocs[i].layout*/
          'viewState': trustedActiveDocs[i].viewState.toSource(),
          'isFront': currentDocPath() === trustedActiveDocs[i].path
        }
      )
    }
    return JSON.stringify(docs, null, 2);
  },

  /**
   * Saving Tabs that are opened (session) data
   */
  SaveSession: function () {
    var d = this.trustedActiveDocs();

    if (d.length == 0) {
      app.alert("No documents opened to save session", 3);

      return;
    }

    if (app.execDialog(this.oDlg) == "ok") {
      var nRslt = 4
      var savedSession = this.GetSession(this.oDlg.strName);
      console.println('SaveSession: ' + savedSession);
      var already_exists = (savedSession.length > 0);
      if (already_exists) {
        nRslt = app.alert("A session with name " + this.oDlg.strName + " already exists...\n\n" + "Do you want to continue?", 2, 2, "Submit Validation");
      }

      if (nRslt == 4) {
        var session = this.oDlg.strName;
        this.PersistSession(session, this.GetDocumentsJSON(d), !already_exists);
      }
    }
  },

  /**
   * Updates existing session with currently opened docs and positions
   */
  UpdateTab: function (name) {
    var d = this.trustedActiveDocs();
    if (d.length == 0) {
      app.alert("No documents opened to update into session \"" + name + "\"", 3);

      return;
    }

    var nRslt = app.alert("Really update session \"" + name + "\" with current documents?\n\n" + "Do you want to continue?", 2, 2, "Submit Validation");
    if (nRslt == 4) {
      this.PersistSession(name, this.GetDocumentsJSON(d), false);
    }
  },

  /**
   * Allows to manually edit the JSON store for the named session.
   * @param session
   */
  EditTab: function (session) {
    this.oDlgEditSession.strSessionData = global.tabs_opened[session];
    this.oDlgEditSession.IsValidJSON = this.IsValidJSON;
    if (app.execDialog(this.oDlgEditSession) == 'ok') {
      var json = this.oDlgEditSession.strSessionData;
      if (this.IsValidJSON(json)) {
        this.PersistSession(session, json, false);
      } else {
        app.alert('Malformed JSON, not saving.');
      }
    }
  },

  /**
   * Remove all saved sessions
   */
  RemoveAllSessions: function () {
    if (4 == app.alert("Are you sure you want to delete all sessions?", 2, 2, "Submit Validation")) {
      for (index in global.tabs_opened) {
        this.DeleteTab(index, false);
      }
      global.tabs_opened = [];
      global.setPersistent("tabs_opened", true);
    }
  },

  /**
   * Tests string for valid JSON structure
   * @param str
   * @param returnError
   * @returns {boolean|*}
   */
  IsValidJSON: function (str, returnError) {
    returnError = (typeof returnError !== 'undefined') ? returnError : false;
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      if (returnError) {
        return e;
      }
      return false;
    }
  },

  /**
   * Add menu items and setup
   * @param funcCurrentDocPath
   */
  init: function (funcCurrentDocPath) {
    this.currentDocPath = funcCurrentDocPath;

    if (global.tabs_opened == null) {
      console.println('init: ' + 'global.tabs_opened == null');
      global.tabs_opened = [];
      global.setPersistent("tabs_opened", true);
    }

    app.addMenuItem({
      cName: "-",
      cParent: this.parentMenu,
      cExec: "void(0);"
    });

    app.addMenuItem({
      cName: "&Save Session",
      cParent: this.parentMenu,
      cExec: "sessionManager.SaveSession();"
    });

    app.addSubMenu({
      cName: this.openMenu,
      cParent: this.parentMenu
    });

    app.addSubMenu({
      cName: this.updateMenu,
      cParent: this.parentMenu
    });

    app.addSubMenu({
      cName: this.editMenu,
      cParent: this.parentMenu
    });

    app.addSubMenu({
      cName: this.deleteMenu,
      cParent: this.parentMenu
    });

    app.addMenuItem({
      cName: this.deleteAll,
      cParent: this.parentMenu,
      cExec: "sessionManager.RemoveAllSessions();"
    });

    for (key in global.tabs_opened) {
      this.AddSessionToMenu(key);
    }
  }
};

/**
 * get the path of the currently-viewed aka inFront document
 * @returns {string}
 */
var currentDocPath = function currentDocPath() {
  return this.path;
};
sessionManager.init(currentDocPath);
