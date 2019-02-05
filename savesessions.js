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

var parentMenu = "Window";
var openMenu = "&Open Session";
var deleteMenu = "&Delete Session";
var deleteAll = "&Remove All Sessions";

// Dialog Definition 
var oDlg = {
  strName: "SessionName",
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
              {type: "ok_cancel",},
            ]
        },
      ]
  }
};

/*
Loads named session into menus
*/
function AddSession(name) {
  app.addMenuItem({
    cName: "open" + name,
    cUser: name,
    cParent: openMenu,
    cExec: "LoadTabs(\"" + name + "\");"
  });

  app.addMenuItem({
    cName: "del" + name,
    cUser: name,
    cParent: deleteMenu,
    cExec: "DeleteTab(\"" + name + "\");"
  });
}

/*
 Loading Saved Tabs
*/
function LoadTabs(name) {
  var session = getSession(name);
  if (session == null || session == []) {

    return;
  }
  var d = trustedActiveDocs();
  var paths = [];
  for (var i = 0; i < d.length; i++) {
    paths.push(d[i].path)
  }

  for (doc in session) {
    try {
      var d = app.openDoc(session[doc].path);
      // if a session doc already open, do not change page
      if(-1 == paths.indexOf(session[doc].path)) {
        d.pageNum = session[doc].pageNum;
      }
    } catch (e) {
      console.println('LoadTabs: ' + e);
    }
  }
}

function DeleteTab(name, warn) {
  var proceed = true;
  if (undefined !== warn && warn) {
    if (app.alert("Are you sure you want to delete " + name + " ?", 2, 2, "Submit Validation") != 4) {
      proceed = false;
    }
  }
  if (proceed) {
    app.hideMenuItem("open" + name);
    app.hideMenuItem("del" + name);
    delete global.tabs_opened[name];
    global.setPersistent("tabs_opened", true);
  }
}

/*
 Function with trusted section returning opened documents
*/
trustedActiveDocs = app.trustedFunction(function () {
  app.beginPriv();
  var d = app.activeDocs;
  app.endPriv();
  return d;
})

function getSession(name) {
  var result = [];
  try {
    if (global.tabs_opened[name]) {
      result = JSON.parse(global.tabs_opened[name]);
    }
  } catch (ee) {
    console.println('getSession: ' + ee);
  }

  return result;
}

/*
 Saving Tabs that are opened
*/
function SaveSession() {

  var d = trustedActiveDocs();

  if (d.length == 0) {
    app.alert("No documents opened to save session", 3);

    return;
  }

  if (app.execDialog(oDlg) == "ok") {

    var nRslt = 4
    var savedSession = getSession(oDlg.strName);
    console.println('SaveSession: ' + savedSession);
    var already_exists = (savedSession.length > 0);
    if (already_exists) {
      nRslt = app.alert("A session with name " + oDlg.strName + " already exists...\n\n" + "Do you want to continue?", 2, 2, "Submit Validation");
    }

    if (nRslt == 4) {
      var session = oDlg.strName;
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
      console.println(json);
      global.tabs_opened[session] = json;
      global.setPersistent("tabs_opened", true);

      AddSession(session)
    }
  }
}

/*
 Remove all saved sessions
*/
function RemoveAllSessions() {
  if (4 == app.alert("Are you sure you want to delete all sessions?", 2, 2, "Submit Validation")) {
    for (index in global.tabs_opened) {
      DeleteTab(index, false);
    }
  }
  global.tabs_opened = [];
  global.setPersistent("tabs_opened", true);
}

if (global.tabs_opened == null) {
  global.tabs_opened = []
  global.setPersistent("tabs_opened", true);
}

app.addMenuItem({
  cName: "-",
  cParent: parentMenu,
  cExec: "void(0);"
});

app.addMenuItem({
  cName: "&Save Session",
  cParent: parentMenu,
  cExec: "SaveSession();"
});

app.addSubMenu({
  cName: openMenu,
  cParent: parentMenu,
});

app.addSubMenu({
  cName: deleteMenu,
  cParent: parentMenu,
});

app.addMenuItem({
  cName: deleteAll,
  cParent: parentMenu,
  cExec: "RemoveAllSessions();"
});

for (key in global.tabs_opened) {
  AddSession(key);
}
