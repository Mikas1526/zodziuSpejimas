// --- KONFIGŪRACIJA ---
let SENTENCES = [];
const LETTER_INTERVAL_MS = 1000;

function loadSentences(callback) {
    fetch('sentences.json')
        .then(response => response.json())
        .then(data => {
            SENTENCES = data;
            if (typeof callback === 'function') callback();
        });
}

// --- DOM ELEMENTAI ---
const startButton = document.getElementById('start-button');
const instructionField = document.getElementById('instructions');
const testArea = document.getElementById('test-area');
const sentenceDisplay = document.getElementById('sentence-display');
const timerDisplay = document.getElementById('timer-display');
const progressIndicator = document.getElementById('progress-indicator');
const resultContainer = document.getElementById('result-container');
const resultJson = document.getElementById('result-json');
const copyJsonBtn = document.getElementById('copy-json-btn');
if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', function() {
        const jsonText = resultJson.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(jsonText).then(() => {
                copyJsonBtn.textContent = 'Nukopijuota!';
                setTimeout(() => {
                    copyJsonBtn.textContent = 'Kopijuoti JSON';
                }, 1200);
            });
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = jsonText;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyJsonBtn.textContent = 'Nukopijuota!';
            setTimeout(() => {
                copyJsonBtn.textContent = 'Kopijuoti JSON';
            }, 1200);
        }
    });
}
let guessInput = null;
let guessSubmitButton = null;

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
    instructionField.textContent = "Jeigu manote, kad žinote, koks bus rodomas žodis, spustelėkite tarpo klavišą";
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

    // Parodome eigą (pvz., "Sakinys 1 iš X")
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

    // Jei sustabdyta vartotojo, parodyti laukelį spėjimui
    if (reason === 'user_stop') {
        showGuessInput((userGuess) => {
            saveResult(userGuess, reason, elapsedTimeSeconds, revealedWordPart);
            currentSentenceIndex++;
            runNextSentence();
        });
    } else {
        saveResult('', reason, elapsedTimeSeconds, revealedWordPart);
        currentSentenceIndex++;
        runNextSentence();
    }
}

function showGuessInput(onSubmit) {
    // Sukuriame input ir mygtuką, jei jų nėra
    if (!guessInput) {
        guessInput = document.createElement('input');
        guessInput.type = 'text';
        guessInput.placeholder = 'Įrašykite savo spėjimą';
        guessInput.id = 'guess-input';
        guessInput.className = 'styled-input';
    }
    if (!guessSubmitButton) {
        guessSubmitButton = document.createElement('button');
        guessSubmitButton.textContent = 'Patvirtinti spėjimą';
        guessSubmitButton.id = 'guess-submit';
        guessSubmitButton.className = 'styled-button';
    }
    // Pridedame į DOM
    sentenceDisplay.appendChild(document.createElement('br'));
    sentenceDisplay.appendChild(guessInput);
    sentenceDisplay.appendChild(guessSubmitButton);
    guessInput.value = '';
    guessInput.focus();

    function submitHandler() {
        const userGuess = guessInput.value.trim();
        // Pašaliname input ir mygtuką
        if (guessInput.parentNode) guessInput.parentNode.removeChild(guessInput);
        if (guessSubmitButton.parentNode) guessSubmitButton.parentNode.removeChild(guessSubmitButton);
        onSubmit(userGuess);
    }
    guessSubmitButton.onclick = submitHandler;
    guessInput.onkeydown = function(e) {
        if (e.key === 'Enter') submitHandler();
    };
}

function saveResult(userGuess, reason, elapsedTimeSeconds, revealedWordPart) {
    const result = {
        sentenceIndex: currentSentenceIndex,
        originalSentence: `${activeSentenceData.prefix}[${activeSentenceData.word}]`,
        fullWord: activeSentenceData.word,
        revealedLetters: revealedWordPart,
        stoppedAtLetterIndex: revealedWordPart.length ? revealedWordPart.length - 1 : -1,
        totalTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(3)),
        stopReason: reason,
        userGuess: userGuess
    };
    allResults.push(result);
}

/**
 * Atvaizduoja galutinius visų etapų rezultatus.
 */
function displayFinalResults() {
    resultJson.textContent = JSON.stringify(allResults, null, 2);
    instructionField.textContent = "Ačiū, kad dalyvavote!";
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
startButton.addEventListener('click', function() {
    if (SENTENCES.length === 0) {
        loadSentences(startTest);
    } else {
        startTest();
    }
});
document.addEventListener('keydown', handleKeyPress);
