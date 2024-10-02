import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js'

import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-database.js'

// Add Firebase products that you want to use
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js'

const firebaseConfig = {
    apiKey: "AIzaSyBMRbEW18ViCFCVdLS6lyoMfx0Z9ZGgW9U",
    authDomain: "dmii-2024.firebaseapp.com",
    projectId: "dmii-2024",
    storageBucket: "dmii-2024.appspot.com",
    messagingSenderId: "871398193932",
    appId: "1:871398193932:web:4b9e45e35be93526b96729",
    databaseURL: 'https://dmii-2024-default-rtdb.europe-west1.firebasedatabase.app'
};

const firebaseApp = initializeApp(firebaseConfig, 'firebase')

const auth = getAuth(firebaseApp);
auth.languageCode = 'fr';

const loginButton = document.getElementById('login');

loginButton.addEventListener('click', (e) => {
    e.preventDefault();

    const provider = new GoogleAuthProvider();

    signInWithPopup(auth, provider)
        .then((result) => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential.accessToken;
            // The signed-in user info.
            const user = result.user;

            const db = getDatabase(firebaseApp);
            const dbRef = ref(db, '/jeankenny/');

            onValue(dbRef, (snapshot) => {
                const data = snapshot.val();

                console.log(data)

                const dataContainer = document.getElementById('data-container');
                dataContainer.innerHTML = '';

                if (data) {
                    Object.keys(data).forEach((key) => {
                        const entry = data[key]['file'];

                        const entryElement = document.createElement('a');
                        entryElement.href = '/download?filepath=' + entry['path'];
                        entryElement.textContent = entry['path'];

                        dataContainer.appendChild(entryElement);
                    });
                } else {
                    dataContainer.innerHTML = '<p>Aucune donnée trouvée.</p>';
                }
            });
        }).catch((error) => {
            // Handle Errors here.
            console.log(error)
    });
})