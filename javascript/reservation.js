import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --- Firebase config ---
const firebaseConfig = {
	apiKey: "AIzaSyAOpuKx1x0IXKZROiThWfrak1iDupk7puc",
	authDomain: "senseat-42219.firebaseapp.com",
	databaseURL: "https://senseat-42219-default-rtdb.asia-southeast1.firebasedatabase.app",
	projectId: "senseat-42219",
	storageBucket: "senseat-42219.firebasestorage.app",
	messagingSenderId: "375530241499",
	appId: "1:375530241499:web:960d8484c2cba69e8d3bfe"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
onAuthStateChanged(auth, (user) => {
	currentUser = user;
});

// --- UI Elements ---
const indoorButton = document.getElementById('indoor-button');
const outdoorButton = document.getElementById('outdoor-button');
const reservationForm = document.querySelector('.reservation-form');
const resultMessage = document.querySelector('.result-message strong');

// Customer modals
let modalOverlay; // created lazily
function ensureModalOverlay() {
	if (modalOverlay) return modalOverlay;
	modalOverlay = document.createElement('div');
	modalOverlay.style.position = 'fixed';
	modalOverlay.style.left = '0';
	modalOverlay.style.top = '0';
	modalOverlay.style.width = '100%';
	modalOverlay.style.height = '100%';
	modalOverlay.style.background = 'rgba(0,0,0,0.5)';
	modalOverlay.style.display = 'none';
	modalOverlay.style.zIndex = '1000';
	document.body.appendChild(modalOverlay);
	return modalOverlay;
}
function showModal(contentNode) {
	const overlay = ensureModalOverlay();
	overlay.innerHTML = '';
	const modal = document.createElement('div');
	modal.style.position = 'fixed';
	modal.style.top = '50%';
	modal.style.left = '50%';
	modal.style.transform = 'translate(-50%, -50%)';
	modal.style.background = '#fff';
	modal.style.padding = '20px';
	modal.style.width = '90%';
	modal.style.maxWidth = '420px';
	modal.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
	modal.style.fontFamily = 'Montserrat, sans-serif';
	modal.appendChild(contentNode);
	overlay.appendChild(modal);
	overlay.style.display = 'block';
	return overlay;
}
function hideModal() {
	if (modalOverlay) modalOverlay.style.display = 'none';
}

// Track selection
let selectedDate = null;
let selectedTime = null;
let selectedPeople = 0;
let reservedTableIdsForSelection = new Set();

// Define per-table capacity (adjust as needed)
const tableCapacity = {
	IN1: 4, IN2: 4, IN3: 4, IN4: 4, IN5: 4, IN6: 4,
	OU1: 4, OU2: 4, OU3: 4, OU4: 4, OU5: 4, OU6: 4
};

function parseAreaFromTableId(tableId) {
	return tableId.startsWith('IN') ? 'inside' : 'outside';
}

function setLayoutVisibility(showInside) {
	const insideLayout = document.getElementById("inside-layout");
	const outsideLayout = document.getElementById("outside-layout");
	insideLayout.style.display = showInside ? "grid" : "none";
	outsideLayout.style.display = showInside ? "none" : "grid";
}

indoorButton.addEventListener("click", function() {
	setLayoutVisibility(false);
});

outdoorButton.addEventListener("click", function() {
	setLayoutVisibility(true);
});

// Safe hover behavior: only flip available <-> table-select
function setupHoverHandlers() {
	document.querySelectorAll('.table').forEach(table => {
		const img = table.querySelector('img');
		table.addEventListener('mouseenter', () => {
			if (img.src.includes('available.png')) {
				img.src = img.src.replace('available.png', 'table-select.png');
			}
		});
		table.addEventListener('mouseleave', () => {
			if (img.src.includes('table-select.png')) {
				img.src = img.src.replace('table-select.png', 'available.png');
			}
		});
	});
}

function setAllTablesToAvailable() {
	document.querySelectorAll('.table img').forEach(img => {
		img.src = img.src.replace('reserved.png', 'available.png').replace('table-select.png', 'available.png');
	});
}

function applyReservedToUI(reservedIds) {
	document.querySelectorAll('.table').forEach(table => {
		const img = table.querySelector('img');
		if (reservedIds.has(table.id)) {
			img.src = img.src.replace('available.png', 'reserved.png').replace('table-select.png', 'reserved.png');
		}
	});
}

async function fetchReservedTableIds(dateStr, timeStr) {
	const slot = `${dateStr}T${timeStr}`;
	const reservationsRef = collection(db, 'reservations');
	const q = query(
		reservationsRef,
		where('slot', '==', slot)
	);
	const snap = await getDocs(q);
	const ids = new Set();
	snap.forEach(docSnap => {
		const data = docSnap.data();
		if (data && data.tableId) ids.add(data.tableId);
	});
	return ids;
}

function formatResultMessage(people, dateStr, timeStr) {
	try {
		const [yy, mm, dd] = dateStr.split('-');
		const date = new Date(`${yy}-${mm}-${dd}T${timeStr}`);
		const options = { hour: '2-digit', minute: '2-digit' };
		const timePretty = date.toLocaleTimeString([], options);
		return `Available tables for ${people} person(s) on ${mm}-${dd}-${yy} at ${timePretty}.`;
	} catch (e) {
		return `Available tables for ${people} person(s) on ${dateStr} at ${timeStr}.`;
	}
}

async function checkAvailability(dateStr, timeStr, people) {
	reservedTableIdsForSelection = await fetchReservedTableIds(dateStr, timeStr);
	setAllTablesToAvailable();
	applyReservedToUI(reservedTableIdsForSelection);
	if (resultMessage) {
		resultMessage.textContent = formatResultMessage(people, dateStr, timeStr);
	}
}

function ensureSelectionSet() {
	if (!selectedDate || !selectedTime || !selectedPeople) {
		showInfoModal('Please choose date, time, and number of people, then click "Check Availability".');
		return false;
	}
	return true;
}

function showInfoModal(message) {
	const content = document.createElement('div');
	content.innerHTML = `
		<div style="font-weight:700;margin-bottom:10px;">Info</div>
		<div style="margin-bottom:16px;">${message}</div>
		<div style="display:flex;justify-content:flex-end;gap:10px;">
			<button id="infoOkBtn" style="padding:8px 12px;background:#2B193C;color:#fff;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">OK</button>
		</div>
	`;
	showModal(content);
	document.getElementById('infoOkBtn').addEventListener('click', hideModal);
}

function showNameConfirmModal(tableId, onConfirm) {
	const content = document.createElement('div');
	content.innerHTML = `
		<div style="font-weight:700;margin-bottom:10px;">Confirm Reservation</div>
		<label style="display:block;margin-bottom:6px;">Reservation Name</label>
		<input id="reservationNameInput" type="text" placeholder="Mr. Gulper" style="width:calc(100% - 12px);padding:10px;border:1px solid #2B193C;margin-bottom:12px;box-sizing:border-box;"/>
		<div style="display:flex;justify-content:flex-end;gap:10px;">
			<button id="nameCancelBtn" style="padding:8px 12px;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">Cancel</button>
			<button id="nameConfirmBtn" style="padding:8px 12px;background:#2B193C;color:#fff;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">Confirm</button>
		</div>
	`;
	showModal(content);
	document.getElementById('nameCancelBtn').addEventListener('click', hideModal);
	document.getElementById('nameConfirmBtn').addEventListener('click', () => {
		const name = (document.getElementById('reservationNameInput').value || '').trim();
		if (!name) return; // keep modal open until filled
		hideModal();
		onConfirm(name);
	});
}

async function handleTableClick(event) {
	const tableDiv = event.currentTarget;
	const tableId = tableDiv.id;
	const capacity = tableCapacity[tableId] || 4;
	const img = tableDiv.querySelector('img');

	if (!ensureSelectionSet()) return;

	if (reservedTableIdsForSelection.has(tableId) || img.src.includes('reserved.png')) {
		showInfoModal('Sorry, this table is already reserved for the selected time.');
		return;
	}

	if (selectedPeople > capacity) {
		showInfoModal(`This table seats up to ${capacity}. Please reduce party size or choose another table.`);
		return;
	}

	if (!currentUser) {
		const content = document.createElement('div');
		content.innerHTML = `
			<div style="font-weight:700;margin-bottom:10px;">Login Required</div>
			<div style="margin-bottom:16px;">You need to be logged in to book. Go to login page?</div>
			<div style="display:flex;justify-content:flex-end;gap:10px;">
				<button id="cancelLogin" style="padding:8px 12px;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">Cancel</button>
				<button id="goLogin" style="padding:8px 12px;background:#2B193C;color:#fff;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">Go to Login</button>
			</div>
		`;
		showModal(content);
		document.getElementById('cancelLogin').addEventListener('click', hideModal);
		document.getElementById('goLogin').addEventListener('click', () => { window.location.href = 'login.html'; });
		return;
	}

	showNameConfirmModal(tableId, async (name) => {
		const confirmationText = `Confirm reservation?\n\nTable: ${tableId}\nDate: ${selectedDate}\nTime: ${selectedTime}\nPeople: ${selectedPeople}\nName: ${name}`;
		const content = document.createElement('div');
		content.innerHTML = `
			<div style="font-weight:700;margin-bottom:10px;">Confirm Details</div>
			<pre style="white-space:pre-wrap;font-family:inherit;margin:0 0 12px 0;">${confirmationText}</pre>
			<div style="display:flex;justify-content:flex-end;gap:10px;">
				<button id="reserveCancelBtn" style="padding:8px 12px;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">Cancel</button>
				<button id="reserveOkBtn" style="padding:8px 12px;background:#2B193C;color:#fff;border:2px solid #2B193C;font-weight:600;cursor:pointer;font-family:Montserrat, sans-serif;">Confirm</button>
			</div>
		`;
		showModal(content);
		document.getElementById('reserveCancelBtn').addEventListener('click', hideModal);
		document.getElementById('reserveOkBtn').addEventListener('click', async () => {
			try {
				await addDoc(collection(db, 'reservations'), {
					userId: currentUser.uid,
					name,
					tableId,
					area: parseAreaFromTableId(tableId),
					date: selectedDate,
					time: selectedTime,
					slot: `${selectedDate}T${selectedTime}`,
					people: selectedPeople,
					status: 'booked',
					createdAt: serverTimestamp()
				});
				reservedTableIdsForSelection.add(tableId);
				img.src = img.src.replace('available.png', 'reserved.png').replace('table-select.png', 'reserved.png');
				hideModal();
				showInfoModal('Reservation confirmed!');
			} catch (e) {
				console.error('Reservation error:', e);
				hideModal();
				showInfoModal('Failed to reserve table. Please try again.');
			}
		});
	});
}

function attachTableClickHandlers() {
	document.querySelectorAll('.table').forEach(table => {
		table.removeEventListener('click', handleTableClick);
		table.addEventListener('click', handleTableClick);
	});
}

// Form handling: prevent submit and run availability check
if (reservationForm) {
	reservationForm.addEventListener('submit', async (e) => {
		e.preventDefault();

		const formData = new FormData(reservationForm);
		const dateStr = formData.get('date');
		const timeStr = formData.get('time');
		const people = parseInt(formData.get('people') || '0', 10);

		if (!dateStr || !timeStr || !people) {
			showInfoModal('Please fill date, time, and number of people.');
			return;
		}

		selectedDate = dateStr;
		selectedTime = timeStr;
		selectedPeople = people;
		await checkAvailability(selectedDate, selectedTime, selectedPeople);
	});
}

// Initial setup
setupHoverHandlers();
attachTableClickHandlers();
// Default to showing inside layout
setLayoutVisibility(true);