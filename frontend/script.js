// Global variables for data and filtering
let allMaterials = [];
let currentFilters = {
  fach: '',
  klasse: '',
  materialform: '',
  thema: '',
  search: ''
};

// Pagination variables
let currentPage = 1;
const itemsPerPage = 25; // Adjust as needed
let totalPages = 1;

// Initialize the application
window.onload = async () => {
  try {
    // Show loading indicator
    const tableBody = document.querySelector('#dataTable tbody');
    if (tableBody) {
      tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fas fa-spinner fa-spin"></i> Materialien werden geladen...</td></tr>';
    }
    
    // Fetch all materials
    const response = await fetch('/materialien');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Store all materials data globally
    allMaterials = await response.json();
    console.log(`Loaded ${allMaterials.length} materials.`);
    
    // Populate filter dropdowns
    populateFilterOptions();
    
    // Display materials in the table
    displayMaterials();
    
    // Set up event listeners for filters
    setupFilterListeners();
    
    // Set up download button event listener
    setupDownloadButton();
    
  } catch (error) {
    console.error('Error loading materials:', error);
    const tableBody = document.querySelector('#dataTable tbody');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">
        <i class="fas fa-exclamation-triangle"></i> Fehler beim Laden der Materialien: ${error.message}
        <br><button class="btn btn-sm mt-sm" onclick="location.reload()">Erneut versuchen</button>
      </td></tr>`;
    }
  }
};

// Populate the filter dropdown options
function populateFilterOptions() {
  // Get unique fach values
  const faecher = [...new Set(allMaterials.map(item => item.fach))].filter(Boolean).sort((a, b) => 
    a.localeCompare(b, 'de')
  );
  populateDropdown('filter-fach', faecher);
  
  // Get unique klasse values
  const klassen = [...new Set(allMaterials.map(item => item.klasse))].filter(Boolean).sort((a, b) => {
    // Sort numerically for klassen (e.g. "Klasse 5" comes before "Klasse 10")
    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
    return numA - numB;
  });
  populateDropdown('filter-klasse', klassen);
  
  // Get unique materialform values
  const materialformen = [...new Set(allMaterials.map(item => item.materialform))].filter(Boolean).sort((a, b) => 
    a.localeCompare(b, 'de')
  );
  populateDropdown('filter-materialform', materialformen);
  
  // Get unique thema values
  // First, count occurrences
  const themaCount = {};
  allMaterials.forEach(item => {
    if (item.thema) {
      themaCount[item.thema] = (themaCount[item.thema] || 0) + 1;
    }
  });
  
  // Sort by frequency and take top 20
  const topThemen = Object.keys(themaCount)
    .sort((a, b) => themaCount[b] - themaCount[a])
    .slice(0, 20);
  
  populateDropdown('filter-thema', topThemen);
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
    displayMaterials();
  });
  
  // Class filter
  document.getElementById('filter-klasse')?.addEventListener('change', function() {
    currentFilters.klasse = this.value;
    currentPage = 1; // Reset to first page when filtering
    displayMaterials();
  });
  
  // Materialform filter
  document.getElementById('filter-materialform')?.addEventListener('change', function() {
    currentFilters.materialform = this.value;
    currentPage = 1; // Reset to first page when filtering
    displayMaterials();
  });
  
  // Thema filter
  document.getElementById('filter-thema')?.addEventListener('change', function() {
    currentFilters.thema = this.value;
    currentPage = 1; // Reset to first page when filtering
    displayMaterials();
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
        displayMaterials();
      }, 300); // 300ms debounce delay
    });
  }
  
  // Clear filters button
  document.getElementById('clear-filters')?.addEventListener('click', function() {
    // Reset all filter values
    if (document.getElementById('filter-fach')) document.getElementById('filter-fach').value = '';
    if (document.getElementById('filter-klasse')) document.getElementById('filter-klasse').value = '';
    if (document.getElementById('filter-materialform')) document.getElementById('filter-materialform').value = '';
    if (document.getElementById('filter-thema')) document.getElementById('filter-thema').value = '';
    if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
    
    // Reset filter object
    currentFilters = {
      fach: '',
      klasse: '',
      materialform: '',
      thema: '',
      search: ''
    };
    
    currentPage = 1; // Reset to first page when clearing filters
    
    // Refresh display
    displayMaterials();
  });
}

// Filter materials based on current filter settings
function filterMaterials() {
  return allMaterials.filter(material => {
    if (!material) return false; // Safety check for null/undefined materials
    
    // Check if material matches all current filters
    const matchesFach = !currentFilters.fach || 
      material.fach === currentFilters.fach;
    
    const matchesKlasse = !currentFilters.klasse || 
      material.klasse === currentFilters.klasse;
    
    const matchesMaterialform = !currentFilters.materialform || 
      material.materialform === currentFilters.materialform;
    
    const matchesThema = !currentFilters.thema || 
      material.thema === currentFilters.thema;
    
    // For search, check multiple fields
    let matchesSearch = true;
    if (currentFilters.search) {
      const searchTerm = currentFilters.search.toLowerCase();
      matchesSearch = 
        (material.titel && material.titel.toLowerCase().includes(searchTerm)) ||
        (material.thema && material.thema.toLowerCase().includes(searchTerm)) ||
        (material.beschreibung && material.beschreibung.toLowerCase().includes(searchTerm)) ||
        (material.materialform && material.materialform.toLowerCase().includes(searchTerm)) ||
        (material.fach && material.fach.toLowerCase().includes(searchTerm)) ||
        (material.klasse && material.klasse.toLowerCase().includes(searchTerm));
    }
    
    return matchesFach && matchesKlasse && matchesMaterialform && matchesThema && matchesSearch;
  });
}

// Display filtered materials in the table
function displayMaterials() {
  const filteredMaterials = filterMaterials();
  const tableBody = document.querySelector('#dataTable tbody');
  
  if (!tableBody) {
    console.error('Table body element not found!');
    return;
  }
  
  // Calculate pagination
  totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages || 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredMaterials.length);
  const paginatedMaterials = filteredMaterials.slice(startIndex, endIndex);
  
  tableBody.innerHTML = ''; // Clear the table
  
  if (filteredMaterials.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">
          <i class="fas fa-search"></i> Keine Materialien gefunden.
          <p class="mt-sm">Versuchen Sie es mit anderen Filterkriterien oder <a href="#" id="clear-filters-link">setzen Sie die Filter zurück</a>.</p>
        </td>
      </tr>
    `;
    
    document.getElementById('clear-filters-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('clear-filters')?.click();
    });
    
    updateEntryCount(0);
    updatePagination(0, 0, 0);
    return;
  }

  // Add rows for each paginated material
  paginatedMaterials.forEach(material => {
    if (!material) return; // Safety check
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><a href="/singleview/${material.id}" class="material-link">${escapeHtml(material.titel || 'Kein Titel')}</a></td>
      <td>${escapeHtml(material.klasse || '-')}</td>
      <td>${escapeHtml(material.fach || '-')}</td>
      <td>${escapeHtml(material.thema || '-')}</td>
      <td>${escapeHtml(material.materialform || '-')}</td>
      <td>
        <button class="btn btn-primary download-btn" data-id="${material.id}">
          <i class="fas fa-download"></i>&nbsp;Herunterladen
        </button>
      </td>
    `;
    tableBody.appendChild(row);
  });
  
  // Update the entry count display
  updateEntryCount(filteredMaterials.length);
  
  // Update pagination
  updatePagination(currentPage, totalPages, filteredMaterials.length);
  
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
    countElement.textContent = `Zeige ${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`;
  }
}

// Update pagination controls
function updatePagination(currentPage, totalPages, totalItems) {
  const paginationContainer = document.getElementById('pagination-container');
  if (!paginationContainer) return;
  
  // Add page navigation if needed
  if (totalPages > 1) {
    // Create or update the pagination element
    let paginationElement = document.getElementById('pagination');
    if (!paginationElement) {
      paginationElement = document.createElement('div');
      paginationElement.id = 'pagination';
      paginationElement.className = 'pagination';
      paginationContainer.appendChild(paginationElement);
    }
    
    // Generate pagination HTML
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
    
    paginationElement.innerHTML = paginationHtml;
    
    // Add event listeners to pagination buttons
    document.querySelectorAll('.page-btn').forEach(button => {
      button.addEventListener('click', function() {
        if (this.hasAttribute('disabled')) return;
        
        const page = parseInt(this.getAttribute('data-page'));
        if (page && page !== currentPage) {
          currentPage = page;
          displayMaterials();
          // Scroll to top of table
          document.querySelector('.table-container')?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  } else {
    // Remove pagination if only one page
    const paginationElement = document.getElementById('pagination');
    if (paginationElement) {
      paginationElement.remove();
    }
  }
}

// Attach event listeners to individual download buttons
function attachDownloadButtonListeners() {
  document.querySelectorAll('.download-btn').forEach(button => {
    button.addEventListener('click', event => {
      const materialId = button.getAttribute('data-id');
      const originalText = button.innerHTML;
      
      // Show loading state
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;&nbsp; Lädt...';
      button.disabled = true;
      
      // Trigger download after a small delay to show loading state
      setTimeout(() => {
        window.location.href = `/download/${materialId}`;
        
        // Reset button state after a short delay
        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 1000);
      }, 500);
    });
  });
}

// Set up the "Download All" button
function setupDownloadButton() {
  document.getElementById('downloadAllBtn')?.addEventListener('click', () => {
    const filteredMaterials = filterMaterials();
    
    if (filteredMaterials.length === 0) {
      alert('Keine Materialien zum Herunterladen gefunden.');
      return;
    }
    
    // Confirm download of large numbers of files
    if (filteredMaterials.length > 10 && !confirm(`Möchten Sie ${filteredMaterials.length} Materialien herunterladen? Dies könnte einige Zeit dauern.`)) {
      return;
    }
    
    // Change button state
    const downloadBtn = document.getElementById('downloadAllBtn');
    const originalText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;&nbsp; Wird vorbereitet...';
    downloadBtn.disabled = true;
    
    // Convert filter object to the format expected by the server
    const serverFilters = {
      0: currentFilters.search, // For title
      1: currentFilters.klasse,
      2: currentFilters.fach,
      3: currentFilters.thema,
      4: currentFilters.materialform
    };
    
    fetch('/download-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filter: serverFilters }),
    })
      .then(response => {
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Keine Materialien gefunden.');
          }
          throw new Error(`Server error: ${response.status}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'materialien.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Reset button state
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
      })
      .catch(error => {
        console.error('Download error:', error);
        alert(`Fehler: ${error.message}`);
        
        // Reset button state
        downloadBtn.innerHTML = originalText;
        downloadBtn.disabled = false;
      });
  });
}

// Sort table by column
function sortTable(columnIndex) {
  const table = document.getElementById('dataTable');
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));
  
  // Skip if no data or only "no materials found" message
  if (rows.length === 0 || (rows.length === 1 && rows[0].cells.length === 1)) {
    return;
  }
  
  // Toggle sort direction
  let ascending = table.getAttribute('data-sort-dir') !== 'asc';
  table.setAttribute('data-sort-dir', ascending ? 'asc' : 'desc');
  
  // Update sort icons (optional visual enhancement)
  table.querySelectorAll('.table-sort i').forEach(icon => {
    icon.className = 'fas fa-sort';
  });
  const currentSortButton = table.querySelectorAll('.table-sort')[columnIndex];
  if (currentSortButton) {
    const icon = currentSortButton.querySelector('i');
    if (icon) {
      icon.className = ascending ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
  }
  
  // Sort the rows with null/undefined handling
  rows.sort((a, b) => {
    // Get text content, safely handling null/empty cells
    const cellA = a.cells[columnIndex];
    const cellB = b.cells[columnIndex];
    
    // Handle missing cells (return empty string)
    const aContent = cellA ? cellA.textContent.trim() : '';
    const bContent = cellB ? cellB.textContent.trim() : '';
    
    // Sort empty/null values to the end regardless of sort direction
    if (!aContent && !bContent) return 0;
    if (!aContent) return ascending ? 1 : -1;
    if (!bContent) return ascending ? -1 : 1;
    
    // Check if numeric (for proper number sorting)
    const aNum = parseFloat(aContent);
    const bNum = parseFloat(bContent);
    const isNumeric = !isNaN(aNum) && !isNaN(bNum);
    
    // Compare values
    if (isNumeric) {
      return ascending ? aNum - bNum : bNum - aNum;
    } else {
      return ascending ? aContent.localeCompare(bContent, 'de') : bContent.localeCompare(aContent, 'de');
    }
  });
  
  // Re-append rows in sorted order
  rows.forEach(row => tbody.appendChild(row));
}