// --- KONFIGŪRACIJA ---
let SENTENCES = []; 
const LETTER_INTERVAL_MS = 1000;

function loadSentences(callback) {
    fetch('sentences.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Nepavyko pakrauti sakinių!");
            }
            return response.json();
        })
        .then(data => {
            SENTENCES = data;
            if (typeof callback === 'function') callback();
        })
        .catch(error => {
            console.error(error);
            alert(error.message);
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
const demographicsForm = document.getElementById('demographics-form');
const ageInput = document.getElementById('age-input');
const genderSelect = document.getElementById('gender-select');
const educationSelect = document.getElementById('education-select');

// --- BŪSENOS KINTAMIEJI ---
let testActive = false;
let startTime = 0;
let timerInterval = null;
let letterInterval = null;
let currentSentenceIndex = 0;
let allResults = [];
let activeSentenceData = null;
let userDemographics = {}; 
// NAUJAS: Kintamieji spėjimo laukeliui, kad kaskart nereikėtų kurti iš naujo
let guessInput = null;
let guessSubmitButton = null;

// --- FUNKCIJOS ---

function startTest() {
    currentSentenceIndex = 0;
    allResults = [];
    
    demographicsForm.classList.add('hidden');
    startButton.classList.add('hidden');
    resultContainer.classList.add('hidden');
    testArea.classList.remove('hidden');
    
    // PAKEISTA: Atnaujiname instrukciją testo metu
    instructionField.innerHTML = "Jeigu manote, kad žinote, koks bus rodomas žodis, spustelėkite <b>TARPO</b> klavišą.";
    loadSentences(runNextSentence);
}

function runNextSentence() {
    if (!SENTENCES || SENTENCES.length === 0) {
        alert("Klaida: Sakinių sąrašas (sentences.json) yra tuščias. Testas negali tęstis.");
        demographicsForm.classList.remove('hidden');
        startButton.classList.remove('hidden');
        testArea.classList.add('hidden');
        instructionField.innerHTML = "Prieš pradedant testą, prašome pateikti šiek tiek informacijos apie save. <br> Testo metu, kai manysite, kad žinote atsakymą, spustelėkite <b>TARPO</b> klavišą.";
        allResults = [];
        return;
    }

    if (currentSentenceIndex >= SENTENCES.length) {
        displayFinalResults();
        return;
    }

    testActive = true;
    activeSentenceData = SENTENCES[currentSentenceIndex];

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

function revealWord() {
    if (!testActive) return;
    let revealedLetters = '';

    letterInterval = setInterval(() => {
        if (!testActive) return;

        if (revealedLetters.length >= activeSentenceData.word.length) {
            // PAKEISTA: Jei žodis atidengtas pilnai, sustabdome testą su kita priežastimi
            stopTest('word_completed');
            return;
        }

        revealedLetters += activeSentenceData.word[revealedLetters.length];
        sentenceDisplay.querySelector('.highlight').textContent = revealedLetters;
    }, LETTER_INTERVAL_MS);
}

/**
 * PAKEISTA: Sustabdo dabartinį etapą. Dabar priima "priežastį".
 * @param {string} reason - Priežastis, kodėl testas stabdomas ('user_stop' or 'word_completed').
 */
function stopTest(reason = 'user_stop') {
    if (!testActive) return; // Apsauga nuo kelių paspaudimų
    testActive = false;
    const endTime = Date.now();

    clearInterval(timerInterval);
    clearInterval(letterInterval);

    const elapsedTimeSeconds = (endTime - startTime) / 1000;
    const revealedWordPart = sentenceDisplay.querySelector('.highlight').textContent;

    // Jei sustabdė vartotojas, rodome spėjimo laukelį
    if (reason === 'user_stop') {
        showGuessInput((userGuess) => {
            saveResult(userGuess, reason, elapsedTimeSeconds, revealedWordPart);
            currentSentenceIndex++;
            runNextSentence();
        });
    } else { // Jei žodis buvo atidengtas iki galo
        saveResult('', reason, elapsedTimeSeconds, revealedWordPart); // Išsaugome be spėjimo
        currentSentenceIndex++;
        runNextSentence();
    }
}

/**
 * NAUJAS: Parodo laukelį spėjimui įvesti.
 * @param {function} onSubmit - Funkcija, kuri bus iškviesta pateikus spėjimą.
 */
function showGuessInput(onSubmit) {
    // Sukuriame elementus, jei jie dar neegzistuoja
    if (!guessInput) {
        guessInput = document.createElement('input');
        guessInput.type = 'text';
        guessInput.placeholder = 'Įrašykite savo spėjimą...';
        guessInput.id = 'guess-input';
        guessInput.className = 'styled-input';
    }
    if (!guessSubmitButton) {
        guessSubmitButton = document.createElement('button');
        guessSubmitButton.textContent = 'Patvirtinti';
        guessSubmitButton.id = 'guess-submit';
        guessSubmitButton.className = 'styled-button';
    }

    // Pridedame elementus į DOM
    sentenceDisplay.appendChild(document.createElement('br'));
    sentenceDisplay.appendChild(guessInput);
    sentenceDisplay.appendChild(guessSubmitButton);
    guessInput.value = ''; // Išvalome seną reikšmę
    guessInput.focus();

    // Funkcija, kuri bus iškviesta paspaudus mygtuką arba Enter
    function submitHandler() {
        const userGuess = guessInput.value.trim();
        // Pašaliname elementus
        if (guessInput.parentNode) guessInput.parentNode.removeChild(guessInput);
        if (guessSubmitButton.parentNode) guessSubmitButton.parentNode.removeChild(guessSubmitButton);
        // Išvalome mygtuko event listener, kad nesidubliuotų
        guessSubmitButton.onclick = null;
        // Iškviečiame pagrindinę funkciją su vartotojo spėjimu
        onSubmit(userGuess);
    }

    guessSubmitButton.onclick = submitHandler;
    guessInput.onkeydown = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Svarbu, kad Enter neperkrautų formos
            submitHandler();
        }
    };
}

/**
 * PAKEISTA: Išsaugo rezultatą su papildomais laukais.
 */
function saveResult(userGuess, reason, elapsedTimeSeconds, revealedWordPart) {
    const result = {
        sentenceIndex: currentSentenceIndex,
        originalSentence: `${activeSentenceData.prefix}[${activeSentenceData.word}]`,
        fullWord: activeSentenceData.word,
        revealedLetters: revealedWordPart,
        stoppedAtLetterIndex: revealedWordPart.length, // Taisyklingesnis skaičiavimas
        totalTimeSeconds: parseFloat(elapsedTimeSeconds.toFixed(3)),
        stopReason: reason, // Pvz., 'user_stop' arba 'word_completed'
        userGuess: userGuess // NAUJAS LAUKAS
    };
    allResults.push(result);
}

function displayFinalResults() {
    const finalData = {
        userInfo: userDemographics,
        testResults: allResults
    };

    resultJson.textContent = JSON.stringify(finalData, null, 2);
    instructionField.innerHTML = "Ačiū, kad dalyvavote! <br>Norėdami kartoti testą, spustelėkite mygtuką.";
    resultContainer.classList.remove('hidden');
    startButton.classList.remove('hidden');
    testArea.classList.add('hidden');
    startButton.textContent = "Kartoti testą";
}

/**
 * Funkcija, kuri klausosi klaviatūros paspaudimų.
 */
function handleKeyPress(event) {
    // Jei paspaustas tarpas IR testas yra aktyvus
    if (event.code === 'Space' && testActive) {
        event.preventDefault();
        stopTest('user_stop');
    }
}

// --- IVYKIŲ KLAUSYTOJAI ---
startButton.addEventListener('click', function() {
    if (allResults.length > 0) {
        allResults = [];
        resultContainer.classList.add('hidden');
        demographicsForm.classList.remove('hidden');
        instructionField.innerHTML = "Prieš pradedant testą, prašome pateikti šiek tiek informacijos apie save. <br> Testo metu, kai manysite, kad žinote atsakymą, spustelėkite <b>TARPO</b> klavišą.";
        ageInput.value = '';
        startButton.textContent = "Pradėti testą";
        return; 
    }

    const age = ageInput.value.trim();
    if (!age || isNaN(age) || age < 1 || age > 120) {
        alert('Tinkamai įveskite amžių (nuo 1 iki 120, be kablelių ar kitų simbolių)!');
        return;
    }

    userDemographics = {
        gender: genderSelect.value,
        age: parseInt(age, 10),
        education: educationSelect.value
    };
    
    startTest();
});

// Įjungiame klaviatūros klausymąsi visai aplinkai
document.addEventListener('keydown', handleKeyPress);

if (copyJsonBtn) {
    copyJsonBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(resultJson.textContent).then(() => {
            copyJsonBtn.textContent = 'Nukopijuota!';
            setTimeout(() => { copyJsonBtn.textContent = 'Kopijuoti JSON'; }, 1200);
        });
    });
}