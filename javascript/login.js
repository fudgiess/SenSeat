import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


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
const provider = new GoogleAuthProvider();

// Listen for login state changes
// onAuthStateChanged(auth, (user) => {
//     if (user) {
//         // User is logged in
//         console.log("User is logged in:", user.email);

//         window.location.href = "index.html";
//     } else {
//         // No user logged in
//         console.log("No user logged in.");
//     }
// });

// DOM elements
const loginForm = document.querySelector("form.login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

loginForm.addEventListener("submit", async (e) => {
	e.preventDefault(); // Prevent form from refreshing

	const email = emailInput.value.trim();
	const password = passwordInput.value;

	if (!email || !password) {
		alert("Please fill in all required fields.");
		return;
	}

	try {
		const userCredential = await signInWithEmailAndPassword(auth, email, password);
		const user = userCredential.user;

		// Proceed with login for verified users
        const querySnapshot = await getDocs(collection(db, "users"));
        // let userFound = false;

        // if (!user.emailVerified) {
        //     window.location.href = "verify.html";
        // } else {
            querySnapshot.forEach((doc) => {
                if (doc.id === user.uid) {
                    // userFound = true;
                    const userRole = doc.data().role;
                    if (userRole !== 'customer') {
                        window.location.href = "admin-dashboard.html";
                    } else {
                        window.location.href = "index.html";
                    }
                }
            });
        //}
	} catch (error) {
		console.error(error);
		alert("Login failed: " + error.message);
	}
});

// --- Google Sign-In ---
const googleBtn = document.getElementById("google");
googleBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log("Signed in as:", user.displayName, user.email);
        // window.location.href = "dashboard.html"; // redirect on success
    } catch (error) {
        console.error("Google Sign-In failed:", error.message);
        alert("Google Sign-In failed: " + error.message);
    }
});
