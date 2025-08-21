// API utility for vehicle analysis
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

Provide analysis in the following JSON format:
{
  "overallScore": 1-10,
  "recommendation": "BUY" | "PASS" | "PROCEED_WITH_CAUTION",
  "priceAnalysis": {
    "currentBid": number,
    "estimatedMarketValue": number,
    "auctionValueRange": "low-high",
    "priceRating": "EXCELLENT" | "GOOD" | "FAIR" | "OVERPRICED"
  },
  "conditionAnalysis": {
    "bodyCondition": "description",
    "mechanicalConcerns": ["list of concerns"],
    "acceptableDamage": boolean,
    "repairEstimate": "cost range or N/A"
  },
  "valueProposition": {
    "pros": ["list of positives"],
    "cons": ["list of negatives"],
    "riskLevel": "LOW" | "MEDIUM" | "HIGH"
  },
  "summary": "2-3 sentence summary of recommendation"
}`
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
          return {
            success: true,
            analysis: parsedAnalysis,
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
3. Condition severity and repairability
4. Overall value proposition as an auction purchase
5. Risk assessment for this type of purchase

Consider that this vehicle likely has issues (that's why it's at auction), but evaluate if it's still a reasonable purchase given the expected discount from retail prices.`;
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

// Make available for background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VehicleAnalyzer;
} else {
  window.VehicleAnalyzer = VehicleAnalyzer;
}
