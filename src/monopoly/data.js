// Tabellone standard con localizzazione italiana classica; importi in unità monetarie del gioco.
const prop = (name, itName, color, price, rent, house) => ({ type: 'property', name, itName: itName || name, color, price, rent, house });
const rail = (name, itName) => ({ type: 'railroad', name, itName: itName || name, price: 200 });
const util = (name, itName) => ({ type: 'utility', name, itName: itName || name, price: 150 });

export const BOARD = [
  { type: 'go', name: 'GO', itName: 'VIA!' },
  prop('Mediterranean Avenue', 'Vicolo Corto', 'brown', 60, [2, 10, 30, 90, 160, 250], 50),
  { type: 'chest', name: 'Community Chest', itName: 'Probabilità' },
  prop('Baltic Avenue', 'Vicolo Stretto', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
  { type: 'tax', name: 'Income Tax', itName: 'Tassa Patrimoniale', amount: 200 },
  rail('Reading Railroad', 'Stazione Sud'),
  prop('Oriental Avenue', 'Bastioni Gran Sasso', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
  { type: 'chance', name: 'Chance', itName: 'Imprevisti' },
  prop('Vermont Avenue', 'Viale Monterosa', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
  prop('Connecticut Avenue', 'Viale Vesuvio', 'lightblue', 120, [8, 40, 100, 300, 450, 600], 50),
  { type: 'jail', name: 'Jail / Just Visiting', itName: 'Prigione / Transito' },
  prop('St. Charles Place', 'Via Accademia', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  util('Electric Company', 'Società Elettrica'),
  prop('States Avenue', 'Corso Ateneo', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  prop('Virginia Avenue', 'Piazza Università', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
  rail('Pennsylvania Railroad', 'Stazione Ovest'),
  prop('St. James Place', 'Via Verdi', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  { type: 'chest', name: 'Community Chest', itName: 'Probabilità' },
  prop('Tennessee Avenue', 'Corso Raffaello', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  prop('New York Avenue', 'Piazza Dante', 'orange', 200, [16, 80, 220, 600, 800, 1000], 100),
  { type: 'parking', name: 'Free Parking', itName: 'Parcheggio Gratuito' },
  prop('Kentucky Avenue', 'Via Marco Polo', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  { type: 'chance', name: 'Chance', itName: 'Imprevisti' },
  prop('Indiana Avenue', 'Corso Magellano', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  prop('Illinois Avenue', 'Largo Colombo', 'red', 240, [20, 100, 300, 750, 925, 1100], 150),
  rail('B. & O. Railroad', 'Stazione Nord'),
  prop('Atlantic Avenue', 'Viale Costantino', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  prop('Ventnor Avenue', 'Viale Traiano', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  util('Water Works', 'Acqua Potabile'),
  prop('Marvin Gardens', 'Piazza Giulio Cesare', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 150),
  { type: 'gotojail', name: 'Go To Jail', itName: 'In Prigione!' },
  prop('Pacific Avenue', 'Via Roma', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  prop('North Carolina Avenue', 'Corso Impero', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  { type: 'chest', name: 'Community Chest', itName: 'Probabilità' },
  prop('Pennsylvania Avenue', 'Largo Augusto', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  rail('Short Line', 'Stazione Est'),
  { type: 'chance', name: 'Chance', itName: 'Imprevisti' },
  prop('Park Place', 'Viale dei Giardini', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { type: 'tax', name: 'Luxury Tax', itName: 'Tassa di Lusso', amount: 100 },
  prop('Boardwalk', 'Parco della Vittoria', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000], 200)
];

export const GROUPS = {
  brown: [1, 3], lightblue: [6, 8, 9], pink: [11, 13, 14], orange: [16, 18, 19],
  red: [21, 23, 24], yellow: [26, 27, 29], green: [31, 32, 34], darkblue: [37, 39]
};

export const CHANCE = [
  { text: 'Avanza fino al VIA; ritira 200 $', move: 0, collectGo: true },
  { text: 'Avanza fino a Largo Colombo (Illinois Avenue)', move: 24 },
  { text: 'Avanza fino a Via Accademia (St. Charles Place)', move: 11 },
  { text: 'Avanza fino alla stazione più vicina', nearest: 'railroad', rentMultiplier: 2 },
  { text: 'Avanza fino alla società di servizi più vicina', nearest: 'utility', utilityMultiplier: 10 },
  { text: 'La banca ti paga un dividendo di 50 $', cash: 50 },
  { text: 'Uscita gratis di prigione', jailCard: true },
  { text: 'Fai 3 passi indietro', back: 3 },
  { text: 'Va dritto in prigione senza passare dal Via', jail: true },
  { text: 'Lavori di ristrutturazione: 25 $ per casa, 100 $ per hotel', repair: [25, 100] },
  { text: 'Multa per eccesso di velocità: paga 15 $', cash: -15 },
  { text: 'Fai un viaggio alla Stazione Sud', move: 5 },
  { text: 'Raggiungi Parco della Vittoria (Boardwalk)', move: 39 },
  { text: 'Sei stato eletto presidente: paga 50 $ a ogni giocatore', payEach: 50 },
  { text: 'Matura il tuo fondo pensione: incassa 150 $', cash: 150 },
  { text: 'Paga spese di consulenza: 50 $', cash: -50 }
];

export const CHEST = [
  { text: 'Avanza fino al VIA; ritira 200 $', move: 0, collectGo: true },
  { text: 'Errore bancario a tuo favore: ritira 200 $', cash: 200 },
  { text: 'Parcella del dottore: paga 50 $', cash: -50 },
  { text: 'Vendita di azioni: incassa 50 $', cash: 50 },
  { text: 'Uscita gratis di prigione', jailCard: true },
  { text: 'Va dritto in prigione senza passare dal Via', jail: true },
  { text: 'Fondo vacanze maturato: ricevi 100 $', cash: 100 },
  { text: 'Rimborso tasse: ricevi 20 $', cash: 20 },
  { text: 'È il tuo compleanno: ricevi 10 $ da ogni giocatore', collectEach: 10 },
  { text: 'Polizza vita maturata: ricevi 100 $', cash: 100 },
  { text: 'Spese ospedaliere: paga 100 $', cash: -100 },
  { text: 'Rette scolastiche: paga 50 $', cash: -50 },
  { text: 'Ricevi compenso professionale di 25 $', cash: 25 },
  { text: 'Migliorie stradali: paga 40 $ per casa, 115 $ per hotel', repair: [40, 115] },
  { text: 'Hai vinto il secondo premio di bellezza: ritira 10 $', cash: 10 },
  { text: 'Erediti 100 $ da un lontano zio', cash: 100 }
];
