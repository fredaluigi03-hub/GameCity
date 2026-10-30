# GameCity 🎮📺

Una piattaforma web moderna e immersiva che riproduce i più celebri **quiz show serali italiani** e i più amati **giochi da tavolo** con motore 3D (Three.js), conduttori satirici interattivi con censura broadcast reale a 1000 Hz, intelligenza artificiale per i concorrenti CPU e gestione multigiocatore flessibile.

---

## 🌟 Caratteristiche Principali

### 📺 I Grandi Format TV Italiani
* **L’Eredità**: Da 2 a 7 concorrenti. Manche di qualificazione (*C'è o non c'è*, *1, 2, 3... quella!*, *Le Date*, *La Scossa*), *La Sfida / Scalata doppia* con timer a tempo e definizioni, *Il Triello*, *I 100 secondi* e il gran finale con **La Ghigliottina** (5 coppie di parole per dimezzare o vincere il montepremi). **Jumbotron 3D animato sul set** con cronometri e lettere scoperte in diretta!
* **Caduta Libera**: Il campione al centro con 3 vite sfida i concorrenti sulle botole; botole 3D che si aprono fisicamente con caduta spettacolare sul materasso.
* **Avanti un altro!**: La fila di concorrenti, il pidigozzaro, lo iettatore e il gioco finale con le risposte contrarie a tempo.
* **Affari Tuoi**: 20 pacchi delle regioni italiane, telefonate del Dottore con offerte e cambi pacco, La Regione Fortunata.
* **Reazione a Catena**: Sfida a squadre (Blu vs Arancio), *L'intesa vincente*, catene di parole e l'ultima parola segreta.
* **Chi Vuol Essere Milionario / Cultura Generale**: La scalata a 15 domande con aiuti (50:50, Chiedi al Pubblico, Telefonata a Casa).
* **Hit / Sarabanda**: Riconoscimento al volo delle canzoni all'asta delle note (*Bid-a-Note*), roulette musicale e *7 per Trenta*.
* **Fight List**: Il ring 3D delle liste con categorie a raffica in 45 secondi.
* **Calcolo Lampo**: Duelli matematici per conquistare il pavimento interattivo stile *The Floor*.

### 🎲 Giochi da Tavolo Immersivi
* **Monopoly (Edizione Italia)**: Tabellone da 40 caselle storiche (da *Vicolo Corto* a *Parco della Vittoria*), pedine che saltano sulle caselle, dadi fisici rotanti, rogiti, affitti e compravendita case/alberghi.
* **Tombola Napoletana**: Tutti i 90 numeri con la **Smorfia Napoletana** autentica, **Panariello 3D animato** che si agita prima dell'estrazione, cartelle tradizionali 3x9 con marcatura automatica o manuale, progressione premi: *Ambo, Terno, Quaterna, Cinquina e Tombola*.
* **Gran Bingo VIP**: Atmosfera Casino Lounge, sfera di cristallo rotante, tabellone master 1-90 e radar di prossimità al Bingo in tempo reale.
* **Tavola Ouija (Edizione Halloween & Mistero)**: Plancetta animata con moto magnetico che viaggia lettera per lettera per comporre profezie occulte e indovinelli nell'oscurità tra candelabri 3D tremolanti.
* **Forza 4**: Griglia tridimensionale con gravità fisica dei gettoni, modalità umana o CPU con algoritmo minimax.

### 🎙 Telecronista con Censura Televisiva ([BEEP])
* Ogni gioco dispone di un conduttore dedicato dotato di dialoghi comici e battute satiriche.
* Filtro di censura reale: badge visivo rosso pulsante `[BEEP]` sincronizzato con un autentico segnale audio a 1000 Hz sintetizzato in tempo reale con Web Audio API.

### ⚙️ Controlli & Personalizzazione
* **Ritmo di gioco**: Regolabile a 1x (Normale), 1.5x (Veloce) e 2.5x (Turbo).
* **Gestione Partecipanti**: Scegli quanti umani e quanti CPU far giocare, con personalizzazione libera dei nomi.
* **Ritiro / Auto-eliminazione**: Pulsante `⚐ Ritirati` per abbandonare la gara in qualsiasi momento.

---

## 🚀 Avvio Locale

### Prerequisiti
* [Node.js](https://nodejs.org/) (versione 18 o superiore consigliata)

### Installazione
```bash
git clone https://github.com/fredaluigi03-hub/GameCity.git
cd GameCity
npm install
```

### Avvio
```bash
npm start
```
*(Oppure fai doppio clic su `avvia-gioco.bat` su Windows)*

Lo script individua automaticamente la prima porta libera disponibile (es. `http://localhost:5199/`) e apre direttamente il browser.

---

## ☁️ Deploy su Vercel

Il progetto è pre-configurato per il deploy istantaneo su **Vercel**:
1. Collega il repository GitHub `GameCity` su Vercel.
2. Il file `vercel.json` configurerà automaticamente il comando di build (`vite build`) e la cartella di output (`dist`).
3. Clicca su **Deploy**!

---

## 🧪 Test
Per eseguire la suite completa di 17 unit test automatici:
```bash
npm test
```
