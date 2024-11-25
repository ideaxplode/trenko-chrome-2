// content.js

var trenkoHostUrl = null;
var trenkoApiKey = null;

// Set up message listener from TrenkoWeb
window.addEventListener('message', receiveMessageFromTrenkoWeb, false);

var currentTrenkoSessionStatus = null;

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
            console.log('TrenkoChrome: TrenkoWeb info loaded from options.')
        }
    });
}

function loadTrenkoSessionStatus() {
    if (currentTrenkoSessionStatus) {
        return; // Do nothing if session status is already loaded
    }

    // Load session status from Chrome storage
    chrome.storage.sync.get(['trenkoSessionStatus'], function (items) {
        if (items.trenkoSessionStatus) {
            currentTrenkoSessionStatus = items.trenkoSessionStatus;
        } else {
            currentTrenkoSessionStatus = 'checked_out'; // Default to 'checked_out' if not set
        }

        // After loading, update the button visibility
        showHideButtonsBasedOnStatus();
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
        }
    }, 500);

    showHideButtonsBasedOnStatus(); // Update button visibility after adding the buttons
}

function getButtonsContainer() {
    // Use querySelector to find the button with the specified data-testid
    const button = document.querySelector('button[data-testid="card-back-labels-button"]');

    if (!button) {
        console.warn('Button with data-testid not found.');
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
                <li class="${liClass}">
                    <button id="checkInButton" class="${buttonClass} check-in-button" type="button" style="display: none;">
                        Check-In
                    </button>
                </li>
                <li class="${liClass}">
                    <button id="addToAgendaButton" class="${buttonClass} add-to-agenda-button" type="button" style="display: none;">
                        Add to Agenda
                    </button>
                </li>
                <li class="${liClass}">
                    <button id="postAgendaButton" class="${buttonClass} post-agenda-button" type="button" style="display: none;">
                        Post Agenda
                    </button>
                </li>
                <li class="${liClass}">
                    <button id="clockEffortButton" class="${buttonClass} clock-effort-button" type="button" style="display: none;">
                        Clock Effort
                    </button>
                </li>
                <li class="${liClass}">
                    <button id="addBreakButton" class="${buttonClass} add-break-button" type="button" style="display: none;">
                        Add Break
                    </button>
                </li>
                <li class="${liClass}">
                    <button id="checkOutButton" class="${buttonClass} check-out-button" type="button" style="display: none;">
                        Check-Out
                    </button>
                </li>
                <hr>
                <li class="${liClass}">
                    <button id="cardReportButton" class="${buttonClass} card-report-button" type="button" style="display: none;">
                        Card Report
                    </button>
                </li>
            </ul>
        </div>
        </br>
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
    const buttonsList = ["checkInButton", "addToAgendaButton", "postAgendaButton", "clockEffortButton", "addBreakButton", "checkOutButton", "cardReportButton"];

    buttonsList.forEach(function (buttonId) {
        document.getElementById(buttonId).addEventListener('click', handleTrenkoButtonClick);
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
        case 'checkInButton':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/user/work_day/new?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        case 'addToAgendaButton':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/user/agendas/new?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        case 'postAgendaButton':
            url = `${trenkoHostUrl}/user/agendas?token=${trenkoApiKey}`;
            break;
        case 'clockEffortButton':
            cardId = getCurrentTrelloCardId();
            url = `${trenkoHostUrl}/user/effort_entries/new?card_id=${cardId}&token=${trenkoApiKey}`;
            break;
        case 'addBreakButton':
            url = `${trenkoHostUrl}/user/break_entries/new?token=${trenkoApiKey}`;
            break;
        case 'checkOutButton':
            url = `${trenkoHostUrl}/user/work_day?token=${trenkoApiKey}`;
            break;
        case 'cardReportButton':
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

    if (event.data && event.data.type) {
        console.log('TrenkoChrome: Received message from TrenkoWeb:', event.data);

        setTrenkoSessionStatus(event.data.type.trim());
    }
}

function setTrenkoSessionStatus(statusString) {
    if (currentTrenkoSessionStatus === statusString) {
        return; // Do nothing if the status hasn't changed
    }

    currentTrenkoSessionStatus = statusString;

    // Persist session status in Chrome storage
    chrome.storage.sync.set({ 'trenkoSessionStatus': currentTrenkoSessionStatus }, function () {
        console.log('TrenkoChrome: Session status saved as', currentTrenkoSessionStatus);
    });

    // Update the button visibility based on the new status
    showHideButtonsBasedOnStatus();
}

function showHideButtonsBasedOnStatus() {
    const allButtonIds = [
        'checkInButton',
        'addToAgendaButton',
        'postAgendaButton',
        'clockEffortButton',
        'addBreakButton',
        'checkOutButton',
        'cardReportButton'
    ];

    let visibleButtonIds = [];

    switch (currentTrenkoSessionStatus) {
        case 'checked_out':
            visibleButtonIds = ['checkInButton', 'cardReportButton'];
            break;
        case 'checked_in':
            visibleButtonIds = ['addToAgendaButton', 'postAgendaButton', 'cardReportButton'];
            break;
        case 'agenda_posted':
            visibleButtonIds = ['clockEffortButton', 'addBreakButton', 'checkOutButton', 'cardReportButton'];
            break;
        default:
            // Handle any unexpected status by showing only the Card Report button
            visibleButtonIds = ['cardReportButton'];
            break;
    }

    // Iterate and set visibility for each button
    allButtonIds.forEach(function(buttonId) {
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

// ------------------------------------------------------------------


// Developer notes:
// use mutation observer??