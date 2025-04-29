/**
 * Accordion Functionality
 * 
 * This script transforms h2 headings and their content into accordion elements.
 * It runs after content is loaded to wrap each h2 and its subsequent paragraphs
 * (until the next h2 or end of document) in accordion divs.
 */

// Function to transform content into accordions
function transformAccordions() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;
  
  // Get all h2 elements in the content that are NOT already inside an accordion
  const h2Elements = Array.from(contentContainer.querySelectorAll('h2')).filter(h2 => {
    // Check if this h2 is already inside an accordion
    return !h2.closest('.accordion');
  });
  
  if (h2Elements.length === 0) return;
  
  // Process each h2 element
  h2Elements.forEach((h2, index) => {
    // Create the accordion container
    const accordion = document.createElement('div');
    accordion.className = 'accordion';
    accordion.dataset.processed = 'true'; // Mark as processed to avoid re-processing
    
    // Create the accordion title container
    const accordionTitle = document.createElement('div');
    accordionTitle.className = 'accordion-title';
    
    // Create toggle icon
    const toggleIcon = document.createElement('div');
    toggleIcon.className = 'accordion-toggle-icon';
    
    // Move the h2 element into the accordion title
    h2.parentNode.insertBefore(accordion, h2);
    accordionTitle.appendChild(h2);
    accordionTitle.appendChild(toggleIcon);
    accordion.appendChild(accordionTitle);
    
    // Create the accordion content container
    const accordionContent = document.createElement('div');
    accordionContent.className = 'accordion-content';
    accordion.appendChild(accordionContent);
    
    // Find all elements after this h2 until the next h2 or until an accordion
    let nextElement = accordion.nextSibling;
    const elementsToMove = [];
    
    while (nextElement && 
           !(nextElement.tagName === 'H2' || 
             nextElement.classList?.contains('accordion'))) {
      // Only move paragraph, div, and similar content elements
      // Skip comment nodes, empty text nodes, etc.
      if (nextElement.nodeType === 1) { // Element node
        elementsToMove.push(nextElement);
      }
      nextElement = nextElement.nextSibling;
    }
    
    // Move elements into the accordion content
    elementsToMove.forEach(element => {
      accordionContent.appendChild(element);
    });
    
    // Add click event to toggle the accordion
    accordionTitle.addEventListener('click', () => {
      const content = accordion.querySelector('.accordion-content');
      accordion.classList.toggle('open');
      
      if (accordion.classList.contains('open')) {
        // Set max-height for opening animation
        content.style.maxHeight = content.scrollHeight + 'px';
        
        // Scroll the accordion title to the top of the viewport
        setTimeout(() => {
          // Check if still open before scrolling
          if (accordion.classList.contains('open')) { 
            accordion.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150); // Small delay to let any animations/transitions start
      } else {
        // Remove max-height for closing animation (rely on CSS)
        content.style.maxHeight = null;
      }
    });
  });
}

// Function to initialize accordions after content is loaded
function initAccordions() {
  // Check if accordions are already initialized
  if (document.querySelector('#content-container .accordion[data-processed="true"]')) {
    console.log('Accordions already processed, skipping initialization');
    return;
  }
  
  transformAccordions();
}

// Monitor for content changes
function setupAccordionObserver() {
  // Create a MutationObserver to watch for content changes
  const observer = new MutationObserver((mutations) => {
    // Check if any mutation affects the content container directly
    const shouldProcess = mutations.some(mutation => 
      mutation.type === 'childList' && 
      mutation.target.id === 'content-container' &&
      !mutation.target.querySelector('.accordion[data-processed="true"]')
    );
    
    if (shouldProcess) {
      // Content was updated and no processed accordions exist yet
      setTimeout(initAccordions, 100); // Small delay to ensure content is fully processed
    }
  });
  
  // Start observing content container
  const contentContainer = document.getElementById('content-container');
  if (contentContainer) {
    observer.observe(contentContainer, { childList: true, subtree: true });
  }
}

// Remove all accordions and restore original structure
function resetAccordions() {
  const contentContainer = document.getElementById('content-container');
  if (!contentContainer) return;
  
  // Find all accordions
  const accordions = contentContainer.querySelectorAll('.accordion[data-processed="true"]');
  
  accordions.forEach(accordion => {
    const parent = accordion.parentNode;
    const title = accordion.querySelector('.accordion-title h2');
    const content = accordion.querySelector('.accordion-content');
    
    // Move the h2 out of the accordion
    if (title) {
      parent.insertBefore(title, accordion);
    }
    
    // Move all content elements out
    if (content) {
      while (content.firstChild) {
        parent.insertBefore(content.firstChild, accordion);
      }
    }
    
    // Remove the empty accordion
    parent.removeChild(accordion);
  });
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setupAccordionObserver();
  
  // Apply to any content that might already be loaded
  initAccordions();
}); 