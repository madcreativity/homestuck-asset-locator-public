const { ipcMain, app, BrowserWindow, shell } = require('electron');
const path = require('path');

let loadingWin;
let win;

let loadingComplete = false;

if(process.platform == 'win32') {
    if(process.arch == 'x64') {
        app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, 'flash-plugin/pepflashplayerx64.dll'));
    } else {
        app.commandLine.appendSwitch('ppapi-flash-path', path.join(__dirname, 'flash-plugin/pepflashplayerx86.dll'));
    }
} else if(process.platform == 'linux') {
    // TODO: Add flash player plugin for other platforms
}

var createLoadingWindow = () => {
    // Create loading window
    loadingWin = new BrowserWindow({
        width: 700,
        height: 525,
        webPreferences: {
            nodeIntegration: true,
            plugins: true
        },
        autoHideMenuBar: true,
        icon: __dirname + '/assets/icon.ico',
        frame: false
    });

    // Load loading.html
    loadingWin.loadFile('./loading.html');

    global.loadingWin = loadingWin;

    // Execute when window is closed
    loadingWin.on('closed', () => {
        // Dereference window
        loadingWin = null;
        
        if(win !== null && !loadingComplete) {
            win.close();
        }
    });


    createMainWindow();
}

var createMainWindow = () => {
    // Create browser window
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            nodeIntegration: true,
            plugins: true
        },
        autoHideMenuBar: true,
        icon: __dirname + '/assets/icon.ico',
        show: false
    });
    
    // Load index.html
    win.loadFile('./index.html');

    win.webContents.setAudioMuted(true);
    
    // Execute when window is closed
    win.on('closed', () => {
        // Dereference window
        loadingWin = null;
        win = null;
    });
    
    global.win = win;
}

ipcMain.on('request-mainprocess-action', (event, arg) => {
    if(arg.message == "endLoading") {
        loadingComplete = true;
    } else if(arg.message == "updateLoadingText") {
        loadingWin.webContents.executeJavaScript('document.querySelector("h2").textContent = "' + arg.data + '";');
    } else if(arg.message == "showItemInFolder") {
        shell.showItemInFolder(arg.data);
    }
});

app.on('ready', createLoadingWindow);

app.on('window-all-closed', () => {
    // macOS docking
    if (process.platform !== 'darwin') {
        app.quit()
    }
});

app.on('activate', () => {
    // macOS "undocking"
    if (win === null && loadingWin === null) {
        createLoadingWindow();
    }
});