const fileInput = document.querySelector("#fileInput");
const fileName = document.querySelector("#fileName");
const fileList = document.querySelector("#fileList");
const processButton = document.querySelector("#processButton");
const results = document.querySelector("#results");
const resultsIntro = document.querySelector("#resultsIntro");
const resultList = document.querySelector("#resultList");
const steps = Array.from(document.querySelectorAll("#steps li"));

fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  fileName.textContent = files.length
    ? `${files.length} Datei(en) ausgewählt`
    : "PDFs oder Fotos hier auswählen";

  fileList.innerHTML = files
    .map((file) => `<li>${file.name} (${formatFileSize(file.size)})</li>`)
    .join("");
});

processButton.addEventListener("click", async () => {
  const files = Array.from(fileInput.files);

  if (files.length === 0) {
    results.classList.add("ready");
    resultsIntro.innerHTML = `
      <p class="section-label">Fehler</p>
      <h2>Keine Datei ausgewählt</h2>
      <p>Bitte wähle mindestens eine PDF- oder Bilddatei aus.</p>
    `;
    resultList.innerHTML = "";
    return;
  }

  results.classList.remove("ready");
  resultList.innerHTML = "";
  resultsIntro.innerHTML = `
    <p class="section-label">3. Verarbeitung</p>
    <h2>Analyse läuft</h2>
    <p>${files.length} Datei(en) werden verarbeitet.</p>
  `;

  steps.forEach((step) => {
    step.classList.remove("active", "done");
  });

  for (const step of steps) {
    step.classList.add("active");
    await wait(650);
    step.classList.remove("active");
    step.classList.add("done");
  }

  resultsIntro.innerHTML = `
    <p class="section-label">3. Ergebnisse</p>
    <h2>${files.length} Datei(en) analysiert</h2>
    <p>Jede Datei hat ein eigenes Ergebnis. In der echten App kämen diese Daten vom Backend.</p>
  `;

  resultList.innerHTML = files.map(createResultCard).join("");
  results.classList.add("ready");
});

function createResultCard(file, index) {
  const topic = file.name.replace(/\.[^/.]+$/, "") || `Material ${index + 1}`;

  return `
    <article class="card">
      <p class="section-label">Ergebnis ${index + 1}</p>
      <h2>${escapeHtml(file.name)}</h2>
      <p><strong>OCR:</strong> Simulierter erkannter Text aus ${escapeHtml(topic)}.</p>
      <p><strong>Zusammenfassung:</strong> Das Material wurde analysiert und in kurze Lerninhalte umgewandelt.</p>
      <ul class="clean-list">
        <li>Aufgabe 1: Schreibe die drei wichtigsten Begriffe heraus.</li>
        <li>Aufgabe 2: Formuliere eine eigene Zusammenfassung.</li>
        <li>Aufgabe 3: Erstelle zwei Prüfungsfragen.</li>
      </ul>
    </article>
  `;
}

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character];
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
