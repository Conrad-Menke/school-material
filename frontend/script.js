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

window.onload = async () => {
  try {
    const response = await fetch('/materialien');
    if (!response.ok) {
      throw new Error('Fehler beim Laden der Materialien');
    }

    const data = await response.json();
    console.log('Geladene Materialien:', data);

    const tableBody = document.querySelector('#dataTable tbody');
    tableBody.innerHTML = ''; // Tabelle leeren

    data.forEach(material => {
      const row = document.createElement('tr');
      row.innerHTML = `
          <td><a href="/singleview/${material.id}">${material.titel}</a></td>
          <td>${material.klasse}</td>
          <td>${material.fach}</td>
          <td>${material.thema}</td>
          <td>${material.materialform}</td>
          <td><button class="download" data-id="${material.id}">Herunterladen</button></td>
      `;
      tableBody.appendChild(row);
    });
    
    // Download-Button Event Listener hinzufügen
    document.querySelectorAll('.download').forEach(button => {
      button.addEventListener('click', event => {
        const materialId = button.getAttribute('data-id');
        window.location.href = `/download/${materialId}`;
      });
    });
  } catch (error) {
    console.error('Fehler beim Laden der Materialien:', error);
    document.getElementById('dataTable').innerHTML = '<p>Fehler beim Laden der Materialien.</p>';
  }
};

// Download-Button für alle gefilterten Dateien
document.getElementById('downloadAllBtn').addEventListener('click', () => {
  fetch('/download-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filter: currentFilters }),
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Fehler beim Herunterladen');
      }
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filtered_files.zip';
      a.click();
      window.URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Fehler beim Download:', error);
    });
});
