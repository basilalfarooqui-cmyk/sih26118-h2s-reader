const BACKEND_URL = "https://sih26118-h2s-reader-production.up.railway.app";

let allRecords = [];
let currentSource = "app";
let sortField = "time_recorded";
let sortDirection = "desc";
let selectedIds = new Set();
let refreshTimer = null;

const tableBody = document.getElementById("tableBody");
const countText = document.getElementById("countText");
const searchInput = document.getElementById("searchInput");
const statusMessage = document.getElementById("statusMessage");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const menuPanel = document.getElementById("menuPanel");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const confirmDialog = document.getElementById("confirmDialog");
const confirmMessage = document.getElementById("confirmMessage");
const confirmOkBtn = document.getElementById("confirmOkBtn");
const confirmCancelBtn = document.getElementById("confirmCancelBtn");

function showStatus(text, type) {
  statusMessage.textContent = text;
  statusMessage.className = "status-message " + type;
  statusMessage.classList.remove("hidden");
}

function hideStatus() {
  statusMessage.classList.add("hidden");
}

async function fetchReadings() {
  showStatus("Loading...", "loading");
  try {
    const res = await fetch(`${BACKEND_URL}/readings?source=${currentSource}`);
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    allRecords = await res.json();
    selectedIds.clear();
    selectAllCheckbox.checked = false;
    hideStatus();
    render();
  } catch (err) {
    showStatus(`Failed to load readings: ${err.message}`, "error");
    tableBody.innerHTML = "";
    countText.textContent = "Showing 0 records";
  }
}

function getFilteredSorted() {
  const term = searchInput.value.trim().toLowerCase();
  let filtered = allRecords.filter(r =>
    r.worker_name.toLowerCase().includes(term) || r.worker_id.toLowerCase().includes(term)
  );

  filtered.sort((a, b) => {
    let va = a[sortField];
    let vb = b[sortField];
    if (sortField === "time_recorded") {
      va = new Date(va).getTime();
      vb = new Date(vb).getTime();
    } else {
      va = (va || "").toString().toLowerCase();
      vb = (vb || "").toString().toLowerCase();
    }
    if (va < vb) return sortDirection === "asc" ? -1 : 1;
    if (va > vb) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return filtered;
}

function formatTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  return d.toLocaleString();
}

function render() {
  const records = getFilteredSorted();
  countText.textContent = `Showing ${records.length} record${records.length === 1 ? "" : "s"}`;

  tableBody.innerHTML = "";
  for (const r of records) {
    const tr = document.createElement("tr");

    const tdCheck = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedIds.has(r.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedIds.add(r.id);
      else selectedIds.delete(r.id);
    });
    tdCheck.appendChild(checkbox);
    tr.appendChild(tdCheck);

    const tdName = document.createElement("td");
    tdName.textContent = r.worker_name;
    tr.appendChild(tdName);

    const tdId = document.createElement("td");
    tdId.textContent = r.worker_id;
    tr.appendChild(tdId);

    const tdHex = document.createElement("td");
    tdHex.className = "hex-cell";
    const swatch = document.createElement("span");
    swatch.className = "hex-swatch";
    swatch.style.background = r.hex_code;
    const hexText = document.createElement("span");
    hexText.textContent = r.hex_code;
    tdHex.appendChild(swatch);
    tdHex.appendChild(hexText);
    tr.appendChild(tdHex);

    const tdRecorded = document.createElement("td");
    tdRecorded.textContent = formatTime(r.time_recorded);
    tr.appendChild(tdRecorded);

    const tdSynced = document.createElement("td");
    tdSynced.textContent = formatTime(r.time_synced);
    tr.appendChild(tdSynced);

    const tdSource = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `badge ${r.source}`;
    badge.textContent = r.source === "app" ? "App" : "Hardware";
    tdSource.appendChild(badge);
    tr.appendChild(tdSource);

    tableBody.appendChild(tr);
  }
}

document.querySelectorAll("th.sortable").forEach(th => {
  th.addEventListener("click", () => {
    const field = th.dataset.sort;
    if (sortField === field) {
      sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      sortField = field;
      sortDirection = "asc";
    }
    document.querySelectorAll("th.sortable .sort-arrow").forEach(s => s.textContent = "");
    th.querySelector(".sort-arrow").textContent = sortDirection === "asc" ? "▲" : "▼";
    render();
  });
});

searchInput.addEventListener("input", render);

document.getElementById("toggleApp").addEventListener("click", () => setSource("app"));
document.getElementById("toggleHardware").addEventListener("click", () => setSource("hardware"));

function setSource(source) {
  currentSource = source;
  document.getElementById("toggleApp").classList.toggle("active", source === "app");
  document.getElementById("toggleHardware").classList.toggle("active", source === "hardware");
  fetchReadings();
}

selectAllCheckbox.addEventListener("change", () => {
  const records = getFilteredSorted();
  if (selectAllCheckbox.checked) {
    records.forEach(r => selectedIds.add(r.id));
  } else {
    records.forEach(r => selectedIds.delete(r.id));
  }
  render();
});

hamburgerBtn.addEventListener("click", () => {
  menuPanel.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!menuPanel.contains(e.target) && e.target !== hamburgerBtn) {
    menuPanel.classList.add("hidden");
  }
});

document.getElementById("exportPdfBtn").addEventListener("click", () => {
  menuPanel.classList.add("hidden");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const records = getFilteredSorted();
  doc.text("H2S Exposure Records", 14, 14);
  doc.autoTable({
    startY: 20,
    head: [["Worker Name", "Worker ID", "Hex Code", "Time Recorded", "Time Synced", "Source"]],
    body: records.map(r => [
      r.worker_name, r.worker_id, r.hex_code,
      formatTime(r.time_recorded), formatTime(r.time_synced),
      r.source === "app" ? "App" : "Hardware"
    ]),
  });
  doc.save("h2s-readings.pdf");
});

document.getElementById("exportXlsxBtn").addEventListener("click", () => {
  menuPanel.classList.add("hidden");
  const records = getFilteredSorted();
  const rows = records.map(r => ({
    "Worker Name": r.worker_name,
    "Worker ID": r.worker_id,
    "Hex Code": r.hex_code,
    "Time Recorded": formatTime(r.time_recorded),
    "Time Synced": formatTime(r.time_synced),
    "Source": r.source === "app" ? "App" : "Hardware",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Readings");
  XLSX.writeFile(wb, "h2s-readings.xlsx");
});

function openConfirm(message, onConfirm) {
  confirmMessage.textContent = message;
  confirmDialog.classList.remove("hidden");
  const cleanup = () => {
    confirmDialog.classList.add("hidden");
    confirmOkBtn.removeEventListener("click", onOk);
    confirmCancelBtn.removeEventListener("click", onCancel);
  };
  const onOk = () => { cleanup(); onConfirm(); };
  const onCancel = () => cleanup();
  confirmOkBtn.addEventListener("click", onOk);
  confirmCancelBtn.addEventListener("click", onCancel);
}

document.getElementById("deleteSelectedBtn").addEventListener("click", () => {
  menuPanel.classList.add("hidden");
  if (selectedIds.size === 0) {
    showStatus("No records selected.", "error");
    return;
  }
  openConfirm(`Delete ${selectedIds.size} selected record(s)? This cannot be undone.`, async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/readings`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      showStatus("Selected records deleted.", "success");
      await fetchReadings();
    } catch (err) {
      showStatus(`Failed to delete: ${err.message}`, "error");
    }
  });
});

document.getElementById("deleteAllBtn").addEventListener("click", () => {
  menuPanel.classList.add("hidden");
  openConfirm("Delete ALL records? This cannot be undone.", async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/readings`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      showStatus("All records deleted.", "success");
      await fetchReadings();
    } catch (err) {
      showStatus(`Failed to delete: ${err.message}`, "error");
    }
  });
});

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchReadings, 30000);
}

fetchReadings();
startAutoRefresh();
