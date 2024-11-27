// content.js

var trenkoHostUrl = null;
var trenkoApiKey = null;
var currentTrenkoSessionStatus = 'checked_out'; // default status is 'checked_out'
const trenkoButtonElementIds = ['checkInElement', 'addToAgendaElement', 'postAgendaElement', 'clockEffortElement', 'addBreakElement', 'checkOutElement', 'cardReportElement'];

// Set up message listener from TrenkoWeb
window.addEventListener('message', receiveMessageFromTrenkoWeb, false);

// ----------------------- Add custom Trenko elements/button -------------------

initializeTrenkoChrome();

function initializeTrenkoChrome() {
    loadTrenkoWebInfo(); // this is an async call
    loadTrenkoSessionStatus();  // this also is an async call

    // Set up MutationObserver to detect card view
    observeCardView();
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

function observeCardView() {
    const targetNode = document.body;
    const observerOptions = {
        childList: true,
        subtree: true,
    };

    let cardOpen = false; // Flag to prevent multiple triggers

    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            // Check for added nodes
            mutation.addedNodes.forEach(function (node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isCardView(node) && !cardOpen) {
                        console.log('TrenkoChrome: Trello card view opened.');
                        cardOpen = true;
                        handleCardView();
                    }
                }
            });

            // Check for removed nodes
            mutation.removedNodes.forEach(function (node) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    if (isCardView(node) && cardOpen) {
                        console.log('TrenkoChrome: Trello card view closed.');
                        cardOpen = false;
                    }
                }
            });
        });
    });

    observer.observe(targetNode, observerOptions);
}

function isCardView(node) {
    if (node.querySelector && node.querySelector('button[data-testid="card-back-labels-button"]')) {
        return true;
    }
    return false;
}

// Function to handle actions when a card-open is detected
function handleCardView() {
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
    let buttonsContainer = getButtonsContainer();

    if (buttonsContainer) {
        var customElementsTree = buildCustomElementsTree(buttonsContainer);
        insertCustomElements(buttonsContainer, customElementsTree);
        addEventListenersToButtons();
        showHideButtonsBasedOnStatus();
    }
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
                        ➕&nbsp; Add to Agenda
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
    trenkoButtonElementIds.forEach(function (buttonId) {
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
    trenkoButtonElementIds.forEach(function (buttonId) {
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
            url = `${trenkoHostUrl}/user/reports/card_efforts?card_id=${cardId}&token=${trenkoApiKey}`;
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
    // Get the current window's position and size
    const wLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const wTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    const wOuterWidth = window.outerWidth || document.documentElement.clientWidth;
    const wOuterHeight = window.outerHeight || document.documentElement.clientHeight;

    // Calculate the new window's dimensions
    const width = wOuterWidth / 1.5;
    const height = wOuterHeight / 2;

    // Calculate the position to center the new window
    const left = wLeft + (wOuterWidth - width) / 2;
    const top = wTop + (wOuterHeight - height) / 2;

    // Assemble the window features string
    const windowFeatures = `width=${width},height=${height},top=${top},left=${left},location=no,resizable=no,status=no,toolbar=no,scrollbars=no`;

    // Open the new window
    const newWindow = window.open(url, '', windowFeatures);

    if (!newWindow) {
        alert('TrenkoChrome: Unable to open TrenkoWeb window. Please allow pop-ups for this site!');
        return;
    }

    // Optional: Focus the new window
    newWindow.focus();
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