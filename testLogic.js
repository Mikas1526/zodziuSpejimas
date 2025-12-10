// --- KONFIGŪRACIJA ---
const SENTENCES = [
    { prefix: "Šiandien graži ", word: "diena" },
    { prefix: "Vakar vakare skaičiau įdomią ", word: "knygą" },
    { prefix: "Rytoj planuoju aplankyti senus ", word: "draugus" }
];
const LETTER_INTERVAL_MS = 1000;

// --- DOM ELEMENTAI ---
const startButton = document.getElementById('start-button');
const testArea = document.getElementById('test-area');
const sentenceDisplay = document.getElementById('sentence-display');
const timerDisplay = document.getElementById('timer-display');
const progressIndicator = document.getElementById('progress-indicator');
const resultContainer = document.getElementById('result-container');
const resultJson = document.getElementById('result-json');

// --- BŪSENOS KINTAMIEJI ---
let testActive = false; // Ar šiuo metu vyksta vieno sakinio testas
let startTime = 0;
let timerInterval = null;
let letterInterval = null;
let currentSentenceIndex = 0;
let allResults = [];
let activeSentenceData = null;

/**
 * Paleidžia visą testų seriją.
 */
function startTest() {
    // Nustatome pradinę būseną visam testui
    currentSentenceIndex = 0;
    allResults = [];
    
    resultContainer.classList.add('hidden');
    startButton.classList.add('hidden');
    testArea.classList.remove('hidden');

    runNextSentence();
}

/**
 * Vykdo vieną testo etapą (vieną sakinį).
 */
function runNextSentence() {
    // Jei praėjome visus sakinius, baigiame testą
    if (currentSentenceIndex >= SENTENCES.length) {
        displayFinalResults();
        return;
    }

    testActive = true;
    activeSentenceData = SENTENCES[currentSentenceIndex];

    // Parodome eigą (pvz., "Sakinys 1 iš 3")
    progressIndicator.textContent = `Sakinys ${currentSentenceIndex + 1} iš ${SENTENCES.length}`;
    sentenceDisplay.innerHTML = `${activeSentenceData.prefix}<span class="highlight"></span>`;
    timerDisplay.textContent = "0.000 s";

    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(3);
        timerDisplay.textContent = `${elapsedTime} s`;
    }, 10);

    revealWord();
}

/**
 * Atidengia žodį po vieną raidę.
 */
function revealWord() {
    if (!testActive) return;
    let revealedLetters = '';

    letterInterval = setInterval(() => {
        if (!testActive) return;

        if (revealedLetters.length >= activeSentenceData.word.length) {
            stopTest('word_completed');
            return;
        }

        revealedLetters += activeSentenceData.word[revealedLetters.length];
        sentenceDisplay.querySelector('.highlight').textContent = revealedLetters;
    }, LETTER_INTERVAL_MS);
}

/**
 * Sustabdo dabartinį etapą, išsaugo jo rezultatą ir pereina prie kito.
 */
function stopTest(reason = 'user_stop') {
    if (!testActive) return;
    testActive = false;
    const endTime = Date.now();

    clearInterval(timerInterval);
    clearInterval(letterInterval);

    const elapsedTimeSeconds = (endTime - startTime) / 1000;
    const revealedWordPart = sentenceDisplay.querySelector('.highlight').textContent;

    // Sukuriame šio etapo rezultatą
    const result = {
        sentenceIndex: currentSentenceIndex,
        originalSentence: `${activeSentenceData.prefix}[${activeSentenceData.word}]`,
        fullWord: activeSentenceData.word,
        revealedLetters: revealedWordPart,
        stoppedAtLetterIndex: revealedWordPart.length ? revealedWordPart.length - 1 : -1,
        totalTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(3)),
        stopReason: reason
    };
    
    // Išsaugome rezultatą bendrame masyve
    allResults.push(result);

    // Pereiname prie kito sakinio
    currentSentenceIndex++;
    runNextSentence();
}

/**
 * Atvaizduoja galutinius visų etapų rezultatus.
 */
function displayFinalResults() {
    resultJson.textContent = JSON.stringify(allResults, null, 2);
    resultContainer.classList.remove('hidden');
    startButton.textContent = "Kartoti testą";
    startButton.classList.remove('hidden');
    testArea.classList.add('hidden');
}

/**
 * Klausosi klaviatūros paspaudimų.
 */
function handleKeyPress(event) {
    if (event.code === 'Space' && testActive) {
        event.preventDefault();
        stopTest('user_stop');
    }
}

// --- IVYKIŲ KLAUSYTOJAI ---
startButton.addEventListener('click', startTest);
document.addEventListener('keydown', handleKeyPress);
