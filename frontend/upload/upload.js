// DOM-Elemente
const uploadForm = document.getElementById('uploadForm');
const uploadProgress = document.getElementById('upload-progress');
const uploadSuccess = document.getElementById('upload-success');
const uploadError = document.getElementById('upload-error');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
const errorMessage = document.getElementById('error-message');

// Dropdown-Elemente
const fachSelect = document.getElementById('fach');
const materialformSelect = document.getElementById('materialform');
const klasseSelect = document.getElementById('klasse');

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

// Erlaubte Dateiendungen (verwendet für RegEx)
const ALLOWED_EXTENSIONS = /\.(pdf|doc|docx|ppt|pptx|zip)$/i;

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
  // Dropdown-Optionen sortieren
  sortSelectOptions();
  
  // Event-Listener für das Formular
  uploadForm.addEventListener('submit', handleFormSubmit);
  
  // Datei-Input validieren
  document.getElementById('material').addEventListener('change', validateFileInput);
  
  // Tooltip-Initialisierung (falls verwendet)
  initializeTooltips();
});

// Tooltip-Initialisierung (kann bei Bedarf angepasst werden)
function initializeTooltips() {
  // Diese Funktion kann genutzt werden, um Tooltips zu initialisieren
  // (z.B. mit Bootstrap oder einer eigenen Implementierung)
  const tooltips = document.querySelectorAll('[data-tooltip]');
  
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseover', (e) => {
      // Tooltip-Logik hier
    });
  });
}

// Dropdown-Optionen sortieren
function sortSelectOptions() {
  // Fach-Dropdown sortieren
  sortOptions(fachSelect);
  
  // Materialform-Dropdown sortieren
  sortOptions(materialformSelect);
}

// Optionen in einem Select-Element sortieren
function sortOptions(selectElement) {
  if (!selectElement) return;
  
  const options = Array.from(selectElement.options);
  
  // Die erste Option ("Bitte wählen") beibehalten
  const firstOption = options.shift();
  
  // Die restlichen Optionen sortieren
  const sortedOptions = options.sort((a, b) => {
    return a.text.localeCompare(b.text, 'de');
  });
  
  // Select-Element leeren
  selectElement.innerHTML = '';
  
  // Erste Option wieder hinzufügen
  selectElement.appendChild(firstOption);
  
  // Sortierte Optionen hinzufügen
  sortedOptions.forEach(option => {
    selectElement.appendChild(option);
  });
}

// Formular-Übermittlung behandeln
async function handleFormSubmit(event) {
  event.preventDefault();
  
  // Formular validieren
  if (!validateForm()) {
    return;
  }
  
  // FormData erstellen
  const formData = new FormData(uploadForm);
  
  // UI aktualisieren
  uploadForm.style.display = 'none';
  uploadProgress.style.display = 'block';
  
  try {
    // Material hochladen
    const response = await uploadMaterial(formData);
    
    // Erfolgsmeldung anzeigen
    uploadProgress.style.display = 'none';
    uploadSuccess.style.display = 'block';
    
    console.log('Hochladen erfolgreich:', response);
  } catch (error) {
    // Fehlermeldung anzeigen
    uploadProgress.style.display = 'none';
    uploadError.style.display = 'block';
    errorMessage.textContent = error.message || 'Beim Hochladen ist ein Fehler aufgetreten.';
    
    console.error('Fehler beim Hochladen:', error);
  }
}

// Material zum Server hochladen
function uploadMaterial(formData) {
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
          resolve({ message: 'Material erfolgreich hochgeladen!' });
        }
      } else {
        let errorMsg = 'Beim Hochladen ist ein Fehler aufgetreten.';
        
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
      reject(new Error('Netzwerkfehler beim Hochladen.'));
    });
    
    // Timeout-Event
    xhr.addEventListener('timeout', () => {
      reject(new Error('Zeitüberschreitung beim Hochladen.'));
    });
    
    // Anfrage öffnen und senden
    xhr.open('POST', '/upload', true);
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
  // Pflichtfelder prüfen
  const requiredFields = [
    { id: 'klasse', name: 'Klasse' },
    { id: 'fach', name: 'Unterrichtsfach' },
    { id: 'materialform', name: 'Materialform' },
    { id: 'thema', name: 'Unterrichtsthema' },
    { id: 'titel', name: 'Materialtitel' },
    { id: 'beschreibung', name: 'Beschreibung' },
    { id: 'autor', name: 'AutorIn' }
  ];
  
  for (const field of requiredFields) {
    const element = document.getElementById(field.id);
    if (!element || !element.value.trim()) {
      alert(`Bitte füllen Sie das Feld "${field.name}" aus.`);
      if (element) element.focus();
      return false;
    }
  }
  
  // Datei-Input validieren
  if (!validateFileInput()) {
    return false;
  }
  
  return true;
}

// Datei-Input validieren
function validateFileInput() {
  const fileInput = document.getElementById('material');
  if (!fileInput || !fileInput.files.length) {
    alert('Bitte wählen Sie eine Datei aus.');
    if (fileInput) fileInput.focus();
    return false;
  }
  
  const file = fileInput.files[0];
  
  // Dateigröße überprüfen
  if (file.size > MAX_FILE_SIZE) {
    alert(`Die Datei ist zu groß. Die maximale Dateigröße beträgt ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
    fileInput.value = '';
    return false;
  }
  
  // Dateityp überprüfen
  let isValidType = false;
  
  // MIME-Typ überprüfen (wenn verfügbar)
  if (file.type && ALLOWED_FILE_TYPES.includes(file.type)) {
    isValidType = true;
  }
  
  // Dateiendung überprüfen (als Fallback)
  if (!isValidType) {
    const fileName = file.name.toLowerCase();
    isValidType = ALLOWED_EXTENSIONS.test(fileName);
  }
  
  if (!isValidType) {
    alert('Dieser Dateityp wird nicht unterstützt. Bitte laden Sie eine PDF-, Word-, PowerPoint- oder ZIP-Datei hoch.');
    fileInput.value = '';
    return false;
  }
  
  return true;
}

// Formular zurücksetzen
function resetForm() {
  uploadForm.reset();
  resetUploadUI();
}

// Upload-UI zurücksetzen
function resetUploadUI() {
  uploadForm.style.display = 'block';
  uploadProgress.style.display = 'none';
  uploadSuccess.style.display = 'none';
  uploadError.style.display = 'none';
  
  progressBarFill.style.width = '0%';
  progressText.textContent = '0%';
}