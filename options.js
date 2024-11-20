// Function to save options to Chrome storage
function saveOptions() {
    const trenkoApiKey = document.getElementById('trenkoApiKey').value;
    const trenkoHostUrl = document.getElementById('trenkoHostUrl').value;

    chrome.storage.sync.set({
        trenkoApiKey: trenkoApiKey,
        trenkoHostUrl: trenkoHostUrl
    }, () => {
        // Update status to let the user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved!';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    });
}

// Function to restore options from Chrome storage
function restoreOptions() {
    chrome.storage.sync.get({
        trenkoApiKey: '',
        trenkoHostUrl: ''
    }, (items) => {
        document.getElementById('trenkoApiKey').value = items.trenkoApiKey;
        document.getElementById('trenkoHostUrl').value = items.trenkoHostUrl;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
