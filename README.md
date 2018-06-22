--------------------------------------------------------------------------------
Copyright (c) 2018, ETH Zurich.
All rights reserved.

This file is distributed under the terms in the attached LICENSE file.
If you do not find this file, copies can be found by writing to:
ETH Zurich D-INFK, Universitaetsstrasse 6, CH-8092 Zurich. Attn: Systems Group.

--------------------------------------------------------------------------------

Description
=======
Summary
-------
### What this extension does
- Record every time your browser makes contact towards a url. This is very close to a browsing history, with a few more technical data being recorded.
- Allow to write the recorded data to a text file.
- Enable to encrypt a file such that our private key is required to decrypt it.

### What this extension doesn't do
- Transmit your data to anyone: the data is stored locally. Your are free to share or not to share the generated data.
- Record the content of the requests: the recording limits itself meta data (urls, a time stamp, and the generic type of data being loaded)

Detailed description
--------------------
The WebExtension uses the [webRequest API](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest) to register all outgoing requests.

On Firefox: 
- [Before every webRequest](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest) it stores the following [details](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/webRequest/onBeforeRequest#details) in the [extension's local storage](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/storage/local)
    - the timestamp, 
    - the originUrl,  (URL of the resource that triggered this request. Note that this may not be the same as the URL of the page into which the requested resource will be loaded)
    - the url, the target of the request in the local persistent storage of the extension. 
    - the type, the type of resource being requested
- When saving to file, the following information (meta-data) is gathered:
    - If the user specified using an ad-blocker
    - The browser name (Firefox)
    - The browser version
    - The extension version

When pressing the toolbar button, a popup shows up, allowing the user to specify whether he is using an AdBlock or not. The data gathered is retrieved from the local storage, translated into a file using the downloads API and saved in the directory chosen by the user. After saving to file, the local storage is wiped.

Currently the output format is one line per request, with the details separated by a whitespace. After the requests, three lines specify the meta-data

On the Chrome version, the following differences exist:
- the initiator of the request is saved instead of the originUrl
- the extension tries to detect AdBlock and saves the result in the meta- data
