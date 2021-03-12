# PDFSessions
A javascript for Adobe Acrobat Reader that enables the user to save sessions (groups of open pdfs) and later restore them. Based on the script by Andrey Kartashov found in https://stackoverflow.com/questions/12689154/adobe-acrobat-reader-tabs-saving-and-autoloading.

Just add the script to the Javascripts directory under your Adobe Acrobat Reader installation (for Adobe Acrobat Reader it should be something like C:\Program Files (x86)\Adobe\Acrobat Reader DC\Reader\Javascripts), restart the application and use the new "Save Session", "Open Session" and "Delete Session" options on the Window menu.
 
If you have trouble getting the script to work: In Adobe Acrobat Reader go to Edit -> Preferences. Then to the "Javascript" section, then enable all items there, like "Javascript execution privileges". Then go to "security (enhanced)" and disable "protected mode at startup". Restart Adobe.
