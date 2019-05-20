document.addEventListener('DOMContentLoaded', () => {
    const remote = require('electron').remote;
    const app = remote.app;
    const {ipcRenderer} = require('electron');
    const {google} = require('googleapis');
    const fs = require('fs');
    const fsPromises = fs.promises;

    let win = remote.getGlobal('win');
    let loadingWin = remote.getGlobal('loadingWin');

    // System variables
    let version = "beta v0.1";
    let settings = [];

    // Loading message updater
    let updateLoadingMessage = (loadingMessage) => {
        ipcRenderer.send('request-mainprocess-action', {
            message: "updateLoadingText",
            data: loadingMessage
        });
    }

    // Ensure that required files exist - if not, create them
    let createDirectory = async (dirpath) => {
        try {
            await fsPromises.mkdir(dirpath, {
                recursive: true
            });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
    }

    let fileExists = (path) => {
        try {
            if (fs.existsSync(path)) {
                return true;
            }
        } catch(err) {
            console.error(err);
            return false;
        }
    }

    // Method to create alert
    let createAlert = (title, content) => {
        if(document.querySelector(".alertBack") === null) {
            // Element setup
            let alertBackElement = document.createElement("div");
            let alertContainerElement = document.createElement("div");
            let alertTitleElement = document.createElement("p");
            let alertInnerElement = document.createElement("div");
            let alertContentElement = document.createElement("p");
            let alertCloseBtnElement = document.createElement("button");

            // Apply classes
            alertBackElement.className = "alertBack";
            alertContainerElement.className = "alertContainer";

            alertTitleElement.className = "alertTitle";
            alertInnerElement.className = "alertInner";

            // Other attributes
            alertTitleElement.textContent = title;
            alertContentElement.textContent = content;
            alertCloseBtnElement.textContent = "Close";

            // Event listeners
            alertCloseBtnElement.addEventListener('click', () => {
                document.body.removeChild(document.querySelector(".alertBack"));
            });

            // Element structure
            alertInnerElement.appendChild(alertContentElement);
            alertInnerElement.appendChild(alertCloseBtnElement);

            alertContainerElement.appendChild(alertTitleElement);
            alertContainerElement.appendChild(alertInnerElement);

            alertBackElement.appendChild(alertContainerElement);

            document.body.appendChild(alertBackElement);
        }
    }

    // Google Service object
    function GoogleService() {
        this.service = null;
        this.client = null;

        // Get client
        this.createClient = (credentialsPath, scopes) => {
            // Load client mail and private key
            let rawData = fs.readFileSync(credentialsPath);
            let parsedData = JSON.parse(rawData);

            let clientMail = parsedData.client_email;
            let privateKey = parsedData.private_key;

            // Initialize client
            let client = new google.auth.JWT(
                clientMail,
                null,
                privateKey,
                scopes,
                null
            );

            // Set promise
            new Promise((resolve, reject) => {
                client.authorize((err, tokens) => {
                    if (err) {
                        createAlert("Error", "Could not connect to Google Service.");
                    } else {
                        google.options({
                            auth: client
                        });
                        resolve();
                    }
                });
            });

            // Save client
            this.client = client;
        }

        // Connect to sheets service
        this.connectSheetsService = () => {
            this.service = google.sheets({
                version: 'v4',
                auth: this.client
            });
        }

        // Get data from field range
        this.getFieldData = (spreadsheet, range) => { 
            let request = this.service.spreadsheets.values.get({
                spreadsheetId: spreadsheet,
                range: range
            });

            request.then((response) => {
                return response;
            }, (reason) => {
                console.error('error: ' + reason.result.error.message);
                return null;
            });
        }

        // Get data from multiple field ranges
        this.getFieldDataMultiple = (spreadsheet, range) => { 
            let request = this.service.spreadsheets.values.batchGet({
                spreadsheetId: spreadsheet,
                range: range
            });

            request.then((response) => {
                return response;
            }, (reason) => {
                console.error('error: ' + reason.result.error.message);
                return null;
            });
        }

        // Write data to field range
        this.writeFieldData = (spreadsheet, range, values) => {
            let request = this.service.spreadsheets.values.update({
                spreadsheetId: spreadsheet,
                range: range
            }, values);

            request.then((response) => {
                return response;
            }, (reason) => {
                console.error('error: ' + reason.result.error.message);
                return null;
            });
        }

        // Write data to multiple field ranges
        this.writeFieldDataMultiple = (spreadsheet, range, values) => {
            let request = this.service.spreadsheets.values.batchUpdate({
                spreadsheetId: spreadsheet,
                range: range,
                data: values
            });

            request.then((response) => {
                return response;
            }, (reason) => {
                console.error('error: ' + reason.result.error.message);
                return null;
            });
        }
    }
    
    // Folder structure
    updateLoadingMessage('Creating folder & file structure');

    let assetsPath = app.getPath('userData') + "\\assets";
    let settingsPath = app.getPath('userData') + "\\settings.txt";
    let metatagsPath = app.getPath('userData') + "\\metatag_cache.txt";

    // Asset directory
    createDirectory(assetsPath);
    
    // Settings file
    if(!fileExists(settingsPath)) {
        fs.writeFileSync(settingsPath, 
            "Off"+ ","
          + "Homestuck" + ","
          + "Auto"
        );
    }

    // Load settings
    settings = fs.readFileSync(settingsPath).toString().split(',');

    
    // Metatag cache
    if(!fileExists(metatagsPath)) {
        fs.writeFileSync(metatagsPath, "");
    }
    
    
    updateLoadingMessage('Setting up');

    
    // Load version
    let DOMversion = document.querySelector("#version");
    
    DOMversion.textContent = version;
    
    // Set idle state
    let DOMstate = document.querySelector("#state");
    
    let setState = (state) => {
        DOMstate.textContent = state;
        
        switch(state) {
            case "Idle":
                DOMstate.style.color = "#4AC925";
                break;
            
            case "Uploading" | "Downloading" | "Offline":
                DOMstate.style.color = "#A1A100";
                break;
            
            case "Upload Failed" | "Download Failed" | "Error":
                DOMstate.style.color = "#E00707";
                break;
            
            default:
                break;
        }
    }


    updateLoadingMessage('Applying interaction logic');

    // Page transition buttons
    let DOMindexPage = document.querySelector("#page-index");
    let DOMsearchPage = document.querySelector("#page-search");
    let DOMeditPage = document.querySelector("#page-edit");
    let DOMoptionsPage = document.querySelector("#page-options");

    let DOMgotoPageButtons = document.querySelectorAll(".goto-btn");

    DOMgotoPageButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            // Hide currently visible element
            document.querySelector(".visible").classList.replace("visible", "hidden");

            // Select correct element
            let element = null;

            if(e.target.classList.contains("goto-search-btn")) element = DOMsearchPage;
            else if(e.target.classList.contains("goto-edit-btn")) element = DOMeditPage;
            else if(e.target.classList.contains("goto-options-btn")) element = DOMoptionsPage;
            else if(e.target.classList.contains("goto-index-btn")) element = DOMindexPage;

            // Show correct element
            element.classList.replace("hidden", "visible");

            // Perform page loading function
            loadPage();
        });
    });

    // Switch option buttons
    let DOMswitchOptionButtons = document.querySelectorAll(".switch-btn");
    DOMswitchOptionButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            let items = e.target.getAttribute("data-options").split(',');
            let curIndex = items.indexOf(e.target.textContent);

            if(curIndex < items.length - 1) {
                curIndex++;
            } else {
                curIndex = 0;
            }


            e.target.textContent = items[curIndex];
        });
    });

    // Options: Reconnect to service
    let DOMreconnectServiceOptionBtn = document.querySelector("#reconnectServiceOptionBtn");
    DOMreconnectServiceOptionBtn.addEventListener('click', () => {
        if(settings[0] == "Off") {
            let googleSheetsConnected = true;
            
            try {
                googleObject.createClient("volunteer.json", [
                    'https://www.googleapis.com/auth/spreadsheets', 
                    'https://www.googleapis.com/auth/spreadsheets.readonly'
                ]);
                googleObject.connectSheetsService();
            }
            catch(err) {
                googleSheetsConnected = false;
                console.error(err);
            }
    
            if(googleSheetsConnected) {
                setState("Online");
            }
        } else {
            setState("Offline");

            createAlert("Error", "Cannot connect to Google Service with offline mode enabled.");
        }
    });

    // Page loading function
    let loadPage = () => {
        
    }
    
    // Options - Save changes button
    let DOMdefaultOriginOption = document.querySelector("#defaultOriginOption");
    let DOMgifAnimationsOption = document.querySelector("#gifAnimationsOption");
    let DOMofflineModeOption = document.querySelector("#offlineModeOption");

    let DOMsaveButton = document.querySelector("#saveBtn");


    DOMsaveButton.addEventListener('click', () => {
        // Save option data to file
        fs.writeFileSync(settingsPath, 
            DOMofflineModeOption.textContent + ","
          + DOMdefaultOriginOption.value + ","
          + DOMgifAnimationsOption.textContent
        );

        settings[0] = DOMofflineModeOption.textContent;
        settings[1] = DOMdefaultOriginOption.value;
        settings[2] = DOMgifAnimationsOption.textContent;
    });

    // Set default origin option
    DOMofflineModeOption.textContent = settings[0];
    DOMdefaultOriginOption.value = settings[1];
    DOMgifAnimationsOption.textContent = settings[2];
    
    
    // Google Sheets methods
    updateLoadingMessage('Connecting to Google Sheets');

    let spreadsheet = "1LcLcP9pUPirSWj2by1_CF4JSO8ArcgjyTLVtHAziJZ0";

    let googleObject = new GoogleService();
    
    if(settings[0] == "Off") {
        let googleSheetsConnected = true;
        
        try {
            googleObject.createClient("volunteer.json", [
                'https://www.googleapis.com/auth/spreadsheets', 
                'https://www.googleapis.com/auth/spreadsheets.readonly'
            ]);
            googleObject.connectSheetsService();
        }
        catch(err) {
            googleSheetsConnected = false;
            console.error(err);
        }

        if(googleSheetsConnected) {
            setState("Online");
            updateLoadingMessage("Succesfully connected to Google Sheets");
        } else {
            updateLoadingMessage("Could not connect to Google Sheets");
        }
    } else {
        setState("Offline");
    }

    // Finished loading
    ipcRenderer.send('request-mainprocess-action', {
        message: "endLoading"
    });

    loadingWin.close();
    win.show();
});