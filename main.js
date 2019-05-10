const { app, BrowserWindow } = require('electron');


let win;

function createWindow () {
    // Create browser window
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true
        },
        autoHideMenuBar: true,
        icon: __dirname + '/assets/icon.ico'
    });

    // Load index.html
    win.loadFile('./index.html');

    // Execute when window is closed
    win.on('closed', () => {
        // Dereference window
        win = null
    })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // macOS docking
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
  
app.on('activate', () => {
    // macOS "undocking"
    if (win === null) {
        createWindow()
    }
})
  