// Word storage
let words = [];
let currentPracticeIndex = 0;
let practiceScore = { correct: 0, total: 0 };
let currentAttempts = 0;
let remainingWords = [];
let listenDirection = 'swedish'; // 'swedish' or 'target'

// Gemini API configuration
const GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || '';
const GEMINI_TTS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// Language voice mapping for Gemini
const languageVoices = {
    'en-US': 'Puck',
    'es-ES': 'Charon',
    'fr-FR': 'Kore',
    'de-DE': 'Fenrir',
    'it-IT': 'Puck',
    'pt-PT': 'Aoede',
    'sv-SE': 'Puck'
};

// Language names for translation
const languageNames = {
    'en-US': 'English',
    'es-ES': 'Spanish',
    'fr-FR': 'French',
    'de-DE': 'German',
    'it-IT': 'Italian',
    'pt-PT': 'Portuguese',
    'sv-SE': 'Swedish'
};

// Language codes for TTS (helps Gemini detect correct language)
const languageCodes = {
    'en-US': 'en-US',
    'es-ES': 'es-ES',
    'fr-FR': 'fr-FR',
    'de-DE': 'de-DE',
    'it-IT': 'it-IT',
    'pt-PT': 'pt-PT',
    'sv-SE': 'sv-SE'
};

// Debounce timer
let translateTimeout = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadWords();
    loadLanguagePreference();
    setupEventListeners();
    checkAPIKey();
});

// Check if API key exists
function checkAPIKey() {
    if (!GEMINI_API_KEY) {
        const key = prompt('Ange din Google Gemini API-nyckel för att använda text-to-speech funktionen:');
        if (key) {
            localStorage.setItem('gemini_api_key', key);
            location.reload();
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Add word button
    document.getElementById('add-word-btn').addEventListener('click', addWord);

    // Clear all words button
    document.getElementById('clear-all-btn').addEventListener('click', clearAllWords);

    // Enter key for adding words
    document.getElementById('translation').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addWord();
    });

    // Auto-translate when typing Swedish word
    document.getElementById('swedish-word').addEventListener('input', (e) => {
        const swedishWord = e.target.value.trim();

        // Clear previous timeout
        if (translateTimeout) clearTimeout(translateTimeout);

        // Hide synonyms when starting to type a new word
        document.getElementById('synonyms-container').style.display = 'none';

        // If empty, clear translation
        if (!swedishWord) {
            document.getElementById('translation').value = '';
            return;
        }

        // Debounce translation (wait 500ms after user stops typing)
        translateTimeout = setTimeout(() => {
            autoTranslate(swedishWord);
        }, 500);
    });

    // Re-translate when language changes
    document.getElementById('language-select').addEventListener('change', (e) => {
        const selectedLanguage = e.target.value;
        saveLanguagePreference(selectedLanguage);

        const swedishWord = document.getElementById('swedish-word').value.trim();
        if (swedishWord) {
            autoTranslate(swedishWord);
        }
    });
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Initialize practice mode if switching to it
    if (tabName === 'write') initWritePractice();
    if (tabName === 'match') initMatchPractice();
    if (tabName === 'listen') initListenPractice();
}

// Load words from localStorage
function loadWords() {
    const saved = localStorage.getItem('words');
    words = saved ? JSON.parse(saved) : [];
    renderWordList();
}

// Save words to localStorage
function saveWords() {
    localStorage.setItem('words', JSON.stringify(words));
}

// Load language preference from localStorage
function loadLanguagePreference() {
    const savedLanguage = localStorage.getItem('selected_language');
    if (savedLanguage) {
        document.getElementById('language-select').value = savedLanguage;
    }
}

// Save language preference to localStorage
function saveLanguagePreference(language) {
    localStorage.setItem('selected_language', language);
}

// Add new word
async function addWord() {
    const swedishWord = document.getElementById('swedish-word').value.trim();
    const translation = document.getElementById('translation').value.trim();
    const language = document.getElementById('language-select').value;

    if (!swedishWord || !translation) {
        alert('Fyll i både svenskt ord och översättning!');
        return;
    }

    // Create word object
    const newWord = {
        id: Date.now(),
        swedish: swedishWord,
        translation: translation,
        language: language,
        audioData: null  // Will be populated with audio
    };

    // Disable add button while generating audio
    const addButton = document.getElementById('add-word-btn');
    const originalText = addButton.innerHTML;
    addButton.disabled = true;
    addButton.innerHTML = '<span class="btn-spinner"></span> Genererar ljud...';

    try {
        // Generate and save audio
        const audioData = await generateAudioData(translation, language);
        newWord.audioData = audioData;
    } catch (error) {
        console.error('Failed to generate audio:', error);
        // Continue even if audio generation fails
    }

    words.push(newWord);
    saveWords();
    renderWordList();

    // Clear inputs and hide synonyms
    document.getElementById('swedish-word').value = '';
    document.getElementById('translation').value = '';
    document.getElementById('synonyms-container').style.display = 'none';

    // Re-enable button
    addButton.disabled = false;
    addButton.innerHTML = originalText;
}

// Delete word
function deleteWord(id) {
    words = words.filter(word => word.id !== id);
    saveWords();
    renderWordList();
}

// Clear all words
function clearAllWords() {
    if (words.length === 0) return;

    const confirmed = confirm(`Är du säker på att du vill ta bort alla ${words.length} ord? Detta kan inte ångras.`);

    if (confirmed) {
        words = [];
        saveWords();
        renderWordList();
    }
}

// Render word list
function renderWordList() {
    const container = document.getElementById('word-list');
    const clearAllBtn = document.getElementById('clear-all-btn');

    if (words.length === 0) {
        container.innerHTML = '<p class="no-words">Inga ord ännu. Lägg till några ord för att börja!</p>';
        clearAllBtn.style.display = 'none';
        return;
    }

    // Show clear all button when there are words
    clearAllBtn.style.display = 'inline-block';

    const languageNamesSwedish = {
        'en-US': 'Engelska',
        'es-ES': 'Spanska',
        'fr-FR': 'Franska',
        'de-DE': 'Tyska',
        'it-IT': 'Italienska',
        'pt-PT': 'Portugisiska'
    };

    container.innerHTML = words.map(word => `
        <div class="word-item">
            <div class="word-info">
                <div class="word-swedish">${word.swedish}</div>
                <div class="word-translation">
                    <span>${word.translation}</span>
                    <span class="word-language">${languageNamesSwedish[word.language]}</span>
                </div>
            </div>
            <div class="word-actions">
                <button class="btn btn-listen" onclick="speakWord('${word.translation}', '${word.language}', this, ${word.id})">🔊 Lyssna</button>
                <button class="btn btn-danger" onclick="deleteWord(${word.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

// Auto-translate function
async function autoTranslate(swedishWord) {
    const targetLanguage = document.getElementById('language-select').value;
    const translationInput = document.getElementById('translation');
    const loader = document.getElementById('translate-loader');
    const synonymsContainer = document.getElementById('synonyms-container');

    // Show loader
    loader.style.display = 'inline';
    translationInput.placeholder = 'Översätter...';
    synonymsContainer.style.display = 'none';

    try {
        const result = await translateText(swedishWord, targetLanguage);

        // Set the first translation as default
        translationInput.value = result.primary;
        translationInput.placeholder = 'Översättning (fylls i automatiskt)';

        // Show synonyms if available (including primary as first option)
        if (result.synonyms && result.synonyms.length > 0) {
            displaySynonyms(result.primary, result.synonyms);
        }
    } catch (error) {
        console.error('Translation error:', error);
        translationInput.placeholder = 'Översättning misslyckades, skriv manuellt';
    } finally {
        loader.style.display = 'none';
    }
}

// Display synonyms as clickable chips
function displaySynonyms(primary, synonyms) {
    const synonymsContainer = document.getElementById('synonyms-container');
    const synonymsList = document.getElementById('synonyms-list');
    const translationInput = document.getElementById('translation');

    // Combine primary and synonyms, with primary first
    const allOptions = [primary, ...synonyms];

    // Create synonym chips
    synonymsList.innerHTML = allOptions.map((synonym, index) => `
        <button class="synonym-chip ${index === 0 ? 'selected' : ''}" data-synonym="${synonym}">${synonym}</button>
    `).join('');

    // Add click handlers
    synonymsList.querySelectorAll('.synonym-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            // Update translation input with selected synonym
            translationInput.value = chip.dataset.synonym;

            // Update selected state
            synonymsList.querySelectorAll('.synonym-chip').forEach(c => c.classList.remove('selected'));
            chip.classList.add('selected');
        });
    });

    // Show synonyms container
    synonymsContainer.style.display = 'block';
}

// Translate text using Gemini API
async function translateText(text, targetLanguage) {
    if (!GEMINI_API_KEY) {
        throw new Error('API key missing');
    }

    const languageName = languageNames[targetLanguage];
    const prompt = `Translate the following Swedish word or phrase to ${languageName}.

If there are multiple common synonyms or alternative translations, provide them in this format:
Primary: [main translation]
Synonyms: [synonym1], [synonym2], [synonym3]

If there is only one translation, just provide:
Primary: [translation]

Swedish: ${text}`;

    try {
        const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
            const response = data.candidates[0].content.parts[0].text.trim();

            // Parse the response to extract primary and synonyms
            const primaryMatch = response.match(/Primary:\s*(.+?)(?:\n|$)/i);
            const synonymsMatch = response.match(/Synonyms:\s*(.+?)(?:\n|$)/i);

            const primary = primaryMatch ? primaryMatch[1].trim() : response;
            const synonyms = synonymsMatch
                ? synonymsMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];

            return {
                primary: primary,
                synonyms: synonyms
            };
        }

        throw new Error('Invalid response format');
    } catch (error) {
        console.error('Translation API error:', error);
        throw error;
    }
}

// Generate audio data for a word and return it
async function generateAudioData(text, language) {
    if (!GEMINI_API_KEY) {
        throw new Error('API key missing');
    }

    const voiceBase = languageVoices[language] || 'Puck';
    const languageCode = languageCodes[language] || 'en-US';

    // Use full voice name format to specify language explicitly
    // Format: {language-code}-Chirp3-HD-{voice-name}
    // This ensures the correct language is used regardless of text content

    const textPrompt = `Read the following text in ${languageNames[language]}: ${text}`;

    const response = await fetch(`${GEMINI_TTS_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: textPrompt }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: voiceBase
                        }
                    }
                }
            }
        })
    });

    const data = await response.json();

    // Extract and return audio data
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        const audioPart = data.candidates[0].content.parts[0];
        if (audioPart && audioPart.inlineData) {
            return audioPart.inlineData.data;
        }
    }

    throw new Error('No audio data in response');
}

// Text-to-speech using Gemini 2.5 TTS or saved audio
async function speakWord(text, language, buttonElement = null, wordId = null, focusInputAfter = null) {
    // Store original button content and disable button
    let originalHTML = '';
    if (buttonElement) {
        originalHTML = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<span class="btn-spinner"></span> Laddar...';
    }

    try {
        let audioData = null;

        // Try to find saved audio data if wordId is provided
        if (wordId) {
            const word = words.find(w => w.id === wordId);
            if (word && word.audioData) {
                audioData = word.audioData;
            }
        }

        // If no saved audio, generate it
        if (!audioData) {
            if (!GEMINI_API_KEY) {
                alert('API-nyckel saknas! Ladda om sidan för att ange den.');
                return;
            }
            audioData = await generateAudioData(text, language);
        }

        // Play PCM audio using Web Audio API
        await playPCMAudio(audioData);
        
        // Focus input after audio completes if specified
        if (focusInputAfter) {
            const inputElement = document.getElementById(focusInputAfter);
            if (inputElement) {
                inputElement.focus();
            }
        }
    } catch (error) {
        console.error('TTS Error:', error);
        alert('Kunde inte spela upp ljudet. Kontrollera din API-nyckel och internetanslutning.');
    } finally {
        // Re-enable button and restore original content
        if (buttonElement) {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalHTML;
        }
    }
}

// Play PCM audio using Web Audio API
async function playPCMAudio(base64Data) {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    // Create WAV header for 24kHz, 16-bit, mono PCM
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataSize = bytes.length;

    // WAV header is 44 bytes
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk size
    view.setUint16(20, 1, true); // Audio format (1 = PCM)
    view.setUint16(22, numChannels, true); // Number of channels
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // Byte rate
    view.setUint16(32, numChannels * bitsPerSample / 8, true); // Block align
    view.setUint16(34, bitsPerSample, true); // Bits per sample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // Data size

    // Combine header and PCM data
    const wavFile = new Uint8Array(44 + dataSize);
    wavFile.set(new Uint8Array(wavHeader), 0);
    wavFile.set(bytes, 44);

    // Create blob and play
    const blob = new Blob([wavFile], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
}

// Helper function to check if answer is correct (more forgiving)
function isAnswerCorrect(userAnswer, correctAnswer) {
    // Normalize: lowercase and remove punctuation
    const normalize = (str) => str.toLowerCase().replace(/[.,!?;:]/g, '').trim();
    
    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);
    
    // Exact match after normalization
    if (normalizedUser === normalizedCorrect) return true;
    
    // Check if answer contains multiple alternatives (separated by / or ,)
    const alternatives = normalizedCorrect.split(/[\/,]/).map(alt => alt.trim());
    
    // Accept if user answer matches any alternative
    if (alternatives.some(alt => alt === normalizedUser)) return true;
    
    // Accept if user answer is contained in correct answer (for partial matches)
    if (alternatives.some(alt => alt.includes(normalizedUser) && normalizedUser.length > 2)) return true;
    
    // Accept if correct answer is contained in user answer (user wrote more)
    if (alternatives.some(alt => normalizedUser.includes(alt) && alt.length > 2)) return true;
    
    return false;
}

// Writing Practice
function initWritePractice() {
    const container = document.getElementById('write-practice');

    if (words.length === 0) {
        container.innerHTML = '<p class="no-words">Lägg till ord först för att börja öva!</p>';
        return;
    }

    currentPracticeIndex = 0;
    practiceScore = { correct: 0, total: words.length };
    currentAttempts = 0;
    remainingWords = [...words].sort(() => Math.random() - 0.5);
    showWritePracticeCard();
}

function showWritePracticeCard() {
    const container = document.getElementById('write-practice');
    
    if (remainingWords.length === 0) {
        container.innerHTML = `
            <div class="practice-card">
                <div class="practice-prompt">🎉 Grattis!</div>
                <p style="font-size: 1.2em; margin: 20px 0;">Du har klarat alla ord!</p>
                <div class="score">Slutpoäng: ${practiceScore.correct} / ${practiceScore.total}</div>
                <button class="btn btn-primary" onclick="initWritePractice()" style="margin-top: 20px;">Öva igen</button>
            </div>
        `;
        return;
    }
    
    const word = remainingWords[currentPracticeIndex];

    container.innerHTML = `
        <div class="practice-card">
            <div class="score">Poäng: ${practiceScore.correct} / ${practiceScore.total} | Kvar: ${remainingWords.length}</div>
            <div class="practice-prompt">${word.swedish}</div>
            <p style="color: #6c757d; margin-bottom: 20px;">Skriv ordet på ${getLanguageName(word.language)}${currentAttempts > 0 ? ` (Försök ${currentAttempts + 1}/2)` : ''}</p>
            <input type="text" class="practice-input" id="write-answer" placeholder="Skriv här..." autocomplete="off">
            <div class="practice-buttons">
                <button class="btn btn-listen" onclick="speakWord('${word.translation}', '${word.language}', this, ${word.id}, 'write-answer')">🔊 Lyssna</button>
                <button class="btn btn-primary" onclick="checkWriteAnswer()">Kontrollera</button>
                <button class="btn btn-secondary" onclick="skipWritePractice()">Hoppa över</button>
            </div>
            <div id="write-feedback"></div>
        </div>
    `;

    document.getElementById('write-answer').focus();
    document.getElementById('write-answer').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkWriteAnswer();
    });
}

function checkWriteAnswer() {
    const answer = document.getElementById('write-answer').value.trim().toLowerCase();
    const word = remainingWords[currentPracticeIndex];
    const correct = isAnswerCorrect(answer, word.translation);

    const feedback = document.getElementById('write-feedback');
    
    if (correct) {
        practiceScore.correct++;
        feedback.className = 'feedback correct';
        feedback.innerHTML = '✅ Rätt! Bra jobbat!';
        
        setTimeout(() => {
            // Remove word from remaining list
            remainingWords.splice(currentPracticeIndex, 1);
            // Adjust index if needed
            if (currentPracticeIndex >= remainingWords.length) {
                currentPracticeIndex = 0;
            }
            currentAttempts = 0;
            showWritePracticeCard();
        }, 1500);
    } else {
        currentAttempts++;
        
        if (currentAttempts >= 2) {
            // Second attempt failed - move word to end of list
            feedback.className = 'feedback incorrect';
            feedback.innerHTML = `❌ Fel. Rätt svar: ${word.translation}`;
            
            setTimeout(() => {
                // Move word to end of remaining list
                const failedWord = remainingWords.splice(currentPracticeIndex, 1)[0];
                remainingWords.push(failedWord);
                // Adjust index if needed
                if (currentPracticeIndex >= remainingWords.length) {
                    currentPracticeIndex = 0;
                }
                currentAttempts = 0;
                showWritePracticeCard();
            }, 2000);
        } else {
            // First attempt failed, allow retry
            feedback.className = 'feedback incorrect';
            feedback.innerHTML = '❌ Fel, försök igen! (1 försök kvar)';
            document.getElementById('write-answer').value = '';
            document.getElementById('write-answer').focus();
        }
    }
}

function skipWritePractice() {
    // Move word to end of list
    const skippedWord = remainingWords.splice(currentPracticeIndex, 1)[0];
    remainingWords.push(skippedWord);
    // Adjust index if needed
    if (currentPracticeIndex >= remainingWords.length) {
        currentPracticeIndex = 0;
    }
    currentAttempts = 0;
    showWritePracticeCard();
}

// Matching Pairs Practice
function initMatchPractice() {
    const container = document.getElementById('match-practice');

    if (words.length < 4) {
        container.innerHTML = '<p class="no-words">Lägg till minst 4 ord för att para ihop!</p>';
        return;
    }

    // Check if mobile (screen width < 768px)
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    
    if (isMobile) {
        initMatchPracticeMobile();
    } else {
        initMatchPracticeDesktop();
    }
}

// Mobile version - one word at a time with buttons
function initMatchPracticeMobile() {
    const container = document.getElementById('match-practice');
    practiceScore = { correct: 0, total: words.length };
    
    // Shuffle words
    const shuffledWords = [...words].sort(() => Math.random() - 0.5);
    let currentIndex = 0;
    
    function showNextWord() {
        if (currentIndex >= shuffledWords.length) {
            container.innerHTML = `
                <div class="practice-card">
                    <div class="practice-prompt">🎉 Grattis!</div>
                    <p style="font-size: 1.2em; margin: 20px 0;">Du klarade alla ${practiceScore.total} ord!</p>
                    <div class="score">Slutpoäng: ${practiceScore.correct} / ${practiceScore.total}</div>
                    <button class="btn btn-primary" onclick="initMatchPractice()" style="margin-top: 20px;">Öva igen</button>
                </div>
            `;
            return;
        }
        
        const currentWord = shuffledWords[currentIndex];
        
        // Create array of all translations (including correct one)
        const allTranslations = shuffledWords.map(w => ({
            text: w.translation,
            id: w.id,
            language: w.language
        }));
        
        // Shuffle translations
        allTranslations.sort(() => Math.random() - 0.5);
        
        container.innerHTML = `
            <div class="practice-card">
                <div class="score">Poäng: ${practiceScore.correct} / ${practiceScore.total} | Ord: ${currentIndex + 1}/${shuffledWords.length}</div>
                <div class="practice-prompt">${currentWord.swedish}</div>
                <p style="color: #6c757d; margin-bottom: 20px;">Välj rätt översättning</p>
                <div class="mobile-match-options">
                    ${allTranslations.map(trans => `
                        <button class="mobile-match-btn" data-id="${trans.id}" data-language="${trans.language}" data-text="${trans.text}">
                            ${trans.text}
                        </button>
                    `).join('')}
                </div>
                <div id="match-feedback"></div>
            </div>
        `;
        
        // Add click handlers to option buttons
        document.querySelectorAll('.mobile-match-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selectedId = parseInt(btn.dataset.id);
                const correct = selectedId === currentWord.id;
                const feedback = document.getElementById('match-feedback');
                
                // Disable all buttons
                document.querySelectorAll('.mobile-match-btn').forEach(b => b.disabled = true);
                
                if (correct) {
                    practiceScore.correct++;
                    btn.classList.add('correct');
                    feedback.className = 'feedback correct';
                    feedback.innerHTML = '✅ Rätt!';
                    
                    // Play audio
                    speakWord(btn.dataset.text, btn.dataset.language, null, selectedId);
                    
                    setTimeout(() => {
                        currentIndex++;
                        showNextWord();
                    }, 1500);
                } else {
                    btn.classList.add('incorrect');
                    // Highlight correct answer
                    document.querySelectorAll('.mobile-match-btn').forEach(b => {
                        if (parseInt(b.dataset.id) === currentWord.id) {
                            b.classList.add('correct');
                        }
                    });
                    
                    feedback.className = 'feedback incorrect';
                    feedback.innerHTML = `❌ Fel. Rätt svar: ${currentWord.translation}`;
                    
                    setTimeout(() => {
                        currentIndex++;
                        showNextWord();
                    }, 2500);
                }
            });
        });
    }
    
    showNextWord();
}

// Desktop version - original two-column layout
function initMatchPracticeDesktop() {
    const container = document.getElementById('match-practice');
    practiceScore = { correct: 0, total: words.length };

    // Take up to 8 words for matching
    const matchWords = words.slice(0, Math.min(8, words.length));

    // Create separate arrays for Swedish and translations
    const swedishCards = matchWords.map(word => ({
        text: word.swedish,
        type: 'swedish',
        id: word.id
    }));

    const translationCards = matchWords.map(word => ({
        text: word.translation,
        type: 'translation',
        id: word.id,
        language: word.language
    }));

    // Shuffle each column separately
    swedishCards.sort(() => Math.random() - 0.5);
    translationCards.sort(() => Math.random() - 0.5);

    let matchedIds = new Set();

    container.innerHTML = `
        <div class="score">Poäng: ${practiceScore.correct} / ${practiceScore.total}</div>
        <div class="match-columns">
            <div class="match-column" id="swedish-column"></div>
            <div class="match-column" id="translation-column"></div>
        </div>
    `;

    const swedishColumn = document.getElementById('swedish-column');
    const translationColumn = document.getElementById('translation-column');

    swedishColumn.innerHTML = swedishCards.map(card => `
        <div class="match-card" data-id="${card.id}" data-type="${card.type}">
            ${card.text}
        </div>
    `).join('');

    translationColumn.innerHTML = translationCards.map(card => `
        <div class="match-card" data-id="${card.id}" data-type="${card.type}" data-language="${card.language}">
            ${card.text}
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.match-card').forEach(card => {
        card.addEventListener('click', () => handleMatchClick(card, matchedIds));
    });
}

function handleMatchClick(card, matchedIds) {
    if (card.classList.contains('matched') || card.classList.contains('selected')) return;

    const selectedCards = document.querySelectorAll('.match-card.selected');

    if (selectedCards.length === 0) {
        card.classList.add('selected');
    } else {
        const firstCard = selectedCards[0];
        const firstId = parseInt(firstCard.dataset.id);
        const secondId = parseInt(card.dataset.id);
        const firstType = firstCard.dataset.type;
        const secondType = card.dataset.type;

        // Only allow matching between different types (swedish and translation)
        if (firstType === secondType) {
            // Same type clicked, deselect first and select new
            firstCard.classList.remove('selected');
            card.classList.add('selected');
            return;
        }

        if (firstId === secondId) {
            // Match found
            firstCard.classList.remove('selected');
            firstCard.classList.add('matched');
            card.classList.add('matched');
            matchedIds.add(firstId);
            practiceScore.correct++;
            
            // Update score display
            document.querySelector('#match-practice .score').textContent = `Poäng: ${practiceScore.correct} / ${practiceScore.total}`;

            // Play success sound
            if (secondType === 'translation') {
                const language = card.dataset.language;
                setTimeout(() => speakWord(card.textContent, language, null, firstId), 300);
            } else if (firstCard.dataset.type === 'translation') {
                const language = firstCard.dataset.language;
                setTimeout(() => speakWord(firstCard.textContent, language, null, firstId), 300);
            }

            // Check if all matched
            if (matchedIds.size === practiceScore.total) {
                setTimeout(() => {
                    alert(`🎉 Grattis! Du klarade alla ${practiceScore.total} ord!`);
                    initMatchPractice();
                }, 1000);
            }
        } else {
            // No match
            card.classList.add('wrong');
            firstCard.classList.add('wrong');

            setTimeout(() => {
                card.classList.remove('wrong');
                firstCard.classList.remove('wrong', 'selected');
            }, 800);
        }
    }
}

// Listen and Write Practice
function initListenPractice() {
    const container = document.getElementById('listen-practice');

    if (words.length === 0) {
        container.innerHTML = '<p class="no-words">Lägg till ord först för att börja öva!</p>';
        return;
    }

    currentPracticeIndex = 0;
    practiceScore = { correct: 0, total: words.length };
    currentAttempts = 0;
    remainingWords = [...words].sort(() => Math.random() - 0.5);
    // Load saved direction preference
    listenDirection = localStorage.getItem('listen_direction') || 'swedish';
    showListenPracticeCard();
}

function showListenPracticeCard() {
    const container = document.getElementById('listen-practice');
    
    if (remainingWords.length === 0) {
        container.innerHTML = `
            <div class="practice-card">
                <div class="practice-prompt">🎉 Grattis!</div>
                <p style="font-size: 1.2em; margin: 20px 0;">Du har klarat alla ord!</p>
                <div class="score">Slutpoäng: ${practiceScore.correct} / ${practiceScore.total}</div>
                <button class="btn btn-primary" onclick="initListenPractice()" style="margin-top: 20px;">Öva igen</button>
            </div>
        `;
        return;
    }
    
    const word = remainingWords[currentPracticeIndex];
    const isSwedish = listenDirection === 'swedish';
    const promptText = isSwedish ? 'på svenska' : `på ${getLanguageName(word.language)}`;

    container.innerHTML = `
        <div class="practice-card">
            <div class="score">Poäng: ${practiceScore.correct} / ${practiceScore.total} | Kvar: ${remainingWords.length}</div>
            <div style="margin-bottom: 20px;">
                <label style="margin-right: 15px; color: #6c757d;">Skriv svar:</label>
                <label style="margin-right: 10px;">
                    <input type="radio" name="listen-direction" value="swedish" ${isSwedish ? 'checked' : ''} onchange="changeListenDirection('swedish')"> På svenska
                </label>
                <label>
                    <input type="radio" name="listen-direction" value="target" ${!isSwedish ? 'checked' : ''} onchange="changeListenDirection('target')"> På ${getLanguageName(word.language)}
                </label>
            </div>
            <div class="practice-prompt">🔊 Lyssna och skriv</div>
            <p style="color: #6c757d; margin-bottom: 20px;">Klicka på knappen för att höra ordet, skriv sedan det ${promptText}${currentAttempts > 0 ? ` (Försök ${currentAttempts + 1}/2)` : ''}</p>
            <button class="btn btn-listen" onclick="speakWord('${word.translation}', '${word.language}', this, ${word.id}, 'listen-answer')" style="margin-bottom: 20px; font-size: 1.2em; padding: 15px 30px;">
                🔊 Spela upp ordet
            </button>
            <input type="text" class="practice-input" id="listen-answer" placeholder="Skriv ${promptText}..." autocomplete="off">
            <div class="practice-buttons">
                <button class="btn btn-primary" onclick="checkListenAnswer()">Kontrollera</button>
                <button class="btn btn-secondary" onclick="skipListenPractice()">Hoppa över</button>
            </div>
            <div id="listen-feedback"></div>
        </div>
    `;

    document.getElementById('listen-answer').focus();
    document.getElementById('listen-answer').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') checkListenAnswer();
    });
}

function checkListenAnswer() {
    const answer = document.getElementById('listen-answer').value.trim().toLowerCase();
    const word = remainingWords[currentPracticeIndex];
    const correctAnswer = listenDirection === 'swedish' ? word.swedish : word.translation;
    const correct = isAnswerCorrect(answer, correctAnswer);

    const feedback = document.getElementById('listen-feedback');
    
    if (correct) {
        practiceScore.correct++;
        feedback.className = 'feedback correct';
        feedback.innerHTML = '✅ Rätt! Bra jobbat!';
        
        setTimeout(() => {
            // Remove word from remaining list
            remainingWords.splice(currentPracticeIndex, 1);
            // Adjust index if needed
            if (currentPracticeIndex >= remainingWords.length) {
                currentPracticeIndex = 0;
            }
            currentAttempts = 0;
            showListenPracticeCard();
        }, 1500);
    } else {
        currentAttempts++;
        
        if (currentAttempts >= 2) {
            // Second attempt failed - move word to end of list
            feedback.className = 'feedback incorrect';
            feedback.innerHTML = `❌ Fel. Rätt svar: ${correctAnswer}`;
            
            setTimeout(() => {
                // Move word to end of remaining list
                const failedWord = remainingWords.splice(currentPracticeIndex, 1)[0];
                remainingWords.push(failedWord);
                // Adjust index if needed
                if (currentPracticeIndex >= remainingWords.length) {
                    currentPracticeIndex = 0;
                }
                currentAttempts = 0;
                showListenPracticeCard();
            }, 2000);
        } else {
            // First attempt failed, allow retry
            feedback.className = 'feedback incorrect';
            feedback.innerHTML = '❌ Fel, försök igen! (1 försök kvar)';
            document.getElementById('listen-answer').value = '';
            document.getElementById('listen-answer').focus();
        }
    }
}

function skipListenPractice() {
    // Move word to end of list
    const skippedWord = remainingWords.splice(currentPracticeIndex, 1)[0];
    remainingWords.push(skippedWord);
    // Adjust index if needed
    if (currentPracticeIndex >= remainingWords.length) {
        currentPracticeIndex = 0;
    }
    currentAttempts = 0;
    showListenPracticeCard();
}

// Change listen direction and save preference
function changeListenDirection(direction) {
    listenDirection = direction;
    localStorage.setItem('listen_direction', direction);
    currentAttempts = 0;
    showListenPracticeCard();
}

// Get language name in Swedish
function getLanguageName(languageCode) {
    const names = {
        'en-US': 'engelska',
        'es-ES': 'spanska',
        'fr-FR': 'franska',
        'de-DE': 'tyska',
        'it-IT': 'italienska',
        'pt-PT': 'portugisiska'
    };
    return names[languageCode] || 'målspråket';
}
