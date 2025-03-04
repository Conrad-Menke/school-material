document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);

  try {
      const response = await fetch('/upload', {
          method: 'POST',
          body: formData
      });

      if (response.ok) {
          alert('Material erfolgreich hochgeladen!');
          window.location.href = '/'; // Zurück zur Hauptseite
      } else {
          alert('Fehler beim Hochladen: ' + response.statusText);
      }
  } catch (error) {
      console.error('Fehler:', error);
  }
});

function sortSelectOptions(selectElement) {
    const options = Array.from(selectElement.options);
    const sortedOptions = options.slice(1).sort((a, b) => a.text.localeCompare(b.text)); // sortiere nach Text, überspringe die erste Option

    // Leere das <select>-Element und füge die sortierten Optionen hinzu
    selectElement.innerHTML = '';
    selectElement.appendChild(options[0]); // Füge die "Bitte wählen"-Option wieder hinzu
    sortedOptions.forEach(option => selectElement.appendChild(option));
  }

  // Anwendung der Funktion auf alle <select>-Elemente mit dem Namen "fach" und "materialform"
  const selectElements = document.querySelectorAll('select[name="fach"], select[name="materialform"]');
  selectElements.forEach(selectElement => sortSelectOptions(selectElement));