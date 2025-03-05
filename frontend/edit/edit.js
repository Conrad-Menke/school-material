// Globale Variablen
let materialId = null;
let oldFilePath = '';
let oldFileName = '';

// DOM-Elemente
const editForm = document.getElementById('editForm');
const loadingIndicator = document.getElementById('loading-indicator');
const editProgress = document.getElementById('edit-progress');
const editSuccess = document.getElementById('edit-success');
const editError = document.getElementById('edit-error');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const errorMessage = document.getElementById('error-message');
const currentFileInfo = document.getElementById('current-file');
const viewMaterialBtn = document.getElementById('view-material-btn');

// Maximale Dateigröße in Bytes (20MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Erlaubte Dateitypen
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-zip-compressed'
];

// Initialisierung
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Material-ID aus der URL lesen
    const urlParams = new URLSearchParams(window.location.search);
    materialId = urlParams.get('id');
    
    if (!materialId) {
      showError('Keine Material-ID gefunden');
      return;
    }
    
    console.log('Material-ID für Bearbeitung:', materialId);
    
    // Material-Daten laden
    await loadMaterialData();
    
    // Event-Listener für das Formular
    editForm.addEventListener('submit', handleFormSubmit);
    
    // Datei-Input validieren
    document.getElementById('material-input').addEventListener('change', validateFileInput);
    
  } catch (error) {
    showError('Fehler beim Laden der Daten', error);
  }
});

// Material-Daten laden
async function loadMaterialData() {
  try {
    const response = await fetch(`/materialien/${materialId}`);
    console.log('Server-Antwortstatus:', response.status);
    
    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Daten: ${response.status}`);
    }
    
    const material = await response.json();
    console.log('Materialdaten geladen:', material);
    
    // Formular mit den Materialdaten füllen
    fillForm(material);
    
    // Lade-Indikator ausblenden, Formular anzeigen
    loadingIndicator.style.display = 'none';
    editForm.style.display = 'block';
    
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    showError('Fehler beim Laden der Daten', error);
  }
}

// Formular mit Material-Daten füllen
function fillForm(material) {
  // Grundlegende Informationen
  document.getElementById('klasse-input').value = material.klasse || '';
  document.getElementById('fach-input').value = material.fach || '';
  document.getElementById('thema-input').value = material.thema || '';
  document.getElementById('materialform-input').value = material.materialform || '';
  document.getElementById('titel-input').value = material.titel || '';
  document.getElementById('beschreibung-input').value = material.beschreibung || '';
  
  // Datei-Informationen speichern
  oldFilePath = material.dateiPfad || '';
  oldFileName = material.originalDateiname || '';
  
  // Aktuelle Datei anzeigen
  if (oldFileName) {
    currentFileInfo.innerHTML = `Aktuelle Datei: <strong>${oldFileName}</strong>`;
    
    // View-Button konfigurieren
    viewMaterialBtn.addEventListener('click', () => {
      window.location.href = `/singleview/${materialId}`;
    });
  } else {
    currentFileInfo.textContent = 'Keine Datei vorhanden';
  }
}

// Formular-Übermittlung behandeln
async function handleFormSubmit(event) {
  event.preventDefault();
  
  // Formular validieren
  if (!validateForm()) {
    return;
  }
  
  // FormData erstellen
  const formData = new FormData(editForm);
  const materialInput = document.getElementById('material-input');
  
  // Prüfen, ob das Datei-Feld leer ist
  const isFileEmpty = !materialInput.files.length;
  
  // Falls das Datei-Feld leer ist, übernehme die alten Dateiinformationen
  if (isFileEmpty) {
    // Lösche die beiden Datenbankfelder
    formData.delete('dateiPfad');
    formData.delete('originalDateiname');
    
    // Füge die alten Werte zu FormData hinzu, falls sie vorhanden sind
    if (oldFilePath && oldFileName) {
      formData.append('dateiPfad', oldFilePath);
      formData.append('originalDateiname', oldFileName);
    }
  }
  
  // Material-ID hinzufügen
  formData.append('id', materialId);
  
  // UI aktualisieren
  editForm.style.display = 'none';
  editProgress.style.display = 'block';
  
  try {
    // Material aktualisieren
    const response = await updateMaterial(formData);
    
    // Erfolgsmeldung anzeigen
    editProgress.style.display = 'none';
    editSuccess.style.display = 'block';
    
    console.log('Aktualisierung erfolgreich:', response);
  } catch (error) {
    // Fehlermeldung anzeigen
    editProgress.style.display = 'none';
    editError.style.display = 'block';
    errorMessage.textContent = error.message || 'Beim Speichern ist ein Fehler aufgetreten.';
    
    console.error('Fehler beim Speichern:', error);
  }
}

// Material zum Server hochladen/aktualisieren
function updateMaterial(formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Progress-Event
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        updateProgressBar(percentComplete);
      }
    });
    
    // Load-Event (erfolgreich)
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          resolve({ message: 'Material erfolgreich aktualisiert!' });
        }
      } else {
        let errorMsg = 'Beim Speichern ist ein Fehler aufgetreten.';
        
        try {
          const response = JSON.parse(xhr.responseText);
          errorMsg = response.error || errorMsg;
        } catch (e) {
          // Fallback auf Standard-Fehlermeldung
        }
        
        reject(new Error(errorMsg));
      }
    });
    
    // Error-Event
    xhr.addEventListener('error', () => {
      reject(new Error('Netzwerkfehler beim Speichern.'));
    });
    
    // Timeout-Event
    xhr.addEventListener('timeout', () => {
      reject(new Error('Zeitüberschreitung beim Speichern.'));
    });
    
    // Anfrage öffnen und senden
    xhr.open('POST', '/update-material', true);
    xhr.send(formData);
  });
}

// Fortschrittsbalken aktualisieren
function updateProgressBar(percent) {
  progressBarFill.style.width = `${percent}%`;
  progressText.textContent = `${percent}%`;
}

// Formular validieren
function validateForm() {
  // Felder validieren
  const requiredFields = [
    'klasse-input',
    'fach-input',
    'materialform-input',
    'thema-input',
    'titel-input',
    'beschreibung-input'
  ];
  
  for (const fieldId of requiredFields) {
    const field = document.getElementById(fieldId);
    if (!field.value.trim()) {
      alert(`Bitte füllen Sie das Feld "${field.previousElementSibling.textContent.replace(':', '')}" aus.`);
      field.focus();
      return false;
    }
  }
  
  // Datei-Input validieren (falls eine Datei ausgewählt wurde)
  const fileInput = document.getElementById('material-input');
  if (fileInput.files.length > 0 && !validateFileInput()) {
    return false;
  }
  
  return true;
}

// Datei-Input validieren
function validateFileInput() {
  const fileInput = document.getElementById('material-input');
  const file = fileInput.files[0];
  
  // Wenn keine Datei ausgewählt wurde, ist das OK (da optional beim Bearbeiten)
  if (!file) {
    return true;
  }
  
  // Dateigröße überprüfen
  if (file.size > MAX_FILE_SIZE) {
    alert(`Die Datei ist zu groß. Die maximale Dateigröße beträgt ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
    fileInput.value = '';
    return false;
  }
  
  // Dateityp überprüfen (wenn möglich)
  if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
    // Dateiendung überprüfen (als Fallback)
    const fileName = file.name.toLowerCase();
    const isAllowedExtension = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.zip'].some(ext => 
      fileName.endsWith(ext)
    );
    
    if (!isAllowedExtension) {
      alert('Dieser Dateityp wird nicht unterstützt. Bitte laden Sie eine PDF-, Word-, PowerPoint- oder ZIP-Datei hoch.');
      fileInput.value = '';
      return false;
    }
  }
  
  return true;
}

// Bearbeitung abbrechen
function cancelEdit() {
  if (confirm('Möchten Sie die Bearbeitung wirklich abbrechen? Alle nicht gespeicherten Änderungen gehen verloren.')) {
    window.location.href = `/singleview/${materialId}`;
  }
}

// Edit-UI zurücksetzen
function resetEditUI() {
  editForm.style.display = 'block';
  editProgress.style.display = 'none';
  editSuccess.style.display = 'none';
  editError.style.display = 'none';
  
  progressBarFill.style.width = '0%';
  progressText.textContent = '0%';
}

// Fehler anzeigen
function showError(title, error) {
  console.error(title, error);
  
  loadingIndicator.style.display = 'none';
  
  const errorElement = document.createElement('div');
  errorElement.className = 'alert alert-danger';
  errorElement.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <h3>${title}</h3>
    <p>${error && error.message ? error.message : 'Ein unbekannter Fehler ist aufgetreten.'}</p>
    <div class="mt-md">
      <button class="btn" onclick="window.location.href='/index.html'">Zurück zur Übersicht</button>
    </div>
  `;
  
  document.querySelector('.card-body').appendChild(errorElement);
}