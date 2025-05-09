function showStatus(message, type = 'loading') {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        statusDiv.style.display = 'block';
    }
}

function hideStatus() {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.style.display = 'none';
    }
}

async function showSuccessIcon() {
    try {
        await chrome.action.setIcon({
            path: chrome.runtime.getURL("images/icon128_success.png")
        });

        setTimeout(async () => {
            try {
                await chrome.action.setIcon({
                    path: chrome.runtime.getURL("images/icon128.png")
                });
            } catch (error) {
                console.error('恢复图标失败:', error);
            }
        }, 3000);
    } catch (error) {
        console.error('设置成功图标失败:', error);
    }
}

function clearSummaryPreview() {
    const summaryPreview = document.getElementById('summaryPreview');
    const summaryText = document.getElementById('summaryText');
    const pageTitle = document.getElementById('pageTitle');
    const pageUrl = document.getElementById('pageUrl');

    if (summaryPreview) {
        summaryPreview.style.display = 'none';
    }
    if (summaryText) {
        summaryText.value = '';
    }
    if (pageTitle) {
        pageTitle.textContent = '';
    }
    if (pageUrl) {
        pageUrl.textContent = '';
    }
}

async function showSummaryPreview(tempData) {
    if (tempData && tempData.summary) {
        document.getElementById('summaryPreview').style.display = 'block';
        document.getElementById('summaryText').value = tempData.summary;
        if (tempData.title) {
            document.getElementById('pageTitle').textContent = tempData.title;
        }
        if (tempData.url) {
            document.getElementById('pageUrl').textContent = tempData.url;
        }
    }
}

function initializeUIListeners() {
    document.querySelectorAll('.tablinks').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.getAttribute('data-tab');

            document.querySelectorAll('.tabcontent').forEach(content => {
                content.style.display = 'none';
            });

            document.querySelectorAll('.tablinks').forEach(btn => {
                btn.classList.remove('active');
            });

            document.getElementById(tabName).style.display = 'block';
            e.target.classList.add('active');
        });
    });

    document.querySelectorAll('.toggle-visibility').forEach(button => {
        button.addEventListener('click', function () {
            const input = this.previousElementSibling;
            if (input) {
                input.classList.toggle('visible');
                this.textContent = input.classList.contains('visible') ? '🔒' : '👁️';
            }
        });
    });
}

export {
    showStatus,
    hideStatus,
    showSuccessIcon,
    clearSummaryPreview,
    showSummaryPreview,
    initializeUIListeners
}; 