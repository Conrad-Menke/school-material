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
const errorContainer = document.getElementById('error-content');
const prevPageButton = document.getElementById('prev-page');
const nextPageButton = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const zoomSelect = document.getElementById('zoom-select');

// Custom sweetalert-like notification system (in case SweetAlert isn't available)
const Notify = {
  fire: function(options) {
    // Check if SweetAlert is available
    if (typeof Swal !== 'undefined') {
      return Swal.fire(options);
    }
    
    // Fallback notification
    const confirmed = window.confirm(options.text || options.title);
    return Promise.resolve({
      isConfirmed: confirmed
    });
  }
};

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
  // Get material ID from URL
  const pathParts = window.location.pathname.split('/');
  const materialId = pathParts[pathParts.length - 1];
  console.log('Material-ID:', materialId);
  
  if (!materialId || isNaN(parseInt(materialId))) {
    throw new Error('Ungültige Material-ID');
  }
  
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
    try {
      await initPdfViewer(material.id);
    } catch (pdfError) {
      console.warn('PDF konnte nicht geladen werden:', pdfError);
      // Show a notification but don't treat this as a fatal error
      document.querySelector('.pdf-container').innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Das PDF konnte nicht geladen werden. Möglicherweise handelt es sich um ein anderes Dateiformat.</p>
          <p>Sie können das Material trotzdem <a href="/download/${material.id}" class="alert-link">herunterladen</a>.</p>
        </div>
      `;
    }
    
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
  // Sicherheitscheck
  if (!material) {
    throw new Error('Keine Materialdaten vorhanden');
  }
  
  // Titel und Metadaten
  document.title = `${escapeHtml(material.titel || 'Unbekanntes Material')} - Ursulinenrealschule`;
  document.getElementById('title').textContent = material.titel || 'Unbekanntes Material';
  
  // Set field values with safety checks
  setFieldValue('klasse', material.klasse);
  setFieldValue('fach', material.fach);
  setFieldValue('thema', material.thema);
  setFieldValue('materialform', material.materialform);
  setFieldValue('beschreibung', material.beschreibung);
  setFieldValue('autor', material.Autor);
  
  // Datum formatieren
  const datumElement = document.getElementById('datum');
  if (datumElement) {
    if (material.Datum) {
      try {
        const datum = new Date(material.Datum);
        datumElement.textContent = datum.toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } catch (e) {
        datumElement.textContent = material.Datum;
      }
    } else {
      datumElement.textContent = '-';
    }
  }
  
  // Links aktualisieren
  const downloadLink = document.getElementById('download-link');
  if (downloadLink) {
    downloadLink.href = `/download/${material.id}`;
    downloadLink.setAttribute('data-id', material.id);
    downloadLink.addEventListener('click', handleDownload);
  }
  
  const editLink = document.getElementById('edit-link');
  if (editLink) {
    editLink.href = `/edit/edit.html?id=${material.id}`;
  }
  
  // Lösch-Button konfigurieren
  const deleteButton = document.getElementById('delete-btn');
  if (deleteButton) {
    deleteButton.setAttribute('data-id', material.id);
    deleteButton.addEventListener('click', handleDelete);
  }
}

// Helper function to set field value with safety check
function setFieldValue(fieldId, value) {
  const element = document.getElementById(fieldId);
  if (element) {
    element.textContent = value || '-';
  }
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

// Handle download action
function handleDownload(event) {
  const link = event.currentTarget;
  const materialId = link.getAttribute('data-id');
  
  // Show loading state
  const originalText = link.innerHTML;
  link.innerHTML = '<i class="fas fa-spinner fa-spin"></i>&nbsp;&nbsp; Lädt...';
  link.classList.add('downloading');
  
  // Reset button state after download starts
  setTimeout(() => {
    link.innerHTML = originalText;
    link.classList.remove('downloading');
  }, 2000);
}

// Lösch-Aktion behandeln
function handleDelete(event) {
  event.preventDefault();
  
  const button = event.currentTarget;
  const materialId = button.getAttribute('data-id');
  
  // Bestätigung vom Benutzer einholen
  Notify.fire({
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Fehler beim Löschen des Materials');
    }
    
    // Erfolgsbestätigung
    Notify.fire({
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
    
    Notify.fire({
      title: 'Fehler',
      text: 'Beim Löschen ist ein Fehler aufgetreten: ' + error.message,
      icon: 'error',
      confirmButtonText: 'OK'
    });
  }
}

// PDF-Viewer initialisieren
function initPdfViewer(materialId) {
  return new Promise((resolve, reject) => {
    // Canvas-Elemente holen
    canvas = document.getElementById('pdf-preview');
    if (!canvas) {
      reject(new Error('PDF Canvas nicht gefunden'));
      return;
    }
    
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
      
      resolve(pdf);
    }).catch(function(error) {
      console.error('Fehler beim Laden des PDFs:', error);
      reject(error);
    });
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
    }).catch(function(error) {
      console.error('Error rendering PDF page:', error);
      pageRendering = false;
    });
  }).catch(function(error) {
    console.error('Error getting PDF page:', error);
    pageRendering = false;
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
  if (!pdfDoc) return;
  
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
  
  // Inhalt ausblenden
  materialContent.style.display = 'none';
  
  // Fehler anzeigen
  errorContainer.style.display = 'block';
  errorContainer.innerHTML = `
    <div class="alert alert-danger">
      <i class="fas fa-exclamation-triangle"></i>
      <h3>Fehler beim Laden des Materials</h3>
      <p>${escapeHtml(error.message || 'Unbekannter Fehler')}</p>
      <div class="mt-md">
        <button class="btn" onclick="window.location.reload()">Erneut versuchen</button>
        <button class="btn btn-secondary" onclick="window.location.href='/index.html'">Zurück zur Übersicht</button>
      </div>
    </div>
  `;
}