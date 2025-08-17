import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, updateEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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

// --- DOM Elements ---
const fullnameInput = document.getElementById("fullname");
const birthdayInput = document.getElementById("birthday");
const contactInput = document.getElementById("contact");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const saveBtn = document.getElementById("saveBtn");
const logoutBtn = document.getElementById("logoutBtn");

// --- Modal Elements ---
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

// --- Load Profile Data ---
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html"; // Redirect if not logged in
        return;
    }

    // Always show auth email
    emailInput.value = user.email;

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const data = userSnap.data();
            console.log("📂 Firestore Data:", data);

            fullnameInput.value = `${data.firstName || ""} ${data.lastName || ""}`.trim();

            if (data.birthdate && data.birthdate.seconds) {
                const date = new Date(data.birthdate.seconds * 1000);
                birthdayInput.value = date.toISOString().split("T")[0];
            }

            contactInput.value = data.contactNumber || "";
        } else {
            console.warn("⚠️ No Firestore profile found for user:", user.uid);
        }
    } catch (err) {
        console.error("🔥 Error loading profile:", err);
    }
});

// --- Save Changes ---
saveBtn.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Email update
        if (emailInput.value !== user.email) {
            await updateEmail(user, emailInput.value);
            await sendEmailVerification(user);
            alert("📧 Email updated! Please check your inbox to verify the new address.");
        }

        // Name split
        const [firstName, ...lastNameParts] = fullnameInput.value.split(" ");
        const lastName = lastNameParts.join(" ");

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
            firstName: firstName || "",
            lastName: lastName || "",
            birthdate: new Date(birthdayInput.value),
            contactNumber: contactInput.value
        });

        if (passwordInput.value.trim() !== "") {
            await updatePassword(user, passwordInput.value);
            alert("✅ Profile and password updated successfully!");
        } else {
            alert("✅ Profile updated successfully!");
        }

        passwordInput.value = "";
    } catch (err) {
        console.error("🔥 Error updating profile:", err);
        alert("❌ Failed to update profile.");
    }
});

// --- Profile Dropdown ---
const profileIcon = document.getElementById("profile");
const dropdown = document.getElementById("profile-dropdown");
let currentUser = null;

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateDropdown();
});

profileIcon.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", () => {
    dropdown.style.display = "none";
});

function updateDropdown() {
    dropdown.innerHTML = "";

    if (!currentUser) {
        const loginLink = document.createElement("a");
        loginLink.href = "login.html";
        loginLink.textContent = "LOGIN";
        dropdown.appendChild(loginLink);
    } else {
        const profileLink = document.createElement("a");
        profileLink.href = "profile.html";
        profileLink.textContent = "PROFILE";

        const logoutLink = document.createElement("a");
        logoutLink.href = "#";
        logoutLink.textContent = "LOGOUT";
        logoutLink.addEventListener("click", (e) => {
            e.preventDefault();
            logoutModal.style.display = "flex"; // Show modal
        });

        dropdown.appendChild(profileLink);
        dropdown.appendChild(logoutLink);
    }
}

// --- Logout Modal Actions ---
logoutBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.style.display = "flex"; // Show modal
});

cancelLogout.addEventListener("click", () => {
    logoutModal.style.display = "none";
});

confirmLogout.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (err) {
        console.error("🔥 Error logging out:", err);
        alert("❌ Failed to log out.");
    }
});
