// Background service worker for car auction analyzer

// Vehicle analyzer class (included directly to avoid importScripts issues)
class VehicleAnalyzer {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async analyzeVehicle(vehicleData) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const analysisPrompt = this.buildAnalysisPrompt(vehicleData);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: `You are an expert automotive appraiser specializing in auction vehicles. You understand that auction vehicles often have damage, may have MIL (Malfunction Indicator Lamp) codes, and are sold "as-is" without warranties. Your job is to provide realistic assessments considering the auction context.

Key principles:
1. Auction vehicles are typically discounted due to condition issues
2. Minor cosmetic damage is expected and acceptable
3. Some mechanical issues (like MIL codes) can be acceptable depending on severity
4. Focus on value relative to the auction setting, not retail standards
5. Consider repair costs in your analysis
6. Assess if the vehicle is a reasonable purchase given its condition and price

SCORING AND RECOMMENDATION GUIDELINES:
Your overallScore (1-10) and recommendation must be ALIGNED using these thresholds:

• SCORE 8-10 → RECOMMENDATION: "BUY"
  - Exceptional value for auction context
  - Low risk, high reward potential
  - Minor issues only, good price

• SCORE 5-7 → RECOMMENDATION: "PROCEED_WITH_CAUTION" 
  - Acceptable value but has notable risks/issues
  - Could be worthwhile with proper expectations
  - Moderate risk, potential reward

• SCORE 1-4 → RECOMMENDATION: "PASS"
  - Poor value or too risky
  - Major issues, overpriced, or high uncertainty
  - High risk, low reward potential

IMPORTANT: You MUST provide ALL fields in your response. If data is missing, make reasonable estimates or provide your best assessment based on available information. Never leave fields empty or provide null values.

Provide analysis in the following JSON format (return ONLY valid JSON, no additional text):
{
  "overallScore": 1-10,
  "recommendation": "BUY" | "PASS" | "PROCEED_WITH_CAUTION",
  "priceAnalysis": {
    "currentBid": number,
    "estimatedMarketValue": number,
    "auctionValueRange": "$X,XXX - $X,XXX",
    "priceRating": "EXCELLENT" | "GOOD" | "FAIR" | "OVERPRICED"
  },
  "conditionAnalysis": {
    "bodyCondition": "detailed description of condition",
    "mechanicalConcerns": ["list of specific concerns"],
    "acceptableDamage": true|false,
    "repairEstimate": "$X,XXX - $X,XXX estimated repair cost"
  },
  "valueProposition": {
    "pros": ["list of at least 2-3 positives"],
    "cons": ["list of at least 2-3 negatives"],
    "riskLevel": "LOW" | "MEDIUM" | "HIGH"
  },
  "summary": "2-3 sentence summary explaining your recommendation and key factors"
}

Guidelines for estimates when data is missing:
- If current bid is unknown, estimate based on vehicle age/condition
- If market value is unclear, provide range based on similar vehicles
- Always provide a priceRating assessment
- Always provide an overallScore (1-10) that MATCHES your recommendation
- Make reasonable assumptions but state them in your analysis`
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const analysis = data.choices[0]?.message?.content;

      if (!analysis) {
        throw new Error('No analysis received from OpenAI');
      }

      // Try to parse JSON from the response
      try {
        const jsonMatch = analysis.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedAnalysis = JSON.parse(jsonMatch[0]);
          
          // Validate and correct score-recommendation alignment
          const validatedAnalysis = this.validateAndCorrectAnalysis(parsedAnalysis);
          
          return {
            success: true,
            analysis: validatedAnalysis,
            rawResponse: analysis,
            timestamp: Date.now()
          };
        } else {
          // Fallback if JSON parsing fails
          return {
            success: true,
            analysis: null,
            rawResponse: analysis,
            timestamp: Date.now()
          };
        }
      } catch (parseError) {
        return {
          success: true,
          analysis: null,
          rawResponse: analysis,
          timestamp: Date.now()
        };
      }

    } catch (error) {
      console.error('Vehicle analysis error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  buildAnalysisPrompt(vehicleData) {
    const currentYear = new Date().getFullYear();
    const vehicleAge = vehicleData.year ? currentYear - vehicleData.year : 'Unknown';
    
    return `Please analyze this auction vehicle listing:

VEHICLE DETAILS:
- Title/Make/Model: ${vehicleData.title || 'Not specified'}
- Year: ${vehicleData.year || 'Unknown'}
- Age: ${vehicleAge} years
- Mileage: ${vehicleData.mileage ? vehicleData.mileage.toLocaleString() : 'Unknown'} miles
- Current Bid/Price: $${vehicleData.currentBid ? vehicleData.currentBid.toLocaleString() : 'Unknown'}
- Title Status: ${vehicleData.titleStatus || 'Not specified'}
- VIN: ${vehicleData.vin || 'Not provided'}
- Location: ${vehicleData.location || 'Not specified'}
- Auction Site: ${vehicleData.site || 'Unknown'}

DAMAGE/CONDITION:
${vehicleData.damages && vehicleData.damages.length > 0 
  ? vehicleData.damages.join(', ') 
  : 'No specific damage information provided'}

ADDITIONAL CONTEXT:
- This is an auction vehicle, sold "as-is"
- Some cosmetic damage and mechanical issues are expected in this context
- Buyer should factor in repair costs and transportation
- Focus on value relative to auction standards, not retail condition

Please provide a comprehensive analysis considering:
1. Price competitiveness for auction context
2. Age vs. mileage appropriateness  
3. Title status impact on value and insurability
4. Condition severity and repairability
5. Overall value proposition as an auction purchase
6. Risk assessment for this type of purchase

IMPORTANT TITLE STATUS CONSIDERATIONS:
- Clean/Clear title: Full market value, easy to insure/finance
- Rebuilt/Reconstructed: 20-40% discount from clean title value
- Salvage title: 50-70% discount, insurance/financing challenges
- Flood damage: High risk, avoid unless deeply discounted
- Lemon/Buyback: Recurring issues likely, high risk
- Other branded titles significantly impact value and resale

Consider that this vehicle likely has issues (that's why it's at auction), but evaluate if it's still a reasonable purchase given the expected discount from retail prices.`;
  }

  // Validate and correct analysis to ensure score-recommendation alignment
  validateAndCorrectAnalysis(analysis) {
    if (!analysis || typeof analysis !== 'object') {
      return analysis;
    }

    const score = analysis.overallScore;
    const recommendation = analysis.recommendation;
    
    // Define correct score-to-recommendation mapping
    let correctRecommendation;
    if (score >= 8) {
      correctRecommendation = 'BUY';
    } else if (score >= 5) {
      correctRecommendation = 'PROCEED_WITH_CAUTION';
    } else {
      correctRecommendation = 'PASS';
    }
    
    // Check if correction is needed
    if (recommendation !== correctRecommendation) {
      console.log(`Score-Recommendation mismatch detected. Score: ${score}, AI Recommendation: ${recommendation}, Corrected: ${correctRecommendation}`);
      
      // Update the recommendation to match the score
      analysis.recommendation = correctRecommendation;
      
      // Also adjust risk level to align with the corrected recommendation
      if (correctRecommendation === 'BUY' && analysis.valueProposition) {
        analysis.valueProposition.riskLevel = 'LOW';
      } else if (correctRecommendation === 'PROCEED_WITH_CAUTION' && analysis.valueProposition) {
        analysis.valueProposition.riskLevel = analysis.valueProposition.riskLevel || 'MEDIUM';
      } else if (correctRecommendation === 'PASS' && analysis.valueProposition) {
        analysis.valueProposition.riskLevel = 'HIGH';
      }
      
      // Update summary to reflect the correction if it contradicts
      if (analysis.summary) {
        const summaryLower = analysis.summary.toLowerCase();
        const hasContradictoryLanguage = (
          (correctRecommendation === 'BUY' && (summaryLower.includes('pass') || summaryLower.includes('avoid'))) ||
          (correctRecommendation === 'PASS' && (summaryLower.includes('buy') || summaryLower.includes('recommend')))
        );
        
        if (hasContradictoryLanguage) {
          // Append clarification to summary
          analysis.summary += ` Based on the overall score of ${score}/10, this vehicle is categorized as: ${correctRecommendation.replace('_', ' ')}.`;
        }
      }
    }
    
    return analysis;
  }

  // Get market value estimates (placeholder for future integration)
  async getMarketValue(vehicleData) {
    // This would integrate with KBB, Edmunds, or similar APIs
    // For now, return estimated ranges based on typical auction discounts
    
    const year = vehicleData.year || new Date().getFullYear() - 10;
    const mileage = vehicleData.mileage || 100000;
    
    // Simple estimation logic (would be replaced with actual API)
    let baseValue = Math.max(1000, (2030 - year) * 2000 - (mileage / 1000) * 50);
    
    return {
      estimatedRetail: Math.round(baseValue * 1.3),
      estimatedTrade: Math.round(baseValue),
      estimatedAuction: Math.round(baseValue * 0.7),
      estimatedPrivateParty: Math.round(baseValue * 1.1)
    };
  }
}

let currentVehicleData = null;
let lastAnalysis = null;
let analyzer = null;

// Initialize the analyzer when extension starts
chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(initialize);

async function initialize() {
  console.log('Car Auction Analyzer extension started');
  
  // Get stored API key
  const result = await chrome.storage.sync.get(['openaiApiKey']);
  if (result.openaiApiKey) {
    analyzer = new VehicleAnalyzer(result.openaiApiKey);
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'VEHICLE_DATA_EXTRACTED':
      handleVehicleDataExtracted(request.data);
      sendResponse({ success: true });
      break;
      
    case 'ANALYZE_VEHICLE':
      handleAnalyzeVehicle(request.data, sendResponse);
      return true; // Indicates async response
      
    case 'GET_LAST_ANALYSIS':
      sendResponse({ 
        analysis: lastAnalysis,
        vehicleData: currentVehicleData
      });
      break;
      
    case 'SET_API_KEY':
      handleSetApiKey(request.apiKey, sendResponse);
      return true;
      
    case 'GET_API_KEY_STATUS':
      handleGetApiKeyStatus(sendResponse);
      return true;
      
    default:
      sendResponse({ error: 'Unknown request type' });
  }
});

function handleVehicleDataExtracted(data) {
  currentVehicleData = data;
  console.log('Vehicle data stored:', data);
}

async function handleAnalyzeVehicle(vehicleData, sendResponse) {
  try {
    if (!analyzer) {
      // Try to initialize analyzer with stored key
      const result = await chrome.storage.sync.get(['openaiApiKey']);
      if (result.openaiApiKey) {
        analyzer = new VehicleAnalyzer(result.openaiApiKey);
      } else {
        sendResponse({ 
          success: false, 
          error: 'OpenAI API key not configured. Please set it in the extension popup.' 
        });
        return;
      }
    }
    
    currentVehicleData = vehicleData;
    console.log('Starting vehicle analysis...', vehicleData);
    
    const result = await analyzer.analyzeVehicle(vehicleData);
    
    if (result.success) {
      lastAnalysis = result;
      console.log('Analysis completed successfully');
      
      // Store the analysis for later retrieval
      await chrome.storage.local.set({
        lastAnalysis: result,
        lastVehicleData: vehicleData,
        analysisTimestamp: Date.now()
      });
      
      sendResponse({ success: true, analysis: result });
    } else {
      console.error('Analysis failed:', result.error);
      sendResponse({ success: false, error: result.error });
    }
    
  } catch (error) {
    console.error('Error in handleAnalyzeVehicle:', error);
    sendResponse({ 
      success: false, 
      error: `Analysis failed: ${error.message}` 
    });
  }
}

async function handleSetApiKey(apiKey, sendResponse) {
  try {
    if (!apiKey || apiKey.trim().length === 0) {
      sendResponse({ success: false, error: 'API key cannot be empty' });
      return;
    }
    
    // Basic validation - OpenAI API keys typically start with 'sk-'
    if (!apiKey.startsWith('sk-')) {
      sendResponse({ 
        success: false, 
        error: 'Invalid API key format. OpenAI keys should start with "sk-"' 
      });
      return;
    }
    
    // Store the API key
    await chrome.storage.sync.set({ openaiApiKey: apiKey });
    
    // Initialize analyzer with new key
    analyzer = new VehicleAnalyzer(apiKey);
    
    console.log('API key configured successfully');
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Error setting API key:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function handleGetApiKeyStatus(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['openaiApiKey']);
    const hasKey = !!(result.openaiApiKey && result.openaiApiKey.length > 0);
    
    sendResponse({ 
      hasApiKey: hasKey,
      keyPreview: hasKey ? `${result.openaiApiKey.substring(0, 7)}...` : null
    });
  } catch (error) {
    console.error('Error getting API key status:', error);
    sendResponse({ hasApiKey: false, error: error.message });
  }
}

// Handle extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
  // This will be handled by the popup, but we can add fallback logic here
  console.log('Extension icon clicked on tab:', tab.url);
});

// Clean up old analysis data periodically
chrome.alarms.create('cleanup', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    try {
      const result = await chrome.storage.local.get(['analysisTimestamp']);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // Clear analysis data older than 1 hour
      if (result.analysisTimestamp && (now - result.analysisTimestamp) > oneHour) {
        await chrome.storage.local.remove(['lastAnalysis', 'lastVehicleData', 'analysisTimestamp']);
        lastAnalysis = null;
        currentVehicleData = null;
        console.log('Cleaned up old analysis data');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
});

// Initialize on script load
initialize();
