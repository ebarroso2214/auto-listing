# Car Auction AI Analyzer

A Chrome extension that uses AI to analyze car auction listings and help determine if a vehicle is a good buy. The extension considers auction-specific factors like expected damage, MIL codes, and "as-is" conditions when providing recommendations.

## Features

- **AI-Powered Analysis**: Uses OpenAI's GPT-4 to analyze vehicle listings
- **Auction-Context Aware**: Understands that auction vehicles have issues and adjusts recommendations accordingly
- **Multi-Site Support**: Works with Copart, IAAI, Manheim, and other auction sites
- **Vehicle Image Display**: Shows the first available vehicle photo for visual reference
- **Comprehensive Evaluation**: Analyzes price, condition, mileage, and overall value
- **Risk Assessment**: Provides clear recommendations (BUY/PASS/PROCEED WITH CAUTION)
- **Visual Interface**: Clean, intuitive popup with detailed analysis results

## Installation

### Prerequisites
- Chrome browser (Manifest V3 support required)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Setup Steps

1. **Clone or Download** this repository to your local machine

2. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the `car-auction-analyzer` folder
   - The extension should now appear in your extensions list

3. **Configure API Key**:
   - Click the extension icon in your browser toolbar
   - Click the settings gear ⚙️ icon
   - Enter your OpenAI API key (starts with `sk-`)
   - Click "Save Key"

## Usage

### Basic Usage

1. **Navigate to a Supported Auction Site**:
   - Visit Copart.com, IAAI.com, or Manheim.com
   - Go to any vehicle listing page

2. **Analyze the Vehicle**:
   - The extension will automatically detect vehicle data
   - Click the floating "AI Analysis" button on the page, OR
   - Click the extension icon and click "Analyze with AI"

3. **Review Results**:
   - View the comprehensive analysis in the extension popup
   - See overall score, recommendation, price analysis, and condition assessment
   - Read pros/cons and detailed summary

### Supported Sites

- **Copart.com** - Fully supported with detailed parsing
- **IAAI.com** - Supported with comprehensive data extraction  
- **Manheim.com** - Basic support for public listings
- **Generic Support** - Works on other auction sites with limited data extraction

### What Gets Analyzed

The AI considers these factors when analyzing vehicles:

- **Price vs. Market Value** (accounting for auction discounts)
- **Vehicle Age vs. Mileage** appropriateness
- **Condition Issues** (distinguishing cosmetic vs. mechanical)
- **Repair Cost Estimates** for known damage
- **Auction Context** (expects some issues, focuses on value)
- **Risk Level** based on all factors

## Understanding the Analysis

### Recommendation Types

- **BUY** 🟢: Great deal, low risk, recommended purchase
- **PROCEED WITH CAUTION** 🟡: Potentially good deal but with notable risks
- **PASS** 🔴: Poor value or too risky for most buyers

### Score Breakdown

The overall score (1-10) directly determines the recommendation using these thresholds:

- **8-10** → **BUY** 🟢: Excellent value with minimal risk
- **5-7** → **PROCEED WITH CAUTION** 🟡: Good value with manageable risk  
- **1-4** → **PASS** 🔴: Poor value or high risk

*Note: The extension automatically ensures score-recommendation alignment for consistent results.*

### Price Ratings

- **EXCELLENT**: Significantly below market value
- **GOOD**: Below market value with good savings
- **FAIR**: Around expected auction price
- **OVERPRICED**: Above reasonable auction value

## Privacy & Security

- **API Key Storage**: Your OpenAI API key is stored locally in Chrome's secure storage
- **Data Handling**: Vehicle data is only sent to OpenAI for analysis
- **No Tracking**: The extension doesn't collect or transmit personal data
- **Secure Communication**: All API calls use HTTPS encryption

## API Costs

The extension uses OpenAI's GPT-4 Turbo model. Typical costs:
- **Per Analysis**: ~$0.02-0.05 USD
- **Monthly Usage**: $5-20 USD for moderate use (100-400 analyses)

You can monitor usage in your [OpenAI Dashboard](https://platform.openai.com/usage).

## Troubleshooting

### Common Issues

**Extension doesn't detect vehicle data**:
- Refresh the auction page and try again
- Make sure you're on a vehicle listing page (not search results)
- Some sites may require scrolling to load all data

**Analysis fails**:
- Check your OpenAI API key in settings
- Verify you have API credits available
- Check browser console for error messages

**Slow analysis**:
- AI analysis typically takes 10-30 seconds
- Slow internet or high OpenAI API load can cause delays

### Getting Help

1. Check browser console (`F12` → Console) for error messages
2. Verify extension permissions in `chrome://extensions/`
3. Try refreshing the auction page and re-analyzing

## Development

### Project Structure

```
car-auction-analyzer/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls
├── content.js            # Injected script for data extraction
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── utils/
│   ├── parser.js         # Vehicle data parsing logic
│   └── api.js            # OpenAI API integration
├── icons/                # Extension icons
└── README.md            # This file
```

### Local Development

1. Make changes to the code
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test changes on auction sites

### Adding New Auction Sites

To add support for additional auction sites:

1. Update `manifest.json` to include new site permissions
2. Add parsing logic in `utils/parser.js`
3. Test data extraction on the new site
4. Submit improvements via pull request

## Contributing

Contributions are welcome! Areas for improvement:

- **Additional Auction Sites**: Add parsers for more sites
- **Enhanced AI Prompts**: Improve analysis accuracy
- **Market Data Integration**: Add KBB/Edmunds API integration
- **UI/UX Improvements**: Better visualization of results
- **Error Handling**: More robust error recovery

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

**Important**: This tool provides AI-generated analysis for informational purposes only. It should not be considered professional automotive advice. Always:

- Inspect vehicles in person when possible
- Consider professional inspection for high-value purchases
- Factor in transportation and repair costs
- Understand auction terms and conditions
- Make final decisions based on your own research and judgment

The developers are not responsible for any financial losses from using this tool.

## Version History

### v1.0.0 (Initial Release)
- AI-powered vehicle analysis using OpenAI GPT-4
- Support for Copart, IAAI, and Manheim
- Comprehensive pricing and condition analysis
- Clean, intuitive popup interface
- Secure API key management
