// ID aus der URL auslesen
const urlParams = new URLSearchParams(window.location.search);
const materialId = urlParams.get('id');
console.log('Material-ID für Bearbeitung:', materialId);

let oldFilePath = '';
let oldFileName = '';

if (materialId) {
  // Daten vom Server abrufen
  fetch(`/materialien/${materialId}`)
    .then(response => {
      console.log('Server-Antwortstatus:', response.status);
      if (!response.ok) {
        throw new Error(`Fehler beim Abrufen der Daten: ${response.status}`);
      }
      return response.json();
    })
    .then(material => {
      console.log('Materialdaten geladen:', material);
      // Felder im Bearbeitungsformular mit den Materialdaten füllen

      oldFilePath = material.dateiPfad;
      oldFileName = material.originalDateiname;
      document.getElementById('klasse-input').value = material.klasse;
      document.getElementById('fach-input').value = material.fach;
      document.getElementById('thema-input').value = material.thema;
      document.getElementById('materialform-input').value = material.materialform;
      document.getElementById('titel-input').value = material.titel;
      document.getElementById('beschreibung-input').value = material.beschreibung;
      document.getElementById('autor-input').value = material.Autor || '';
      if (material.originalDateiname) {
        document.getElementById('current-file').textContent = `Aktuelle Datei: ${material.originalDateiname}`;
      }
    })
    .catch(error => {
      console.error('Fehler beim Laden der Daten:', error);
      alert('Fehler beim Laden der Materialdaten');
    });
} else {
  alert('Keine Material-ID gefunden');
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!materialId) {
    alert('Keine Material-ID gefunden');
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

  // Debugging: Formulardaten ausgeben
  console.log('Formulardaten für Update:');
  for (let [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }

  try {
    // Benutze die neue PUT-Endpunkt anstatt des Upload-Endpunkts
    const response = await fetch(`/materialien/${materialId}`, {
      method: 'PUT',
      body: formData
    });

    const result = await response.json();
    console.log('Update-Ergebnis:', result);

    if (response.ok) {
      alert('Material erfolgreich aktualisiert!');
      window.location.href = `/singleview/${materialId}`; // Zurück zur Einzelansicht
    } else {
      alert('Fehler beim Aktualisieren: ' + (result.error || response.statusText));
    }
  } catch (error) {
    console.error('Fehler beim Senden der Daten:', error);
    alert('Fehler beim Aktualisieren des Materials');
  }
});