// content.js


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

// Function to handle actions when a card is detected
function handleCardView() {
    console.log('Trello card view detected.');
    addCustomButtonsToCard();
}

// Function to add custom buttons to the Trello card
function addCustomButtonsToCard() {
    let buttonsContainer = null;

    setTimeout(function () {
        buttonsContainer = getButtonsContainer();

        if (buttonsContainer) {
            var customElementsTree = buildCustomElementsTree(buttonsContainer);
            insertCustomElements(buttonsContainer, customElementsTree);
        }
    }, 2000);
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
        <hgroup class="${hgroupClass}">
            <h4 class="${h4Class}">Trenko Actions</h4>
        </hgroup>
        <ul class="${ulClass}">
            <li class="${liClass}">
                <button class="${buttonClass}" type="button">Check-In</button>
            </li>
            <li class="">
                <button class="${buttonClass}" type="button">Check-Out</button>
            </li>
            <li class="">
                <button class="${buttonClass}" type="button">Clock Effort</button>
            </li>
        </ul>
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


// Developer notes:
// window location change event?? or implement mutation observer to detect card open??
// a function to wait for buttons container to load??