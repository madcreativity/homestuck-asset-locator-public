const { app, BrowserWindow } = require('electron');

let loadingWin;
let win;

var createLoadingWindow = () => {
    // Create loading window
    loadingWin = new BrowserWindow({
        width: 700,
        height: 525,
        webPreferences: {
            nodeIntegration: true
        },
        autoHideMenuBar: true,
        icon: __dirname + '/assets/icon.ico',
        frame: false
    });

    // Load loading.html
    loadingWin.loadFile('./loading.html');

    global.loadingWin = loadingWin;

    createMainWindow();
}

var createMainWindow = () => {
    // Create browser window
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true
        },
        autoHideMenuBar: true,
        icon: __dirname + '/assets/icon.ico',
        show: false
    });

    // Load index.html
    win.loadFile('./index.html');

    // Execute when window is closed
    win.on('closed', () => {
        // Dereference window
        win = null;
    })

    global.win = win;
}

app.on('ready', createLoadingWindow);

app.on('window-all-closed', () => {
    // macOS docking
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
  
app.on('activate', () => {
    // macOS "undocking"
    if (win === null) {
        createMainWindow()
    }
})
  