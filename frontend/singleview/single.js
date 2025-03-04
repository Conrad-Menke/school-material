

// Funktion zum Laden der Materialdaten
window.onload = async () => {
  const materialId = window.location.pathname.split('/').pop();
  console.log('Material-ID:', materialId); // Überprüfen, ob die ID korrekt ist

  try {
    const response = await fetch(`/materialien/${materialId}`);
    console.log('Server-Antwortstatus:', response.status); // HTTP-Status prüfen

    if (!response.ok) {
      throw new Error(`Fehler beim Abrufen der Daten: ${response.status}`);
    }

    const material = await response.json();
    console.log('Geladene Materialdaten:', material); // Prüfen, ob Daten zurückkommen

    // Weiterverarbeitung der Daten
    document.getElementById('title').textContent = material.titel;
    document.getElementById('klasse').textContent = material.klasse;
    document.getElementById('fach').textContent = material.fach;
    document.getElementById('thema').textContent = material.thema;
    document.getElementById('materialform').textContent = material.materialform;
    document.getElementById('beschreibung').textContent = material.beschreibung;
    document.getElementById('Autor').textContent = material.Autor;
    document.getElementById('Datum').textContent = new Date(material.Datum).toLocaleDateString();

    // Logik des download buttons
    document.getElementById('download-link').href = `/download/${material.id}`;

    // Logik des edit buttons
    document.getElementById('edit-link').href = `/edit/edit.html?id=${material.id}`;

    // Logik des delete buttons
    document.getElementById('delete').setAttribute('data-id', material.id);
    document.getElementById('delete').addEventListener('click', event => {
      const button = event.target; // Das geklickte Element
      const materialId = button.getAttribute('data-id');
      if (confirm('Möchten Sie diesen Eintrag wirklich löschen?')) {
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
    });

    // PDF anzeigen
    const pdfUrl = `/download/${material.id}`; // URL zum PDF herunterladen

    // PDF.js initialisieren
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then(function (pdf) {
      console.log('PDF geladen');

      // Erste Seite des PDFs anzeigen
      pdf.getPage(1).then(function (page) {
        const scale = 1.5; // Skalierung der Seite
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.getElementById('pdf-preview');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Rendern der Seite auf dem Canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        page.render(renderContext);
      });
    });

  } catch (error) {
    console.error('Fehler beim Laden der Daten:', error);
    document.getElementById('materialDetails').innerHTML = '<p>Beim Laden der Daten ist ein Fehler aufgetreten.</p>';
  }
};
