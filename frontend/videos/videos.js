// Global variables for data and filtering
let allVideos = [];
let currentFilters = {
  fach: '',
  klasse: '',
  thema: '',
  search: ''
};

// Pagination variables
let currentPage = 1;
const itemsPerPage = 12; // Videos per page
let totalPages = 1;

// Initialize the application
window.onload = async () => {
  try {
    // Show loading indicator
    document.getElementById('loading-videos').style.display = 'block';
    document.getElementById('video-grid').style.display = 'none';
    document.getElementById('no-videos').style.display = 'none';
    
    // Fetch all videos by filtering for materialform = "Video"
    const response = await fetch('/videos');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Store all videos data globally
    allVideos = await response.json();
    console.log(`Loaded ${allVideos.length} videos.`);
    
    // Hide loading indicator
    document.getElementById('loading-videos').style.display = 'none';
    
    if (allVideos.length === 0) {
      document.getElementById('no-videos').style.display = 'block';
      document.getElementById('showing-entries').textContent = 'Zeige 0 Videos';
    } else {
      document.getElementById('video-grid').style.display = 'grid';
      
      // Populate filter dropdowns
      populateFilterOptions();
      
      // Display videos in the grid
      displayVideos();
      
      // Set up event listeners for filters
      setupFilterListeners();
    }
    
  } catch (error) {
    console.error('Error loading videos:', error);
    document.getElementById('loading-videos').style.display = 'none';
    document.getElementById('no-videos').style.display = 'block';
    document.getElementById('no-videos').innerHTML = `
      <i class="fas fa-exclamation-triangle fa-2x text-danger"></i>
      <p class="text-danger">Fehler beim Laden der Videos: ${error.message}</p>
      <button class="btn btn-sm mt-sm" onclick="location.reload()">Erneut versuchen</button>
    `;
  }
};

// Populate the filter dropdown options
function populateFilterOptions() {
  // Get unique fach values
  const faecher = [...new Set(allVideos.map(item => item.fach))].filter(Boolean).sort((a, b) => 
    a.localeCompare(b, 'de')
  );
  populateDropdown('filter-fach', faecher);
  
  // Get unique klasse values
  const klassen = [...new Set(allVideos.map(item => item.klasse))].filter(Boolean).sort((a, b) => {
    // Sort numerically for klassen (e.g. "Klasse 5" comes before "Klasse 10")
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });
  populateDropdown('filter-klasse', klassen);
  
  // Get unique thema values
  const themen = [...new Set(allVideos.map(item => item.thema))].filter(Boolean).sort((a, b) => 
    a.localeCompare(b, 'de')
  );
  populateDropdown('filter-thema', themen);
}

// Helper to populate a dropdown
function populateDropdown(elementId, values) {
  const select = document.getElementById(elementId);
  if (!select) return;
  
  // Keep the first option
  const firstOption = select.options[0];
  select.innerHTML = '';
  select.appendChild(firstOption);
  
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

// Setup event listeners for the filter controls
function setupFilterListeners() {
  // Subject filter
  document.getElementById('filter-fach')?.addEventListener('change', function() {
    currentFilters.fach = this.value;
    currentPage = 1; // Reset to first page when filtering
    displayVideos();
  });
  
  // Class filter
  document.getElementById('filter-klasse')?.addEventListener('change', function() {
    currentFilters.klasse = this.value;
    currentPage = 1; // Reset to first page when filtering
    displayVideos();
  });
  
  // Thema filter
  document.getElementById('filter-thema')?.addEventListener('change', function() {
    currentFilters.thema = this.value;
    currentPage = 1; // Reset to first page when filtering
    displayVideos();
  });
  
  // Search input - debounced to avoid too many updates
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    let debounceTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        currentFilters.search = this.value.toLowerCase().trim();
        currentPage = 1; // Reset to first page when searching
        displayVideos();
      }, 300); // 300ms debounce delay
    });
  }
  
  // Clear filters button
  document.getElementById('clear-filters')?.addEventListener('click', function() {
    // Reset all filter values
    if (document.getElementById('filter-fach')) document.getElementById('filter-fach').value = '';
    if (document.getElementById('filter-klasse')) document.getElementById('filter-klasse').value = '';
    if (document.getElementById('filter-thema')) document.getElementById('filter-thema').value = '';
    if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
    
    // Reset filter object
    currentFilters = {
      fach: '',
      klasse: '',
      thema: '',
      search: ''
    };
    
    currentPage = 1; // Reset to first page when clearing filters
    
    // Refresh display
    displayVideos();
  });
  
  // Clear filters link in "no videos found" message
  document.getElementById('clear-filters-link')?.addEventListener('click', function(e) {
    e.preventDefault();
    document.getElementById('clear-filters')?.click();
  });
}

// Filter videos based on current filter settings
function filterVideos() {
  return allVideos.filter(video => {
    if (!video) return false; // Safety check for null/undefined videos
    
    // Check if video matches all current filters
    const matchesFach = !currentFilters.fach || 
      video.fach === currentFilters.fach;
    
    const matchesKlasse = !currentFilters.klasse || 
      video.klasse === currentFilters.klasse;
    
    const matchesThema = !currentFilters.thema || 
      video.thema === currentFilters.thema;
    
    // For search, check multiple fields
    let matchesSearch = true;
    if (currentFilters.search) {
      const searchTerm = currentFilters.search.toLowerCase();
      matchesSearch = 
        (video.titel && video.titel.toLowerCase().includes(searchTerm)) ||
        (video.thema && video.thema.toLowerCase().includes(searchTerm)) ||
        (video.beschreibung && video.beschreibung.toLowerCase().includes(searchTerm)) ||
        (video.fach && video.fach.toLowerCase().includes(searchTerm)) ||
        (video.klasse && video.klasse.toLowerCase().includes(searchTerm));
    }
    
    return matchesFach && matchesKlasse && matchesThema && matchesSearch;
  });
}

// Display filtered videos in the grid
function displayVideos() {
  const filteredVideos = filterVideos();
  const videoGrid = document.getElementById('video-grid');
  
  if (!videoGrid) {
    console.error('Video grid element not found!');
    return;
  }
  
  // Calculate pagination
  totalPages = Math.ceil(filteredVideos.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredVideos.length);
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);
  
  videoGrid.innerHTML = ''; // Clear the grid
  
  if (filteredVideos.length === 0) {
    document.getElementById('no-videos').style.display = 'block';
    videoGrid.style.display = 'none';
    updateEntryCount(0);
    updatePagination(0, 0, 0);
    return;
  }

  // Show the grid, hide the "no videos" message
  document.getElementById('no-videos').style.display = 'none';
  videoGrid.style.display = 'grid';

  // Add cards for each paginated video
  paginatedVideos.forEach(video => {
    if (!video) return; // Safety check
    
    const card = document.createElement('div');
    card.className = 'video-card';
    
    // Determine thumbnail source
    let thumbnailHtml = '';
    if (video.previewImage) {
      // Use custom preview image if available
      thumbnailHtml = `<img src="/uploads/${video.previewImage}" alt="${escapeHtml(video.titel)}">`;
    } else {
      // Use placeholder if no preview image is available
      thumbnailHtml = `<div class="placeholder-thumbnail"><i class="fas fa-film"></i></div>`;
    }
    
    // Create the video card HTML
    card.innerHTML = `
      <div class="video-thumbnail">
        ${thumbnailHtml}
        <div class="video-play-button">
          <i class="fas fa-play"></i>
        </div>
      </div>
      <div class="video-info">
        <h3 class="video-title">${escapeHtml(video.titel || 'Kein Titel')}</h3>
        <div class="video-meta">
          <div><i class="fas fa-graduation-cap"></i> ${escapeHtml(video.klasse || '-')}</div>
          <div><i class="fas fa-book"></i> ${escapeHtml(video.fach || '-')}</div>
        </div>
        <div class="video-description">${escapeHtml(video.beschreibung || 'Keine Beschreibung')}</div>
        <div class="video-actions">
          <a href="/singleview/${video.id}" class="btn btn-sm">
            <i class="fas fa-info-circle"></i> Details
          </a>
          <button class="btn btn-primary btn-sm download-btn" data-id="${video.id}">
            <i class="fas fa-download"></i> Herunterladen
          </button>
        </div>
      </div>
    `;
    
    // Add click event for the whole card to go to the video details
    card.querySelector('.video-thumbnail').addEventListener('click', () => {
      window.location.href = `/singleview/${video.id}`;
    });
    
    videoGrid.appendChild(card);
  });
  
  // Update the entry count display
  updateEntryCount(filteredVideos.length);
  
  // Update pagination
  updatePagination(currentPage, totalPages, filteredVideos.length);
  
  // Attach download button event listeners
  attachDownloadButtonListeners();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (text === null || text === undefined) {
    return '';
  }
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Update the entry count display
function updateEntryCount(count) {
  const countElement = document.getElementById('showing-entries');
  if (countElement) {
    countElement.textContent = `Zeige ${count} ${count === 1 ? 'Video' : 'Videos'}`;
  }
}

// Update pagination controls
function updatePagination(currentPage, totalPages, totalItems) {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;
  
  // Clear the pagination container
  paginationContainer.innerHTML = '';
  
  // Add page navigation if needed
  if (totalPages > 1) {
    let paginationHtml = '';
    
    // First and Previous buttons
    paginationHtml += `
      <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="1">
        <i class="fas fa-angle-double-left"></i>
      </button>
      <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
        <i class="fas fa-angle-left"></i>
      </button>
    `;
    
    // Page numbers
    const showPages = 5; // Number of page links to show
    const halfPages = Math.floor(showPages / 2);
    let startPage = Math.max(currentPage - halfPages, 1);
    let endPage = Math.min(startPage + showPages - 1, totalPages);
    
    if (endPage - startPage + 1 < showPages) {
      startPage = Math.max(endPage - showPages + 1, 1);
    }
    
    // Render page numbers
    for (let i = startPage; i <= endPage; i++) {
      paginationHtml += `
        <button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">
          ${i}
        </button>
      `;
    }
    
    // Next and Last buttons
    paginationHtml += `
      <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
        <i class="fas fa-angle-right"></i>
      </button>
      <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${totalPages}">
        <i class="fas fa-angle-double-right"></i>
      </button>
    `;
    
    paginationContainer.innerHTML = paginationHtml;
    
    // Add event listeners to pagination buttons
    document.querySelectorAll('.page-btn').forEach(button => {
      button.addEventListener('click', function() {
        if (this.hasAttribute('disabled')) return;
        
        const page = parseInt(this.getAttribute('data-page'));
        if (page && page !== currentPage) {
          currentPage = page;
          displayVideos();
          // Scroll to top of grid
          document.querySelector('.video-grid').scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  } else {
    // Remove pagination if only one page
    paginationContainer.innerHTML = '';
  }
}

// Attach event listeners to individual download buttons
function attachDownloadButtonListeners() {
  document.querySelectorAll('.download-btn').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      
      const materialId = button.getAttribute('data-id');
      const originalText = button.innerHTML;
      
      // Show loading state
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      button.disabled = true;
      
      // Trigger download
      window.location.href = `/download/${materialId}`;
      
      // Reset button state after a short delay
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = false;
      }, 1000);
    });
  });
}