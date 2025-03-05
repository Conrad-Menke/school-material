// Global variables for data and filtering
let allMaterials = [];
let currentFilters = {
  fach: '',
  klasse: '',
  materialform: '',
  thema: '',
  search: ''
};

// Initialize the application
window.onload = async () => {
  try {
    // Fetch all materials
    const response = await fetch('/materialien');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Store all materials data globally
    allMaterials = await response.json();
    console.log('Loaded materials:', allMaterials);
    
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
    const tableContainer = document.getElementById('dataTable');
    tableContainer.innerHTML = `<p class="error">Fehler beim Laden der Materialien: ${error.message}</p>`;
  }
};

// Populate the filter dropdown options
function populateFilterOptions() {
  // Get unique fach values
  const faecher = [...new Set(allMaterials.map(item => item.fach))].filter(Boolean).sort();
  const fachSelect = document.getElementById('filter-fach');
  
  faecher.forEach(fach => {
    const option = document.createElement('option');
    option.value = fach;
    option.textContent = fach;
    fachSelect.appendChild(option);
  });
  
  // Get unique klasse values
  const klassen = [...new Set(allMaterials.map(item => item.klasse))].filter(Boolean).sort();
  const klasseSelect = document.getElementById('filter-klasse');
  
  klassen.forEach(klasse => {
    const option = document.createElement('option');
    option.value = klasse;
    option.textContent = klasse;
    klasseSelect.appendChild(option);
  });
  
  // Get unique materialform values
  const materialformen = [...new Set(allMaterials.map(item => item.materialform))].filter(Boolean).sort();
  const materialformSelect = document.getElementById('filter-materialform');
  
  materialformen.forEach(materialform => {
    const option = document.createElement('option');
    option.value = materialform;
    option.textContent = materialform;
    materialformSelect.appendChild(option);
  });
  
  // Get unique thema values (top 20 most common)
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
  
  const themaSelect = document.getElementById('filter-thema');
  
  topThemen.forEach(thema => {
    const option = document.createElement('option');
    option.value = thema;
    option.textContent = thema;
    themaSelect.appendChild(option);
  });
}

// Setup event listeners for the filter controls
function setupFilterListeners() {
  // Subject filter
  document.getElementById('filter-fach').addEventListener('change', function() {
    currentFilters.fach = this.value;
    displayMaterials();
  });
  
  // Class filter
  document.getElementById('filter-klasse').addEventListener('change', function() {
    currentFilters.klasse = this.value;
    displayMaterials();
  });
  
  // Materialform filter
  document.getElementById('filter-materialform').addEventListener('change', function() {
    currentFilters.materialform = this.value;
    displayMaterials();
  });
  
  // Thema filter
  document.getElementById('filter-thema').addEventListener('change', function() {
    currentFilters.thema = this.value;
    displayMaterials();
  });
  
  // Search input
  document.getElementById('search-input').addEventListener('input', function() {
    currentFilters.search = this.value.toLowerCase().trim();
    displayMaterials();
  });
  
  // Clear filters button
  document.getElementById('clear-filters').addEventListener('click', function() {
    // Reset all filter values
    document.getElementById('filter-fach').value = '';
    document.getElementById('filter-klasse').value = '';
    document.getElementById('filter-materialform').value = '';
    document.getElementById('filter-thema').value = '';
    document.getElementById('search-input').value = '';
    
    // Reset filter object
    currentFilters = {
      fach: '',
      klasse: '',
      materialform: '',
      thema: '',
      search: ''
    };
    
    // Refresh display
    displayMaterials();
  });
}

// Filter materials based on current filter settings
function filterMaterials() {
  return allMaterials.filter(material => {
    // Check if material matches all current filters
    const matchesFach = !currentFilters.fach || material.fach === currentFilters.fach;
    const matchesKlasse = !currentFilters.klasse || material.klasse === currentFilters.klasse;
    const matchesMaterialform = !currentFilters.materialform || material.materialform === currentFilters.materialform;
    const matchesThema = !currentFilters.thema || material.thema === currentFilters.thema;
    
    // For search, check multiple fields
    const matchesSearch = !currentFilters.search || 
      (material.titel && material.titel.toLowerCase().includes(currentFilters.search)) ||
      (material.thema && material.thema.toLowerCase().includes(currentFilters.search)) ||
      (material.beschreibung && material.beschreibung.toLowerCase().includes(currentFilters.search)) ||
      (material.materialform && material.materialform.toLowerCase().includes(currentFilters.search));
    
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
  
  tableBody.innerHTML = ''; // Clear the table
  
  if (filteredMaterials.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center">Keine Materialien gefunden.</td></tr>';
    updateEntryCount(0);
    return;
  }

  // Add rows for each filtered material
  filteredMaterials.forEach(material => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><a href="/singleview/${material.id}">${material.titel || 'Kein Titel'}</a></td>
      <td>${material.klasse || '-'}</td>
      <td>${material.fach || '-'}</td>
      <td>${material.thema || '-'}</td>
      <td>${material.materialform || '-'}</td>
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
  
  // Attach download button event listeners
  attachDownloadButtonListeners();
}

// Update the entry count display
function updateEntryCount(count) {
  const countElement = document.getElementById('showing-entries');
  if (countElement) {
    countElement.textContent = `Zeige ${count} ${count === 1 ? 'Eintrag' : 'Einträge'}`;
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
  document.getElementById('downloadAllBtn').addEventListener('click', () => {
    const filteredMaterials = filterMaterials();
    
    if (filteredMaterials.length === 0) {
      alert('Keine Materialien zum Herunterladen gefunden.');
      return;
    }
    
    if (filteredMaterials.length > 10 && !confirm(`Möchten Sie ${filteredMaterials.length} Materialien herunterladen? Dies könnte einige Zeit dauern.`)) {
      return;
    }
    
    fetch('/download-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        filter: {
          fach: currentFilters.fach,
          klasse: currentFilters.klasse,
          materialform: currentFilters.materialform,
          thema: currentFilters.thema,
          search: currentFilters.search
        } 
      }),
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
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'materialien.zip';
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(error => {
        console.error('Download error:', error);
        alert(`Fehler: ${error.message}`);
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
  
  // Sort the rows
  rows.sort((a, b) => {
    // Get text content, handling empty cells
    const aContent = a.cells[columnIndex]?.textContent.trim() || '';
    const bContent = b.cells[columnIndex]?.textContent.trim() || '';
    
    // Check if numeric (for proper number sorting)
    const isNumeric = !isNaN(aContent) && !isNaN(bContent);
    
    // Compare values
    if (isNumeric) {
      return ascending ? Number(aContent) - Number(bContent) : Number(bContent) - Number(aContent);
    } else {
      return ascending ? aContent.localeCompare(bContent) : bContent.localeCompare(aContent);
    }
  });
  
  // Re-append rows in sorted order
  rows.forEach(row => tbody.appendChild(row));
}