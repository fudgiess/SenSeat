import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, setDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

// Listen for login state changes
// onAuthStateChanged(auth, async (user) => {
// 	if (user) {
// 		// User is logged in
// 		console.log("User is logged in:", user.email);

// 		window.location.href = "index.html";
// 	} else {
// 		// No user logged in
// 		console.log("No user logged in.");
// 	}
// });

// Birth date function
function populateYears(selectedYear = 2000) {
    const yearSelect = document.getElementById("birth-year");
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1900; y--) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = y;
        if (y === selectedYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function populateDays(month = 1, year = 2000, selectedDay = 1) {
    const daySelect = document.getElementById("birth-day");
    daySelect.innerHTML = '<option value="">Day</option>';
    
    if (!month || !year) return;

    const daysInMonth = new Date(year, month, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i;
        if (i === selectedDay) option.selected = true;
        daySelect.appendChild(option);
    }
}

function setDefaultMonth(selectedMonth = 1) {
    const monthSelect = document.getElementById("birth-month");
    monthSelect.value = selectedMonth;
}

// Call on page load
setDefaultMonth();          // January
populateYears();            // 2000
populateDays(1, 2000);      // 1st

// Add event listeners to re-render days when month/year change
document.getElementById("birth-month").addEventListener("change", () => {
    const month = parseInt(document.getElementById("birth-month").value);
    const year = parseInt(document.getElementById("birth-year").value);
    populateDays(month, year);
});

document.getElementById("birth-year").addEventListener("change", () => {
    const month = parseInt(document.getElementById("birth-month").value);
    const year = parseInt(document.getElementById("birth-year").value);
    populateDays(month, year);
});

// --- Form Submission Handler ---
document.querySelector(".login-form").addEventListener("submit", async (e) => {
	e.preventDefault();

	// Get form values
	const firstName = document.getElementById("first-name").value.trim();
	const middleName = document.getElementById("middle-name").value.trim();
	const lastName = document.getElementById("last-name").value.trim();
	const contactNumber = document.getElementById("contact-number").value.trim();
	const birthMonth = parseInt(document.getElementById("birth-month").value);
	const birthDay = parseInt(document.getElementById("birth-day").value);
	const birthYear = parseInt(document.getElementById("birth-year").value);
	const email = document.getElementById("email").value.trim();
	const password = document.getElementById("password").value;
	const confirmPassword = document.getElementById("confirm-password").value;

	// Validation
	if (
		!firstName || !lastName || !contactNumber ||
		!birthMonth || !birthDay || !birthYear ||
		!email || !password || !confirmPassword
	) {
		alert("Please fill in all required fields.");
		return;
	}

	if (password !== confirmPassword) {
		alert("Passwords do not match.");
		return;
	}

	// Convert birthdate to Timestamp (month - 1 for JS Date)
	const birthdateObj = new Date(birthYear, birthMonth - 1, birthDay);
	const birthdateTimestamp = Timestamp.fromDate(birthdateObj);

	// Get current time for createdAt
	const createdAtTimestamp = Timestamp.now();

	try {
		// Create user in Firebase Auth
		const userCredential = await createUserWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;

		// Update Firebase user profile
		await updateProfile(user, {
			displayName: `${firstName} ${lastName}`
		});

		// Save user data to Firestore
		const userDoc = doc(db, "users", user.uid);

		// Save to Firestore
		await setDoc(userDoc, {
			firstName,
			middleName,
			lastName,
			contactNumber,
			birthdate: birthdateTimestamp,
			email,
			role: "customer",
			createdAt: createdAtTimestamp
		});

		alert("Registration successful!");
		await signOut(auth);

		window.location.href = "login.html";
	} catch (error) {
		console.error("Registration error:", error);
		alert("Error: " + error.message);
	}
});