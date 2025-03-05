// Globales Filter-Objekt
let currentFilters = {};

// Filter-Funktion für Spalten
function filterColumn(columnIndex) {
  const input = document.querySelectorAll('thead input')[columnIndex];
  const filterValue = input.value.toLowerCase();
  currentFilters[columnIndex] = filterValue;

  const table = document.getElementById('dataTable');
  const rows = table.querySelectorAll('tbody tr');

  rows.forEach(row => {
    let isVisible = true;
    Object.keys(currentFilters).forEach(index => {
      const cell = row.cells[index];
      if (cell && !cell.textContent.toLowerCase().includes(currentFilters[index])) {
        isVisible = false;
      }
    });
    row.style.display = isVisible ? '' : 'none';
  });
}

// Sortier-Funktion für Tabellen
function sortTable(columnIndex) {
  const table = document.getElementById('dataTable');
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const isNumeric = !isNaN(rows[0].cells[columnIndex].textContent.trim());

  let ascending = table.getAttribute('data-sort-asc') !== 'true';
  table.setAttribute('data-sort-asc', ascending);

  rows.sort((a, b) => {
    const aText = a.cells[columnIndex].textContent.trim();
    const bText = b.cells[columnIndex].textContent.trim();

    if (isNumeric) {
      return ascending ? aText - bText : bText - aText;
    } else {
      return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
    }
  });

  const tbody = table.querySelector('tbody');
  rows.forEach(row => tbody.appendChild(row));
}

// Improve error handling in window.onload
window.onload = async () => {
  try {
    const response = await fetch('/materialien');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Loaded data:', data); // Debug output
    
    const tableBody = document.querySelector('#dataTable tbody');
    if (!tableBody) {
      console.error('Table body element not found!');
      return;
    }
    
    tableBody.innerHTML = ''; // Clear the table
    
    if (data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">Keine Materialien gefunden.</td></tr>';
      return;
    }

    data.forEach(material => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td><a href="/singleview/${material.id}">${material.titel || 'Kein Titel'}</a></td>
          <td>${material.klasse || '-'}</td>
          <td>${material.fach || '-'}</td>
          <td>${material.thema || '-'}</td>
          <td>${material.materialform || '-'}</td>
          <td><button class="download" data-id="${material.id}">Herunterladen</button></td>
      `;
      tableBody.appendChild(row);
    });
    
    // Download-Button Event Listener
    document.querySelectorAll('.download').forEach(button => {
      button.addEventListener('click', event => {
        const materialId = button.getAttribute('data-id');
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Lädt...';
        button.disabled = true;
        
        // Nach dem Download (oder mit einem Timeout simulieren)
        setTimeout(() => {
          window.location.href = `/download/${materialId}`;
          
          // Optional: Button zurücksetzen nach kurzem Delay
          setTimeout(() => {
            button.innerHTML = '<i class="fas fa-download"></i> Herunterladen';
            button.disabled = false;
          }, 1000);
        }, 500);
      });
    });
  } catch (error) {
    console.error('Error loading materials:', error);
    const tableContainer = document.getElementById('dataTable');
    tableContainer.innerHTML = `<p class="error">Fehler beim Laden der Materialien: ${error.message}</p>`;
  }
};

// Improve error handling for downloadAllBtn
document.getElementById('downloadAllBtn').addEventListener('click', () => {
  // Check if any filters are applied
  const hasFilters = Object.keys(currentFilters).some(key => currentFilters[key]);
  
  if (!hasFilters) {
    if (!confirm('Möchten Sie alle Materialien herunterladen? Dies könnte einige Zeit dauern.')) {
      return;
    }
  }
  
  fetch('/download-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filter: currentFilters }),
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