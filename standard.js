const { google } = require('googleapis');
const { fs } = require('fs');

// System variables
let version = "beta v0.1";

// Load version
let DOMversion = document.querySelector("#version");

DOMversion.textContent = version;

// Set idle state
let DOMstate = document.querySelector("#state");

var setState = (state) => {
    DOMstate.textContent = state;

    switch(state) {
        case "Idle":
            DOMstate.style.color = "#4AC925";
            break;

        case "Uploading" | "Downloading" | "Offline":
            DOMstate.style.color = "#A1A100";
            break;

        case "Upload Failed" | "Download Failed":
            DOMstate.style.color = "#E00707";
            break;

        default:
            break;
    }
}


// Google Sheets methods
var spreadsheet = "1LcLcP9pUPirSWj2by1_CF4JSO8ArcgjyTLVtHAziJZ0";


// Load credentials
var getCredentials = (credentialsPath) => {
    let rawData = fs.readFileSync(credentialsPath);
    let parsedData = JSON.parse(rawData);

    return [ parsedData.client_email, parsedData.private_key ];
}

var getAuthorization = (clientMail, privateKey) => {
    var client = new google.auth.JWT(
        clientMail,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/spreadsheets.readonly'],
        null
    );

    new Promise((resolve, reject) => {
        client.authorize((err, tokens) => {
            if (err) {
                reject(err);
            } else {
                google.options({
                    auth: client
                });
                resolve();
            }
        });
    });

    return client;
}

var connectSheetsService = (client) => {
    return sheets = google.sheets({
        version: 'v4',
        auth: client
    });
}

var getFieldData = (sheetsService, range) => { 
    let request = sheetsService.spreadsheets.values.get({
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