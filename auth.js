import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCIGhIB4Ju-EriiODG6kryPG0L54OGKTRI",
    authDomain: "sobanglevel2.firebaseapp.com",
    projectId: "sobanglevel2",
    storageBucket: "sobanglevel2.firebasestorage.app",
    messagingSenderId: "1000021218348",
    appId: "1:1000021218348:web:87881240640481caea6d89",
    measurementId: "G-80TRB9F2KT",
    databaseURL: "https://sobanglevel2-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const errorMessage = document.getElementById('error-message');

if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
}

if (signupButton) {
    signupButton.addEventListener('click', handleSignUp);
}

/**
 * 로그인 처리
 */
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    errorMessage.textContent = ''; // Clear previous error
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'index.html'; // 로그인 성공 시 메인 페이지로 이동
    } catch (error) {
        console.error("로그인 오류:", error);
        errorMessage.textContent = `로그인 실패: ${error.message}`;
    }
}

/**
 * 회원가입 처리
 */
async function handleSignUp() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const passwordConfirm = document.getElementById('signup-password-confirm').value;
    errorMessage.textContent = ''; // Clear previous error

    // 비밀번호 확인
    if (password !== passwordConfirm) {
        errorMessage.textContent = '비밀번호가 일치하지 않습니다.';
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // 회원가입 성공 후, 사용자 프로필에 이름 업데이트
        await updateProfile(userCredential.user, { displayName: name });
        window.location.href = 'index.html'; // 회원가입 및 자동 로그인 성공 시 메인 페이지로 이동
    } catch (error) {
        console.error("회원가입 오류:", error);
        errorMessage.textContent = `회원가입 실패: ${error.message}`;
    }
}