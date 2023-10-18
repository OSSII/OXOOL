# OxOffice Online

## Key features
* View and edit text documents, spreadsheets, presentations & more
* Collaborative editing features
* Works in any modern browser – no plugin needed
* Open Source – primarily under the [MPLv2](http://mozilla.org/MPL/2.0/) license. Some parts are under other open source licences, see e.g. [browser/LICENSE](https://github.com/CollaboraOnline/online/blob/master/browser/LICENSE).

## Website

For many more details, build instructions, downloads and more please visit https://collaboraonline.github.io/

## Developer assistance
Please ask your questions on any of the bridged IRC/Matrix/Telegram rooms
* IRC: `#oxool-dev` on `irc.libera.chat` 
* Matrix: [#oxool-dev:libera.chat](https://app.element.io/#/room/#oxool-dev:libera.chat)
* Telegram: [CollaboraOnline](https://t.me/CollaboraOnline)

Join the conversation on our Discourse server at https://forum.collaboraonline.com/

Watch the tinderbox status (if it's green) at
https://cpci.cbg.collabora.co.uk:8080/job/Tinderbox%20for%20online%20master%20against%20co-22.05/

## Development bits

This project has several components:
* **wsd/**
  * The Web Services Daemon - which accepts external connections
* **kit/**
  * The client which lives in its own chroot and renders documents
* **common/**
  * Shared code between these processes
* **browser/**
  * The client side JavaScript component
* **test/**
  * C++ based unit tests
* **cypress_test/**
  * JavaScript based integration tests

## Further recommended reading with build details

Please consult the README files in the component's directory for more details:
- **[wsd/README](wsd)**
- **[browser/README](browser)**

## iOS and Android apps

See the corresponding READMEs:
* **[ios/README](ios)**
* **[android/README](android)**

## GitPod

Head over to https://collaboraonline.github.io/post/build-code/ select gitpod from the dropdown and follow the steps.

Interesting things to keep in mind:
- Make sure your browser is not blocking windows/tabs from opening from the gitpod workspace URL (maybe add `*.gitpod.io` to your browser's whitelist)
  - The GitPod tasks will run automatically and further instructions will be printed out right in the terminal
  - VNC tab will open automatically if not just click on the left icon `Remote explorer` and click `6080`. You will see a tab completely black, that's normal.
  - As mentioned in those instructions if you are not using the VS Code desktop and if you are only relying on your browser please:
    - Do not try to click the URL from the make run out put instead copy that URL and execute `firefox [paste URL here]`
    - Head over to the tab where the VNC is opened (black page), you will see Firefox opening there, maximize and have fun.
    - You can also run cypress tests via GitPod but you will need to use Firefox, for that just prepend `CYPRESS_BROWSER="firefox"` to the desired command. Example: `CYPRESS_BROWSER="firefox" make check` for every test or `CYPRESS_BROWSER="firefox" make check-desktop spec=impress/scrolling_spec.js` for one specific test on desktop

## Enjoy!
