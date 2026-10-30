// Reazione a Catena: contenuti originali (nessuna import: verificabile con node).
// Ogni coppia di parole adiacenti forma un'espressione fissa, in uno dei due ordini (A B, B A, A di B, composto).
const W = s => s.split(' ');

// 7 parole: catena del titolo e Una tira l'altra
export const CHAINS = [
  'CASA BIANCA NEVE PALLA CANNONE COLPO GRAZIA',          // casa bianca, biancaneve, palla di neve, palla di cannone, colpo di cannone, colpo di grazia
  'CAFFÈ LATTE DENTI MALE MARE STELLA CADENTE',           // caffellatte, denti da latte, mal di denti, mal di mare, stella di mare, stella cadente
  'FERRO CAVALLO CORSA AUTO SCUOLA GUIDA PATENTE',        // ferro di cavallo, cavallo da corsa, auto da corsa, autoscuola, scuola guida, patente di guida
  'PANE BURRO CACAO POLVERE STELLE STRISCE PEDONALI',     // pane e burro, burro di cacao, cacao in polvere, polvere di stelle, stelle e strisce, strisce pedonali
  'GATTO NERO PECORA LANA VETRO BOTTIGLIA VINO',          // gatto nero, pecora nera, lana di pecora, lana di vetro, bottiglia di vetro, bottiglia di vino
  'TRENO VAPORE FERRO STIRO ASSE EQUILIBRIO SENSO',       // treno a vapore, ferro a vapore, ferro da stiro, asse da stiro, asse di equilibrio, senso dell'equilibrio
  'TORTA COMPLEANNO FESTA PAPÀ NATALE ALBERO MAESTRO',    // torta di compleanno, festa di compleanno, festa del papà, Papà Natale, albero di Natale, albero maestro
  'CHIAVE INGLESE ZUPPA PESCE SPADA LASER STAMPANTE',     // chiave inglese, zuppa inglese, zuppa di pesce, pesce spada, spada laser, stampante laser
  'CARTA PENNA SFERA CRISTALLO ROCCA FORTE CASSA',        // carta e penna, penna a sfera, sfera di cristallo, cristallo di rocca, roccaforte, cassaforte
  'SOLE OCCHIALI VISTA PUNTO CROCE ROSSA PIAZZA',         // occhiali da sole, occhiali da vista, punto di vista, punto croce, Croce Rossa, Piazza Rossa
  'MANO FRENO PEDALE PIANOFORTE CODA PAGLIA CAPPELLO',    // freno a mano, pedale del freno, pedale del pianoforte, pianoforte a coda, coda di paglia, cappello di paglia
  'GIOCO SQUADRA CAPO STAZIONE SERVIZIO MILITARE LEVA',   // gioco di squadra, caposquadra, capostazione, stazione di servizio, servizio militare, leva militare
  'LIBRO GIALLO CARTELLINO ROSSO SEMAFORO VERDE SPERANZA',// libro giallo, cartellino giallo/rosso, semaforo rosso/verde, verde speranza
  'BUCO NERO SEPPIA OSSO DURO PANE SALAME',               // buco nero, nero di seppia, osso di seppia, osso duro, pane duro, pane e salame
  'SCARPA TACCO PUNTA PIEDI PIATTI CARTA IDENTITÀ',       // scarpa col tacco, punta e tacco, punta dei piedi, piedi piatti, piatti di carta, carta d'identità
  'FIORE CAMPO CALCIO RIGORE AREA SERVIZIO CAMERA',       // fiore di campo, campo di calcio, calcio di rigore, area di rigore, area di servizio, servizio in camera
  'DIVANO LETTO CASTELLO CARTE GIOCO PAROLE CROCIATE',    // divano letto, letto a castello, castello di carte, gioco di carte, gioco di parole, parole crociate
  'ORA LEGALE STUDIO CASO LIMITE VELOCITÀ LUCE',          // ora legale, studio legale, caso di studio, caso limite, limite di velocità, velocità della luce
  'MULINO VENTO GIACCA CRAVATTA NODO GOLA CARAMELLA',     // mulino a vento, giacca a vento, giacca e cravatta, nodo alla cravatta, nodo alla gola, caramella per la gola
  'CANE GUARDIA MEDICA VISITA CORTESIA AUTO STRADA',      // cane da guardia, guardia medica, visita medica, visita di cortesia, auto di cortesia, autostrada
  'MAGLIA ROSA VENTI QUATTRO STAGIONI MEZZE MANICHE',     // maglia rosa, rosa dei venti, quattro venti, quattro stagioni, mezze stagioni, mezze maniche
  'CAPPELLO CILINDRO CONIGLIO TANA LUPO MARE TEMPESTA',   // cappello a cilindro, coniglio dal cilindro, tana del coniglio, tana del lupo, lupo di mare, mare in tempesta
  'TAVOLA CALDA ACQUA GOCCIA VASO FIORI ARANCIO',         // tavola calda, acqua calda, goccia d'acqua, la goccia che fa traboccare il vaso, vaso di fiori, fiori d'arancio
  'BANCO PROVA FORZA MAGGIORE STATO CIVILE DIRITTO',      // banco di prova, prova di forza, forza maggiore, stato maggiore, stato civile, diritto civile
  'CUORE LEONE ORO MINIERA CARBONE BEFANA CALZA',         // cuor di leone, Leone d'oro, miniera d'oro, miniera di carbone, carbone della Befana, calza della Befana
  'CIELO AZZURRO PRINCIPE PICCOLO SCHERMO PIATTO FORTE',  // cielo azzurro, principe azzurro, Piccolo Principe, piccolo schermo, schermo piatto, piatto forte
  'NOTTE BIANCA SETTIMANA SANTA SEDE LEGALE CONSULENTE',  // notte bianca, settimana bianca, settimana santa, Santa Sede, sede legale, consulente legale
  'CESTO FRUTTA SUCCO LIMONE SCORZA DURA TESTA',          // cesto di frutta, succo di frutta, succo di limone, scorza di limone, scorza dura, testa dura
  'ISOLA TESORO CACCIA RISERVA INDIANA FILA PRIMA',       // isola del tesoro, caccia al tesoro, riserva di caccia, riserva indiana, fila indiana, prima fila
  'PIZZA MARGHERITA REGINA APE MIELE LUNA PIENA',         // pizza margherita, regina Margherita, ape regina, miele d'api, luna di miele, luna piena
  'SCATOLA NERA LAVAGNA GESSO STATUA LIBERTÀ STAMPA',     // scatola nera, lavagna nera, gesso e lavagna, statua di gesso, Statua della Libertà, libertà di stampa
  'CINTURA SICUREZZA USCITA EMERGENZA NUMERO PRIMO AMORE',// cintura di sicurezza, uscita di sicurezza, uscita d'emergenza, numero d'emergenza, numero primo, primo amore
  'GIRASOLE SEMI OLIO MOTORE BARCA VELA SCUOLA'           // semi di girasole, olio di semi, olio motore, barca a motore, barca a vela, scuola di vela
].map(W);

// Catena del titolo (adattamento della catena musicale): titolo celebre + indizi testuali originali (dal vago al preciso)
export const TITLES = [
  {a: 'La vita è bella', c: ['Un film italiano premiato con l’Oscar', 'Un padre trasforma la paura in un gioco per il figlio', 'Il premio promesso al bambino è un carro armato', 'Il titolo dice che l’esistenza è… piacevole']},
  {a: 'I promessi sposi|promessi sposi', c: ['Un romanzo dell’Ottocento che si studia a scuola', 'Comincia sul lago, vicino a Lecco', 'Un signorotto prepotente si mette di mezzo', 'Un matrimonio che “non s’ha da fare”']},
  {a: 'Il nome della rosa|nome della rosa', c: ['Un giallo ambientato nel Medioevo', 'Tutto succede in un’abbazia di montagna', 'Un frate indaga tra libri proibiti', 'Nel titolo c’è un fiore']},
  {a: 'La dolce vita|dolce vita', c: ['Un film in bianco e nero del 1960', 'Le notti romane di via Veneto', 'Un bagno di mezzanotte in una fontana celebre', 'Il titolo parla di un’esistenza zuccherata']},
  {a: 'Pinocchio|Le avventure di Pinocchio', c: ['Un libro per ragazzi dell’Ottocento', 'Tutto comincia da un pezzo di legno', 'Ci sono un Gatto e una Volpe', 'Il protagonista ha un naso che si allunga']},
  {a: 'Il gattopardo|gattopardo', c: ['Un romanzo uscito dopo la morte del suo autore', 'Sicilia, ai tempi dello sbarco dei Mille', '“Tutto cambi perché nulla cambi”', 'Il titolo è un felino, simbolo di una famiglia nobile']},
  {a: 'Nuovo cinema paradiso|cinema paradiso', c: ['Un film premiato con l’Oscar nel 1990', 'Un bambino e un proiezionista in un paese siciliano', 'Una pellicola fatta solo di baci tagliati', 'Il titolo è il nome di una sala']},
  {a: 'La torre di Pisa|torre di pisa|torre pendente', c: ['Un monumento toscano famoso nel mondo', 'Si trova in piazza dei Miracoli', 'È il campanile di una cattedrale', 'Pende, ma non cade']}
];

// Le parole mancanti: notizie inventate, parole omesse tra [ ]
export const NEWS = [
  'Nel borgo di Valfiorita una [GALLINA] ha deposto un uovo di quasi trecento [GRAMMI]. Il [SINDACO] ha proclamato una giornata di [FESTA] e il [FORNAIO] ha preparato una [FRITTATA] gigante per tutti.',
  'Un [PINGUINO] fuggito dall’acquario è stato ritrovato in una [GELATERIA] del centro. Il [PROPRIETARIO] gli ha offerto un [CONO] alla menta, poi ha chiamato i [VIGILI], che lo hanno riaccompagnato in [TAXI].',
  'Alla gara di [AQUILONI] sulla spiaggia di Portoluce ha vinto una [NONNA] di novant’anni. Il suo [DRAGO] di carta è rimasto in [VOLO] per tre [ORE], battendo i [CAMPIONI] in carica.',
  'Una [BIBLIOTECA] di montagna ha ricevuto un [LIBRO] restituito con quarant’anni di [RITARDO]. Il lettore ha pagato la [MULTA] con una [TORTA] di mele e un [BIGLIETTO] di scuse.',
  'Durante il [CONCERTO] in piazza un [GATTO] è salito sul [PALCO] e si è accoccolato sul [PIANOFORTE]. Il [MAESTRO] ha continuato a suonare tra gli [APPLAUSI] del pubblico.',
  'Un [CONTADINO] di Campolargo ha coltivato una [ZUCCA] di oltre seicento [CHILI]. Per portarla alla [FIERA] sono serviti un [TRATTORE] e dieci [VOLONTARI].'
];

// La sillaba fortunata: sillaba + 7 parole che iniziano con lei, con definizione
export const SYLL = [
  {s: 'MA', w: [['MARE', 'Grande distesa d’acqua salata'], ['MATITA', 'Scrive e si cancella con la gomma'], ['MAGO', 'Tira fuori conigli dal cilindro'], ['MANO', 'Ha cinque dita'], ['MAPPA', 'La consulta chi cerca un tesoro'], ['MAESTRA', 'Insegna alle elementari'], ['MARMELLATA', 'Si spalma sulle fette biscottate']]},
  {s: 'CA', w: [['CANE', 'Il migliore amico dell’uomo'], ['CASA', 'Dolce, se è la propria'], ['CAMINO', 'Ci scende Babbo Natale'], ['CAVALLO', 'Galoppa e nitrisce'], ['CAROTA', 'Arancione, piace ai conigli'], ['CANDELA', 'Ha lo stoppino'], ['CAPPELLO', 'Si porta in testa']]},
  {s: 'TO', w: [['TOPO', 'Ha una passione per il formaggio'], ['TORTA', 'Ci si mettono le candeline'], ['TORRE', 'Quella di Pisa pende'], ['TORO', 'Vede rosso nell’arena'], ['TONNO', 'Pesce che si compra in scatola'], ['TOVAGLIA', 'Si stende sul tavolo prima di mangiare'], ['TOSTAPANE', 'Rende croccanti le fette di pane']]},
  {s: 'PA', w: [['PANE', 'Si compra dal fornaio'], ['PALLA', 'Rotola e rimbalza'], ['PATATA', 'Tubero da friggere'], ['PALAZZO', 'Edificio con molti piani'], ['PAPAVERO', 'Fiore rosso dei campi di grano'], ['PANCHINA', 'Ci si siede ai giardinetti'], ['PARACADUTE', 'Si apre dopo il lancio dall’aereo']]}
];

// Zip: 4 parole legate a catena
export const ZIP = [
  'TORRE CONTROLLO QUALITÀ PREZZO',   // torre di controllo, controllo qualità, qualità-prezzo
  'FINE SETTIMANA BIANCA NEVE',       // fine settimana, settimana bianca, Biancaneve
  'PORTA FORTUNA RUOTA PANORAMICA',   // portafortuna, ruota della fortuna, ruota panoramica
  'COLLO BOTTIGLIA MESSAGGIO SEGRETO',// collo di bottiglia, messaggio in bottiglia, messaggio segreto
  'PESCE ROSSO TAPPETO VOLANTE',      // pesce rosso, tappeto rosso, tappeto volante
  'BORSA VALORI FAMIGLIA STATO',      // Borsa valori, valori di famiglia, stato di famiglia
  'SALA ATTESA LISTA SPESA',          // sala d'attesa, lista d'attesa, lista della spesa
  'CAMPO GRANO CHICCO CAFFÈ',         // campo di grano, chicco di grano, chicco di caffè
  'TAZZA TÈ BISCOTTI BURRO',          // tazza di tè, tè e biscotti, biscotti al burro
  'GIRO MONDO NUOVO ANNO'             // giro del mondo, Nuovo Mondo, anno nuovo
].map(W);

// Quando, dove, come, perché
export const QDCP = [
  {a: 'Ombrello', c: ['Quando il cielo diventa grigio', 'All’ingresso, in un portaombrelli', 'Si apre con un bottone e ha le stecche', 'Per non bagnarsi sotto la pioggia']},
  {a: 'Sveglia', c: ['Ogni mattina, sempre troppo presto', 'Sul comodino', 'Suona, squilla, a volte vibra', 'Per non arrivare tardi al lavoro']},
  {a: 'Capodanno', c: ['Una notte d’inverno, una volta l’anno', 'In piazza o a casa con gli amici', 'Con il conto alla rovescia e i botti', 'Per salutare l’anno che arriva']},
  {a: 'Compleanno', c: ['Una volta l’anno, in un giorno diverso per ognuno', 'A casa, con amici e parenti', 'Spegnendo le candeline', 'Per festeggiare il giorno in cui si è nati']},
  {a: 'Valigia', c: ['Prima di partire', 'Sul nastro dell’aeroporto', 'Si riempie e si chiude con la cerniera', 'Per portare i vestiti in viaggio']},
  {a: 'Sciopero', c: ['Quando non si è d’accordo con il datore di lavoro', 'Nelle fabbriche, negli uffici, sui treni', 'Incrociando le braccia', 'Per protestare e ottenere diritti']},
  {a: 'Matrimonio', c: ['Spesso in primavera o d’estate', 'In chiesa o in municipio', 'Con il sì e lo scambio degli anelli', 'Per unire due persone che si amano']},
  {a: 'Eclissi', c: ['Di rado, e la annunciano gli astronomi', 'In cielo', 'Un disco si oscura per qualche minuto', 'La Luna si mette tra la Terra e il Sole']},
  {a: 'Vendemmia', c: ['Tra la fine dell’estate e l’inizio dell’autunno', 'Tra i filari, in collina', 'Con forbici e cassette', 'Per raccogliere l’uva e fare il vino']},
  {a: 'Trasloco', c: ['Quando si cambia casa', 'Su e giù per le scale', 'Con un furgone e tanti scatoloni', 'Per portare i mobili nella nuova abitazione']},
  {a: 'Sbadiglio', c: ['Quando si ha sonno o ci si annoia', 'Ovunque, anche durante una riunione', 'Spalancando la bocca', 'Per stanchezza; e si dice che sia contagioso']},
  {a: 'Mongolfiera', c: ['All’alba, quando il vento è calmo', 'In cielo, sopra le campagne', 'Scaldando l’aria con una fiamma', 'Per volare dentro una cesta']},
  {a: 'Carnevale', c: ['Tra gennaio e febbraio', 'A Venezia, a Viareggio, in tutte le piazze', 'Con maschere, carri e coriandoli', 'Per fare festa prima della Quaresima']},
  {a: 'Arcobaleno', c: ['Dopo un temporale', 'In cielo, dalla parte opposta al sole', 'Ad arco, con sette colori', 'La luce si scompone nelle gocce di pioggia']},
  {a: 'Marea', c: ['Due volte al giorno', 'Sulle coste e nelle spiagge', 'Il mare sale e poi si ritira', 'Per l’attrazione della Luna']}
];

// Quattro per una
export const Q4 = [
  {a: 'Napoleone', c: ['Esilio all’Elba', 'Waterloo', 'Imperatore dei francesi', 'Nato in Corsica']},
  {a: 'Giraffa', c: ['Collo lunghissimo', 'Savana africana', 'Macchie marroni', 'Mangia le foglie delle acacie']},
  {a: 'Venezia', c: ['Gondole', 'Ponte di Rialto', 'Maschere di Carnevale', 'Piazza San Marco']},
  {a: 'Pinocchio', c: ['Geppetto', 'Naso che si allunga', 'Grillo Parlante', 'Burattino di legno']},
  {a: 'Chitarra', c: ['Sei corde', 'Plettro', 'Accordi', 'Cassa armonica']},
  {a: 'Leonardo da Vinci|Leonardo', c: ['La Gioconda', 'L’Ultima Cena', 'Macchine volanti', 'Un paese toscano nel nome']},
  {a: 'Pizza', c: ['Forno a legna', 'Napoli', 'Mozzarella', 'Margherita']},
  {a: 'Saturno', c: ['Anelli', 'Sesto pianeta', 'Gigante gassoso', 'Titano è una sua luna']},
  {a: 'Scacchi', c: ['Scacco matto', 'Alfiere', 'Arrocco', 'Sessantaquattro caselle']},
  {a: 'Titanic', c: ['Iceberg', 'Nave “inaffondabile”', '1912', 'Viaggio inaugurale']},
  {a: 'Colosseo', c: ['Gladiatori', 'Anfiteatro Flavio', 'Roma', 'Belve e spettacoli']},
  {a: 'Galileo Galilei|Galileo', c: ['Cannocchiale', '“Eppur si muove”', 'Pisa', 'Lune di Giove']},
  {a: 'Bicicletta', c: ['Pedali', 'Catena', 'Campanello', 'Due ruote']},
  {a: 'Befana', c: ['Scopa', 'Calza', 'Epifania', 'Carbone ai bambini cattivi']},
  {a: 'Vesuvio', c: ['Pompei', 'Golfo di Napoli', 'Eruzione del 79 d.C.', 'Vulcano']}
];

// Zot: parola legata a due termini (iniziale data)
export const ZOT = [
  ['CASA', 'BIANCA', 'VACANZE'], ['PALLA', 'NEVE', 'CANNONE'], ['LUNA', 'MIELE', 'PIENA'], ['FUOCO', 'ARTIFICIO', 'CAMINO'],
  ['MANO', 'FRENO', 'BAGAGLIO'], ['CARTA', 'IDENTITÀ', 'CREDITO'], ['PESCE', 'SPADA', 'ROSSO'], ['TORRE', 'CONTROLLO', 'PISA'],
  ['ORO', 'MEDAGLIA', 'NERO'], ['SOLE', 'OCCHIALI', 'GIRA'], ['STELLA', 'CADENTE', 'MARE'], ['CHIAVE', 'INGLESE', 'VOLTA'], ['TEMPO', 'LIBERO', 'PERSO']
];

// L'intesa vincente: parola da far indovinare + parole-indizio (una parola ciascuna, dal vago al preciso)
export const INTESA = [
  'OMBRELLO: oggetto aprire pioggia riparo manico stecche temporale',
  'FORCHETTA: tavola mangiare punte rebbi spaghetti coltello posata',
  'SPECCHIO: guardare riflesso immagine bagno vetro truccarsi Biancaneve',
  'FRIGORIFERO: cucina elettrodomestico freddo conservare latte freezer congelatore',
  'CAMPANELLO: porta casa suonare ospiti premere bottone squillo',
  'BICICLETTA: due ruote pedali catena sellino manubrio campanello',
  'CANDELA: cera stoppino fiamma luce buio compleanno torta',
  'VALIGIA: viaggio vestiti partire aeroporto bagaglio ruote chiudere',
  'OROLOGIO: tempo polso lancette minuti quadrante cinturino ticchettio',
  'PIANOFORTE: strumento musica tasti bianchi neri coda Chopin',
  'GIRAFFA: animale Africa collo lungo macchie savana alta',
  'PINGUINO: uccello freddo ghiaccio Antartide frac nuotare goffo',
  'ELEFANTE: animale grande proboscide zanne avorio orecchie Africa',
  'CAMALEONTE: animale rettile colore cambiare lingua mimetico occhi',
  'PALLONE: calcio rotondo gonfiare porta rete partita cuoio',
  'MONTAGNA: alta neve vetta salire sci rifugio scalatore',
  'SPIAGGIA: estate sabbia mare asciugamano ombrellone sole bagnino',
  'BIBLIOTECA: libri prestito silenzio scaffali leggere studiare tessera',
  'OSPEDALE: medici infermieri malati reparto barella ambulanza ricovero',
  'SCUOLA: alunni maestra banchi lezione compiti campanella ricreazione',
  'CASTELLO: torri re principessa fossato mura levatoio fiaba',
  'ARCOBALENO: cielo pioggia colori sette sole curva iride',
  'VULCANO: montagna lava fuoco eruzione cratere Etna magma',
  'DENTISTA: dottore bocca carie trapano poltrona apparecchio sorriso',
  'POMPIERE: fuoco incendio idrante sirena scala camion casco',
  'CUOCO: cucina pentole ricetta ristorante grembiule fornelli mestolo',
  'POSTINO: lettere busta francobollo consegnare bicicletta cassetta pacco',
  'FARFALLA: ali colori bruco volare fiori leggera crisalide',
  'RAGNO: zampe otto tela filo paura tarantola angolo',
  'TARTARUGA: lenta guscio rettile mare uova sabbia longeva',
  'COCCODRILLO: rettile fiume denti lacrime coda verde palude',
  'GELATO: freddo estate cono coppetta gusti cioccolato panna',
  'PIZZA: forno Napoli mozzarella pomodoro margherita fetta impasto',
  'CAFFÈ: tazzina mattina bar espresso moka zucchero sveglia',
  'TELEFONO: chiamare numero squillare pronto cellulare cornetta rubrica',
  'CALENDARIO: giorni mesi anno date muro pagine settimane',
  'FOTOGRAFIA: ricordo scattare macchina immagine sorriso album rullino',
  'NATALE: dicembre albero regali presepe panettone neve festa',
  'CARNEVALE: maschere coriandoli carri febbraio Venezia festa chiacchiere',
  'MATRIMONIO: sposi anelli chiesa abito bianco confetti viaggio',
  'COMPLEANNO: candeline torta festa regali auguri invitati età',
  'AEREO: volare ali pilota cielo pista biglietto decollare',
  'ASTRONAUTA: spazio luna razzo tuta casco stazione gravità',
  'SIRENA: mare coda donna canto Ulisse pesce scogli',
  'ORCHESTRA: musicisti direttore bacchetta violini concerto teatro sinfonia',
  'CARTA DI CREDITO: pagare negozio plastica banca tessera numero codice',
  'FUOCHI D’ARTIFICIO: notte cielo botti colori Capodanno scoppi festa',
  'CASTELLO DI SABBIA: spiaggia bambini secchiello paletta onda torri costruire',
  'BABBO NATALE: barba rossa slitta renne regali camino dicembre',
  'CINTURA DI SICUREZZA: auto allacciare sedile viaggio obbligo incidente scatto',
  'MACCHINA DA SCRIVERE: tasti foglio vecchia nastro lettere rumore ticchettio',
  'PRONTO SOCCORSO: ospedale emergenza ambulanza codice attesa urgenza barella'
].map(s => { const [a, c] = s.split(': '); return {a, c: c.split(' ')}; });

// L'ultima catena: 15 parole (dispari scoperte, pari coperte; la 14ª è la parola finale tra 13ª e 15ª)
export const FINALS = [
  'SOLE OCCHIALI VISTA PUNTO CROCE ROSSA PIAZZA AFFARI UOMO RAGNO TELA OLIO OLIVA VERDE SPERANZA',
  // piazza Affari, uomo d'affari, uomo ragno, tela di ragno, olio su tela, olio d'oliva, verde oliva, verde speranza
  'CASA BIANCA NEVE PALLA CANNONE COLPO TESTA CROCE PUNTO VENDITA ASTA SALTO QUALITÀ CONTROLLO TORRE',
  // colpo di testa, testa o croce, punto croce, punto vendita, vendita all'asta, salto con l'asta, salto di qualità, controllo qualità, torre di controllo
  'LUNA MIELE APE REGINA MADRE NATURA MORTA LINGUA GATTO NERO BUCO SERRATURA CHIAVE INGLESE ZUPPA',
  // regina madre, madre natura, natura morta, lingua morta, lingua di gatto, gatto nero, buco nero, buco della serratura, chiave inglese, zuppa inglese
  'TRENO VAPORE FERRO STIRO ASSE EQUILIBRIO SENSO UNICO FIGLIO PAPÀ NATALE ALBERO MAESTRO ORCHESTRA DIRETTORE',
  // senso unico, figlio unico, figlio di papà, Papà Natale, albero di Natale, albero maestro, maestro d'orchestra, direttore d'orchestra
  'CAFFÈ LATTE DENTI MALE MARE STELLA POLARE ORSO TANA VOLPE UVA SUCCO LIMONE SCORZA DURA',
  // stella polare, orso polare, tana dell'orso, tana della volpe, la volpe e l'uva, succo d'uva, succo di limone, scorza di limone, scorza dura
  'CARTA PENNA SFERA CRISTALLO ROCCA FORTE CASSA RISPARMIO LIBRETTO ISTRUZIONI USO COMUNE SENSO UNICO FIGLIO',
  // cassa di risparmio, libretto di risparmio, libretto di istruzioni, istruzioni per l'uso, uso comune, senso comune, senso unico, figlio unico
  'MANO FRENO PEDALE PIANOFORTE CODA PAGLIA CAPPELLO CILINDRO MOTORE RICERCA LAVORO TAVOLO BILIARDO STECCA CIOCCOLATO',
  // cappello a cilindro, cilindro del motore, motore di ricerca, ricerca di lavoro, tavolo di lavoro, tavolo da biliardo, stecca da biliardo, stecca di cioccolato
  'FIORE CAMPO CALCIO RIGORE AREA SERVIZIO CAMERA ARIA CASTELLI ROMANI NUMERI LOTTO TERRENO GIOCO SQUADRA',
  // camera d'aria, castelli in aria, Castelli Romani, numeri romani, numeri del lotto, lotto di terreno, terreno di gioco, gioco di squadra
  'DIVANO LETTO CASTELLO CARTE MAZZO FIORI CAMPO BATTAGLIA NAVALE ACCADEMIA MILITARE LEVA CAMBIO STAGIONE ALTA',
  // mazzo di carte, mazzo di fiori, fiori di campo, campo di battaglia, battaglia navale, accademia navale/militare, leva militare, leva del cambio, cambio di stagione, alta stagione
  'ORA LEGALE STUDIO CASO LIMITE VELOCITÀ LUCE ANNO CAPO LAVORO FORZA GRAVITÀ CENTRO STORICO ROMANZO',
  // anno luce, Capodanno, capolavoro, forza lavoro, forza di gravità, centro di gravità, centro storico, romanzo storico
  'CINTURA SICUREZZA USCITA EMERGENZA NUMERO PRIMO AMORE CANZONE FESTIVAL CINEMA MUTO PESCE SPADA LASER STAMPANTE',
  // canzone d'amore, festival della canzone, festival del cinema, cinema muto, muto come un pesce, pesce spada, spada laser, stampante laser
  'GIRASOLE SEMI OLIO MOTORE BARCA VELA SCUOLA GUIDA CANE GUARDIA MEDICA VISITA CONTROLLO PANNELLO SOLARE',
  // scuola guida, cane guida, cane da guardia, guardia medica, visita medica, visita di controllo, pannello di controllo, pannello solare
  'SCATOLA NERA LAVAGNA GESSO STATUA LIBERTÀ STAMPA CONFERENZA PACE GIUDICE LINEA ARIA CORRENTE ELETTRICA CHITARRA',
  // conferenza stampa, conferenza di pace, giudice di pace, giudice di linea, linea d'aria, corrente d'aria, corrente elettrica, chitarra elettrica
  'MULINO VENTO GIACCA CRAVATTA NODO FAZZOLETTO CARTA CREDITO ISTITUTO BELLEZZA CONCORSO PUBBLICO TRASPORTO MEZZO BUSTO',
  // nodo al fazzoletto, fazzoletto di carta, carta di credito, istituto di credito, istituto di bellezza, concorso di bellezza, concorso pubblico, trasporto pubblico, mezzo di trasporto, mezzobusto
  'ISOLA TESORO CACCIA RISERVA INDIANA FILA PRIMA CLASSE COMPAGNO BANCO LAVORO TURNO NOTTE BIANCA SETTIMANA'
  // prima classe, compagno di classe, compagno di banco, banco di lavoro, turno di lavoro, turno di notte, notte bianca, settimana bianca
].map(W);
