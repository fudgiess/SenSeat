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
		alert('Please choose date, time, and number of people, then click "Check Availability".');
		return false;
	}
	return true;
}

async function handleTableClick(event) {
	const tableDiv = event.currentTarget;
	const tableId = tableDiv.id;
	const capacity = tableCapacity[tableId] || 4;
	const img = tableDiv.querySelector('img');

	if (!ensureSelectionSet()) return;

	if (reservedTableIdsForSelection.has(tableId) || img.src.includes('reserved.png')) {
		alert('Sorry, this table is already reserved for the selected time.');
		return;
	}

	if (selectedPeople > capacity) {
		alert(`This table seats up to ${capacity}. Please reduce party size or choose another table.`);
		return;
	}

	if (!currentUser) {
		const goLogin = confirm('You need to be logged in to book. Go to login page?');
		if (goLogin) window.location.href = 'login.html';
		return;
	}

	// Confirm reservation details before saving
	const confirmationText = `Confirm reservation?\n\nTable: ${tableId}\nDate: ${selectedDate}\nTime: ${selectedTime}\nPeople: ${selectedPeople}`;
	if (!confirm(confirmationText)) {
		return;
	}

	try {
		await addDoc(collection(db, 'reservations'), {
			userId: currentUser.uid,
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
		alert('Reservation confirmed!');
	} catch (e) {
		console.error('Reservation error:', e);
		alert('Failed to reserve table. Please try again.');
	}
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
			alert('Please fill date, time, and number of people.');
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