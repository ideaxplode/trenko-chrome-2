// content.js

var trenkoHostUrl = null;
var trenkoApiKey = null;
var currentTrenkoSessionStatus = 'checked_out'; // default status is 'checked_out'
const trenkoButtonElements = ['checkInElement', 'addToAgendaElement', 'postAgendaElement', 'clockEffortElement', 'addBreakElement', 'checkOutElement', 'cardReportElement'];

// Set up message listener from TrenkoWeb
window.addEventListener('message', receiveMessageFromTrenkoWeb, false);

// ----------------------- Add custom Trenko elements/button -------------------

initializeTrenkoChrome();

function initializeTrenkoChrome() {
    loadTrenkoWebInfo(); // this is an async call
    loadTrenkoSessionStatus();  // this also is an async call

    // Initial check
    if (isCardView(window.location.href)) {
        handleCardView();
    }

    // Start monitoring URL changes
    monitorUrlChanges((newUrl) => {
        if (isCardView(newUrl)) {
            handleCardView();
        }
    });
}

function loadTrenkoWebInfo() {
    chrome.storage.sync.get(['trenkoHostUrl', 'trenkoApiKey'], function (values) {
        trenkoHostUrl = values.trenkoHostUrl;
        trenkoApiKey = values.trenkoApiKey;

        if (!trenkoHostUrl || !trenkoApiKey) {
            alert('TrenkoChrome: Please set Trenko\'s Web URL and your Trenko API Key in the extension options. This extension will not work without this! Please reload the Trello page after doing this.');
            return null;
        } else {
            console.log('TrenkoChrome: TrenkoWeb\'s info loaded from extension options.')
        }
    });
}

function loadTrenkoSessionStatus() {
    // Load session status from Chrome storage
    chrome.storage.sync.get(['trenkoSessionStatus'], function (items) {
        if (items.trenkoSessionStatus) {
            currentTrenkoSessionStatus = items.trenkoSessionStatus;
            console.log(`TrenkoChrome: Session status loaded from Chrome storage as: ${currentTrenkoSessionStatus}`)
        }
    });
}

// Function to monitor URL changes
function monitorUrlChanges(callback) {
    let currentUrl = window.location.href;

    setInterval(() => {
        if (currentUrl !== window.location.href) {
            currentUrl = window.location.href;
            callback(currentUrl);
        }
    }, 500); // Check every 500ms
}

// Function to determine if the current URL corresponds to a Trello card view
function isCardView(url) {
    // Trello card URLs typically follow the pattern: https://trello.com/c/{cardID}/{card-title}
    const cardUrlPattern = /^https:\/\/trello\.com\/c\/[^/]+\/.+/;
    return cardUrlPattern.test(url);
}

// Function to handle actions when a card-open is detected
function handleCardView() {
    console.log('TrenkoChrome: Trello card view detected.');

    if (!isTrenkoWebInfoLoaded()) {
        return; // exit by doing nothing
    }

    addCustomButtonsToCard();
}

function isTrenkoWebInfoLoaded() {
    if (!trenkoHostUrl || !trenkoApiKey) {
        loadTrenkoWebInfo();
        return false;
    } else {
        return true;
    }
}

// Function to add custom buttons to the Trello card
function addCustomButtonsToCard() {
    let buttonsContainer = null;

    setTimeout(function () {
        buttonsContainer = getButtonsContainer();

        if (buttonsContainer) {
            var customElementsTree = buildCustomElementsTree(buttonsContainer);
            insertCustomElements(buttonsContainer, customElementsTree);
            addEventListenersToButtons();
            showHideButtonsBasedOnStatus();
        }
    }, 2000);
}

function getButtonsContainer() {
    // Use querySelector to find the button with the specified data-testid
    const button = document.querySelector('button[data-testid="card-back-labels-button"]');

    if (!button) {
        console.warn('TrenkoChrome: Button with data-testid not found.');
        return null;
    }

    // Use the closest() method to find the nearest ancestor <section> element
    const section = button.closest('section');

    if (!section) {
        console.warn('No <section> ancestor found for the button with the data-testid');
        return null;
    }

    return section;
}

function buildCustomElementsTree(buttonsContainer) {
    // Fetch class names that Trello is presently using for the specific elements that we need
    const hgroupClass = buttonsContainer.querySelector("hgroup").className.trim();
    const h4Class = buttonsContainer.querySelector("h4").className.trim();
    const ulClass = buttonsContainer.querySelector("ul").className.trim();
    const liClass = buttonsContainer.querySelector("li").className.trim();
    const buttonClass = buttonsContainer.querySelector("button").className.trim();

    // Compose the custom elements within a div container
    const htmlString = `
        <div class="trenko-buttons-container">
            <hgroup class="${hgroupClass}">
                <h4 class="${h4Class}">Trenko Actions</h4>
            </hgroup>
            <ul class="${ulClass}">
                <li id="checkInElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} check-in-button" type="button">
                        ✅&nbsp; Check-In
                    </button>
                </li>
                <li id="addToAgendaElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} add-to-agenda-button" type="button">
                        ➕&nbsp; ⨭&nbsp; Add to Agenda
                    </button>
                </li>
                <li id="postAgendaElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} post-agenda-button" type="button">
                        📣&nbsp; Post Agenda
                    </button>
                </li>
                <li id="clockEffortElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} clock-effort-button" type="button">
                        ⛳&nbsp; Clock Effort
                    </button>
                </li>
                <li id="addBreakElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} add-break-button" type="button">
                        ☕&nbsp; Add Break
                    </button>
                </li>
                <li id="checkOutElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} check-out-button" type="button">
                        🚪&nbsp; Check-Out
                    </button>
                </li>
                <hr>
                <li id="cardReportElement" class="${liClass}" style="display: none;">
                    <button class="${buttonClass} card-report-button" type="button">
                        📰&nbsp; Effort Report
                    </button>
                </li>
            </ul>
        </div>
        <div style="height: 25px;"></div>
        <hgroup class="${hgroupClass}">
            <h4 class="${h4Class}">Trello Actions</h4>
        </hgroup>
        `;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlString;

    return wrapper;
}

function insertCustomElements(buttonsContainer, customElementsTree) {
    buttonsContainer.insertBefore(customElementsTree, buttonsContainer.firstChild);
}

function addEventListenersToButtons() {
    trenkoButtonElements.forEach(function (buttonId) {
        document.getElementById(buttonId).addEventListener('click', handleTrenkoButtonClick);
    });
}

function showHideButtonsBasedOnStatus() {
    let visibleButtonIds = [];

    switch (currentTrenkoSessionStatus) {
        case 'checked_out':
            visibleButtonIds = ['checkInElement', 'cardReportElement'];
            break;
        case 'checked_in':
            visibleButtonIds = ['addToAgendaElement', 'postAgendaElement', 'cardReportElement'];
            break;
        case 'agenda_posted':
            visibleButtonIds = ['clockEffortElement', 'addBreakElement', 'checkOutElement', 'cardReportElement'];
            break;
        default:
            // Handle any unexpected status by showing only the Card Report button
            visibleButtonIds = ['cardReportElement'];
            break;
    }

    // Iterate and set visibility for each button
    trenkoButtonElements.forEach(function (buttonId) {
        const buttonElement = document.getElementById(buttonId);
        if (buttonElement) {
            if (visibleButtonIds.includes(buttonId)) {
                buttonElement.style.display = 'block';
            } else {
                buttonElement.style.display = 'none';
            }
        }
    });
}

// -----------------------------------------------------------------------

//------------------------ Handle Trenko actions -------------------------

function handleTrenkoButtonClick() {
    if (!isTrenkoWebInfoLoaded()) {
        return; // exit and do nothing
    }

    console.log(`TrenkoChrome: Button with Id ${this.id} clicked.`);

    var url = null;
    var cardId = null;

    switch (this.id) {
        case 'checkInElement':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/user/work_day/new?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        case 'addToAgendaElement':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/user/agendas/new?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        case 'postAgendaElement':
            url = `${trenkoHostUrl}/user/agendas?token=${trenkoApiKey}`;
            break;
        case 'clockEffortElement':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/user/effort_entries/new?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        case 'addBreakElement':
            url = `${trenkoHostUrl}/user/break_entries/new?token=${trenkoApiKey}`;
            break;
        case 'checkOutElement':
            url = `${trenkoHostUrl}/user/work_day?token=${trenkoApiKey}`;
            break;
        case 'cardReportElement':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/reports/card_efforts?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        default:
            console.log('TrenkoChrome: Unknown button clicked;');
    }

    openTrenkoWindow(url);
}

function getCurrentTrelloCardId() {
    const urlParts = window.location.pathname.split('/');
    return urlParts[2];
}

function openTrenkoWindow(url) {
    const windowFeatures = 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no';
    const newWindow = window.open(url, '_blank', windowFeatures);

    if (!newWindow) {
        alert('TrenkoChrome: Unable to open TrenkoWeb window. Please allow pop-ups for this site!');
        return;
    }

    // const checkWindowClosed = setInterval(() => {
    //     if (newWindow.closed) {
    //         clearInterval(checkWindowClosed);
    //         if (callback) callback();
    //     }
    // }, 500);
}

// Function to listen to messages from TrenkoWeb (for updating session status)
function receiveMessageFromTrenkoWeb(event) {
    const trustedOrigin = new URL(trenkoHostUrl).origin;

    if (event.origin !== trustedOrigin) {
        // console.warn('TrenkoChrome: Ignoring message from untrusted origin:', event.origin);
        return;
    }

    if (event.data && event.data.type === 'session' && event.data.values && event.data.values.status) {
        console.log('TrenkoChrome: Received message from TrenkoWeb:', event.data);

        // Extract the session status from the message
        const statusString = event.data.values.status.trim();
        setTrenkoSessionStatus(statusString);
    } else {
        console.warn('TrenkoChrome: Received message with unexpected format:', event.data);
    }
}

function setTrenkoSessionStatus(statusString) {
    if (currentTrenkoSessionStatus === statusString) {
        return; // Do nothing if the status hasn't changed
    }

    currentTrenkoSessionStatus = statusString;

    showHideButtonsBasedOnStatus(); // Update the button visibility based on the new status

    // Persist session status in Chrome storage
    chrome.storage.sync.set({ 'trenkoSessionStatus': currentTrenkoSessionStatus }, function () {
        console.log(`TrenkoChrome: Session status saved as: ${currentTrenkoSessionStatus}`);
    });
}

// ------------------------------------------------------------------


// Developer notes:
// use mutation observer??