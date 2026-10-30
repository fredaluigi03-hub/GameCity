import {shuffle} from './ui.js';

export const CATS = ['Storia', 'Geografia', 'Scienza', 'Sport', 'Arte', 'Cinema', 'Musica', 'Cucina'];
export const CAT_COL = {Storia: '#c0842b', Geografia: '#2bb673', Scienza: '#3b82f6', Sport: '#ef4444', Arte: '#a855f7', Cinema: '#f59e0b', Musica: '#ec4899', Cucina: '#14b8a6'};

// [categoria, difficoltà 1-3, domanda, giusta, sbagliata x3]
const RAW = [
['Storia',1,'In che anno è caduto il Muro di Berlino?','1989','1991','1985','1979'],
['Storia',1,'Chi fu il primo imperatore di Roma?','Augusto','Giulio Cesare','Nerone','Traiano'],
['Storia',2,'In che anno Cristoforo Colombo raggiunse l’America?','1492','1453','1519','1500'],
['Storia',2,'Quale città fu distrutta dal Vesuvio nel 79 d.C. insieme a Pompei?','Ercolano','Napoli','Capua','Cuma'],
['Storia',3,'In che anno ebbe luogo la battaglia di Waterloo?','1815','1805','1821','1799'],
['Storia',2,'Chi guidò la spedizione dei Mille?','Giuseppe Garibaldi','Giuseppe Mazzini','Camillo Cavour','Vittorio Emanuele II'],
['Storia',3,'Quale trattato del 1957 istituì la Comunità Economica Europea?','Trattato di Roma','Trattato di Maastricht','Trattato di Lisbona','Trattato di Versailles'],
['Storia',1,'In che anno l’Italia è diventata una Repubblica?','1946','1936','1953','1961'],
['Geografia',1,'Qual è la capitale dell’Australia?','Canberra','Sydney','Melbourne','Perth'],
['Geografia',1,'Qual è il fiume più lungo d’Italia?','Po','Tevere','Adige','Arno'],
['Geografia',2,'Qual è il lago più grande d’Italia?','Lago di Garda','Lago Maggiore','Lago di Como','Lago Trasimeno'],
['Geografia',2,'Di quale paese è capitale Ottawa?','Canada','Australia','Nuova Zelanda','Sudafrica'],
['Geografia',3,'Qual è la capitale della Mongolia?','Ulan Bator','Astana','Bishkek','Tashkent'],
['Geografia',2,'In quale oceano si trovano le Maldive?','Oceano Indiano','Oceano Pacifico','Oceano Atlantico','Oceano Artico'],
['Geografia',3,'Qual è il deserto caldo più grande del mondo?','Sahara','Gobi','Kalahari','Deserto Arabico'],
['Geografia',1,'Quante regioni ha l’Italia?','20','18','21','22'],
['Scienza',1,'Qual è il pianeta più vicino al Sole?','Mercurio','Venere','Marte','Giove'],
['Scienza',1,'Qual è il simbolo chimico dell’oro?','Au','Ag','Or','Go'],
['Scienza',2,'Quante ossa ha il corpo umano adulto?','206','186','256','312'],
['Scienza',2,'Chi formulò la teoria della relatività?','Albert Einstein','Isaac Newton','Niels Bohr','Galileo Galilei'],
['Scienza',3,'Qual è l’elemento più abbondante nell’universo?','Idrogeno','Elio','Ossigeno','Carbonio'],
['Scienza',2,'Quale gas assorbono le piante con la fotosintesi?','Anidride carbonica','Ossigeno','Azoto','Idrogeno'],
['Scienza',3,'Quanto vale circa la velocità della luce nel vuoto?','300.000 km/s','150.000 km/s','30.000 km/s','3.000.000 km/s'],
['Scienza',1,'Quanti sono i pianeti del Sistema Solare?','8','9','7','10'],
['Sport',1,'Quante volte l’Italia ha vinto i Mondiali di calcio?','4','3','5','2'],
['Sport',2,'Quale città italiana ospita le Olimpiadi invernali 2026 insieme a Cortina?','Milano','Torino','Roma','Bormio'],
['Sport',2,'Chi ha vinto più tornei del Grande Slam in singolare maschile?','Novak Djokovic','Rafael Nadal','Roger Federer','Pete Sampras'],
['Sport',3,'In che anno l’Italia ha vinto il suo ultimo Mondiale di calcio?','2006','2010','1994','1982'],
['Sport',1,'Quanti giocatori scendono in campo per squadra nel calcio?','11','10','12','9'],
['Sport',2,'In quale sport si usa il volano?','Badminton','Squash','Tennis','Padel'],
['Sport',3,'Chi è il miglior marcatore di sempre della Nazionale italiana di calcio?','Luigi Riva','Paolo Rossi','Roberto Baggio','Alessandro Del Piero'],
['Sport',2,'Quanti titoli mondiali di F1 hanno vinto Schumacher e Hamilton?','7','5','6','8'],
['Arte',1,'Chi ha dipinto la Gioconda?','Leonardo da Vinci','Michelangelo','Raffaello','Caravaggio'],
['Arte',1,'Chi ha scritto la Divina Commedia?','Dante Alighieri','Petrarca','Boccaccio','Ariosto'],
['Arte',2,'Chi è l’autore de “I Promessi Sposi”?','Alessandro Manzoni','Giacomo Leopardi','Ugo Foscolo','Giovanni Verga'],
['Arte',2,'Chi scolpì il David conservato a Firenze?','Michelangelo','Donatello','Bernini','Canova'],
['Arte',3,'Chi ha scritto “Il Gattopardo”?','Tomasi di Lampedusa','Leonardo Sciascia','Italo Svevo','Luigi Pirandello'],
['Arte',2,'Quale pittore realizzò “La notte stellata”?','Vincent van Gogh','Claude Monet','Paul Gauguin','Edvard Munch'],
['Arte',3,'Chi ha scritto “Il fu Mattia Pascal”?','Luigi Pirandello','Italo Svevo','Grazia Deledda','Giovanni Verga'],
['Arte',1,'Chi ha scritto “Romeo e Giulietta”?','William Shakespeare','Charles Dickens','Molière','Goethe'],
['Cinema',1,'Chi ha diretto “La vita è bella”?','Roberto Benigni','Giuseppe Tornatore','Paolo Sorrentino','Nanni Moretti'],
['Cinema',2,'Quale film di Sorrentino ha vinto l’Oscar come miglior film straniero?','La grande bellezza','Youth','È stata la mano di Dio','Il divo'],
['Cinema',2,'Chi ha interpretato il ragionier Fantozzi?','Paolo Villaggio','Renato Pozzetto','Carlo Verdone','Massimo Troisi'],
['Cinema',3,'Chi ha diretto “Il padrino”?','Francis Ford Coppola','Martin Scorsese','Brian De Palma','Sergio Leone'],
['Cinema',1,'Come si chiama il maghetto protagonista dei libri di J.K. Rowling?','Harry Potter','Merlino','Gandalf','Percy Jackson'],
['Cinema',2,'Chi ha composto la colonna sonora di “C’era una volta il West”?','Ennio Morricone','Nino Rota','Piero Piccioni','Riz Ortolani'],
['Cinema',3,'Quale film della trilogia di Peter Jackson vinse 11 Oscar?','Il ritorno del re','La compagnia dell’anello','Le due torri','Lo Hobbit'],
['Cinema',2,'Come si chiama la pesciolina smemorata di “Alla ricerca di Nemo”?','Dory','Bruce','Gill','Squirt'],
['Musica',1,'Chi ha vinto Sanremo 2021 con “Zitti e buoni”?','Måneskin','Mahmood','Achille Lauro','Blanco'],
['Musica',2,'Chi ha cantato “Nel blu dipinto di blu”?','Domenico Modugno','Adriano Celentano','Gianni Morandi','Lucio Dalla'],
['Musica',2,'Quanti erano i membri dei Beatles?','4','3','5','6'],
['Musica',3,'Chi ha composto “Le quattro stagioni”?','Antonio Vivaldi','Giuseppe Verdi','Gioachino Rossini','Giacomo Puccini'],
['Musica',1,'Quale band britannica ha cantato “Bohemian Rhapsody”?','Queen','Pink Floyd','Led Zeppelin','The Who'],
['Musica',2,'Chi ha scritto l’opera “La Traviata”?','Giuseppe Verdi','Giacomo Puccini','Gaetano Donizetti','Vincenzo Bellini'],
['Musica',3,'Quale strumento suonava Niccolò Paganini?','Violino','Pianoforte','Violoncello','Flauto'],
['Musica',2,'Chi è soprannominato “il Re del Pop”?','Michael Jackson','Prince','Elvis Presley','Freddie Mercury'],
['Cucina',1,'Di quale regione è tipico il pesto?','Liguria','Piemonte','Toscana','Sardegna'],
['Cucina',1,'Quale città è considerata la patria della pizza?','Napoli','Roma','Palermo','Bari'],
['Cucina',2,'Quale formaggio si usa nella vera carbonara?','Pecorino romano','Mozzarella','Gorgonzola','Ricotta'],
['Cucina',3,'Qual è la città d’origine del panettone?','Milano','Torino','Verona','Bologna'],
['Cucina',2,'Di quale regione è tipica la bagna cauda?','Piemonte','Veneto','Lazio','Puglia'],
['Cucina',1,'Da quale animale si ricava la mozzarella “di bufala”?','Bufala','Mucca','Capra','Pecora'],
['Cucina',3,'Da quale parte del fiore si ricava lo zafferano?','Stimmi','Petali','Radici','Foglie'],
['Cucina',2,'Quale biscotto si usa nel tiramisù?','Savoiardi','Amaretti','Pavesini','Pan di stelle']
];

export const Q = RAW.map(([c, d, q, r, ...w], id) => ({id, c, d, q, r, w}));

// pesca una domanda mai usata (reset se finite); opts = numero di risposte
export function drawQ(used, {d, c, opts = 4} = {}) {
  let pool = Q.filter(x => (!d || x.d === d) && (!c || x.c === c) && !used.has(x.id));
  if (!pool.length) pool = Q.filter(x => (!d || x.d === d) && (!c || x.c === c));
  const r = pool[Math.floor(Math.random() * pool.length)];
  used.add(r.id);
  const o = shuffle([r.r, ...shuffle(r.w).slice(0, opts - 1)]);
  return {q: r.q, opts: o, right: o.indexOf(r.r), cat: r.c, d: r.d};
}

// Ghigliottina: 5 parole + soluzione
export const GHIG = [
  {w: ['Neve', 'Cannone', 'Cristallo', 'Volo', 'Piede'], a: 'Palla'},
  {w: ['Miele', 'Park', 'Rossa', 'Mezza', 'Piena'], a: 'Luna'},
  {w: ['Bianca', 'Vacanze', 'Discografica', 'Popolare', 'Editrice'], a: 'Casa'},
  {w: ['Zecchino', 'Corsa', 'Medaglia', 'Pesce', 'Nero'], a: 'Oro'},
  {w: ['Artificio', 'Fatuo', 'Amico', 'Arma', 'Cessate'], a: 'Fuoco'},
  {w: ['Opera', 'Morta', 'Destra', 'Armata', 'Stretta'], a: 'Mano'},
  {w: ['Levante', 'Pasta', 'Pan', 'Farina', 'Lievito'], a: 'Pane'},
  {w: ['Maglia', 'Premio', 'Gara', 'Borsa', 'Caffè'], a: 'Rosa'}
];

// Reazione a catena: ogni parola è legata alla successiva
export const CHAINS = [
  ['LUNA', 'MIELE', 'APE', 'REGINA', 'SCACCHI', 'TORRE', 'PISA'],
  ['CALCIO', 'PALLA', 'NEVE', 'FIOCCO', 'NASTRO', 'REGALO', 'NATALE'],
  ['ONDA', 'MARE', 'SALE', 'PEPE', 'NERO', 'CIGNO', 'LAGO'],
  ['CHIAVE', 'PORTA', 'FINESTRA', 'VETRO', 'BICCHIERE', 'VINO', 'ROSSO'],
  ['PIZZA', 'MARGHERITA', 'REGINA', 'MADRE', 'NATURA', 'MORTA']
];

// Fight List: categorie con elenchi
const L = s => s.split(',').map(x => x.trim());
export const LISTS = [
  {n: 'Squadre di calcio italiane', a: L('Juventus,Inter,Milan,Napoli,Roma,Lazio,Fiorentina,Atalanta,Torino,Bologna,Genoa,Sampdoria,Udinese,Verona,Cagliari,Lecce,Empoli,Monza,Parma,Como,Sassuolo,Salernitana,Spezia,Cremonese,Venezia,Palermo,Bari,Brescia,Cesena,Pisa,Frosinone,Livorno,Catania,Chievo,Perugia,Ascoli,Reggina')},
  {n: 'Capitali europee', a: L('Roma,Parigi,Londra,Madrid,Berlino,Lisbona,Vienna,Bruxelles,Amsterdam,Atene,Dublino,Oslo,Stoccolma,Helsinki,Copenaghen,Varsavia,Praga,Budapest,Bucarest,Sofia,Zagabria,Lubiana,Bratislava,Berna,Tallinn,Riga,Vilnius,Belgrado,Reykjavik,Kiev,Mosca,La Valletta,Sarajevo,Tirana,Skopje,Podgorica,Chisinau,Minsk,Nicosia,Lussemburgo')},
  {n: 'Frutti', a: L('Mela,Pera,Banana,Arancia,Limone,Fragola,Ciliegia,Pesca,Albicocca,Uva,Ananas,Kiwi,Melone,Anguria,Prugna,Fico,Mandarino,Pompelmo,Lampone,Mirtillo,Mora,Cocco,Mango,Papaya,Melograno,Cachi,Nespola,Lime,Cedro,Ribes,Guava,Litchi')},
  {n: 'Marche di automobili', a: L('Fiat,Ferrari,Lamborghini,Maserati,Alfa Romeo,Lancia,Ford,Toyota,Honda,Audi,BMW,Mercedes,Volkswagen,Opel,Renault,Peugeot,Citroen,Tesla,Volvo,Nissan,Mazda,Kia,Hyundai,Skoda,Seat,Porsche,Jaguar,Bentley,Mini,Jeep,Suzuki,Dacia,Subaru,Land Rover,Bugatti,Pagani,Abarth,Chevrolet,Lexus,Mitsubishi,Alpine,Cupra')},
  {n: 'Cantanti e band italiani', a: L('Vasco Rossi,Ligabue,Laura Pausini,Eros Ramazzotti,Jovanotti,Tiziano Ferro,Mina,Celentano,Battisti,Baglioni,Zucchero,Elisa,Giorgia,Emma,Fedez,Mahmood,Blanco,Achille Lauro,Morandi,Renato Zero,Nek,Max Pezzali,Renga,Antonacci,Cremonini,Mengoni,Ultimo,Tananai,Elodie,Anna Oxa,Mannoia,Venditti,De Gregori,Dalla,De André,Pino Daniele,Pooh,Måneskin,Negramaro,Modà,Nannini,Rovazzi,Salmo,Sfera Ebbasta')},
  {n: 'Città italiane', a: L('Roma,Milano,Napoli,Torino,Palermo,Genova,Bologna,Firenze,Bari,Catania,Venezia,Verona,Messina,Padova,Trieste,Brescia,Parma,Taranto,Prato,Modena,Reggio Calabria,Reggio Emilia,Perugia,Livorno,Ravenna,Cagliari,Foggia,Rimini,Salerno,Ferrara,Sassari,Latina,Monza,Siracusa,Pescara,Bergamo,Forlì,Trento,Vicenza,Terni,Bolzano,Novara,Piacenza,Ancona,Arezzo,Udine,Cesena,Lecce,Pesaro,La Spezia,Pisa,Lucca,Como,Cremona,Mantova,Aosta,Asti,Cuneo,Brindisi,Potenza,Matera,Campobasso,Catanzaro,Cosenza,Trapani,Agrigento,Ragusa,Siena,Grosseto,Viterbo,Rieti,Frosinone,Teramo,Chieti,Avellino,Benevento,Caserta')},
  {n: 'Formati di pasta', a: L('Spaghetti,Penne,Fusilli,Rigatoni,Farfalle,Tagliatelle,Linguine,Bucatini,Paccheri,Tortellini,Ravioli,Lasagne,Orecchiette,Maccheroni,Ziti,Fettuccine,Pappardelle,Trofie,Cavatelli,Gnocchi,Conchiglie,Tortiglioni,Mezze maniche,Strozzapreti,Bigoli,Vermicelli,Capellini,Cannelloni,Agnolotti,Casarecce,Mafalde,Sedanini,Ditalini,Stelline,Spaghettoni,Tagliolini,Pizzoccheri,Garganelli,Malloreddus,Cappelletti,Gemelli,Candele')}
];

// Hit: [titolo, artista, anno, genere]
export const SONGS = [
  ['Volare', 'Domenico Modugno', 1958, 'Pop'],
  ['Felicità', 'Al Bano e Romina Power', 1982, 'Pop'],
  ['L’italiano', 'Toto Cutugno', 1983, 'Pop'],
  ['Azzurro', 'Adriano Celentano', 1968, 'Pop'],
  ['Con te partirò', 'Andrea Bocelli', 1995, 'Pop lirico'],
  ['Gli anni', '883', 1995, 'Pop'],
  ['Tanta voglia di lei', 'Pooh', 1971, 'Pop'],
  ['Cosa resterà degli anni ’80', 'Raf', 1989, 'Pop'],
  ['La solitudine', 'Laura Pausini', 1993, 'Pop'],
  ['Non ho l’età', 'Gigliola Cinquetti', 1964, 'Pop'],
  ['Ti sento', 'Matia Bazar', 1985, 'Pop'],
  ['Ti amo', 'Umberto Tozzi', 1977, 'Pop'],
  ['Gloria', 'Umberto Tozzi', 1979, 'Pop'],
  ['Sarà perché ti amo', 'Ricchi e Poveri', 1981, 'Pop'],
  ['Vacanze romane', 'Matia Bazar', 1983, 'Pop'],
  ['Strada facendo', 'Claudio Baglioni', 1981, 'Cantautorato'],
  ['Caruso', 'Lucio Dalla', 1986, 'Cantautorato'],
  ['Il cielo in una stanza', 'Gino Paoli', 1960, 'Cantautorato'],
  ['Svalutation', 'Adriano Celentano', 1976, 'Pop'],
  ['Zitti e buoni', 'Måneskin', 2021, 'Rock'],
  ['Soldi', 'Mahmood', 2019, 'Pop'],
  ['Margherita', 'Riccardo Cocciante', 1976, 'Cantautorato'],
  ['Meravigliosa creatura', 'Gianna Nannini', 1995, 'Rock'],
  ['Vita spericolata', 'Vasco Rossi', 1983, 'Rock'],
  ['Albachiara', 'Vasco Rossi', 1979, 'Rock'],
  ['Il mio canto libero', 'Lucio Battisti', 1972, 'Cantautorato']
];
