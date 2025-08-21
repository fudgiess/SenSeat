import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// Firebase config (reuse same project)
const firebaseConfig = {
	apiKey: "AIzaSyAOpuKx1x0IXKZROiThWfrak1iDupk7puc",
	authDomain: "senseat-42219.firebaseapp.com",
	databaseURL: "https://senseat-42219-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "senseat-42219",
	storageBucket: "senseat-42219.firebasestorage.app",
	messagingSenderId: "375530241499",
	appId: "1:375530241499:web:960d8484c2cba69e8d3bfe"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UI refs
const rowsContainer = document.getElementById("reservation-rows");
const openAddBtn = document.getElementById("openAddReservation");
const addModal = document.getElementById("addReservationModal");
const closeAddBtn = document.getElementById("closeAddReservation");
const addForm = document.getElementById("addReservationForm");
const nowBtn = document.getElementById("arNowBtn");
const deleteSelectedBtn = document.getElementById("deleteSelected");

// Details & generic modals
const detailsModal = document.getElementById("reservationDetailsModal");
const detailsBody = document.getElementById("reservationDetailsBody");
const closeDetailsBtn = document.getElementById("closeReservationDetails");
const infoModal = document.getElementById("adminInfoModal");
const infoText = document.getElementById("adminInfoText");
const infoOk = document.getElementById("adminInfoOk");
const confirmModal = document.getElementById("adminConfirmModal");
const confirmText = document.getElementById("adminConfirmText");
const confirmOk = document.getElementById("adminConfirmOk");
const confirmCancel = document.getElementById("adminConfirmCancel");

function showInfo(message) {
	infoText.textContent = message;
	infoModal.style.display = "block";
}
function hideInfo() { infoModal.style.display = "none"; }
infoOk.addEventListener("click", hideInfo);

function showConfirm(message) {
	return new Promise((resolve) => {
		confirmText.textContent = message;
		confirmModal.style.display = "block";
		const onOk = () => { cleanup(); resolve(true); };
		const onCancel = () => { cleanup(); resolve(false); };
		function cleanup() {
			confirmOk.removeEventListener("click", onOk);
			confirmCancel.removeEventListener("click", onCancel);
			confirmModal.style.display = "none";
		}
		confirmOk.addEventListener("click", onOk);
		confirmCancel.addEventListener("click", onCancel);
	});
}

function formatTimeToDisplay(hhmm) {
	if (!hhmm || !hhmm.includes(":")) return hhmm || "";
	const [hStr, m] = hhmm.split(":");
	let h = parseInt(hStr, 10);
	const ampm = h >= 12 ? "PM" : "AM";
	h = h % 12 || 12;
	return `${h}:${m} ${ampm}`;
}

function renderEmpty() {
	rowsContainer.innerHTML = `<div class="reservation-row"><div style="grid-column: 1 / -1; color:#888;">No reservations.</div></div>`;
}

function renderRow(collectionName, docId, data) {
	const row = document.createElement("div");
	row.className = "reservation-row";

	const name = data.name || data.displayName || data.userId || "—";
	const table = data.tableId || "—";
	const time = data.time ? formatTimeToDisplay(data.time) : "—";
	const guests = data.people != null ? data.people : "—";
	const status = (data.status || "").toLowerCase();
	const badgeClass = status === "seated" ? "seated" : status === "waiting" ? "waiting" : status === "cancelled" ? "cancelled" : status === "booked" ? "booked" : "";

	row.innerHTML = `
		<div><input type=\"checkbox\" class=\"select-res\" data-id=\"${docId}\" data-col=\"${collectionName}\"></div>
		<div>${name}</div>
		<div>${table}</div>
		<div>${time}</div>
		<div>${guests}</div>
		<div><span class=\"badge ${badgeClass}\">${status ? status.toUpperCase() : "—"}</span></div>
		<div><img src=\"assets/images/icons/more.png\" class=\"icon more-btn\" data-id=\"${docId}\" data-col=\"${collectionName}\"></div>
	`;
	return row;
}

// Maintain snapshot state for both collections
const snapshotByCollection = {
	reservations: new Map(),
	reservation: new Map()
};

function computeSlotString(data) {
	if (data && typeof data.slot === "string" && data.slot.includes("T")) return data.slot;
	const date = data?.date || "";
	const time = data?.time || "";
	return `${date}T${time}`;
}

function renderAllReservations() {
	rowsContainer.innerHTML = "";
	const combined = [];
	for (const [id, data] of snapshotByCollection.reservations.entries()) {
		combined.push({ col: "reservations", id, data });
	}
	for (const [id, data] of snapshotByCollection.reservation.entries()) {
		combined.push({ col: "reservation", id, data });
	}

	if (combined.length === 0) {
		renderEmpty();
		return;
	}

	combined.sort((a, b) => {
		const slotA = computeSlotString(a.data);
		const slotB = computeSlotString(b.data);
		if (slotA === slotB) return 0;
		return slotA > slotB ? -1 : 1; // newest first
	});

	combined.forEach((entry) => {
		rowsContainer.appendChild(renderRow(entry.col, entry.id, entry.data));
	});

	rowsContainer.querySelectorAll(".more-btn").forEach((el) => {
		el.addEventListener("click", () => {
			const id = el.getAttribute("data-id");
			const col = el.getAttribute("data-col");
			const data = snapshotByCollection[col].get(id) || {};
			showDetails(data, id, col);
		});
	});
}

function subscribeReservations() {
	const qPlural = query(collection(db, "reservations"), orderBy("slot", "desc"));
	const qSingular = query(collection(db, "reservation"), orderBy("slot", "desc"));

	onSnapshot(qPlural, (snap) => {
		snapshotByCollection.reservations.clear();
		snap.forEach((docSnap) => {
			snapshotByCollection.reservations.set(docSnap.id, docSnap.data());
		});
		renderAllReservations();
	}, (error) => {
		console.error("Failed to load from 'reservations':", error);
	});

	onSnapshot(qSingular, (snap) => {
		snapshotByCollection.reservation.clear();
		snap.forEach((docSnap) => {
			snapshotByCollection.reservation.set(docSnap.id, docSnap.data());
		});
		renderAllReservations();
	}, (error) => {
		console.error("Failed to load from 'reservation':", error);
	});
}

function openAddModal() {
	addModal.style.display = "block";
}

function closeAddModal() {
	addModal.style.display = "none";
	addForm.reset();
}

function setNow() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	document.getElementById("arDate").value = `${year}-${month}-${day}`;
	document.getElementById("arTime").value = `${hours}:${minutes}`;
}

async function handleAddSubmit(e) {
	e.preventDefault();
	const formData = new FormData(addForm);
	const name = formData.get("name");
	const area = formData.get("area");
	const tableId = formData.get("tableId");
	const date = formData.get("date");
	const time = formData.get("time");
	const people = parseInt(formData.get("people") || "0", 10);
	const status = formData.get("status") || "booked";

	if (!name || !area || !tableId || !date || !time || !people) {
		showInfo("Please fill all fields.");
		return;
	}

	const slot = `${date}T${time}`;
	await addDoc(collection(db, "reservations"), {
		name,
		tableId,
		area,
		date,
		time,
		slot,
		people,
		status,
		createdAt: serverTimestamp()
	});

	showInfo("Reservation added.");
	closeAddModal();
}

async function handleDeleteSelected() {
	const checkboxes = rowsContainer.querySelectorAll(".select-res:checked");
	if (checkboxes.length === 0) {
		showInfo("Please select at least one reservation to delete.");
		return;
	}
	const ok = await showConfirm(`Delete ${checkboxes.length} reservation(s)?`);
	if (!ok) return;
	for (const cb of checkboxes) {
		const id = cb.getAttribute("data-id");
		const col = cb.getAttribute("data-col") || "reservations";
		await deleteDoc(doc(db, col, id));
	}
	showInfo("Selected reservations deleted.");
}

function showDetails(data, id, col) {
	const createdAt = data.createdAt && data.createdAt.seconds ? new Date(data.createdAt.seconds * 1000) : null;
	const createdAtStr = createdAt ? createdAt.toLocaleString() : "—";
	const details = [
		{ label: "Name", value: data.name || data.displayName || data.userId || "—" },
		{ label: "Area", value: data.area || "—" },
		{ label: "Table", value: data.tableId || "—" },
		{ label: "Date", value: data.date || "—" },
		{ label: "Time", value: data.time ? formatTimeToDisplay(data.time) : "—" },
		{ label: "Guests", value: data.people != null ? data.people : "—" },
		{ label: "Status", value: data.status || "—" },
		{ label: "Slot", value: computeSlotString(data) || "—" },
		{ label: "Created At", value: createdAtStr }
	];
	detailsBody.innerHTML = details.map(d => `<div><strong>${d.label}:</strong> ${d.value}</div>`).join("");
	detailsBody.style.fontFamily = 'Montserrat, sans-serif';
	detailsModal.style.display = "block";
}

closeDetailsBtn.addEventListener("click", () => { detailsModal.style.display = "none"; });
window.addEventListener("click", (e) => {
	if (e.target === detailsModal) detailsModal.style.display = "none";
	if (e.target === addModal) closeAddModal();
	if (e.target === infoModal) hideInfo();
	if (e.target === confirmModal) confirmModal.style.display = "none";
});

openAddBtn.addEventListener("click", openAddModal);
closeAddBtn.addEventListener("click", closeAddModal);
nowBtn.addEventListener("click", setNow);
addForm.addEventListener("submit", handleAddSubmit);
deleteSelectedBtn.addEventListener("click", handleDeleteSelected);

subscribeReservations(); 