/*
  save session is a java script for Acrobat Reader
  based on save tabs by Andrey Kartashov found on
  https://stackoverflow.com/questions/12689154/adobe-acrobat-reader-tabs-saving-and-autoloading
  Put it in $HOME/.adobe/Acrobat/9.0/JavaScripts (or in
  the equivalent program files folder under Windows,
  %appdata%/adobe/acrobat/Privileged/DC/JavaScripts)
  and it will automatically
  be loaded.
*/
var sessionManager = {
  parentMenu: "Window",
  openMenu: "&Open Session",
  deleteMenu: "&Delete Session",
  editMenu: "&Edit Session Data",
  deleteAll: "&Remove All Sessions",

  // Session Edit Dialog Definition
  oDlgEditSession: {
    strSessionData: '[]',
    initialize: function (dialog) {
      dialog.load({"sese": this.strSessionData});
    },
    commit: function (dialog) {
      var data = dialog.store();
      this.strSessionData = data["sese"];
    },
    description: {
      name: "Session Edit", elements:
        [
          {
            type: "view", elements:
              [
                {name: "Edit Session JSON", type: "static_text",},
                {item_id: "sese", type: "edit_text", multiline: true, char_width: 120, char_height: 80},
                {type: "ok_cancel"},
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
                {type: "ok_cancel"},
              ]
          },
        ]
    }
  },

  /*
  Loads named session into menus
  */
  AddSessionToMenu: function (name) {
    app.addMenuItem({
      cName: "open" + name,
      cUser: name,
      cParent: this.openMenu,
      cExec: "sessionManager.LoadTabs(\"" + name + "\");"
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

  /*
   Loading Saved Tabs
  */
  LoadTabs: function (name) {
    var session = this.GetSession(name);
    if (session == null || session == []) {

      return;
    }
    var d = this.trustedActiveDocs();
    var paths = [];
    for (var i = 0; i < d.length; i++) {
      paths.push(d[i].path)
    }

    for (doc in session) {
      try {
        var d = app.openDoc(session[doc].path);
        // if a session doc already open, do not change page
        if (-1 == paths.indexOf(session[doc].path)) {
          d.pageNum = session[doc].pageNum;
        }
      } catch (e) {
        console.println('LoadTabs: ' + e);
      }
    }
  },

  DeleteTab: function (name, warn) {
    var proceed = true;
    if (undefined !== warn && warn) {
      if (app.alert("Are you sure you want to delete " + name + " ?", 2, 2, "Submit Validation") != 4) {
        proceed = false;
      }
    }
    if (proceed) {
      app.hideMenuItem("open" + name);
      app.hideMenuItem("del" + name);
      app.hideMenuItem("edit" + name);
      delete global.tabs_opened[name];
      global.setPersistent("tabs_opened", true);
    }
  },

  /*
   Function with trusted section returning opened documents
  */
  trustedActiveDocs: app.trustedFunction(function () {
    app.beginPriv();
    var d = app.activeDocs;
    app.endPriv();
    return d;
  }),

  GetSession: function (name) {
    var result = [];
    try {
      if (global.tabs_opened[name]) {
        result = JSON.parse(global.tabs_opened[name]);
      }
    } catch (ee) {
      console.println('GetSession: ' + ee);
    }

    return result;
  },

  PersistSession: function (sessionName, sessionData, addToMenu) {
    sessionData = (typeof sessionData !== 'undefined') ? sessionData : '[]';
    addToMenu = (typeof addToMenu !== 'undefined') ? addToMenu : true;
    global.tabs_opened[sessionName] = sessionData;
    global.setPersistent("tabs_opened", true);
    if (addToMenu) {
      this.AddSessionToMenu(sessionName)
    }
  },

  /*
   Saving Tabs that are opened
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
        docs = [];

        for (var i = 0; i < d.length; i++) {
          docs.push(
            {
              'path': d[i].path,
              'pageNum': d[i].pageNum
            }
          )
        }
        json = JSON.stringify(docs);
        this.PersistSession(session, json, !already_exists);
      }
    }
  },

  EditTab: function(session) {
    this.oDlgEditSession.strSessionData = global.tabs_opened[session];
    if(app.execDialog(this.oDlgEditSession) == 'ok') {
      var json = this.oDlgEditSession.strSessionData;
      if(this.IsValidJSON(json)) {
        this.PersistSession(session, json, false);
      } else {
        app.alert('Malformed JSON, not saving.');
      }
    }
  },

  /*
   Remove all saved sessions
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

  IsValidJSON: function (str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },

  /*
   Add menu items
   */
  init: function () {
    if (global.tabs_opened == null) {
      global.tabs_opened = []
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
      cParent: this.parentMenu,
    });

    app.addSubMenu({
      cName: this.deleteMenu,
      cParent: this.parentMenu,
    });

    app.addSubMenu({
      cName: this.editMenu,
      cParent: this.parentMenu,
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
}
sessionManager.init();
