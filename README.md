# 📚 Oh My Words - Glosträning

En webbapp för att träna på glosor med text-to-speech funktionalitet via Google Gemini 2.5 TTS.

## Funktioner

- ✅ Lägg till ord på svenska med automatisk översättning till olika språk
- 🔄 Välj mellan synonymer när översättningen ger flera alternativ
- 🔊 Lyssna på ord med Gemini 2.5 TTS (högkvalitativt tal)
- 💾 Ljudet genereras och sparas när ord läggs till (snabbare uppspelning, färre API-anrop)
- ✍️ Öva på att skriva orden på målspråket
- 🎯 Para ihop svenska ord med översättningar (tvåkolumnslayout)
- 👂 Lyssna på ord och skriv dem på svenska
- 🗑️ Rensa alla ord för att börja om
- 🌐 Kommer ihåg vilket språk du valt
- 💾 Automatisk lagring av ord och ljud i webbläsaren

## Språk som stöds

- Engelska (en-US)
- Spanska (es-ES)
- Franska (fr-FR)
- Tyska (de-DE)
- Italienska (it-IT)
- Portugisiska (pt-PT)

## Installation och användning

### 1. Skaffa en Gemini API-nyckel

För att använda text-to-speech funktionen behöver du en Google Gemini API-nyckel:

1. Gå till [Google AI Studio](https://aistudio.google.com/apikey)
2. Logga in med ditt Google-konto
3. Klicka på "Get API Key" eller "Create API Key"
4. Kopiera din API-nyckel

### 2. Öppna appen

1. Öppna `index.html` i din webbläsare
2. Vid första öppnandet kommer du att bli ombedd att ange din Gemini API-nyckel
3. Klistra in din API-nyckel och klicka OK
4. API-nyckeln sparas lokalt i din webbläsare

### 3. Börja träna

1. **Hantera ord**: Lägg till ord på svenska med översättningar
2. **Skriv orden**: Träna på att skriva översättningarna
3. **Para ihop**: Matcha svenska ord med översättningar
4. **Lyssna & skriv**: Lyssna på ordet och skriv det på svenska

## Tekniska detaljer

- Ren HTML, CSS och JavaScript (inga externa ramverk)
- Använder Gemini 2.5 Flash Preview TTS API för högkvalitativ talsyntesen
- Språkspecifik röstväljning (format: `{language-code}-Chirp3-HD-{voice}`) för korrekt språk
- Fallback-mekanism om Chirp3-HD formatet inte stöds
- Använder Gemini 2.0 Flash för automatisk översättning av ord
- Web Audio API för att konvertera PCM-ljud till WAV-format
- LocalStorage för att spara ord, ljud och API-nyckel
- Responsiv design som fungerar på mobil och desktop

## API-kostnad

Gemini 2.5 TTS API är för närvarande gratis inom vissa begränsningar. Kontrollera [Google AI Studio](https://aistudio.google.com/) för aktuell prissättning och kvotgränser.

## Säkerhet

Din API-nyckel lagras endast lokalt i din webbläsare och skickas aldrig någon annanstans än direkt till Google's API.

För att ta bort din API-nyckel:
```javascript
localStorage.removeItem('gemini_api_key');
```

Kör detta kommando i webbläsarens konsol och ladda om sidan.

## Webbläsarstöd

Appen fungerar i alla moderna webbläsare som stöder:
- LocalStorage
- Fetch API
- ES6+ JavaScript

## Licens

Open source - använd fritt!
