/*
 * Copyright (c) 2018, ETH Zurich.
 * All rights reserved.
 *
 * This file is distributed under the terms in the attached LICENSE file.
 * If you do not find this file, copies can be found by writing to:
 * ETH Zurich D-INFK, Haldeneggsteig 4, CH-8092 Zurich. Attn: Systems Group.
 */

function getAdBlockString(buttonContent) {
    switch (buttonContent) {
        case "I have an ad blocker (AdBlock, ABP, Ghostify,...)":
            return "UserInfoAdBlock: Yes ";
        case "I don't have an ad blocker":
            return "UserInfoAdBlock: No ";
        default:
            return "UserInfoAdBlock: Undefined ";
    }
}

function handleError(error) {
    console.log(error);
}

function handleResponse(message) {
    document.querySelector("#result-content").classList.remove("hidden");
    document.getElementById("result-content").innerHTML = message.response;
}

function getIndices(plainByteArray) {
    var bufView = new Uint8Array(plainByteArray);
    //retrieve IV size
    var strEndIndex = 3;
    var IVSizeStr = "";
    while (!(String.fromCharCode(bufView[strEndIndex]) === " ")) {
        //console.log(keySizeStr);
        IVSizeStr += String.fromCharCode(bufView[strEndIndex]);
        strEndIndex++;
    }
    //retrieve symKey size
    strEndIndex += 4;
    var keySizeStr = "";
    while (!(String.fromCharCode(bufView[strEndIndex]) === " ")) {
        //console.log(keySizeStr);
        keySizeStr += String.fromCharCode(bufView[strEndIndex]);
        strEndIndex++;
    }
    //retrieve cipherText size
    strEndIndex += 4;
    var cipherSizeStr = "";
    while (!(String.fromCharCode(bufView[strEndIndex]) === " ")) {
        //console.log(keySizeStr);
        cipherSizeStr += String.fromCharCode(bufView[strEndIndex]);
        strEndIndex++;
    }
    const headerLen = strEndIndex + 1;
    //assert(totalsize - parseInt(cipherSizeStr) === headerLen + parseInt(IVSizeStr) + parseInt(keySizeStr));
    return { IVStart: headerLen, keyStart: headerLen + parseInt(IVSizeStr), cipherStart: headerLen + parseInt(IVSizeStr) + parseInt(keySizeStr) };//the data is header, IV, Key, Cipher
}

function encryptFile(plainByteArray, filename) {
    console.log(plainByteArray);
    const filenameArray = filename.split('.', 2);
    if (filenameArray[1] === "enc") {
        document.querySelector("#result-content").classList.remove("hidden");
        document.getElementById("result-content").innerHTML = "The file you are trying to encrypt already has the encrypted file extension";
    }
    else {
        //generate an exportable AES-256 key
        const beginTime = new Date().getTime();
        console.log("beginning to encrypt the data")
        window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]).then(symKey=> {
            //encrypt the data using the symmetric key
            const IniVec = window.crypto.getRandomValues(new Uint8Array(16));
            window.crypto.subtle.encrypt({ name: "AES-GCM", iv: IniVec }, symKey, plainByteArray).then(cipherText => {
                console.log("Took " + ((new Date().getTime()) - beginTime) + " ms to encrypt the plain text")
                //@TODO: place the final public key here
                const publicKeyJSON = { "alg": "RSA-OAEP-512", "e": "AQAB", "ext": true, "key_ops": ["wrapKey"], "kty": "RSA", "n": "oeHgGC7-l5pTxzRMlAKbpsuXOL8keVdMplNkG6pypb6HHur0H3Vs6NzelLvpZ33KM-9ak6gGRqPoeBBJ4RmHV9kURlkZDd3_GILiTObBu5uD2DcGv-t9RPArNg8sNEwAFnV8v1jTatsl_-3s0gn7vwel7kX_dbmJyTpdBvYXLhRuoZ50FprMXQ7Zfr5jiLiTpBGpDUinJrFfjK6Cbu1NdQ0d-JiEHp0D9lD8WQEMG--7lqMPTF5MskSWH3tVA9ocxqvwM-sRs4WHfId9o6PQPTop53y_tCVqMNo9EDV07A-JSL2wBeZHR1OIuN9AueJVS9RysJAFP3zS3Np3eBeAIw37ggiTHShXgCM73kyDMukF4hj9gUAMyZYXiUM7XdXBXXK6sqWNI4rxh2QRIJUKUzIQsvrpLZ6Yi6h_ZIttLUIOfOiV4ENYmABgqkCxfEflB3572aMaVJaaeMxgZcJbGN7XtAX6YV1CLBkPRlzOtk_O2ZaJYiQBFjd9FxHI5n0m-W9oWTHNlRARwrSToW0MdvUKRc_5eEffTeGNqkjSJ1w17sqXibj4x2XGQdlYlf1o9zKdVrUJ4iabAddFa__uam4M6AF1xlm-Y23Vxyq6caF3HTLVuXjqUcU6lxX1QbhbolzCcRRR9qyNCpeX1vHNEsHRvNNRlzqE-t_-8ddS7Z8" };
                window.crypto.subtle.importKey(
                    "jwk", //format of the key to import
                    publicKeyJSON,
                    {   //these are the algorithm options
                        name: "RSA-OAEP",
                        hash: { name: "SHA-512" }, //possibly "SHA-256"
                    },
                    false, //whether the key is extractable
                    ["wrapKey"]
                ).then(publicKey=> {
                    console.log(JSON.stringify(symKey));
                    //encrypt the AES-key using the public RSA key
                    window.crypto.subtle.wrapKey("jwk", symKey, publicKey, "RSA-OAEP").then(wrappedSymKey=> {
                        console.log("Took " + ((new Date().getTime()) - beginTime) + " ms to encrypt the plain text and the symmetric key")
                        //store encrypted AES-key and ciphertext
                        const prependString = "IV " + IniVec.length + " SK " + wrappedSymKey.byteLength + " CT " + cipherText.byteLength + " ";
                        const blob = new Blob([prependString, IniVec, wrappedSymKey, cipherText], { type: 'application/octet-stream' });
                        const dataUrl = URL.createObjectURL(blob);
                        const newFilename = filenameArray[0] + ".enc";
                        chrome.downloads.download({ url: dataUrl, saveAs: true, filename: newFilename, conflictAction: 'uniquify' });
                    });
                });
            });
        });
    }


}

function handleFilesPicked() {
    console.debug("recieved " + this.files.length);
    const filesPicked = this.files;
    for (let filePick of filesPicked) {
        var reader = new FileReader();
        reader.onload = function (event) {
            encryptFile(reader.result, filePick.name);
        };
        reader.readAsArrayBuffer(filePick);
    }
}


function listenForClicks() {
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("button")) {
            console.log("clicked button");
            var ABUserString = getAdBlockString(e.target.textContent);
            browser.runtime.sendMessage({ "userInfoAdBlock": ABUserString }).then( handleResponse, handleError);;
        }
    });
}

function listenForFiles() {
    var inputElement = document.getElementById("inputFile");
    inputElement.addEventListener("change", handleFilesPicked, false);

}

listenForFiles();
listenForClicks();