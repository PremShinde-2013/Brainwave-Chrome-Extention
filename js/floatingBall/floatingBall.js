// floatingBallState.js content
const ballState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    startRight: 0,
    startBottom: 0,
    isProcessing: false
};

function getState() {
    return ballState;
}

function updateState(newState) {
    Object.assign(ballState, newState);
    return ballState;
}

async function loadPosition() {
    try {
        const result = await chrome.storage.local.get('floatingBallPosition');
        return result.floatingBallPosition || {
            right: '20px',
            bottom: '20px'
        };
    } catch (error) {
        console.error('Failed to load floating ball position:', error);
        return {
            right: '20px',
            bottom: '20px'
        };
    }
}

async function savePosition(position) {
    try {
        await chrome.storage.local.set({ floatingBallPosition: position });
    } catch (error) {
        console.error('Failed to save floating ball position:', error);
    }
}

// floatingBallUI.js content
function createFloatingBallStyle() {
    const style = document.createElement('style');
    style.textContent = `
        #blinko-floating-ball {
            position: fixed;
            width: min(50px, 5vw);
            height: min(50px, 5vw);
            cursor: move;
            z-index: 10000;
            user-select: none;
            touch-action: none;
        }

        .ball-icon {
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: black;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.5s ease;
        }

        .ball-icon img {
            width: 75%;
            height: 75%;
            transition: transform 0.5s ease;
            filter: brightness(1);
        }

        .loading-circle {
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border: 2px solid transparent;
            border-top-color: #4CAF50;
            border-radius: 50%;
            display: none;
            animation: spin 1s linear infinite;
        }

        .loading-circle.reverse {
            border-top-color: #C35AF7;
            animation: spin-reverse 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        @keyframes spin-reverse {
            0% { transform: rotate(360deg); }
            100% { transform: rotate(0deg); }
        }

        .processing .loading-circle {
            display: block;
        }

        .success .ball-icon img {
            transform: rotateY(180deg);
        }

        @media (max-width: 768px) {
            #blinko-floating-ball {
                width: min(40px, 8vw);
                height: min(40px, 8vw);
            }
        }
    `;
    return style;
}

function createFloatingBallElement() {
    const ball = document.createElement('div');
    ball.id = 'blinko-floating-ball';
    ball.innerHTML = `
        <div class="ball-icon">
            <img src="${chrome.runtime.getURL('images/icon128.png')}" alt="Blinko">
        </div>
        <div class="loading-circle"></div>
    `;
    return ball;
}

function setFloatingBallPosition(ball, position) {
    Object.assign(ball.style, position);
}

function showLoadingState(ball, isRightClick = false) {
    ball.classList.add('processing');
    const loadingCircle = ball.querySelector('.loading-circle');
    if (loadingCircle) {
        if (isRightClick) {
            loadingCircle.classList.add('reverse');
        } else {
            loadingCircle.classList.remove('reverse');
        }
    }
}
function hideLoadingState(ball) {
    ball.classList.remove('processing');
}

function showSuccessState(ball) {
    ball.classList.remove('processing');
    ball.classList.add('success');
    const iconImg = ball.querySelector('img');
    iconImg.src = chrome.runtime.getURL('images/icon128_success_reverse.png');
}

function resetState(ball) {
    ball.classList.remove('success', 'processing');
    const iconImg = ball.querySelector('img');
    iconImg.src = chrome.runtime.getURL('images/icon128.png');
}

function removeFloatingBall() {
    const ball = document.getElementById('blinko-floating-ball');
    if (ball) {
        ball.remove();
    }
}

// floatingBallHandler.js content
function handleDragStart(e, ball) {
    const state = getState();
    if (state.isProcessing) return;

    updateState({
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY
    });

    const rect = ball.getBoundingClientRect();
    updateState({
        startRight: window.innerWidth - rect.right,
        startBottom: window.innerHeight - rect.bottom
    });

    ball.style.transition = 'none';
}

function handleDragMove(e, ball) {
    const state = getState();
    if (!state.isDragging) return;

    const deltaX = state.startX - e.clientX;
    const deltaY = state.startY - e.clientY;

    const newRight = state.startRight + deltaX;
    const newBottom = state.startBottom + deltaY;

    ball.style.right = newRight + 'px';
    ball.style.bottom = newBottom + 'px';
}

function handleDragEnd(ball) {
    const state = getState();
    if (!state.isDragging) return;

    updateState({ isDragging: false });
    ball.style.transition = 'transform 0.5s ease';

    // Save new position
    const position = {
        right: ball.style.right,
        bottom: ball.style.bottom
    };
    savePosition(position);
}

async function handleClick(ball, isRightClick = false) {
    const state = getState();
    if (state.isDragging || state.isProcessing) return;

    updateState({ isProcessing: true });
    showLoadingState(ball, isRightClick);

    try {
        // Get page content
        const content = extractPageContent();
        const metadata = getPageMetadata();

        // Send message to background script for processing
        const response = await chrome.runtime.sendMessage({
            action: 'processAndSendContent',
            content: content,
            title: metadata.title,
            url: metadata.url,
            isExtractOnly: isRightClick  // Mark if only extracting content
        });

        if (response && response.processing) {
            // Wait for actual response
            return;  // Background will handle the rest of the process
        } else {
            throw new Error('Request processing failed');
        }
    } catch (error) {
        console.error('Error processing content:', error);
        resetState(ball);
        updateState({ isProcessing: false });
        // Show error notification
        chrome.runtime.sendMessage({
            action: 'showNotification',
            type: 'error',
            title: 'Operation failed',
            message: error.message
        });
    }
}

function initializeEventListeners(ball) {
    // Handle drag
    ball.addEventListener('mousedown', e => {
        if (e.button === 0) { // Left click
            handleDragStart(e, ball);
        }
    });
    document.addEventListener('mousemove', e => handleDragMove(e, ball));
    document.addEventListener('mouseup', () => handleDragEnd(ball));

    // Handle click
    ball.addEventListener('click', () => handleClick(ball, false));  // Left click
    ball.addEventListener('contextmenu', (e) => {
        e.preventDefault();  // Prevent default right-click menu
        handleClick(ball, true);  // Right-click
    });
}

// Main logic
async function createFloatingBall() {
    try {
        // Check if floating ball is enabled
        const result = await chrome.storage.sync.get('settings');
        const settings = result.settings || {};
        if (settings.enableFloatingBall === false) {
            return;
        }

        // Add styles
        const style = createFloatingBallStyle();
        document.head.appendChild(style);

        // Create floating ball element
        const ball = createFloatingBallElement();

        // Get position from storage
        const position = await loadPosition();
        setFloatingBallPosition(ball, position);

        // Add to the page
        document.body.appendChild(ball);

        // Initialize event listeners
        initializeEventListeners(ball);
    } catch (error) {
        console.error('Error creating floating ball:', error);
    }
}

function initializeMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateFloatingBallState') {
            const ball = document.getElementById('blinko-floating-ball');
            if (!ball) return;

            if (request.enabled === false) {
                removeFloatingBall();
            } else if (request.success !== undefined) {
                // Process summary result
                if (request.success) {
                    showSuccessState(ball);
                    // Reset after 3 seconds
                    setTimeout(() => {
                        resetState(ball);
                        updateState({ isProcessing: false });
                    }, 3000);
                } else {
                    resetState(ball);
                    updateState({ isProcessing: false });
                    // Optionally show error message
                    console.error('Summary failed:', request.error);
                }
            } else if (!document.getElementById('blinko-floating-ball')) {
                createFloatingBall();
            }
        }
    });
}

// Initialize
async function initialize() {
    initializeMessageListener();
    await createFloatingBall();
}

// Export needed functions
window.initialize = initialize;
