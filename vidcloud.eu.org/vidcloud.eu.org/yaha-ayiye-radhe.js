// Optimized & Lightweight Telegram Popup Script - FIXED ICON
function createTelegramPopup() {
    // Clean and minified CSS with forced visibility for Icon
    const styles = `
        <style id="join-tg-popup-styles">
            #join-tg-popup-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
                display: flex; justify-content: center; align-items: center; z-index: 999999;
                font-family: Arial, sans-serif;
            }
            #join-tg-popup-container {
                background: var(--card-bg, #ffffff) !important; border-radius: 16px;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2); padding: 30px;
                max-width: 400px; width: 90%; position: relative; text-align: center;
                animation: join-tg-popup-slideIn 0.3s ease-out;
                border: 1px solid var(--card-border, rgba(0, 0, 0, 0.1)) !important;
                color: var(--text-primary, #333333) !important;
            }
            #join-tg-popup-close-btn {
                position: absolute; top: 15px; right: 15px; background: #dadada; color: #333;
                border: none; width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
                font-size: 18px; font-weight: bold; display: flex; justify-content: center;
                align-items: center; transition: 0.2s ease; line-height: 1;
            }
            #join-tg-popup-close-btn:hover { background: #ff4757; color: white; transform: scale(1.1); }
            
            /* Icon Container */
            #join-tg-popup-icon {
                width: 70px; height: 70px; background-color: var(--primary-color, #0088cc) !important;
                border-radius: 50%; margin: 0 auto 20px; display: flex;
                justify-content: center; align-items: center;
                box-shadow: 0 8px 25px rgba(0, 136, 204, 0.3);
            }
            
            /* FORCED SVG VISIBILITY - Fixed here */
            #join-tg-popup-icon svg {
                width: 40px; height: 40px;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            #join-tg-popup-icon svg path {
                fill: #ffffff !important; /* Force icon color to white */
            }
            
            #join-tg-popup-title { font-size: 22px; font-weight: bold; margin-bottom: 10px; margin-top: 0; }
            #join-tg-popup-description { font-size: 15px; color: #555; margin-bottom: 25px; line-height: 1.5; margin-top: 0; }
            
            #join-tg-popup-btn {
                background: var(--primary-color, #0088cc) !important; color: white !important; border: none;
                padding: 12px 28px; font-size: 16px; font-weight: 600; border-radius: 8px;
                cursor: pointer; transition: 0.2s ease; text-decoration: none; display: inline-block;
                box-shadow: 0 4px 15px rgba(0, 136, 204, 0.3); text-transform: uppercase; letter-spacing: 0.5px;
            }
            #join-tg-popup-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 136, 204, 0.4); }
            
            #join-tg-popup-mute-link {
                background: none !important; color: #888 !important; padding: 0;
                font-size: 13px; cursor: pointer; transition: 0.2s ease; font-weight: normal;
                text-decoration: underline; display: inline-block; margin-top: 20px; border: none;
            }
            #join-tg-popup-mute-link:hover { color: #ff4757 !important; }
            
            .join-tg-popup-hidden { display: none !important; }
            
            @keyframes join-tg-popup-slideIn {
                from { transform: scale(0.9) translateY(-20px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
            
            @media (max-width: 480px) {
                #join-tg-popup-container { padding: 30px 20px; }
                #join-tg-popup-title { font-size: 19px; }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);

    // Clean HTML Structure with robust SVG
    const popupHTML = `
        <div id="join-tg-popup-overlay" class="join-tg-popup-hidden">
            <div id="join-tg-popup-container">
                <button id="join-tg-popup-close-btn" onclick="closeTelegramPopup()">×</button>
                
                <div id="join-tg-popup-icon">
                    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        <path d="M50 100a50 50 0 1 1 50-50 50.057 50.057 0 0 1-50 50Zm25.59-67.433a3.468 3.468 0 0 0-3.329-1.282l-51.523 19.866a3.473 3.473 0 0 0-.256 6.381l14.394 5.92 3.844 12.316a3.46 3.46 0 0 0 5.679.916l6.63-7.518L65.01 79.525a3.476 3.476 0 0 0 5.46-1.78l10.45-48.4a3.468 3.468 0 0 0-.33-2.778ZM41.411 63.858 37.8 74.072 34.3 62.1 63.023 41.74l-21.612 22.118Z"/>
                    </svg>
                </div>
                
                <h2 id="join-tg-popup-title">Join Our Telegram</h2>
                <p id="join-tg-popup-description">Join our community for instant notifications, support, and updates.</p>
                
                <a href="#" target="_blank" id="join-tg-popup-btn" onclick="closeTelegramPopup()">
                    Join Now
                </a>
                <br>
                <button id="join-tg-popup-mute-link" onclick="muteTelegramPopup()">
                    Don't show again for 24 hours
                </button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', popupHTML);
}

// Show popup
function showTelegramPopup() {
    const popup = document.getElementById('join-tg-popup-overlay');
    if (popup) {
        popup.classList.remove('join-tg-popup-hidden');
        document.body.style.overflow = 'hidden';
    }
}

// Close popup
function closeTelegramPopup() {
    const popup = document.getElementById('join-tg-popup-overlay');
    if (popup) {
        popup.classList.add('join-tg-popup-hidden');
        document.body.style.overflow = 'auto';
    }
}

// Mute popup for 24 Hours
function muteTelegramPopup() {
    const expiryTimestamp = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours
    localStorage.setItem("join_tg_popup_mute_until", expiryTimestamp);
    closeTelegramPopup();
}

// Initialize
function initTelegramPopup(options = {}) {
    const config = {
        autoShow: true,
        autoShowDelay: 1500,
        telegramUrl: atob('aHR0cHM6Ly90Lm1lL3N0dWR5c3Rhcms='), // base64 encoded URL
        ...options
    };

    // Check if muted
    const muteUntil = localStorage.getItem("join_tg_popup_mute_until");
    if (muteUntil && Date.now() < parseInt(muteUntil, 10)) {
        return;
    }

    if (!document.getElementById('join-tg-popup-overlay')) {
        createTelegramPopup();

        // Update URL
        const telegramLink = document.getElementById('join-tg-popup-btn');
        if (telegramLink && config.telegramUrl) telegramLink.href = config.telegramUrl;

        const popup = document.getElementById('join-tg-popup-overlay');

        // Event Listeners
        popup.addEventListener('click', e => {
            if (e.target === popup) closeTelegramPopup();
        });
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeTelegramPopup();
        });
        document.getElementById('join-tg-popup-container').addEventListener('click', e => e.stopPropagation());

        // Auto show trigger
        if (config.autoShow) {
            setTimeout(showTelegramPopup, config.autoShowDelay);
        }
    }
}

// Load Script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initTelegramPopup());
} else {
    initTelegramPopup();
}