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
    const ALPHABET =  ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "Y", "Z"];

    const version = "beta v0.6";
    let settings = [];
    
    let spreadsheet = "1LcLcP9pUPirSWj2by1_CF4JSO8ArcgjyTLVtHAziJZ0";
    let metatagSpreadsheet = "1BfGuLpsdV4sV3N_Z3NVM2Vo-_OYT05m4SIvExdDd59g";
    
    let googleSheetsConnected = false;

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
        this.getFieldDataMultiple = async (spreadsheet, ranges) => { 
            return new Promise((resolve, reject) => {
                this.service.spreadsheets.values.batchGet({
                    spreadsheetId: spreadsheet,
                    ranges: ranges,
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
                    valueInputOption: "RAW",
                    resource: {
                        values: [ values ]
                    }
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
        this.writeFieldDataMultiple = async (spreadsheet, ranges, values) => {
            return new Promise((resolve, reject) => {
                this.service.spreadsheets.values.batchUpdate({
                    spreadsheetId: spreadsheet,
                    ranges: ranges,
                    valueInputOption: "RAW",
                    resource: {
                        values: [ values ]
                    }
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

    let getState = () => {
        return DOMstate.textContent;
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
            else if(e.target.classList.contains("goto-edit-btn")) {
                if(settings[0] === "Off" && googleSheetsConnected) {
                    element = DOMeditPage;
                } else {
                    createAlert("Error", "You cannot edit tags while offline.");
                    DOMindexPage.classList.add("visible");
                    return;
                }
            }
            else if(e.target.classList.contains("goto-options-btn")) element = DOMoptionsPage;
            else if(e.target.classList.contains("goto-index-btn")) element = DOMindexPage;

            // Show correct element
            element.classList.replace("hidden", "visible");

            // Perform page loading function
            loadPage();
        });
    });

    // Edit page elements
    let DOMeditContentContainer = document.querySelector("#editContentContainer");

    let DOMeditOrigin = document.querySelector("#edit-origin");
    let DOMeditPageField = document.querySelector("#edit-pageField");
    let DOMeditIdField = document.querySelector("#edit-idField");

    let DOMeditTagsField = document.querySelector("#tagField");

    // Edit page -- asset functionality
    let curOrigin = "";
    let curPage = 1;
    let curID = 1
    let origins = [];
    let assets = [];

    function Origin(origin, originStart, originEnd) {
        this.origin = origin;
        this.originStart = originStart;
        this.originEnd = originEnd;
    }

    let getOrigins = (callback) => {
        let localOrigins = [];
        origins = [];

        googleObject.getFieldData(spreadsheet, "1:1").then((result) => {
            localOrigins = result.data.values[0];

            for(let i = 0; i < localOrigins.length - 1; i += 2) {
                let originSplit = localOrigins[i + 1].split('-');
                origins.push(new Origin(localOrigins[i], originSplit[0], originSplit[1]));
            }

            callback();
        });
    }

    let loadAssetsFunc = () => {
        // Load assets based on origin
        let originSections = [];
        
        assets = [];
        
        origins.forEach((origin) => {
            originSections.push(origin.originStart + ":" + origin.originEnd);
        });

        googleObject.getFieldDataMultiple(spreadsheet, originSections).then((result) => {
            result.data.valueRanges.forEach((valueRange) => {
                valueRange.values.forEach((value) => {
                    assets.push(value);
                });
            });

            // Show asset
            showAsset();

            setState("Idle");
        });
    }

    let loadAssets = () => {
        DOMeditPageField.value = "1";
        DOMeditIdField.value = "1";

        curOrigin = settings[1];
        page = 1;
        id = 1;

        // Get origins
        if(origins.length === 0) {
            getOrigins(loadAssetsFunc);
        } else {
            loadAssetsFunc();
        }
    }

    let loadAssetsSearch = () => {
        curOrigin = settings[1];
        currentResultsPage = 1;

        // Get origins
        if(origins.length === 0) {
            getOrigins(loadAssetsFunc);
        } else {
            loadAssetsFunc();
        }
    }

    let showAssetFlash = (url) => {
        let thisObjectElement = document.createElement("object");
        let thisParamMovieElement = document.createElement("param");
        let thisParamWmodeElement = document.createElement("param");
        let thisEmbedElement = document.createElement("embed");

        thisParamMovieElement.name = "movie";
        thisParamMovieElement.value = url;

        thisParamWmodeElement.name = "wmode";
        thisParamWmodeElement.value = "transparent";

        thisEmbedElement.src = url;

        
        thisObjectElement.appendChild(thisParamMovieElement);
        thisObjectElement.appendChild(thisParamWmodeElement);
        thisObjectElement.appendChild(thisEmbedElement);

        DOMeditContentContainer.appendChild(thisObjectElement);
    }

    let showAssetPanel = (url) => {
        let thisImageElement = document.createElement("img");
        thisImageElement.src = url;

        DOMeditContentContainer.appendChild(thisImageElement);
    }

    let showAsset = () => {
        setState("Processing");


        let thisPageTypeDat = assets[curPage - 1][2 + (curID - 1) * 3];
        let thisPageLinkDat = assets[curPage - 1][3 + (curID - 1) * 3];
        let thisPageTagsDat = assets[curPage - 1][4 + (curID - 1) * 3];

        if(thisPageTypeDat === "Panel") {
            if(DOMeditContentContainer.children[0] !== undefined) {
                if(DOMeditContentContainer.children[0].tagName !== "IMG") {
                    while(DOMeditContentContainer.firstChild) {
                        DOMeditContentContainer.removeChild(DOMeditContentContainer.firstChild);
                    }

                    showAssetPanel(thisPageLinkDat);
                } else {
                    DOMeditContentContainer.children[0].src = thisPageLinkDat;
                }
            } else {
                showAssetPanel(thisPageLinkDat);
            }
        } else if(thisPageTypeDat === "Flash") {
            if(DOMeditContentContainer.children[0] !== undefined) {
                if(DOMeditContentContainer.children[0].tagName !== "OBJECT") {
                    while(DOMeditContentContainer.firstChild) {
                        DOMeditContentContainer.removeChild(DOMeditContentContainer.firstChild);
                    }

                    showAssetFlash(thisPageLinkDat);
                } else {
                    DOMeditContentContainer.querySelector("param[name=movie]").value = thisPageLinkDat;

                    DOMeditContentContainer.querySelector("embed").src = thisPageLinkDat;
                }
            } else {
                showAssetFlash(thisPageLinkDat);
            }
        }

        DOMeditTagsField.value = thisPageTagsDat;


        setState("Idle");
    }

    let indexToColumn = (index) => {
        let column = "";

        let timesRun = 0;
        while (timesRun < Math.floor(index / ALPHABET.length))
        {
            column += ALPHABET[timesRun];
            timesRun++;
        }

        if(index - (timesRun * ALPHABET.length) > 0)
        {
            column += ALPHABET[index - (timesRun * ALPHABET.length)];
        }

        return column;
    }

    // Edit page -- Apply edits button
    let DOMeditApplyTagEditsBtn = document.querySelector("#applyEditsTagBtn");

    DOMeditApplyTagEditsBtn.addEventListener('click', () => {
        if(getState() !== "Processing") {
            let thisOrigins = curOrigin.replace(" ", "").toLowerCase().split(",");
            let thisIndexOffset = 0;

            for(let i = 0; i < origins.length; i++) {
                if(thisOrigins.includes(origins[i].origin.toLowerCase())) {
                    if(curPage >= thisIndexOffset && curPage <= thisIndexOffset + origins[i].originEnd) {
                        let thisSheetField = indexToColumn(4 + (curID - 1) * 3) + (parseInt(origins[i].originStart) + (curPage - 1) - thisIndexOffset).toString();

                        googleObject.writeFieldData(spreadsheet, thisSheetField + ":" + thisSheetField, [DOMeditTagsField.value]).then((result) => {
                            console.log(thisSheetField + ": " + DOMeditTagsField.value);
                        });


                        assets[curPage - 1][4 + (curID - 1) * 3] = DOMeditTagsField.value;

                        break;
                    }
                    thisIndexOffset += origins[i].originEnd - origins[i].originStart;
                }
            }
        }
    });


    // Edit page -- Select button
    let DOMeditSelectBtn = document.querySelector("#edit-selectBtn");
    DOMeditSelectBtn.addEventListener('click', () => {
        if(getState() !== "Processing") {
            setState("Processing");

            curPage = parseInt(DOMeditPageField.value);
            curID = parseInt(DOMeditIdField.value);

            if(DOMeditOrigin.value !== curOrigin) {
                curOrigin = DOMeditOrigin.value;
            }

            showAsset();

            setState("Idle");
        }
    });

    // Key press
    let keyMap = {};
    window.addEventListener('keydown', (e) => {
        e = e || window.event;

        keyMap[e.keyCode] = e.type == 'keydown';

        // Search page
        if(DOMsearchPage.classList.contains("visible")) {
            if(keyMap[13]) {
                DOMsearchIcon.click();
            }
        }

        // Edit tags page
        if(DOMeditPage.classList.contains("visible")) {
            if(keyMap[17] && keyMap[39]) {
                if(assets[curPage - 1][0] > curID) {
                    curID++;
                } else {
                    curPage++;
                    curID = 1;
                }
        
                DOMeditPageField.value = curPage.toString();
                DOMeditIdField.value = curID.toString();

                showAsset();
            } else if(keyMap[17] && keyMap[37]) {
                if(curID - 1 > 0) {
                    curID--;
                } else if(curPage - 1 > 0) {
                    curPage--;
                    curID = assets[curPage - 1][0];
                }

                DOMeditPageField.value = curPage.toString();
                DOMeditIdField.value = curID.toString();

                showAsset();
            } else if(keyMap[13]) {
                if(document.activeElement !== DOMeditTagsField) {
                    curOrigin = DOMeditOrigin.value;
                    curPage = parseInt(DOMeditPageField.value);
                    curId = parseInt(DOMeditIdField.value);

                    showAsset();
                }
            }
        }
    });

    let DOMeditPageBack = document.querySelector("#page-edit-back");
    let DOMeditPageForward = document.querySelector("#page-edit-forward");

    DOMeditPageBack.addEventListener('click', () => {
        setState("Processing");

        if(curID - 1 > 0) {
            curID--;
        } else if(curPage - 1 > 0) {
            curPage--;
            curID = assets[curPage - 1][0];
        }

        DOMeditPageField.value = curPage.toString();
        DOMeditIdField.value = curID.toString();

        showAsset();

        setState("Idle");
    });

    DOMeditPageForward.addEventListener('click', () => {
        setState("Processing");

        if(assets[curPage - 1][0] > curID) {
            curID++;
        } else {
            curPage++;
            curID = 1;
        }

        DOMeditPageField.value = curPage.toString();
        DOMeditIdField.value = curID.toString();

        showAsset();

        setState("Idle");
    });


    window.addEventListener('keyup', (e) => {
        e = e || window.event;

        keyMap[e.keyCode] = e.type == 'keydown';
    });

    // Search page variables
    let currentResultsPage = 1;
    let searchSelectedAssets = [];

    // Search page elements
    let DOMsearchOrigin = document.querySelector("#search-origin");
    let DOMsearchTags = document.querySelector("#tagControl");

    let DOMsearchIcon = document.querySelector("#searchIcon");

    // Search -- Search button
    DOMsearchIcon.addEventListener("click", () => {
        setState("Processing");
        
        let thisSearchTags = DOMsearchTags.value.toLowerCase().replace(/ /g, "");
        let thisSearchOrigin = DOMsearchOrigin.value;
        searchSelectedAssets = [];

        let thisSplitSearchTags = thisSearchTags.split(",");

        // Find assets
        for(let x = 0; x < assets.length; x++) {
            for(let thisID = 1; thisID < 1 + Math.ceil((assets[x].length - 4) / 3); thisID++) {
                let thisSplitAssetTags = assets[x][4 + (thisID - 1) * 3].toLowerCase().replace(/ /g, "").split(",");
                let thisSelectAsset = true;

                for(let i = 0; i < thisSplitSearchTags.length; i++) {
                    if(!thisSplitAssetTags.includes(thisSplitSearchTags[i])) {
                        thisSelectAsset = false;
                        break;
                    }
                }
                
                if(thisSelectAsset) {
                    searchSelectedAssets.push(x + ";" + thisID);
                }
            }
        };

        // Show assets until page limit is reached
        console.log(searchSelectedAssets);



        setState("Idle");
    });

    // Page loading function
    let loadPage = () => {
        if(DOMeditPage.classList.contains("visible")) {
            setState("Processing");

            DOMeditOrigin.value = settings[1];

            if(assets.length <= 0) {
                loadAssets();
            }

            setState("Idle");
        } else if(DOMsearchPage.classList.contains("visible")) {
            setState("Processing");

            DOMsearchOrigin.value = settings[1];

            if(assets.length <= 0) {
                loadAssetsSearch();
            }

            setState("Idle");
        }
    }

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
       // TODO: Download assets and correct data from spreadsheet 
    });

    // Options: Update metatag data
    let DOMupdateMetatagDataOptionBtn = document.querySelector("#getMetatagsOptionBtn");
    DOMupdateMetatagDataOptionBtn.addEventListener('click', () => {
        if(settings[0] == "Off") {
            // Gather metatags from spreadsheet
            let metatagOutput = "";
            
            setState("Processing");
            googleObject.getFieldData(metatagSpreadsheet, "1:380").then((result) => {
                let discoveredMetatags = result;
                
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
            googleSheetsConnected = true;
            
            try {
                googleObject.createClient(__dirname + "\\dev.json", [
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
        googleSheetsConnected = true;
        
        try {
            googleObject.createClient(__dirname + "\\dev.json", [
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