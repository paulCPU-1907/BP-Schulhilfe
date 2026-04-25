const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || "/api");

function normalizeApiBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export function formatFileSize(size) {
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function fileToPayload(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        contentBase64: String(reader.result).split(",")[1] || ""
      });
    };
    reader.onerror = () => reject(new Error(`${file.name} konnte nicht gelesen werden.`));
    reader.readAsDataURL(file);
  });
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
