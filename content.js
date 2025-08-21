// Content script for car auction analyzer
(function() {
  'use strict';

  let vehicleData = null;
  let isAnalyzing = false;

  // Parse vehicle data when page loads
  function extractVehicleData() {
    try {
      vehicleData = window.VehicleParser ? window.VehicleParser.parse() : null;
      
      if (vehicleData) {
        console.log('Vehicle data extracted:', vehicleData);
        
        // Store the data for popup access
        chrome.runtime.sendMessage({
          type: 'VEHICLE_DATA_EXTRACTED',
          data: vehicleData
        });

        // Add visual indicator that extension is active
        addAnalysisButton();
      }
    } catch (error) {
      console.error('Error extracting vehicle data:', error);
    }
  }

  // Add a floating analysis button to the page
  function addAnalysisButton() {
    // Remove existing button if present
    const existingButton = document.getElementById('auction-ai-analyzer-btn');
    if (existingButton) {
      existingButton.remove();
    }

    const button = document.createElement('div');
    button.id = 'auction-ai-analyzer-btn';
    button.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #020308ea 0%, #eb3737 100%);
        color: white;
        padding: 12px 16px;
        border-radius: 25px;
        cursor: pointer;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        outline: none;
      " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.3)'" 
         onmouseout="this.style.transform='translateY(0px)'; this.style.boxShadow='0 4px 15px rgba(0,0,0,0.2)'">
        <span id="btn-text">Vehicle Analysis</span>
        <div id="loading-spinner" style="display: none; width: 16px; height: 16px;">
          <div style="
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    button.addEventListener('click', handleAnalysisClick);
    document.body.appendChild(button);
  }

  // Handle analysis button click
  function handleAnalysisClick() {
    if (isAnalyzing) return;

    isAnalyzing = true;
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('loading-spinner');
    
    if (btnText) btnText.textContent = 'Analyzing...';
    if (spinner) spinner.style.display = 'block';

    // Re-extract data in case page has updated
    vehicleData = window.VehicleParser ? window.VehicleParser.parse() : null;

    if (!vehicleData || !vehicleData.title) {
      showNotification('Unable to extract vehicle data from this page', 'error');
      resetButton();
      return;
    }

    // Send analysis request to background script
    chrome.runtime.sendMessage({
      type: 'ANALYZE_VEHICLE',
      data: vehicleData
    }, (response) => {
      resetButton();
      
      if (response && response.success) {
        showNotification('Analysis complete! Check the extension popup.', 'success');
      } else {
        showNotification(response?.error || 'Analysis failed', 'error');
      }
    });
  }

  function resetButton() {
    isAnalyzing = false;
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('loading-spinner');
    
    if (btnText) btnText.textContent = 'AI Analysis';
    if (spinner) spinner.style.display = 'none';
  }

  // Show notification to user
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10001;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;

    if (type === 'success') {
      notification.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
      notification.style.color = 'white';
    } else if (type === 'error') {
      notification.style.background = 'linear-gradient(135deg, #f44336, #da190b)';
      notification.style.color = 'white';
    } else {
      notification.style.background = 'linear-gradient(135deg, #2196F3, #0b7dda)';
      notification.style.color = 'white';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }

  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_VEHICLE_DATA') {
      // Re-extract fresh data
      vehicleData = window.VehicleParser ? window.VehicleParser.parse() : null;
      sendResponse({ data: vehicleData });
    }
    
    if (request.type === 'TRIGGER_ANALYSIS') {
      handleAnalysisClick();
      sendResponse({ success: true });
    }
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractVehicleData);
  } else {
    extractVehicleData();
  }

  // Re-extract data when page changes (for SPAs)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(extractVehicleData, 1000); // Wait for page to settle
    }
  }).observe(document, { subtree: true, childList: true });

})();
