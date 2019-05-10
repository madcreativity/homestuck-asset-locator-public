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


// Google Sheets JS Example
var clientMail;
var privateKey;

// TODO: Initialize clientMail and privateKey from JSON file

var spreadsheet = "1LcLcP9pUPirSWj2by1_CF4JSO8ArcgjyTLVtHAziJZ0";

const {google} = require('googleapis');
const client = new google.auth.JWT(
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

const sheets = google.sheets({
    version: 'v4',
    auth: client
});


var request = sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheet,
    range: "1:1",
    valueRenderOption: 'UNFORMATTED_VALUE'
});

request.then(function(response) {
    console.log(response.data.values);
  }, function(reason) {
    console.error('error: ' + reason.result.error.message);
  });