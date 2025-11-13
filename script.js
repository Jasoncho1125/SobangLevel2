let quizData = []; // 모든 문제 데이터
let currentBookProblems = []; // 현재 선택된 book의 문제 데이터
let bookList = []; // 전체 Book 목록
let currentProblemIndex = 0; // 현재 풀고 있는 문제의 인덱스
let isAnswered = false; // 현재 문제가 풀이되었는지 여부

// 🎯 사용자 지정 변수
const JSON_FILE_NAME = "sobang-v0.01.json"; 
const IMAGE_BASE_PATH = "/image/"; 
const STORAGE_KEY = 'SobangLevel2'; // 학습 내용(결과)을 저장할 로컬 저장소 키

// DOM 요소
const bookSelect = document.getElementById('book-select');
const loadStatus = document.getElementById('load-status');
const imageA = document.getElementById('image_a');
const imageB = document.getElementById('image_b');
const resultContainer = document.getElementById('result-container');
const resultMessage = document.getElementById('result-message');
const optionsContainer = document.getElementById('options-container');
const nextButton = document.getElementById('next-button');
const quizHeader = document.getElementById('quiz-header');
const currentProblemInfo = document.getElementById('current-problem-info');
const bookSelectorContainer = document.getElementById('book-selector-container');
const totalProblemsInfo = document.getElementById('total-problems-info');
const imageContainer = document.getElementById('image-container');
const localStorageStatus = document.getElementById('local-storage-status');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeModalButton = document.getElementById('close-modal-button');
const progressSummaryContainer = document.getElementById('progress-summary-container');
const resetAllButton = document.getElementById('reset-all-button');
const resetCurrentBookButton = document.getElementById('reset-current-book-button');
const prevBookButton = document.getElementById('prev-book-button');
const nextBookButton = document.getElementById('next-book-button');

// =========================================================================
// 🚀 초기화 및 이벤트 리스너
// =========================================================================

document.addEventListener('DOMContentLoaded', loadData); // 페이지 로드 시 데이터 자동 로드
settingsButton.addEventListener('click', () => settingsModal.style.display = 'block');
closeModalButton.addEventListener('click', () => settingsModal.style.display = 'none');
resetAllButton.addEventListener('click', resetAllLearning);
resetCurrentBookButton.addEventListener('click', resetCurrentBookLearning);
prevBookButton.addEventListener('click', prevBook);
nextBookButton.addEventListener('click', nextBook);


// =========================================================================
// � 로컬 저장소 (LocalStorage) 관련 함수
// =========================================================================

/**
 * 로컬 저장소에서 저장된 학습 데이터를 불러옵니다.
 * @returns {Array} 저장된 문제 데이터 (없으면 빈 배열)
 */
function loadFromLocalStorage() {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
        localStorageStatus.textContent = `✅ 저장된 학습 이력을 불러왔습니다.`;
        return JSON.parse(storedData);
    }
    localStorageStatus.textContent = `⭐ 새로운 학습을 시작합니다.`;
    return [];
}

/**
 * 마지막으로 학습한 위치(Book, 문제 인덱스)를 로컬 저장소에서 불러옵니다.
 * @returns {Object|null} 저장된 위치 정보 또는 null
 */
function loadLastState() {
    const storedState = localStorage.getItem(`${STORAGE_KEY}_LastState`);
    return storedState ? JSON.parse(storedState) : null;
}

/**
 * 현재의 전체 문제 데이터를 로컬 저장소에 저장합니다.
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(quizData));
        localStorageStatus.textContent = `💾 학습 결과가 성공적으로 저장되었습니다.`;
    } catch (e) {
        console.error("로컬 저장소 저장 실패:", e);
        localStorageStatus.textContent = `❌ 로컬 저장소 저장에 실패했습니다.`;
    }
}

/**
 * 현재 학습 위치(Book, 문제 인덱스)를 로컬 저장소에 저장합니다.
 */
function saveLastState() {
    if (currentBookProblems.length > 0 && currentProblemIndex >= 0) {
        const lastState = {
            lastBook: currentBookProblems[currentProblemIndex].book,
            lastIndex: currentProblemIndex
        };
        localStorage.setItem(`${STORAGE_KEY}_LastState`, JSON.stringify(lastState));
    }
}


// =========================================================================
// 🔄 데이터 로드 및 문제 풀이 관련 함수
// =========================================================================

/**
 * 1. JSON 파일을 불러오고 로컬 데이터와 병합하는 함수
 */
async function loadData() {
    const jsonFileName = JSON_FILE_NAME; 
    loadStatus.textContent = `데이터 (${jsonFileName})를 불러오는 중...`;
    
    try {
        const response = await fetch(jsonFileName); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const remoteData = await response.json();
        const localData = loadFromLocalStorage();
        
        // JSON 데이터를 기본 템플릿으로 설정
        let mergedData = remoteData.map(problem => ({
            ...problem,
            testResult: null // 기본값 초기화
        }));

        // 로컬 데이터와 병합: num이 일치하는 문제의 testResult를 로컬 데이터로 덮어씁니다.
        const localDataMap = new Map(localData.map(p => [`${p.book}-${p.num}`, p.testResult]));
        
        quizData = mergedData.map(problem => {
            const key = `${problem.book}-${problem.num}`;
            if (localDataMap.has(key)) {
                problem.testResult = localDataMap.get(key);
            }
            return problem;
        });
        
        loadStatus.textContent = `✅ 총 ${quizData.length}개의 문제를 성공적으로 불러왔습니다.`;
        
        setupBookSelector(quizData);
        updateProgressSummary(); // 학습 현황 업데이트

    } catch (error) {
        loadStatus.textContent = `❌ 데이터 로드 실패: ${error.message}. 파일 경로를 확인해주세요.`;
        console.error("데이터 로드 오류:", error);
    }
}

/**
 * 2. Book 선택 드롭다운 설정 및 첫 번째 Book 자동 선택 함수
 */
function setupBookSelector(data) {
    bookList = [...new Set(data.map(item => item.book))].sort();
    
    bookSelect.innerHTML = ''; // 기존 옵션 클리어
    if (bookList.length === 0) {
        bookSelectorContainer.style.display = 'none';
        quizSection.style.display = 'none';
        return;
    }

    bookList.forEach(bookName => {
        const problemCount = data.filter(p => p.book === bookName).length;
        const option = document.createElement('option');
        option.value = bookName;
        option.textContent = `${bookName}(${problemCount}개)`;
        bookSelect.appendChild(option);
    });

    // 🎯 마지막 학습 위치 또는 첫 번째 Book 자동 선택
    const lastState = loadLastState();
    let bookToSelect = bookList[0];
    let indexToSelect = null;

    if (lastState && bookList.includes(lastState.lastBook)) {
        bookToSelect = lastState.lastBook;
        indexToSelect = lastState.lastIndex;
    }

    bookSelect.value = bookToSelect;
    selectBook(bookToSelect, indexToSelect);
}

/**
 * 3. Book 선택 시 문제 목록을 필터링하고 첫 문제로 이동
 * @param {string} book - 선택된 Book의 이름
 * @param {number|null} startIndex - 시작할 문제의 인덱스 (지정하지 않으면 마지막으로 푼 문제 다음부터 시작)
 */
function selectBook(book, startIndex = null) {
    if (!book) {
        totalProblemsInfo.textContent = '';
        return;
    }
    
    currentBookProblems = quizData.filter(problem => problem.book === book);

    // 시작 인덱스 결정: 지정된 인덱스가 있으면 사용, 없으면 풀지 않은 첫 문제부터 시작
    const firstUnsolvedIndex = currentBookProblems.findIndex(p => p.testResult === null);
    currentProblemIndex = (startIndex !== null) ? startIndex : (firstUnsolvedIndex === -1 ? 0 : firstUnsolvedIndex);
    
    totalProblemsInfo.textContent = `선택된 Book: **${book}**, 총 ${currentBookProblems.length} 문제`;
    
    quizHeader.textContent = book;
    
    displayProblem(currentProblemIndex);
}

/**
 * 4. 현재 인덱스의 문제 출제
 */
function displayProblem(index) {
    if (index < 0 || index >= currentBookProblems.length) return;

    currentProblemIndex = index;
    isAnswered = false; 
    
    const problem = currentBookProblems[currentProblemIndex];
    
    // 현재 Book의 정답률 계산
    const completedProblems = currentBookProblems.filter(p => p.testResult !== null).length;
    const correctProblems = currentBookProblems.filter(p => p.testResult === 'ok').length;
    const correctRate = completedProblems > 0 ? Math.round((correctProblems / completedProblems) * 100) : 0;

    // 문제 정보 표시 (정답률 포함)
    currentProblemInfo.innerHTML = `문제 ${currentProblemIndex + 1} / ${currentBookProblems.length} (정답률 ${correctRate}%)`;
    
    // image_a 로드
    imageA.src = IMAGE_BASE_PATH + problem.image_a;
    imageA.alt = `${problem.book} 문제 ${problem.num}`;
    
    // 결과 및 해설 초기화
    resultContainer.style.display = 'none';
    imageB.style.display = 'none'; // 해설 이미지 숨기기
    nextButton.style.display = 'none';
    
    // 버튼 활성화 및 스타일 초기화
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = false;
        button.style.backgroundColor = '#6c757d'; // 기본 회색으로 초기화
    });

    // 이미 풀었던 문제인 경우, 바로 결과 표시
    if (problem.testResult) {
        showPreviousResult(problem);
    }

    // 🎯 현재 위치를 로컬 저장소에 저장
    saveLastState();
}

/**
 * 4-1. 이미 풀었던 문제의 결과를 표시
 */
function showPreviousResult(problem) {
    isAnswered = true;
    const correctAnswer = problem.answer;
    
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
    });

    const correctButton = document.querySelector(`.option-button[data-option="${correctAnswer}"]`);
    if (correctButton) {
        correctButton.style.backgroundColor = '#007bff'; // 정답은 파란색으로 표시
    }

    if (problem.testResult === 'ok') {
        resultMessage.className = 'correct';
        resultMessage.textContent = `✅ 이전에 정답(${correctAnswer}번) 처리된 문제입니다.`;
    } else {
        resultMessage.className = 'incorrect';
        resultMessage.textContent = `❌ 이전에 오답 처리된 문제입니다. 정답은 ${correctAnswer}번입니다.`;
        
        imageB.src = IMAGE_BASE_PATH + problem.image_b;
        imageB.alt = `${problem.book} 해설 ${problem.num}`;
        imageB.style.display = 'block';
    }

    resultContainer.style.display = 'block';
    nextButton.style.display = 'block';
}


/**
 * 5. 선택 버튼 클릭 이벤트 핸들러
 */
optionsContainer.addEventListener('click', (event) => {
    if (event.target.classList.contains('option-button') && !isAnswered) {
        checkAnswer(event.target);
    }
});

/**
 * 6. 정답 확인 로직 및 로컬 저장
 */
function checkAnswer(selectedButton) {
    isAnswered = true;
    const problem = currentBookProblems[currentProblemIndex];
    const userAnswer = selectedButton.dataset.option;
    const correctAnswer = problem.answer;
    
    let message = '';
    
    document.querySelectorAll('.option-button').forEach(button => {
        button.disabled = true;
    });

    // 정답/오답 확인
    if (userAnswer === correctAnswer) {
        message = `${userAnswer}번, 정답입니다. 🎉`;
        resultMessage.className = 'correct';
        problem.testResult = 'ok';
        
    } else {
        message = `틀렸습니다. 정답은 ${correctAnswer}번입니다. 😥`;
        resultMessage.className = 'incorrect';
        problem.testResult = 'nok';
        
        // 오답 선택 버튼 강조
        selectedButton.style.backgroundColor = 'red';
    }
    
    // image_b (해설) 표시 (정답/오답 모두)
    imageB.src = IMAGE_BASE_PATH + problem.image_b;
    imageB.alt = `${problem.book} 해설 ${problem.num}`;
    imageB.style.display = 'block';

    // 정답 버튼 강조
    const correctButton = document.querySelector(`.option-button[data-option="${correctAnswer}"]`);
    if (correctButton) {
        correctButton.style.backgroundColor = '#007bff'; // 정답은 파란색으로 변경
    }

    resultMessage.textContent = message;
    resultContainer.style.display = 'block';
    nextButton.style.display = 'block';

    // 🎯 학습 결과를 로컬 저장소에 저장
    saveToLocalStorage();
    
    // 결과 반영 후 현재 문제 정보 및 정답률 업데이트
    const completedProblems = currentBookProblems.filter(p => p.testResult !== null).length;
    const correctProblems = currentBookProblems.filter(p => p.testResult === 'ok').length;
    const correctRate = completedProblems > 0 ? Math.round((correctProblems / completedProblems) * 100) : 0;

    currentProblemInfo.innerHTML = `문제 ${currentProblemIndex + 1} / ${currentBookProblems.length} (정답률 ${correctRate}%)`;

    // 전체 학습 현황 업데이트
    updateProgressSummary();

    // 현재 Book의 모든 문제를 풀었는지 확인
    const allSolved = currentBookProblems.every(p => p.testResult !== null);
    if (allSolved) {
        const currentBookName = quizHeader.textContent;
        setTimeout(() => alert(`'${currentBookName}'의 모든 문제를 풀이완료 했습니다.`), 100);
    }
}

/**
 * 7. 다음 문제로 이동
 */
function nextProblem() {
    if (currentProblemIndex < currentBookProblems.length - 1) {
        displayProblem(currentProblemIndex + 1);
    } else {
        alert("마지막 문제입니다. 첫 문제로 돌아갑니다.");
        displayProblem(0);
    }
}

/**
 * 8. 이전 문제로 이동
 */
function prevProblem() {
    if (currentProblemIndex > 0) {
        displayProblem(currentProblemIndex - 1);
    } else {
        alert("첫 문제입니다.");
    }
}

/**
 * 8-1. 다음 Book으로 이동
 */
function nextBook() {
    const currentBookName = bookSelect.value;
    const currentIndex = bookList.indexOf(currentBookName);
    const nextIndex = (currentIndex + 1) % bookList.length; // Wraps around
    const nextBookName = bookList[nextIndex];
    
    bookSelect.value = nextBookName;
    selectBook(nextBookName);
}

/**
 * 8-2. 이전 Book으로 이동
 */
function prevBook() {
    const currentBookName = bookSelect.value;
    const currentIndex = bookList.indexOf(currentBookName);
    const prevIndex = (currentIndex - 1 + bookList.length) % bookList.length; // Wraps around
    const prevBookName = bookList[prevIndex];

    bookSelect.value = prevBookName;
    selectBook(prevBookName);
}

/**
 * 9. 전체 학습 기록 초기화
 */
function resetAllLearning() {
    if (confirm("정말로 모든 학습 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(`${STORAGE_KEY}_LastState`); // 마지막 학습 위치도 초기화
        quizData = []; // 메모리에서도 데이터 초기화
        
        // UI 초기화 및 데이터 다시 로드
        localStorageStatus.textContent = "학습 기록이 초기화되었습니다.";
        loadStatus.textContent = "데이터를 다시 로드합니다...";
        settingsModal.style.display = 'none';
        loadData();
    }
}

/**
 * 9-1. 현재 Book의 학습 기록 초기화
 */
function resetCurrentBookLearning() {
    const currentBookName = bookSelect.value;
    if (!currentBookName) return;

    if (confirm(`'${currentBookName}' Book의 학습 기록만 초기화하시겠습니까?`)) {
        quizData.forEach(problem => {
            if (problem.book === currentBookName) {
                problem.testResult = null;
            }
        });

        saveToLocalStorage(); // 변경된 데이터 저장
        settingsModal.style.display = 'none'; // 모달 닫기
        updateProgressSummary(); // 하단 학습 현황 UI 업데이트
        selectBook(currentBookName, 0); // 현재 Book의 문제 목록 및 UI 새로고침 (0번 문제부터)
    }
}

/**
 * 10. 전체 Book별 학습 현황을 계산하고 표시 (updateProgressSummary)
 */
function updateProgressSummary() {
    if (!quizData || quizData.length === 0) return;

    // 전체 진도율 계산 및 제목 업데이트
    const summaryTitle = document.querySelector('#progress-summary-section h2');
    if (summaryTitle) {
        const totalProblemCount = quizData.length;
        const completedProblemCount = quizData.filter(p => p.testResult !== null).length;
        const overallProgress = totalProblemCount > 0 ? Math.round((completedProblemCount / totalProblemCount) * 100) : 0;
        summaryTitle.textContent = `전체 학습 현황 (${overallProgress}%)`;
    }


    progressSummaryContainer.innerHTML = ''; // 기존 내용 초기화

    const books = [...new Set(quizData.map(item => item.book))].sort();

    books.forEach(bookName => {
        const bookProblems = quizData.filter(p => p.book === bookName);
        const totalProblems = bookProblems.length;
        const completedProblems = bookProblems.filter(p => p.testResult !== null).length;
        const correctProblems = bookProblems.filter(p => p.testResult === 'ok').length;
        
        // 정답률 계산 (푼 문제가 있을 경우에만)
        const correctRate = completedProblems > 0 ? Math.round((correctProblems / completedProblems) * 100) : 0;

        const progressParagraph = document.createElement('p');
        progressParagraph.className = 'progress-text';
        progressParagraph.textContent = `${bookName} : 문제수 ${totalProblems}, 풀이완료 ${completedProblems}, 정답률 ${correctRate}%`;

        progressSummaryContainer.appendChild(progressParagraph);
    });
}



// =========================================================================
// 🖱️ 스와이프 기능 구현 (Touch 및 Mouse)
// =========================================================================
let startX = 0;
let endX = 0;
const SWIPE_THRESHOLD = 50; 

// 모바일 터치 이벤트
imageContainer.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
});

imageContainer.addEventListener('touchend', (e) => {
    endX = e.changedTouches[0].clientX;
    handleSwipe();
});

// PC 마우스 드래그 이벤트
let isDragging = false;

imageContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    imageContainer.style.cursor = 'grabbing';
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        imageContainer.style.cursor = 'grab';
        handleSwipe();
    }
});

imageContainer.addEventListener('mousemove', (e) => {
    if (isDragging) {
        endX = e.clientX;
    }
});

function handleSwipe() {
    if (startX === 0 && endX === 0) return; // 스와이프가 아닌 단순 클릭 방지

    const deltaX = endX - startX;
    
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
            // 오른쪽 스와이프 (이전 문제)
            prevProblem();
        } else {
            // 왼쪽 스와이프 (다음 문제) - 문제를 푼 경우에만 이동
            if (isAnswered) {
                nextProblem();
            } else {
                // 문제를 풀지 않았으면 아무 동작도 하지 않음
            }
        }
    }
    startX = 0;
    endX = 0;
}