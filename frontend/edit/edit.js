// ID aus der URL auslesen
const urlParams = new URLSearchParams(window.location.search);
const materialId = urlParams.get('id');
console.log('Material-ID für Bearbeitung:', materialId);

let oldFilePath = '';
let oldFileName = '';

// Form-Felder, die erforderlich sind
const requiredFields = [
  { id: 'klasse-input', name: 'Klasse' },
  { id: 'fach-input', name: 'Fach' },
  { id: 'thema-input', name: 'Thema' },
  { id: 'materialform-input', name: 'Materialform' },
  { id: 'titel-input', name: 'Titel' }
];

// Materialien-Daten abrufen
if (materialId) {
  loadMaterialData();
} else {
  showMessage('Keine Material-ID gefunden', 'error');
  document.getElementById('editForm').style.display = 'none';
}

/**
 * Lädt die Material-Daten vom Server
 */
async function loadMaterialData() {
  try {
    const response = await fetch(`/materialien/${materialId}`);
    console.log('Server-Antwortstatus:', response.status);
    
    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Daten: ${response.status}`);
    }
    
    const material = await response.json();
    console.log('Materialdaten geladen:', material);
    
    // Felder im Bearbeitungsformular mit den Materialdaten füllen
    fillFormFields(material);
  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    showMessage('Fehler beim Laden der Materialdaten: ' + error.message, 'error');
  }
}

/**
 * Füllt die Formularfelder mit den Materialdaten
 * @param {Object} material - Die Materialdaten
 */
function fillFormFields(material) {
  oldFilePath = material.dateiPfad;
  oldFileName = material.originalDateiname;
  
  document.getElementById('klasse-input').value = material.klasse || '';
  document.getElementById('fach-input').value = material.fach || '';
  document.getElementById('thema-input').value = material.thema || '';
  document.getElementById('materialform-input').value = material.materialform || '';
  document.getElementById('titel-input').value = material.titel || '';
  document.getElementById('beschreibung-input').value = material.beschreibung || '';
  document.getElementById('autor-input').value = material.Autor || '';
  
  if (material.originalDateiname) {
    document.getElementById('current-file').textContent = `Aktuelle Datei: ${material.originalDateiname}`;
  }
}

/**
 * Zeigt eine Nachricht an
 * @param {string} text - Der Nachrichtentext
 * @param {string} type - Der Typ der Nachricht ('success' oder 'error')
 */
function showMessage(text, type = 'info') {
  const messageElement = document.getElementById('message');
  messageElement.textContent = text;
  messageElement.className = type;
  messageElement.style.display = 'block';

  // Nach 5 Sekunden ausblenden
  setTimeout(() => {
    messageElement.style.display = 'none';
  }, 5000);
}

/**
 * Validiert das Formular
 * @returns {boolean} True, wenn das Formular gültig ist, sonst false
 */
function validateForm() {
  // Prüfen, ob alle Pflichtfelder ausgefüllt sind
  for (const field of requiredFields) {
    const element = document.getElementById(field.id);
    if (!element.value.trim()) {
      showMessage(`Bitte füllen Sie das Feld "${field.name}" aus.`, 'error');
      element.focus();
      return false;
    }
  }

  // Datei-Input validieren
  const fileInput = document.getElementById('material-input');
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const maxSize = 20 * 1024 * 1024; // 20MB
    
    // Dateigröße überprüfen
    if (file.size > maxSize) {
      showMessage(`Die Datei ist zu groß. Die maximale Dateigröße beträgt 20 MB.`, 'error');
      return false;
    }
    
    // Dateityp überprüfen
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/zip',
      'application/x-zip-compressed'
    ];
    
    const allowedExtensions = /\.(pdf|doc|docx|ppt|pptx|zip)$/i;
    const fileName = file.name.toLowerCase();
    
    if (file.type && !allowedTypes.includes(file.type) && !allowedExtensions.test(fileName)) {
      showMessage('Dieser Dateityp wird nicht unterstützt. Bitte laden Sie eine PDF-, Word-, PowerPoint- oder ZIP-Datei hoch.', 'error');
      return false;
    }
  }
  
  return true;
}

// Event-Listener für das Formular
document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!materialId) {
    showMessage('Keine Material-ID gefunden', 'error');
    return;
  }
  
  // Formular validieren
  if (!validateForm()) {
    return;
  }
  
  const formData = new FormData(e.target);
  const materialInput = document.getElementById('material-input');

  // Prüfen, ob das Datei-Feld leer ist
  const isFileEmpty = !materialInput.files.length;

  // Falls das Datei-Feld leer ist, übernehme die alten Dateiinformationen
  if (isFileEmpty) {
    // Füge die alten Werte zu FormData hinzu, falls sie vorhanden sind
    if (oldFilePath && oldFileName) {
      formData.append('dateiPfad', oldFilePath);
      formData.append('originalDateiname', oldFileName);
    }
  }

  // Anzeigen, dass der Vorgang läuft
  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Wird gespeichert...';

  try {
    // Benutze die neue PUT-Endpunkt anstatt des Upload-Endpunkts
    const response = await fetch(`/materialien/${materialId}`, {
      method: 'PUT',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Unbekannter Fehler');
    }

    const result = await response.json();
    console.log('Update-Ergebnis:', result);

    showMessage('Material erfolgreich aktualisiert!', 'success');
    
    // Kurze Verzögerung, bevor zur Einzelansicht zurückgekehrt wird
    setTimeout(() => {
      window.location.href = `/singleview/${materialId}`;
    }, 1500);
  } catch (error) {
    console.error('Fehler beim Senden der Daten:', error);
    showMessage('Fehler beim Aktualisieren des Materials: ' + error.message, 'error');
    
    // Button zurücksetzen
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
});