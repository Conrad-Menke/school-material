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
      if (material.originalDateiname) {
        document.getElementById('current-file').textContent = `Aktuelle Datei: ${material.originalDateiname}`;
      }
      // Wenn keine Datei hochgeladen wurde, setze die ursprünglichen Dateipfade
      if (material.dateiPfad && material.originalDateiname) {
        document.getElementById('material-input').setAttribute('data-old-file', material.dateiPfad);
        document.getElementById('material-input').setAttribute('data-old-file-name', material.originalDateiname);
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
  const formData = new FormData(e.target);
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

  // Debugging: Formulardaten ausgeben
  for (let [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }

  try {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      alert('Material erfolgreich hochgeladen!');
      // Wenn eine Datei hochgeladen wurde, löschen wir den alten Eintrag
      if (!isFileEmpty) {
        fetch(`/materialien/${materialId}`, { method: 'DELETE' })
          .then(response => {
            if (response.ok) {
              alert('Eintrag erfolgreich gelöscht');
              window.location.href = '/index.html'; // Zurück zur Hauptseite
              button.closest('tr').remove();
            } else {
              alert('Fehler beim Löschen des Eintrags');
            }
          })
          .catch(error => {
            console.error('Fehler beim Löschen:', error);
          });
      }

      window.location.href = '/'; // Zurück zur Hauptseite, nach dem Upload
    } else {
      alert('Fehler beim Hochladen: ' + response.statusText);
    }
  } catch (error) {
    console.error('Fehler:', error);
  }
});
