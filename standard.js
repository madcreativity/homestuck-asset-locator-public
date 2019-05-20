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
    
    let spreadsheet = "1LcLcP9pUPirSWj2by1_CF4JSO8ArcgjyTLVtHAziJZ0";
    let metatagSpreadsheet = "1BfGuLpsdV4sV3N_Z3NVM2Vo-_OYT05m4SIvExdDd59g";

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
        this.results = [];

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
        this.getFieldData = async (spreadsheet, range) => { 
            return new Promise((resolve, reject) => {
                this.service.spreadsheets.values.get({
                    spreadsheetId: spreadsheet,
                    range: range,
                }, (err, result) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        }

        // Get data from multiple field ranges
        this.getFieldDataMultiple = async (spreadsheet, range) => { 
            return new Promise((resolve, reject) => {
                this.service.spreadsheets.values.batchGet({
                    spreadsheetId: spreadsheet,
                    range: range,
                }, (err, result) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        }

        // Write data to field range
        this.writeFieldData = async (spreadsheet, range, values) => {
            return new Promise((resolve, reject) => {
                this.service.spreadsheets.values.update({
                    spreadsheetId: spreadsheet,
                    range: range,
                    data: values,
                }, (err, result) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        }

        // Write data to multiple field ranges
        this.writeFieldDataMultiple = async (spreadsheet, range, values) => {
            return new Promise((resolve, reject) => {
                this.service.spreadsheets.values.batchUpdate({
                    spreadsheetId: spreadsheet,
                    range: range,
                    data: values,
                }, (err, result) => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
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
            
            case "Processing" | "Offline":
                DOMstate.style.color = "#A1A100";
                break;
            
            case "Error":
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

    // Options: Offline preparation
    let DOMofflinePreparationOptionBtn = document.querySelector("#offlinePreparationOptionBtn");
    DOMofflinePreparationOptionBtn.addEventListener('click', () => {
        
    });

    // Options: Update metatag data
    let DOMupdateMetatagDataOptionBtn = document.querySelector("#getMetatagsOptionBtn");
    DOMupdateMetatagDataOptionBtn.addEventListener('click', () => {
        if(settings[0] == "Off") {
            // Gather metatags from spreadsheet
            setState("Processing");
            googleObject.getFieldData(metatagSpreadsheet, "1:380").then((result) => {
                let discoveredMetatags = result;
                let metatagOutput = "";
                
                // Cast error if metatags failed to be collected correctly
                if(discoveredMetatags === undefined) {
                    createAlert("Error", "Failed to gather metatag data. Please try again. If this error persists, contact a developer.");
                    setState("Error");
                    return;
                }
                
                // Attempt to process metatag data
                try {
                    discoveredMetatags.data.values.forEach((tagRow) => {
                        tagRow.forEach((singleTag) => {
                            metatagOutput += singleTag.toString() + ",";
                        });

                        metatagOutput = metatagOutput.slice(0, metatagOutput.length - 1);
                        metatagOutput += "|";
                    });

                    metatagOutput = metatagOutput.slice(0, metatagOutput.length - 1);
                } catch(err) {
                    createAlert("Error", "Failed to process metatag data. Please try again. If this error persists, contact a developer.");
                    return;
                }

                // Save metatags to file
                fs.writeFileSync(metatagsPath, metatagOutput);                    

                setState("Idle");
            });

            


            fs.writeFileSync(metatagsPath, metatagOutput);
        } else {
            createAlert("Error", "Cannot connect to Google Service with offline mode enabled.");
        }
    });

    // Options: Reconnect to service
    let DOMreconnectServiceOptionBtn = document.querySelector("#reconnectServiceOptionBtn");
    DOMreconnectServiceOptionBtn.addEventListener('click', () => {
        if(settings[0] == "Off") {
            let googleSheetsConnected = true;
            
            try {
                googleObject.createClient("volunteer.json", [
                    'https://www.googleapis.com/auth/spreadsheets'
                ]);
                googleObject.connectSheetsService();
            }
            catch(err) {
                googleSheetsConnected = false;
                console.error(err);
                setState("Offline");

                createAlert("Error", "Could not connect to Google Service.");
            }
    
            if(googleSheetsConnected) {
                setState("Online");
            }
        } else {

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


    let googleObject = new GoogleService();
    
    if(settings[0] == "Off") {
        let googleSheetsConnected = true;
        
        try {
            googleObject.createClient("volunteer.json", [
                'https://www.googleapis.com/auth/spreadsheets'
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