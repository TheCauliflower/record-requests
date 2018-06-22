/*
 * Copyright (c) 2018, ETH Zurich.
 * All rights reserved.
 *
 * This file is distributed under the terms in the attached LICENSE file.
 * If you do not find this file, copies can be found by writing to:
 * ETH Zurich D-INFK, Haldeneggsteig 4, CH-8092 Zurich. Attn: Systems Group.
 */

var trackedDownloads = [];

function logRequest(requestDetails) {
    //console.log('logging request');
    writeToStorage(requestDetails.timeStamp, requestDetails.originUrl, requestDetails.url, requestDetails.type);
}

function writeToStorage(timestamp, origin, target, type) {
    var pair = {};
    const key = timestamp + ' ' + origin + ' ' + target + ' ' + type;
    pair[key] = null;
    browser.storage.local.set(pair);//stores by using the entire string as the key
    console.debug('At ' + timestamp + ' logged : ' + origin + ' accessing ' + target + ' of type ' + type);
}

//--------------------------------Handle the message to write to disk------------------------------------------------------------------------------------

function handleMessage(request, sender, sendResponse) {
    if (typeof request.userInfoAdBlock !== "undefined") {

        var ABUserString = request.userInfoAdBlock;
        console.debug("starting to write data");
        retrieveRequestData(ABUserString, sendResponse); //launches a chain of callbacks ending up in saving the data to file and replying to sendResponse
        return true;//required for asynchronous response to messages
    }
}

function retrieveRequestData(ABUserString, sendResponse) {
    browser.storage.local.get(null).then((dataRetrieved) => {//TODO (optional): find a way to stream this
        cleanDataString(dataRetrieved, ABUserString, sendResponse);
    }, (error)=> {
        sendResponse({ response: "Failed to get data from DB" });
        return;
    });

}

function cleanDataString(dataObject, ABUserString, sendResponse) {
    var keys = Object.keys(dataObject);
    var cleanString = "";
    keys.forEach(key=> {
        cleanString += key + "\r\n";
    });
    adBlockInfo(cleanString, ABUserString, sendResponse);
}

function adBlockInfo(cleanString, ABUserString, sendResponse) {
    var description = "Extensions: " + ABUserString + "\r\n";
    addMetaInfos(cleanString + description , sendResponse);
}

function addMetaInfos(cleanString, sendResponse) {
    browser.runtime.getBrowserInfo().then((browserInfos) => {
        var metaInfos = "BrowserName: " + browserInfos.name + " ";
        metaInfos += "BrowserVersion: " + browserInfos.version + "\r\n";
        manifest = browser.runtime.getManifest();
        metaInfos += "ExtensionVersion: " + manifest.version + "\r\n";
        const blob = new Blob([cleanString + metaInfos], { type: 'text/plain' });
        const dataUrl = URL.createObjectURL(blob);
        writeToDiskAndWipe(dataUrl, sendResponse);
    }, error=> {
        console.error(error);
        sendResponse({ response: "Failed to get data from Browser" });
    });
}

function writeToDiskAndWipe(dataUrl, sendResponse) {
    browser.downloads.onChanged.addListener(checkIfDownloadSuccessful);
    browser.downloads.download({ url: dataUrl, saveAs: true, filename: 'browsing_requests.txt', conflictAction: 'uniquify' }).then( (downloadID) => {
        trackedDownloads.push({ "downloadID": downloadID, "sendResponse": sendResponse });
    }, (error) => {
        console.error(error);
        sendResponse({ response: "Failed to access the downloads API" });
    });
}

function checkIfDownloadSuccessful(downloadDelta) {
    trackedDownloads.forEach((downloadPair, index) => {
        if (downloadDelta.id === downloadPair.downloadID) {
            if (downloadDelta.hasOwnProperty('state')) {
                if (downloadDelta.state.current === "complete") {
                    wipeMemory(downloadPair.sendResponse);
                    trackedDownloads.splice(index, 1);
                }
                else if (downloadDelta.state.current === "interrupted") {
                    downloadPair.sendResponse({ response: "The download of the local data was interrupted" });
                    trackedDownloads.splice(index, 1);
                }
            }
        }
    });
    if (trackedDownloads.length === 0) {
        browser.downloads.onChanged.removeListener(checkIfDownloadSuccessful);
    }
}

function wipeMemory(sendResponse) {
    browser.storage.local.clear();
    sendResponse({ response: "Successfully saved data to file" });
}

function browserActionCalled() {
    console.log("browser action called");
    const url = browser.extension.getURL("popup/choose_extensions.html");
    //opens a popup instead of the extension panel in reason of https://bugzilla.mozilla.org/show_bug.cgi?id=1292701
    
    const width = 450;
    const height = 370; 
   
    browser.windows.create({
        type: 'popup', url , width, height,
        });
    }

browser.runtime.onMessage.addListener(handleMessage);

console.log('launching urls recording extension');
browser.browserAction.onClicked.addListener(browserActionCalled);
browser.webRequest.onBeforeRequest.addListener(
    logRequest,
    { urls: ["<all_urls>"] }
    );
