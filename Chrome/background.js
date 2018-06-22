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
    writeToStorage(requestDetails.timeStamp, requestDetails.initiator, requestDetails.url, requestDetails.type);
}

function writeToStorage(timestamp, origin, target, type) {
    var pair = {};
    const key = timestamp + ' ' + origin + ' ' + target + ' ' + type;
    pair[key] = null;
    chrome.storage.local.set(pair);//stores by using the entire string as the key
    console.debug('At ' + timestamp + ' logged : ' + origin + ' accessing ' + target + ' of type ' + type);
}

//--------------------------------Handle the message to write to disk------------------------------------------------------------------------------------

function handleMessage(request, sender, sendResponse) {
    if (typeof request.userInfoAdBlock !== "undefined")
    {
        var ABUserString = request.userInfoAdBlock;
        console.debug("starting to write data");
        retrieveRequestData(ABUserString, sendResponse); //launches a chain of callbacks ending up in saving the data to file and replying to sendResponse
        return true;//required for asynchronous response to messages
    }
}

function retrieveRequestData(ABUserString, sendResponse) {
    chrome.storage.local.get(null, dataRetrieved=> {//TODO (optional): find a way to stream this
        if (chrome.extension.lastError) {
            sendResponse({ response: "Failed to get data from DB" });
            return;
        }
        cleanDataString(dataRetrieved, ABUserString, sendResponse);
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
    var description = "Extensions: " + ABUserString + "AdBlockDetected: " ;
    var s = new Image();
    s.onload = function () {
        if (s.naturalWidth != 0) {
            addMetaInfos(cleanString + description + "Yes\r\n", sendResponse);
        }
        else {
            addMetaInfos(cleanString + description + "Undefined\r\n", sendResponse);
        }
    };
    s.onerror = function () {
        addMetaInfos(cleanString + description + "No\r\n", sendResponse);;
    };
    s.src = "chrome-extension://gighmmpiobklfepjocnamgkkbiglidom/icons/icon24.png";
}

function addMetaInfos(cleanString, sendResponse) {
    var metaInfos = "BrowserName: " + navigator.appName + " (Chrome code) ";
    metaInfos += "BrowserVersion: " + navigator.appVersion + "\r\n";
    manifest = chrome.runtime.getManifest();
    metaInfos += "ExtensionVersion: " + manifest.version + "\r\n";
    cleanString = cleanString.concat(metaInfos);
    createBlob(cleanString, sendResponse);
}

function createBlob(dataString, sendResponse) {
    const blob = new Blob([dataString], { type: 'text/plain' });
    const dataUrl = URL.createObjectURL(blob);
    writeToDiskAndWipe(dataUrl, sendResponse);

}

function writeToDiskAndWipe(dataUrl, sendResponse) {
    chrome.downloads.onChanged.addListener(checkIfDownloadSuccessful);
    chrome.downloads.download({ url: dataUrl, saveAs: true, filename: 'browsing_requests.txt', conflictAction: 'uniquify' }, (downloadID) => {
        if (chrome.extension.lastError) {
            console.error(chrome.extension.lastError);
            sendResponse({ response: "Failed to access the downloads API" });
        } else {
            trackedDownloads.push({ "downloadID": downloadID, "sendResponse": sendResponse });
        }
    });
}

function checkIfDownloadSuccessful(downloadDelta) {
    trackedDownloads.forEach((downloadPair,index) => {
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
        chrome.downloads.onChanged.removeListener(checkIfDownloadSuccessful);
    }
}

function wipeMemory(sendResponse) {
    chrome.storage.local.clear();
    sendResponse({ response: "Successfully saved data to file" });
}

chrome.runtime.onMessage.addListener(handleMessage);

console.log('launching urls recording extension');
//chrome.browserAction.onClicked.addListener(retrieveRequestData);
chrome.webRequest.onBeforeRequest.addListener(
    logRequest,
    { urls: ["<all_urls>"] }
    );
