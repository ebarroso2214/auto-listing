// Popup JavaScript for Car Auction Analyzer
document.addEventListener('DOMContentLoaded', async function() {
  // DOM elements
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const closeSettings = document.getElementById('close-settings');
  const openSettingsBtn = document.getElementById('open-settings-btn');
  const mainContent = document.getElementById('main-content');
  
  // State panels
  const noApiKeyPanel = document.getElementById('no-api-key');
  const noVehiclePanel = document.getElementById('no-vehicle');
  const vehicleInfoPanel = document.getElementById('vehicle-info');
  const analysisResultsPanel = document.getElementById('analysis-results');
  const loadingStatePanel = document.getElementById('loading-state');
  const errorStatePanel = document.getElementById('error-state');
  
  // Settings elements
  const apiKeyInput = document.getElementById('api-key');
  const toggleKeyVisibility = document.getElementById('toggle-key-visibility');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const keyStatus = document.getElementById('key-status');
  
  // Action buttons
  const analyzeBtn = document.getElementById('analyze-btn');
  const refreshAnalysisBtn = document.getElementById('refresh-analysis');
  const retryAnalysisBtn = document.getElementById('retry-analysis');
  
  let currentVehicleData = null;
  let isAnalyzing = false;

  // Initialize popup
  await initialize();

  async function initialize() {
    try {
      // Check API key status
      const apiKeyStatus = await checkApiKeyStatus();
      updateApiKeyStatus(apiKeyStatus);
      
      // If no API key, show settings requirement
      if (!apiKeyStatus.hasApiKey) {
        showPanel('no-api-key');
        return;
      }
      
      // Get current tab and check for vehicle data
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        showPanel('no-vehicle');
        return;
      }
      
      // Try to get vehicle data from content script
      await loadVehicleData(tab);
      
      // Check for existing analysis
      await loadExistingAnalysis();
      
    } catch (error) {
      console.error('Initialization error:', error);
      showPanel('no-vehicle');
    }
  }

  async function checkApiKeyStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_API_KEY_STATUS' }, (response) => {
        resolve(response || { hasApiKey: false });
      });
    });
  }

  function updateApiKeyStatus(status) {
    if (status.hasApiKey) {
      keyStatus.textContent = `Configured: ${status.keyPreview}`;
      keyStatus.style.color = '#28a745';
    } else {
      keyStatus.textContent = 'No API key configured';
      keyStatus.style.color = '#dc3545';
    }
  }

  async function loadVehicleData(tab) {
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tab.id, { type: 'GET_VEHICLE_DATA' }, (response) => {
          // Check for chrome.runtime.lastError
          if (chrome.runtime.lastError) {
            console.log('Content script not available:', chrome.runtime.lastError.message);
            showPanel('no-vehicle');
            resolve(false);
            return;
          }
          
          if (response && response.data) {
            currentVehicleData = response.data;
            displayVehicleInfo(response.data);
            resolve(true);
          } else {
            showPanel('no-vehicle');
            resolve(false);
          }
        });
      } catch (error) {
        console.error('Error loading vehicle data:', error);
        showPanel('no-vehicle');
        resolve(false);
      }
    });
  }


  async function loadExistingAnalysis() {
    chrome.runtime.sendMessage({ type: 'GET_LAST_ANALYSIS' }, (response) => {
      if (response && response.analysis && response.analysis.success) {
        displayAnalysisResults(response.analysis);
      }
    });
  }

  function displayVehicleInfo(vehicleData) {
    document.getElementById('vehicle-title').textContent = vehicleData.title || 'Unknown Vehicle';
    document.getElementById('vehicle-year').textContent = vehicleData.year || 'Unknown';
    document.getElementById('vehicle-mileage').textContent = vehicleData.mileage ? 
      vehicleData.mileage.toLocaleString() + ' miles' : 'Unknown';
    document.getElementById('vehicle-price').textContent = vehicleData.currentBid ? 
      '$' + vehicleData.currentBid.toLocaleString() : 'Unknown';
    document.getElementById('vehicle-title-status').textContent = vehicleData.titleStatus || 'Unknown';
    document.getElementById('vehicle-location').textContent = vehicleData.location || 'Unknown';
    
    // Display vehicle image if available
    const imageContainer = document.getElementById('vehicle-image-container');
    const vehicleImage = document.getElementById('vehicle-image');
    
    if (vehicleData.primaryImage) {
      vehicleImage.src = vehicleData.primaryImage;
      vehicleImage.onerror = function() {
        // Hide image container if image fails to load
        imageContainer.classList.add('hidden');
        console.log('Failed to load vehicle image:', vehicleData.primaryImage);
      };
      vehicleImage.onload = function() {
        // Show image container when image loads successfully
        imageContainer.classList.remove('hidden');
        console.log('Successfully loaded vehicle image');
      };
    } else {
      // Hide image container if no image available
      imageContainer.classList.add('hidden');
    }
    
    showPanel('vehicle-info');
  }

  function displayAnalysisResults(analysisData) {
    const analysis = analysisData.analysis;
    
    if (!analysis) {
      // Show raw response if structured analysis failed
      showError('Analysis completed but formatting failed. Please try again.');
      return;
    }

    // Overall score and recommendation with better fallbacks
    document.getElementById('overall-score').textContent = analysis.overallScore || '5';
    
    const recommendationBadge = document.getElementById('recommendation-badge');
    const recommendation = analysis.recommendation || 'PROCEED_WITH_CAUTION';
    recommendationBadge.textContent = recommendation.replace(/_/g, ' ');
    recommendationBadge.className = 'badge ' + recommendation.toLowerCase();
    
    const riskLevel = document.getElementById('risk-level');
    if (analysis.valueProposition && analysis.valueProposition.riskLevel) {
      riskLevel.textContent = `Risk Level: ${analysis.valueProposition.riskLevel}`;
    }

    // Price analysis with better fallbacks
    const priceAnalysis = analysis.priceAnalysis || {};
    
    document.getElementById('analysis-current-bid').textContent = 
      priceAnalysis.currentBid ? '$' + priceAnalysis.currentBid.toLocaleString() : 'Unknown';
    document.getElementById('analysis-market-value').textContent = 
      priceAnalysis.estimatedMarketValue ? '$' + priceAnalysis.estimatedMarketValue.toLocaleString() : 'Unknown';
    
    const priceRating = document.getElementById('price-rating');
    const rating = priceAnalysis.priceRating || 'FAIR';
    priceRating.textContent = rating;
    priceRating.className = 'badge ' + rating.toLowerCase();

    // Condition analysis
    if (analysis.conditionAnalysis) {
      document.getElementById('body-condition').textContent = 
        analysis.conditionAnalysis.bodyCondition || 'No condition information available';
      
      const mechanicalConcerns = document.getElementById('mechanical-concerns');
      if (analysis.conditionAnalysis.mechanicalConcerns && analysis.conditionAnalysis.mechanicalConcerns.length > 0) {
        mechanicalConcerns.innerHTML = '<h6>Mechanical Concerns:</h6><ul>' + 
          analysis.conditionAnalysis.mechanicalConcerns.map(concern => `<li>${concern}</li>`).join('') + '</ul>';
      } else {
        mechanicalConcerns.innerHTML = '<p>No specific mechanical concerns noted.</p>';
      }
      
      const repairEstimate = document.getElementById('repair-estimate');
      if (analysis.conditionAnalysis.repairEstimate && analysis.conditionAnalysis.repairEstimate !== 'N/A') {
        repairEstimate.innerHTML = `<strong>Estimated Repairs:</strong> ${analysis.conditionAnalysis.repairEstimate}`;
        repairEstimate.style.display = 'block';
      } else {
        repairEstimate.style.display = 'none';
      }
    }

    // Pros and cons
    if (analysis.valueProposition) {
      const prosList = document.getElementById('pros-list');
      const consList = document.getElementById('cons-list');
      
      prosList.innerHTML = '';
      consList.innerHTML = '';
      
      if (analysis.valueProposition.pros) {
        analysis.valueProposition.pros.forEach(pro => {
          const li = document.createElement('li');
          li.textContent = pro;
          prosList.appendChild(li);
        });
      }
      
      if (analysis.valueProposition.cons) {
        analysis.valueProposition.cons.forEach(con => {
          const li = document.createElement('li');
          li.textContent = con;
          consList.appendChild(li);
        });
      }
    }

    // Summary
    document.getElementById('analysis-summary').textContent = analysis.summary || 'No summary available';

    // Timestamp
    const timestamp = new Date(analysisData.timestamp).toLocaleString();
    document.getElementById('analysis-timestamp').textContent = `Analyzed: ${timestamp}`;

    showPanel('analysis-results');
  }

  async function analyzeVehicle() {
    if (isAnalyzing || !currentVehicleData) return;
    
    isAnalyzing = true;
    showLoadingState();
    
    // Update button state
    const analyzeText = document.getElementById('analyze-text');
    const analyzeSpinner = document.getElementById('analyze-spinner');
    if (analyzeText) analyzeText.textContent = 'Analyzing...';
    if (analyzeSpinner) analyzeSpinner.classList.remove('hidden');

    chrome.runtime.sendMessage({
      type: 'ANALYZE_VEHICLE',
      data: currentVehicleData
    }, (response) => {
      isAnalyzing = false;
      
      // Reset button state
      if (analyzeText) analyzeText.textContent = 'Analyze with AI';
      if (analyzeSpinner) analyzeSpinner.classList.add('hidden');
      
      if (response && response.success) {
        displayAnalysisResults(response.analysis);
      } else {
        showError(response?.error || 'Analysis failed');
      }
    });
  }

  function showPanel(panelName) {
    // Hide all panels
    [noApiKeyPanel, noVehiclePanel, vehicleInfoPanel, analysisResultsPanel, loadingStatePanel, errorStatePanel]
      .forEach(panel => panel?.classList.add('hidden'));
    
    // Show specific panel
    switch (panelName) {
      case 'no-api-key':
        noApiKeyPanel?.classList.remove('hidden');
        break;
      case 'no-vehicle':
        noVehiclePanel?.classList.remove('hidden');
        break;
      case 'vehicle-info':
        vehicleInfoPanel?.classList.remove('hidden');
        break;
      case 'analysis-results':
        analysisResultsPanel?.classList.remove('hidden');
        break;
      case 'loading':
        loadingStatePanel?.classList.remove('hidden');
        break;
      case 'error':
        errorStatePanel?.classList.remove('hidden');
        break;
    }
  }

  function showLoadingState() {
    showPanel('loading');
  }

  function showError(message) {
    document.getElementById('error-message').textContent = message;
    showPanel('error');
  }

  // Event listeners
  settingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });

  closeSettings.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });

  openSettingsBtn.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });

  toggleKeyVisibility.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
    toggleKeyVisibility.textContent = type === 'password' ? '👁️' : '🙈';
  });

  saveApiKeyBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    saveApiKeyBtn.textContent = 'Saving...';
    saveApiKeyBtn.disabled = true;
    
    chrome.runtime.sendMessage({
      type: 'SET_API_KEY',
      apiKey: apiKey
    }, async (response) => {
      saveApiKeyBtn.textContent = 'Save Key';
      saveApiKeyBtn.disabled = false;
      
      if (response && response.success) {
        const apiKeyStatus = await checkApiKeyStatus();
        updateApiKeyStatus(apiKeyStatus);
        settingsPanel.classList.add('hidden');
        
        // Reinitialize if we now have an API key
        if (apiKeyStatus.hasApiKey) {
          await initialize();
        }
      } else {
        alert('Failed to save API key: ' + (response?.error || 'Unknown error'));
      }
    });
  });

  analyzeBtn.addEventListener('click', analyzeVehicle);
  refreshAnalysisBtn.addEventListener('click', analyzeVehicle);
  retryAnalysisBtn.addEventListener('click', analyzeVehicle);

  // Load existing API key in settings when opened
  settingsPanel.addEventListener('transitionend', async () => {
    if (!settingsPanel.classList.contains('hidden')) {
      // Load current API key (masked)
      const result = await chrome.storage.sync.get(['openaiApiKey']);
      if (result.openaiApiKey) {
        apiKeyInput.value = result.openaiApiKey;
      }
    }
  });
});
