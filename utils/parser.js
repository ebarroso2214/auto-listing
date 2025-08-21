// Vehicle data parser for different auction sites
class VehicleParser {
  static parseCopart() {
    try {
      const vehicleData = {
        site: 'copart',
        url: window.location.href,
        timestamp: Date.now()
      };

      // Extract basic vehicle info
      const titleElement = document.querySelector('h1') || document.querySelector('.vehicle-title');
      if (titleElement) {
        const titleText = titleElement.textContent.trim();
        const yearMatch = titleText.match(/(\d{4})/);
        vehicleData.year = yearMatch ? parseInt(yearMatch[1]) : null;
        vehicleData.title = titleText;
      }
      
      // Extract title status - try CSS selectors first
      const titleStatusSelectors = [
        '[data-uname="lottitletxt"]',
        '.title-status',
        '.title-brand',
        '[class*="title"]',
        '.lot-title-status'
      ];
      
      for (const selector of titleStatusSelectors) {
        const statusElement = document.querySelector(selector);
        if (statusElement) {
          const statusText = statusElement.textContent.trim().toLowerCase();
          if (statusText && this.isValidTitleStatus(statusText)) {
            vehicleData.titleStatus = this.normalizeTitleStatus(statusText);
            console.log('Copart: Found title status via CSS selector:', vehicleData.titleStatus);
            break;
          }
        }
      }
      
      // If no title status found via CSS selectors, try text search
      if (!vehicleData.titleStatus) {
        const allText = document.body.textContent;
        const titleStatus = this.extractTitleStatusFromText(allText);
        if (titleStatus) {
          vehicleData.titleStatus = titleStatus;
          console.log('Copart: Found title status via text search:', vehicleData.titleStatus);
        }
      }

      // Extract VIN
      const vinElement = document.querySelector('[data-uname="lotvintxt"]') || 
                        document.querySelector('.vin') ||
                        document.querySelector('[class*="vin"]');
      if (vinElement) {
        vehicleData.vin = vinElement.textContent.trim();
      }

      // Extract mileage
      const mileageElement = document.querySelector('[data-uname="lotmileagetxt"]') ||
                            document.querySelector('.odometer') ||
                            document.querySelector('[class*="mileage"]');
      if (mileageElement) {
        const mileageText = mileageElement.textContent;
        const mileageMatch = mileageText.match(/([\d,]+)/);
        vehicleData.mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : null;
      }

      // Extract current bid/price
      const priceElement = document.querySelector('[data-uname="lotcurbidtxt"]') ||
                          document.querySelector('.current-bid') ||
                          document.querySelector('[class*="price"]');
      if (priceElement) {
        const priceText = priceElement.textContent;
        const priceMatch = priceText.match(/\$?([\d,]+)/);
        vehicleData.currentBid = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;
      }

      // Extract damage description
      const damageElements = document.querySelectorAll('[data-uname*="damage"], .damage-description, [class*="damage"]');
      if (damageElements.length > 0) {
        vehicleData.damages = Array.from(damageElements).map(el => el.textContent.trim());
      }

      // Extract location
      const locationElement = document.querySelector('[data-uname="lotlocationtxt"]') ||
                             document.querySelector('.location');
      if (locationElement) {
        vehicleData.location = locationElement.textContent.trim();
      }

      // Extract images - look for vehicle images specifically
      const imageSelectors = [
        '.lot-image img',
        '.vehicle-image img', 
        '.gallery img',
        '.vehicle-photos img',
        '.photo-gallery img',
        '.lot-photos img',
        '.images img',
        '.carousel img',
        '.slider img',
        '[class*="image"] img',
        '[class*="photo"] img'
      ];
      
      const imageElements = document.querySelectorAll(imageSelectors.join(', '));
      const images = Array.from(imageElements)
        .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy'))
        .filter(src => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
        .filter((src, index, arr) => arr.indexOf(src) === index); // Remove duplicates
      
      vehicleData.images = images;
      vehicleData.primaryImage = images.length > 0 ? images[0] : null;

      return vehicleData;
    } catch (error) {
      console.error('Error parsing Copart data:', error);
      return null;
    }
  }

  static debugIAAI() {
    // Debug helper to understand page structure
    console.log('=== IAAI DEBUG INFO ===');
    console.log('URL:', window.location.href);
    
    // Log all elements that might contain vehicle info
    const possibleElements = document.querySelectorAll('*');
    const relevantElements = [];
    
    possibleElements.forEach(el => {
      const text = el.textContent?.trim();
      const className = el.className;
      const id = el.id;
      
      if (text && (
        text.match(/\d{4,}/) || // Numbers (mileage, year, etc)
        text.toLowerCase().includes('odometer') ||
        text.toLowerCase().includes('mileage') ||
        text.toLowerCase().includes('miles') ||
        text.toLowerCase().includes('location') ||
        text.toLowerCase().includes('branch') ||
        text.toLowerCase().includes('facility') ||
        text.toLowerCase().includes('bid') ||
        text.toLowerCase().includes('price')
      )) {
        relevantElements.push({
          tag: el.tagName,
          className: className,
          id: id,
          text: text.substring(0, 100) // Limit text length
        });
      }
    });
    
    console.log('Relevant elements found:', relevantElements.slice(0, 20)); // Limit output
    console.log('=== END DEBUG INFO ===');
  }

  static parseIAAI() {
    try {
      const vehicleData = {
        site: 'iaai',
        url: window.location.href,
        timestamp: Date.now()
      };

      console.log('IAAI Parser: Starting data extraction...');
      
      // Run debug to help understand page structure (disabled for now)
      // this.debugIAAI();

      // Extract basic vehicle info from title - try multiple selectors
      const titleSelectors = [
        'h1',
        '.vehicle-title',
        '.lot-title',
        '[data-testid="lot-title"]',
        '.lot-details h1',
        '.vehicle-info h1',
        '.title'
      ];
      
      for (const selector of titleSelectors) {
        const titleElement = document.querySelector(selector);
        if (titleElement && titleElement.textContent.trim()) {
          vehicleData.title = titleElement.textContent.trim();
          const yearMatch = vehicleData.title.match(/(\d{4})/);
          vehicleData.year = yearMatch ? parseInt(yearMatch[1]) : null;
          console.log('IAAI Parser: Found title:', vehicleData.title);
          break;
        }
      }

      // Extract VIN - try multiple selectors
      const vinSelectors = [
        '.vin',
        '[class*="vin"]',
        '[data-testid="vin"]',
        '.vehicle-vin',
        '.lot-vin'
      ];
      
      for (const selector of vinSelectors) {
        const vinElement = document.querySelector(selector);
        if (vinElement && vinElement.textContent.trim()) {
          vehicleData.vin = vinElement.textContent.trim();
          console.log('IAAI Parser: Found VIN:', vehicleData.vin);
          break;
        }
      }
      
      // Extract title status - try CSS selectors first
      const titleStatusSelectors = [
        '.title-status',
        '.title-brand',
        '[class*="title"]',
        '[data-testid="title-status"]',
        '.lot-title-status'
      ];
      
      for (const selector of titleStatusSelectors) {
        const statusElement = document.querySelector(selector);
        if (statusElement) {
          const statusText = statusElement.textContent.trim().toLowerCase();
          if (statusText && this.isValidTitleStatus(statusText)) {
            vehicleData.titleStatus = this.normalizeTitleStatus(statusText);
            console.log('IAAI Parser: Found title status via CSS selector:', vehicleData.titleStatus);
            break;
          }
        }
      }
      
      // If no title status found via CSS selectors, try text search for IAAI-specific patterns
      if (!vehicleData.titleStatus) {
        const allText = document.body.textContent;
        
        // IAAI-specific pattern: "Title/Sale Doc: [status]"
        const iaaiTitleMatch = allText.match(/Title\/Sale Doc[:\s]*([^\n,;]+)/i);
        if (iaaiTitleMatch && iaaiTitleMatch[1]) {
          const statusText = iaaiTitleMatch[1].trim();
          if (this.isValidTitleStatus(statusText)) {
            vehicleData.titleStatus = this.normalizeTitleStatus(statusText);
            console.log('IAAI Parser: Found title status via "Title/Sale Doc" pattern:', vehicleData.titleStatus);
          }
        }
        
        // If still not found, try general title patterns
        if (!vehicleData.titleStatus) {
          const titleStatus = this.extractTitleStatusFromText(allText);
          if (titleStatus) {
            vehicleData.titleStatus = titleStatus;
            console.log('IAAI Parser: Found title status via general text search:', vehicleData.titleStatus);
          }
        }
      }

      // Extract mileage/odometer - try multiple selectors and patterns
      const mileageSelectors = [
        '.odometer',
        '.mileage',
        '[class*="mileage"]',
        '[class*="odometer"]',
        '[data-testid="odometer"]',
        '.vehicle-mileage',
        '.lot-mileage',
        '.odometer-reading'
      ];
      
      for (const selector of mileageSelectors) {
        const mileageElement = document.querySelector(selector);
        if (mileageElement) {
          const mileageText = mileageElement.textContent;
          const mileageMatch = mileageText.match(/([\d,]+)/);
          if (mileageMatch) {
            const miles = parseInt(mileageMatch[1].replace(/,/g, ''));
            if (miles > 0 && miles < 1000000) { // Reasonable range
              vehicleData.mileage = miles;
              console.log('IAAI Parser: Found mileage:', vehicleData.mileage);
              break;
            }
          }
        }
      }

      // If direct selectors don't work, search in all text content
      if (!vehicleData.mileage) {
        const allText = document.body.textContent;
        const mileagePatterns = [
          /Odometer[:\s]*([\d,]+)/i,
          /Miles[:\s]*([\d,]+)/i,
          /Mileage[:\s]*([\d,]+)/i,
          /([\d,]+)\s*miles?/i
        ];
        
        for (const pattern of mileagePatterns) {
          const match = allText.match(pattern);
          if (match) {
            const miles = parseInt(match[1].replace(/,/g, ''));
            if (miles > 100 && miles < 1000000) {
              vehicleData.mileage = miles;
              console.log('IAAI Parser: Found mileage via text search:', vehicleData.mileage);
              break;
            }
          }
        }
      }

      // Extract location - try multiple selectors
      const locationSelectors = [
        '.location',
        '.branch',
        '.facility',
        '.selling-branch',
        '[class*="location"]',
        '[class*="branch"]',
        '[class*="facility"]',
        '[data-testid="location"]',
        '.auction-location',
        '.lot-location'
      ];
      
      for (const selector of locationSelectors) {
        const locationElement = document.querySelector(selector);
        if (locationElement && locationElement.textContent.trim()) {
          const locationText = locationElement.textContent.trim();
          // Validate that it's not just "Selling" or contains "Selling Branch"
          if (locationText.length > 2 && 
              !locationText.toLowerCase().includes('selling') && 
              !locationText.toLowerCase().includes('branch') &&
              locationText.match(/[A-Za-z]{2,}/)) {
            // Clean up location - remove parentheses and their contents
            vehicleData.location = locationText.replace(/\s*\([^)]*\)/g, '').trim();
            console.log('IAAI Parser: Found location via CSS selector:', vehicleData.location, 'selector:', selector);
            break;
          } else {
            console.log('IAAI Parser: Rejected CSS selector result:', locationText, 'selector:', selector);
          }
        }
      }

      // If location not found, try text patterns and element-based search
      if (!vehicleData.location) {
        // First try element-based approach - find elements containing "selling branch" text
        const allElements = document.querySelectorAll('*');
        for (const element of allElements) {
          const text = element.textContent;
          if (text && text.toLowerCase().includes('selling branch')) {
            console.log('IAAI Parser: Found element with "selling branch":', text.substring(0, 200));
            
            // Look for the location in the same element or nearby elements
            const fullText = text.trim();
            
            // Try multiple patterns to extract location from the same element
            const locationPatterns = [
              /selling\s+branch[:\s]*([A-Za-z][^\n]*?)(?:\n|$|\s{2,})/i, // Capture until line break or double space
              /selling\s+branch[:\s]+([A-Z][^\n]+?)(?:\n|$)/i, // Capital letter start, capture to end of line
              /selling\s+branch[^\n]*?([A-Z][a-z]+[^\n]*?)(?:\n|$|\s{2,})/i // Find capitalized word and capture rest of line
            ];
            
            for (const pattern of locationPatterns) {
              const locationMatch = fullText.match(pattern);
              if (locationMatch && locationMatch[1]) {
                let location = locationMatch[1].trim();
                // Additional validation
                if (location.length > 2 && 
                    !location.toLowerCase().includes('selling') && 
                    !location.toLowerCase().includes('branch') &&
                    location.match(/[A-Za-z]/) && // Contains letters
                    location.length < 100) { // Reasonable length
                  // Clean up location - remove parentheses and their contents
                  vehicleData.location = location.replace(/\s*\([^)]*\)/g, '').trim();
                  console.log('IAAI Parser: Found location via element search:', vehicleData.location, 'using pattern:', pattern.source);
                  break;
                }
              }
            }
            
            if (vehicleData.location) break;
            
            // If not found in same element, check next sibling or parent's next sibling
            let nextElement = element.nextElementSibling;
            if (nextElement && nextElement.textContent) {
              const nextText = nextElement.textContent.trim();
              if (nextText.length > 2 && 
                  !nextText.toLowerCase().includes('selling') && 
                  !nextText.toLowerCase().includes('branch') &&
                  nextText.match(/[A-Za-z]/)) {
                // Clean up location - remove parentheses and their contents
                vehicleData.location = nextText.replace(/\s*\([^)]*\)/g, '').trim();
                console.log('IAAI Parser: Found location via next sibling:', vehicleData.location);
                break;
              }
            }
          }
        }
        
        // If still not found, try text splitting approach
        if (!vehicleData.location) {
          const allText = document.body.textContent;
          
          // Find "Selling Branch" and extract what comes after it
          const sellingBranchIndex = allText.toLowerCase().indexOf('selling branch');
          if (sellingBranchIndex !== -1) {
            // Get text after "Selling Branch"
            let afterText = allText.substring(sellingBranchIndex + 'selling branch'.length);
            
            // Remove common separators and get the next meaningful text
            afterText = afterText.replace(/^[:\s,;-]+/, ''); // Remove leading separators
            
            // Extract the next words (likely the location)
            const locationMatch = afterText.match(/^([A-Za-z][^\n]*?)(?:\n|\s{2,}|$)/);
            if (locationMatch && locationMatch[1]) {
              let location = locationMatch[1].trim();
              
              // Clean up and validate
              location = location.replace(/[,.;]*$/, ''); // Remove trailing punctuation
              location = location.replace(/\s+/g, ' '); // Normalize whitespace
              
              if (location.length > 2 && 
                  location.length < 50 && 
                  !location.toLowerCase().includes('selling') &&
                  !location.toLowerCase().includes('branch') &&
                  location.match(/[A-Za-z]{2,}/)) { // At least 2 consecutive letters
                // Clean up location - remove parentheses and their contents
                vehicleData.location = location.replace(/\s*\([^)]*\)/g, '').trim();
                console.log('IAAI Parser: Found location via text splitting:', vehicleData.location);
              }
            }
          }
          
          // Final fallback - try regex patterns
          if (!vehicleData.location) {
            const locationPatterns = [
              /Selling\s+Branch[:\s]*([^\n,;]+)/i,
              /Selling\s+Branch[:\s]+(.+?)(?:\n|$)/i,
              /Branch[:\s]*([^\n,;]+)/i,
              /Location[:\s]*([^\n,;]+)/i,
              /Facility[:\s]*([^\n,;]+)/i
            ];
            
            for (const pattern of locationPatterns) {
              const match = allText.match(pattern);
              if (match && match[1] && match[1].trim()) {
                let location = match[1].trim();
                // Clean up the location (remove extra whitespace, common suffixes)
                location = location.replace(/\s+/g, ' ').replace(/\.$/, '');
                if (location.length > 2 && !location.toLowerCase().includes('selling')) {
                  // Clean up location - remove parentheses and their contents
                  vehicleData.location = location.replace(/\s*\([^)]*\)/g, '').trim();
                  console.log('IAAI Parser: Found location via regex fallback:', vehicleData.location, 'using pattern:', pattern.source);
                  break;
                }
              }
            }
          }
        }
      }

      // Extract current bid - try multiple selectors
      const bidSelectors = [
        '.current-bid',
        '.bid-amount',
        '[class*="bid"]',
        '[class*="price"]',
        '[data-testid="current-bid"]',
        '.auction-price',
        '.lot-price'
      ];
      
      for (const selector of bidSelectors) {
        const bidElement = document.querySelector(selector);
        if (bidElement) {
          const bidText = bidElement.textContent;
          const bidMatch = bidText.match(/\$?([\d,]+)/);
          if (bidMatch) {
            const amount = parseInt(bidMatch[1].replace(/,/g, ''));
            if (amount > 0) {
              vehicleData.currentBid = amount;
              console.log('IAAI Parser: Found bid:', vehicleData.currentBid);
              break;
            }
          }
        }
      }

      // Extract damages/condition info
      const damageSelectors = [
        '.damage',
        '.condition',
        '[class*="damage"]',
        '[class*="condition"]',
        '.lot-condition',
        '.vehicle-condition'
      ];
      
      const damages = [];
      for (const selector of damageSelectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent.trim();
          if (text && !damages.includes(text)) {
            damages.push(text);
          }
        });
      }
      
      if (damages.length > 0) {
        vehicleData.damages = damages;
        console.log('IAAI Parser: Found damages:', vehicleData.damages);
      }

      // Final debug log showing location processing
      if (vehicleData.location) {
        console.log('IAAI Parser: Final location before return:', vehicleData.location);
        console.log('IAAI Parser: Location contains parentheses:', vehicleData.location.includes('('));
        
        // Test the regex one more time to be absolutely sure
        const testClean = vehicleData.location.replace(/\s*\([^)]*\)/g, '').trim();
        console.log('IAAI Parser: Test regex clean result:', testClean);
        
        // Apply final cleanup if somehow it still has parentheses
        if (vehicleData.location.includes('(')) {
          console.log('IAAI Parser: Location still has parentheses, applying final cleanup');
          vehicleData.location = vehicleData.location.replace(/\s*\([^)]*\)/g, '').trim();
          console.log('IAAI Parser: After final cleanup:', vehicleData.location);
        }
      }
      
      // Extract images for IAAI
      const imageSelectors = [
        '.lot-image img',
        '.vehicle-image img',
        '.gallery img', 
        '.vehicle-photos img',
        '.photo-gallery img',
        '.lot-photos img',
        '.images img',
        '.carousel img',
        '.slider img',
        '[class*="image"] img',
        '[class*="photo"] img',
        '.auction-images img',
        '.vehicle-gallery img'
      ];
      
      const imageElements = document.querySelectorAll(imageSelectors.join(', '));
      const images = Array.from(imageElements)
        .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy'))
        .filter(src => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
        .filter((src, index, arr) => arr.indexOf(src) === index); // Remove duplicates
      
      vehicleData.images = images;
      vehicleData.primaryImage = images.length > 0 ? images[0] : null;
      
      console.log('IAAI Parser: Found images:', images.length);
      if (vehicleData.primaryImage) {
        console.log('IAAI Parser: Primary image:', vehicleData.primaryImage);
      }
      
      console.log('IAAI Parser: Final extracted data:', vehicleData);
      return vehicleData;
      
    } catch (error) {
      console.error('Error parsing IAAI data:', error);
      return null;
    }
  }

  static parseGeneric() {
    try {
      const vehicleData = {
        site: 'generic',
        url: window.location.href,
        timestamp: Date.now()
      };

      // Try to extract basic info using common patterns
      const titleElement = document.querySelector('h1, .title, .vehicle-title, [class*="title"]');
      if (titleElement) {
        vehicleData.title = titleElement.textContent.trim();
        const yearMatch = vehicleData.title.match(/(\d{4})/);
        vehicleData.year = yearMatch ? parseInt(yearMatch[1]) : null;
      }

      // Look for price/bid information
      const priceElements = document.querySelectorAll('[class*="price"], [class*="bid"], .cost, .amount');
      for (const element of priceElements) {
        const priceText = element.textContent;
        const priceMatch = priceText.match(/\$?([\d,]+)/);
        if (priceMatch && parseInt(priceMatch[1].replace(/,/g, '')) > 100) {
          vehicleData.currentBid = parseInt(priceMatch[1].replace(/,/g, ''));
          break;
        }
      }

      // Look for mileage
      const mileageElements = document.querySelectorAll('[class*="mileage"], [class*="odometer"], [class*="miles"]');
      for (const element of mileageElements) {
        const mileageText = element.textContent;
        const mileageMatch = mileageText.match(/([\d,]+)/);
        if (mileageMatch) {
          const miles = parseInt(mileageMatch[1].replace(/,/g, ''));
          if (miles > 1000 && miles < 500000) { // Reasonable mileage range
            vehicleData.mileage = miles;
            break;
          }
        }
      }

      // Extract images for generic sites
      const imageSelectors = [
        '.vehicle-image img',
        '.car-image img', 
        '.listing-image img',
        '.photo img',
        '.image img',
        '.gallery img',
        '.carousel img',
        '[class*="image"] img',
        '[class*="photo"] img'
      ];
      
      const imageElements = document.querySelectorAll(imageSelectors.join(', '));
      const images = Array.from(imageElements)
        .map(img => img.src || img.getAttribute('data-src') || img.getAttribute('data-lazy'))
        .filter(src => src && src.startsWith('http') && !src.includes('icon') && !src.includes('logo'))
        .filter((src, index, arr) => arr.indexOf(src) === index); // Remove duplicates
      
      vehicleData.images = images;
      vehicleData.primaryImage = images.length > 0 ? images[0] : null;

      return vehicleData;
    } catch (error) {
      console.error('Error parsing generic data:', error);
      return null;
    }
  }

  // Helper method to validate if a text contains valid title status information
  static isValidTitleStatus(text) {
    const titleStatusKeywords = [
      'clean', 'clear', 'salvage', 'rebuilt', 'reconstructed', 'flood', 'fire', 
      'hail', 'theft recovery', 'lemon', 'manufacturer buyback', 'gray market',
      'dismantled', 'junk', 'certificate of destruction', 'non-repairable',
      'water damage', 'biohazard', 'vandalism', 'collision', 'rollover'
    ];
    
    const lowerText = text.toLowerCase();
    return titleStatusKeywords.some(keyword => lowerText.includes(keyword));
  }
  
  // Helper method to normalize title status text
  static normalizeTitleStatus(text) {
    const lowerText = text.toLowerCase().trim();
    
    // Map common variations to standard terms
    if (lowerText.includes('clean') || lowerText.includes('clear')) return 'Clean';
    if (lowerText.includes('salvage')) return 'Salvage';
    if (lowerText.includes('rebuilt') || lowerText.includes('reconstructed')) return 'Rebuilt';
    if (lowerText.includes('flood') || lowerText.includes('water damage')) return 'Flood Damage';
    if (lowerText.includes('fire')) return 'Fire Damage';
    if (lowerText.includes('hail')) return 'Hail Damage';
    if (lowerText.includes('theft recovery')) return 'Theft Recovery';
    if (lowerText.includes('lemon') || lowerText.includes('manufacturer buyback')) return 'Lemon/Buyback';
    if (lowerText.includes('gray market')) return 'Gray Market';
    if (lowerText.includes('dismantled') || lowerText.includes('parts only')) return 'Dismantled';
    if (lowerText.includes('junk') || lowerText.includes('certificate of destruction') || lowerText.includes('non-repairable')) return 'Junk';
    if (lowerText.includes('biohazard')) return 'Biohazard';
    if (lowerText.includes('vandalism')) return 'Vandalism';
    if (lowerText.includes('collision')) return 'Collision';
    if (lowerText.includes('rollover')) return 'Rollover';
    
    // Return original text if no specific match found
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  
  // Enhanced text search for title status if direct selectors don't work
  static extractTitleStatusFromText(text) {
    const titlePatterns = [
      /title[:\s]*([^\n,;]+)/i,
      /title status[:\s]*([^\n,;]+)/i,
      /title brand[:\s]*([^\n,;]+)/i,
      /title type[:\s]*([^\n,;]+)/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const statusText = match[1].trim();
        if (this.isValidTitleStatus(statusText)) {
          return this.normalizeTitleStatus(statusText);
        }
      }
    }
    
    return null;
  }

  static parse() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('copart.com')) {
      return this.parseCopart();
    } else if (hostname.includes('iaai.com')) {
      return this.parseIAAI();
    } else {
      return this.parseGeneric();
    }
  }
}

// Make it available globally
window.VehicleParser = VehicleParser;
