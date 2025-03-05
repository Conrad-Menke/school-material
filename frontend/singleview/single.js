// Globale Variablen für PDF-Anzeige
let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1.0;
let canvas = null;
let ctx = null;

// DOM-Elemente
const loadingIndicator = document.getElementById('loading-indicator');
const materialContent = document.getElementById('material-content');
const errorContainer = document.getElementById('error-container');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const zoomSelect = document.getElementById('zoom-select');

// Initialisiere die Ansicht
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadMaterialDetails();
  } catch (error) {
    showError(error);
  }
});

// Material-Details laden
async function loadMaterialDetails() {
  const materialId = window.location.pathname.split('/').pop();
  console.log('Material-ID:', materialId);
  
  try {
    // Material-Daten laden
    const response = await fetch(`/materialien/${materialId}`);
    
    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Daten: ${response.status}`);
    }
    
    const material = await response.json();
    console.log('Geladene Materialdaten:', material);
    
    // UI aktualisieren
    updateUI(material);
    
    // PDF laden
    initPdfViewer(material.id);
    
    // Lade-Indikator ausblenden, Inhalt anzeigen
    loadingIndicator.style.display = 'none';
    materialContent.style.display = 'block';
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    showError(error);
  }
}

// UI mit Material-Daten aktualisieren
function updateUI(material) {
  // Titel und Metadaten
  document.title = `${material.titel} - Ursulinenrealschule`;
  document.getElementById('title').textContent = material.titel;
  document.getElementById('klasse').textContent = material.klasse || '-';
  document.getElementById('fach').textContent = material.fach || '-';
  document.getElementById('thema').textContent = material.thema || '-';
  document.getElementById('materialform').textContent = material.materialform || '-';
  document.getElementById('beschreibung').textContent = material.beschreibung || '-';
  document.getElementById('autor').textContent = material.Autor || '-';
  
  // Datum formatieren
  const datumElement = document.getElementById('datum');
  if (material.Datum) {
    const datum = new Date(material.Datum);
    datumElement.textContent = datum.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } else {
    datumElement.textContent = '-';
  }
  
  // Links aktualisieren
  document.getElementById('download-link').href = `/download/${material.id}`;
  document.getElementById('edit-link').href = `/edit/edit.html?id=${material.id}`;
  
  // Lösch-Button konfigurieren
  const deleteButton = document.getElementById('delete-btn');
  deleteButton.setAttribute('data-id', material.id);
  deleteButton.addEventListener('click', handleDelete);
}

// Lösch-Aktion behandeln
function handleDelete(event) {
  event.preventDefault();
  
  const button = event.currentTarget;
  const materialId = button.getAttribute('data-id');
  
  // Bestätigung vom Benutzer einholen
  Swal.fire({
    title: 'Material löschen?',
    text: 'Diese Aktion kann nicht rückgängig gemacht werden!',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Ja, löschen',
    cancelButtonText: 'Abbrechen'
  }).then((result) => {
    if (result.isConfirmed) {
      deleteMaterial(materialId);
    }
  });
}

// Material löschen
async function deleteMaterial(materialId) {
  try {
    const response = await fetch(`/materialien/${materialId}`, { 
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Fehler beim Löschen des Materials');
    }
    
    // Erfolgsbestätigung
    Swal.fire({
      title: 'Gelöscht!',
      text: 'Das Material wurde erfolgreich gelöscht.',
      icon: 'success',
      confirmButtonText: 'OK'
    }).then(() => {
      // Zurück zur Übersicht
      window.location.href = '/index.html';
    });
  } catch (error) {
    console.error('Fehler beim Löschen:', error);
    
    Swal.fire({
      title: 'Fehler',
      text: 'Beim Löschen ist ein Fehler aufgetreten.',
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}

// PDF-Viewer initialisieren
function initPdfViewer(materialId) {
  // Canvas-Elemente holen
  canvas = document.getElementById('pdf-preview');
  ctx = canvas.getContext('2d');
  
  // PDF-URL
  const pdfUrl = `/download/${materialId}`;
  
  // PDF laden
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  loadingTask.promise.then(function(pdf) {
    console.log('PDF geladen, Seitenanzahl:', pdf.numPages);
    
    pdfDoc = pdf;
    pageInfo.textContent = `Seite ${pageNum} von ${pdf.numPages}`;
    
    // Aktiviere/deaktiviere Seitennavigation
    updateNavButtons();
    
    // Erste Seite rendern
    renderPage(pageNum);
    
    // Event-Listener für Navigation hinzufügen
    prevPageButton.addEventListener('click', onPrevPage);
    nextPageButton.addEventListener('click', onNextPage);
    zoomSelect.addEventListener('change', onZoomChange);
  }).catch(function(error) {
    console.error('Fehler beim Laden des PDFs:', error);
    
    // PDF-Container mit Fehlermeldung ersetzen
    const pdfContainer = document.querySelector('.pdf-container');
    pdfContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Das PDF konnte nicht geladen werden. Möglicherweise handelt es sich um ein anderes Dateiformat.</p>
        <p>Sie können das Material trotzdem <a href="/download/${materialId}" class="alert-link">herunterladen</a>.</p>
      </div>
    `;
  });
}

// Seite rendern
function renderPage(num) {
  pageRendering = true;
  
  // Seite aus dem PDF holen
  pdfDoc.getPage(num).then(function(page) {
    // Viewport basierend auf Skalierung erstellen
    const viewport = page.getViewport({ scale: scale });
    
    // Canvas für die Seitengröße vorbereiten
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render-Kontext
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };
    
    // Seite rendern
    const renderTask = page.render(renderContext);
    
    // Warten auf Abschluss des Renderns
    renderTask.promise.then(function() {
      pageRendering = false;
      
      if (pageNumPending !== null) {
        // Wenn eine Seite aussteht, diese rendern
        renderPage(pageNumPending);
        pageNumPending = null;
      }
    });
  });
  
  // Seiteninformation aktualisieren
  pageInfo.textContent = `Seite ${num} von ${pdfDoc.numPages}`;
  
  // Schaltflächen aktualisieren
  updateNavButtons();
}

// Zur vorherigen Seite wechseln
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}

// Zur nächsten Seite wechseln
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}

// Zoom ändern
function onZoomChange() {
  scale = parseFloat(zoomSelect.value);
  queueRenderPage(pageNum);
}

// Navigationsschaltflächen aktualisieren
function updateNavButtons() {
  prevPageButton.disabled = pageNum <= 1;
  nextPageButton.disabled = pageNum >= pdfDoc.numPages;
}

// Seitenrendering in Warteschlange stellen
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

// Fehlerbehandlung
function showError(error) {
  console.error('Fehler:', error);
  
  // Lade-Indikator ausblenden
  loadingIndicator.style.display = 'none';
  
  // Fehler anzeigen
  errorContainer.style.display = 'block';
}

// SweetAlert2 als Polyfill, falls nicht geladen
if (typeof Swal === 'undefined') {
  window.Swal = {
    fire: function(options) {
      const confirmed = window.confirm(options.text || options.title);
      return Promise.resolve({
        isConfirmed: confirmed
      });
    }
  };
}