// L'Eredità: contenuti originali per i sette giochi. Nessun import: verificabile con node.

// C'è o non c'è: argomento -> [parola, c'entra?]
export const CENC = [
  {d: 2, t: 'Opere di Giuseppe Verdi', i: [['Aida', 1], ['Tosca', 0], ['Rigoletto', 1], ['Norma', 0], ['Nabucco', 1], ['La Bohème', 0], ['Otello', 1], ['Il barbiere di Siviglia', 0]]},
  {d: 1, t: 'Capitali europee', i: [['Lisbona', 1], ['Ginevra', 0], ['Bratislava', 1], ['Barcellona', 0], ['Lubiana', 1], ['Istanbul', 0], ['Zagabria', 1], ['Rotterdam', 0]]},
  {d: 2, t: 'Regioni italiane bagnate dal mare', i: [['Umbria', 0], ['Molise', 1], ['Basilicata', 1], ['Piemonte', 0], ['Emilia-Romagna', 1], ['Lombardia', 0], ['Valle d’Aosta', 0], ['Trentino-Alto Adige', 0]]},
  {d: 3, t: 'Opere di Italo Calvino', i: [['Il barone rampante', 1], ['Il nome della rosa', 0], ['Le città invisibili', 1], ['La coscienza di Zeno', 0], ['Il visconte dimezzato', 1], ['Il deserto dei Tartari', 0], ['Il sentiero dei nidi di ragno', 1]]},
  {d: 1, t: 'Pianeti del Sistema Solare', i: [['Plutone', 0], ['Nettuno', 1], ['Saturno', 1], ['Cerere', 0], ['Venere', 1], ['Luna', 0], ['Mercurio', 1]]},
  {d: 1, t: 'Mammiferi', i: [['Delfino', 1], ['Pinguino', 0], ['Pipistrello', 1], ['Squalo', 0], ['Ornitorinco', 1], ['Struzzo', 0], ['Balena', 1], ['Tartaruga', 0]]},
  {d: 3, t: 'Dipinti di Caravaggio', i: [['Canestra di frutta', 1], ['La Primavera', 0], ['Vocazione di San Matteo', 1], ['La Tempesta', 0], ['Bacco', 1], ['La scuola di Atene', 0], ['Medusa', 1], ['La nascita di Venere', 0]]},
  {d: 3, t: 'Stati attraversati dal Danubio', i: [['Austria', 1], ['Svizzera', 0], ['Ungheria', 1], ['Polonia', 0], ['Serbia', 1], ['Repubblica Ceca', 0], ['Romania', 1], ['Italia', 0]]},
  {d: 3, t: 'Elementi gassosi a temperatura ambiente', i: [['Azoto', 1], ['Mercurio', 0], ['Neon', 1], ['Bromo', 0], ['Cloro', 1], ['Sodio', 0], ['Elio', 1], ['Iodio', 0]]},
  {d: 2, t: 'Città attraversate dall’Arno', i: [['Firenze', 1], ['Siena', 0], ['Pisa', 1], ['Lucca', 0], ['Empoli', 1], ['Prato', 0]]}
];

// 1, 2, 3… quella!: argomento, tre indizi, giusta, tre sbagliate
export const TRIS = [
  [1, 'Scrittori', 'Recanati · Silvia · L’infinito', 'Giacomo Leopardi', 'Ugo Foscolo', 'Giosuè Carducci', 'Giovanni Pascoli'],
  [1, 'Città', 'Gondole · Rialto · Carnevale', 'Venezia', 'Verona', 'Padova', 'Trieste'],
  [1, 'Scienziati', 'Pisa · cannocchiale · Sidereus Nuncius', 'Galileo Galilei', 'Niccolò Copernico', 'Giovanni Keplero', 'Evangelista Torricelli'],
  [2, 'Compositori', 'Pesaro · Barbiere · Guglielmo Tell', 'Gioachino Rossini', 'Giuseppe Verdi', 'Gaetano Donizetti', 'Vincenzo Bellini'],
  [1, 'Pittori', 'Urbino · Madonne · Scuola di Atene', 'Raffaello', 'Michelangelo', 'Tiziano', 'Perugino'],
  [1, 'Personaggi storici', 'Caprera · camicie rosse · Teano', 'Giuseppe Garibaldi', 'Giuseppe Mazzini', 'Camillo Cavour', 'Cesare Battisti'],
  [3, 'Film', 'Fellini · Fontana di Trevi · Anita Ekberg', 'La dolce vita', '8½', 'Amarcord', 'La strada'],
  [1, 'Pianeti', 'Anelli · Titano · sonda Cassini', 'Saturno', 'Giove', 'Urano', 'Nettuno'],
  [2, 'Sport', 'Tour de France · Pirata · Cesenatico', 'Marco Pantani', 'Fausto Coppi', 'Gino Bartali', 'Felice Gimondi'],
  [3, 'Scrittori', 'Macondo · Colombia · Cent’anni di solitudine', 'Gabriel García Márquez', 'Jorge Luis Borges', 'Pablo Neruda', 'Mario Vargas Llosa'],
  [1, 'Monumenti', 'Parigi · Gustave · 1889', 'Torre Eiffel', 'Arco di Trionfo', 'Louvre', 'Notre-Dame'],
  [1, 'Animali', 'Bambù · Cina · bianco e nero', 'Panda gigante', 'Koala', 'Orso polare', 'Lemure'],
  [3, 'Cucina', 'Uova · guanciale · pecorino', 'Carbonara', 'Amatriciana', 'Gricia', 'Cacio e pepe'],
  [1, 'Mitologia', 'Itaca · Penelope · cavallo di legno', 'Ulisse', 'Achille', 'Enea', 'Ettore'],
  [1, 'Musica', 'Liverpool · Abbey Road · Yesterday', 'The Beatles', 'The Rolling Stones', 'Queen', 'The Who'],
  [1, 'Inventori', 'Bologna · onde radio · Nobel 1909', 'Guglielmo Marconi', 'Alessandro Volta', 'Antonio Meucci', 'Enrico Fermi'],
  [1, 'Regioni', 'Etna · Cefalù · cannoli', 'Sicilia', 'Calabria', 'Sardegna', 'Campania'],
  [1, 'Romanzi', 'Renzo · Lucia · don Abbondio', 'I promessi sposi', 'Il Gattopardo', 'I Malavoglia', 'Le confessioni d’un italiano'],
  [2, 'Scienziati', 'Gravità · mela · Principia', 'Isaac Newton', 'Galileo Galilei', 'Albert Einstein', 'Giovanni Keplero'],
  [2, 'Città', 'Mole · Lingotto · Superga', 'Torino', 'Milano', 'Genova', 'Asti'],
  [1, 'Pittori', 'Girasoli · orecchio · Arles', 'Vincent van Gogh', 'Paul Gauguin', 'Claude Monet', 'Paul Cézanne'],
  [1, 'Personaggi', 'Collodi · Geppetto · naso', 'Pinocchio', 'Lucignolo', 'Mangiafuoco', 'Gian Burrasca'],
  [2, 'Monumenti', 'Agra · marmo bianco · Mumtaz', 'Taj Mahal', 'Alhambra', 'Angkor Wat', 'Petra'],
  [3, 'Scrittori', 'Montalbano · Vigàta · Porto Empedocle', 'Andrea Camilleri', 'Leonardo Sciascia', 'Luigi Pirandello', 'Gesualdo Bufalino']
].map(([d, cat, clues, r, ...w]) => ({d, cat, clues, r, w}));

// Le Date: 4 anni e gli eventi da associare
export const DATE = [
  {d: 1, y: [1492, 1861, 1946, 1969], e: [
    ['Cristoforo Colombo sbarca nel Nuovo Mondo', 1492], ['Muore Lorenzo il Magnifico', 1492],
    ['Viene proclamato il Regno d’Italia', 1861], ['Abraham Lincoln si insedia alla Casa Bianca', 1861],
    ['Il referendum sceglie la Repubblica in Italia', 1946], ['Primo allunaggio con l’Apollo 11', 1969], ['Si tiene il festival di Woodstock', 1969]]},
  {d: 2, y: [1789, 1815, 1914, 1989], e: [
    ['Presa della Bastiglia', 1789], ['George Washington diventa il primo presidente degli USA', 1789],
    ['Battaglia di Waterloo', 1815], ['Si chiude il Congresso di Vienna', 1815],
    ['Attentato di Sarajevo a Francesco Ferdinando', 1914], ['Viene inaugurato il Canale di Panama', 1914], ['Cade il Muro di Berlino', 1989]]},
  {d: 3, y: [1453, 1517, 1571, 1633], e: [
    ['Caduta di Costantinopoli', 1453], ['Finisce la Guerra dei cent’anni', 1453],
    ['Lutero rende pubbliche le 95 tesi', 1517], ['Battaglia di Lepanto', 1571], ['Processo e abiura di Galileo Galilei', 1633]]},
  {d: 3, y: [1871, 1922, 1957, 2002], e: [
    ['Roma diventa capitale d’Italia', 1871], ['Viene proclamato l’Impero tedesco a Versailles', 1871],
    ['Marcia su Roma', 1922], ['Scoperta della tomba di Tutankhamon', 1922],
    ['Firma dei Trattati di Roma', 1957], ['Lancio dello Sputnik 1', 1957], ['Entrano in circolazione monete e banconote in euro', 2002]]},
  {d: 2, y: [1265, 1304, 1321, 1348], e: [
    ['Nasce Dante Alighieri', 1265], ['Nasce Francesco Petrarca', 1304], ['Dante muore a Ravenna', 1321], ['La peste nera colpisce Firenze', 1348]]},
  {d: 2, y: [1912, 1936, 1960, 1985], e: [
    ['Naufragio del Titanic', 1912], ['Olimpiadi di Berlino', 1936], ['Olimpiadi di Roma', 1960],
    ['John F. Kennedy viene eletto presidente degli USA', 1960], ['Concerti del Live Aid', 1985], ['Gorbačëv diventa segretario del PCUS', 1985]]}
];

// La Scossa: domanda, risposta da EVITARE, otto risposte sbagliate
export const SCOSSA = [
  [1, 'Qual è la capitale dell’Australia?', 'Canberra', ['Sydney', 'Melbourne', 'Perth', 'Brisbane', 'Adelaide', 'Darwin', 'Hobart', 'Cairns']],
  [2, 'In quale regione si trova il Lago Trasimeno?', 'Umbria', ['Toscana', 'Lazio', 'Marche', 'Abruzzo', 'Emilia-Romagna', 'Molise', 'Campania', 'Lombardia']],
  [1, 'Chi ha composto “Madama Butterfly”?', 'Puccini', ['Verdi', 'Rossini', 'Bellini', 'Donizetti', 'Mascagni', 'Leoncavallo', 'Monteverdi', 'Cilea']],
  [3, 'Qual è il fiume più lungo d’Europa?', 'Volga', ['Danubio', 'Reno', 'Dnepr', 'Don', 'Elba', 'Loira', 'Vistola', 'Po']],
  [2, 'Quale elemento ha simbolo chimico K?', 'Potassio', ['Calcio', 'Cripto', 'Carbonio', 'Cobalto', 'Cadmio', 'Cesio', 'Cloro', 'Sodio']],
  [2, 'Qual è la terza città più popolosa d’Italia?', 'Napoli', ['Torino', 'Palermo', 'Genova', 'Bologna', 'Firenze', 'Bari', 'Catania', 'Venezia']],
  [1, 'Chi ha scritto “Il nome della rosa”?', 'Umberto Eco', ['Italo Calvino', 'Alberto Moravia', 'Pier Paolo Pasolini', 'Leonardo Sciascia', 'Dino Buzzati', 'Cesare Pavese', 'Antonio Tabucchi', 'Alessandro Baricco']],
  [2, 'In quale città si trova la Cappella degli Scrovegni?', 'Padova', ['Verona', 'Vicenza', 'Venezia', 'Treviso', 'Ferrara', 'Mantova', 'Bologna', 'Firenze']]
].map(([d, q, r, w]) => ({d, q, r, w}));

// Sfida / Scalata doppia: parola (solo A-Z) e definizione
export const DEFS = [
  ['OMBRELLO', 'Si apre quando piove'], ['ARCOBALENO', 'Arco di sette colori dopo la pioggia'], ['BUSSOLA', 'Il suo ago indica il nord'],
  ['CLESSIDRA', 'Misura il tempo con la sabbia'], ['VULCANO', 'Montagna che può eruttare lava'], ['PINGUINO', 'Uccello marino che non vola e sembra in frac'],
  ['ORCHESTRA', 'Musicisti guidati da un direttore'], ['PALINDROMO', 'Parola che si legge uguale nei due sensi'], ['MOSAICO', 'Opera composta da tessere colorate'],
  ['FARO', 'Torre che guida le navi di notte'], ['DIZIONARIO', 'Libro che spiega il significato delle parole'], ['CANGURO', 'Marsupiale australiano che salta'],
  ['ACQUEDOTTO', 'Opera che porta l’acqua alle città'], ['SISMOGRAFO', 'Strumento che registra i terremoti'], ['GONDOLA', 'Barca tipica di Venezia'],
  ['AFORISMA', 'Frase breve che condensa una verità'], ['ARCHIVIO', 'Luogo dove si conservano i documenti'], ['TERMOMETRO', 'Misura la temperatura'],
  ['BAROMETRO', 'Misura la pressione atmosferica'], ['ALVEARE', 'La casa delle api'], ['FORMICAIO', 'La casa delle formiche'],
  ['STALATTITE', 'Concrezione che pende dal soffitto delle grotte'], ['GHIACCIAIO', 'Massa di ghiaccio che scende lenta a valle'], ['ARCHITETTO', 'Progetta edifici'],
  ['CAMALEONTE', 'Rettile che cambia colore'], ['ANAGRAMMA', 'Parola ottenuta rimescolando le lettere di un’altra'], ['PENISOLA', 'Terra circondata dal mare su tre lati'],
  ['ARCIPELAGO', 'Gruppo di isole vicine'], ['SONETTO', 'Componimento poetico di quattordici versi'], ['AFFRESCO', 'Pittura eseguita su intonaco fresco'],
  ['MERIDIANA', 'Orologio che funziona con l’ombra del sole'], ['METRONOMO', 'Scandisce il tempo ai musicisti'], ['SCRIGNO', 'Piccolo forziere per gioielli'],
  ['POSTINO', 'Consegna la corrispondenza'], ['MAGGIORDOMO', 'Capo della servitù in una casa signorile'], ['EQUATORE', 'Linea immaginaria che divide la Terra in due emisferi'],
  ['LIBRETTO', 'Il testo di un’opera lirica'], ['DIRIGIBILE', 'Aeromobile più leggero dell’aria, con motori'], ['PERGAMENA', 'Pelle d’animale lavorata per scriverci'],
  ['SEMAFORO', 'Regola il traffico con tre luci'], ['CORNICE', 'Bordo che racchiude un quadro'], ['ORIGAMI', 'Arte giapponese di piegare la carta'],
  ['MARATONA', 'Corsa di 42 chilometri e 195 metri'], ['QUADRIFOGLIO', 'Trifoglio raro che porta fortuna'], ['TRAMONTO', 'Il sole che scende sotto l’orizzonte'],
  ['LABIRINTO', 'Intrico di percorsi da cui è difficile uscire'], ['PAPIRO', 'Antico supporto per la scrittura degli Egizi'], ['ZAFFERANO', 'Spezia gialla del risotto alla milanese'],
  ['CAMPANILE', 'Torre che ospita le campane'], ['SCIROCCO', 'Vento caldo che soffia da sud-est'], ['TRAMONTANA', 'Vento freddo che soffia da nord']
].map(([w, t]) => ({w, t, d: w.length <= 7 ? 1 : w.length <= 9 ? 2 : 3})); // d: parola lunga = lettere scoperte più lentamente

// La Ghigliottina: cinque coppie [indizio giusto, intruso], parola, spiegazione
export const GHIGLIOTTINE = [
  {d: 1, a: 'PALLA', p: [['Neve', 'Sabbia'], ['Cannone', 'Spada'], ['Cristallo', 'Argento'], ['Volo', 'Salto'], ['Mano', 'Dito']],
    x: 'Palla di neve, palla di cannone, palla di cristallo, palla al volo, pallamano.'},
  {d: 1, a: 'LUNA', p: [['Miele', 'Zucchero'], ['Park', 'Garden'], ['Mezza', 'Doppia'], ['Piena', 'Vuota'], ['Storta', 'Dritta']],
    x: 'Luna di miele, luna park, mezzaluna, luna piena, avere la luna storta.'},
  {d: 1, a: 'CASA', p: [['Bianca', 'Verde'], ['Discografica', 'Canora'], ['Riposo', 'Sonno'], ['Editrice', 'Letteraria'], ['Fatto', 'Detto']],
    x: 'Casa Bianca, casa discografica, casa di riposo, casa editrice, fatto in casa.'},
  {d: 2, a: 'ORO', p: [['Zecchino', 'Soldino'], ['Cuore', 'Fegato'], ['Febbre', 'Tosse'], ['Tacere', 'Urlare'], ['Medaglia', 'Pagella']],
    x: 'Zecchino d’Oro, cuore d’oro, febbre dell’oro, il silenzio è d’oro (tacere è d’oro), medaglia d’oro.'},
  {d: 2, a: 'FUOCO', p: [['Artificio', 'Inganno'], ['Fatuo', 'Vano'], ['Arma', 'Scudo'], ['Cessate', 'Riprendete'], ['Prova', 'Verifica']],
    x: 'Fuochi d’artificio, fuoco fatuo, arma da fuoco, cessate il fuoco, prova del fuoco.'},
  {d: 2, a: 'MANO', p: [['Opera', 'Fatica'], ['Fuori', 'Dentro'], ['Stretta', 'Presa'], ['Freno', 'Pedale'], ['Bagaglio', 'Valigia']],
    x: 'Manodopera, fuori mano, stretta di mano, freno a mano, bagaglio a mano.'},
  {d: 2, a: 'PANE', p: [['Spagna', 'Francia'], ['Grattato', 'Pelato'], ['Quotidiano', 'Settimanale'], ['Buono', 'Bello'], ['Tradimento', 'Inganno']],
    x: 'Pan di Spagna, pangrattato, pane quotidiano, buono come il pane, mangiare pane a tradimento.'},
  {d: 1, a: 'ROSA', p: [['Maglia', 'Felpa'], ['Venti', 'Mari'], ['Cronaca', 'Rubrica'], ['Deserto', 'Oceano'], ['Fresco', 'Tiepido']],
    x: 'Maglia rosa, rosa dei venti, cronaca rosa, rosa del deserto, fresco come una rosa.'},
  {d: 2, a: 'TESTA', p: [['Croce', 'Spada'], ['Ponte', 'Arco'], ['Colpo', 'Spinta'], ['Calda', 'Tiepida'], ['Coda', 'Zampa']],
    x: 'Testa o croce, testa di ponte, colpo di testa, testa calda, testacoda.'},
  {d: 3, a: 'CUORE', p: [['Leone', 'Tigre'], ['Batti', 'Corri'], ['De Amicis', 'Collodi'], ['Sacro', 'Pio'], ['Carciofo', 'Melanzana']],
    x: 'Cuor di leone, batticuore, «Cuore» di De Amicis, Sacro Cuore, cuore di carciofo.'},
  {d: 2, a: 'CARTA', p: [['Identità', 'Persona'], ['Credito', 'Prestito'], ['Parati', 'Pareti'], ['Bianca', 'Grigia'], ['Canta', 'Suona']],
    x: 'Carta d’identità, carta di credito, carta da parati, carta bianca, carta canta.'},
  {d: 3, a: 'GATTO', p: [['Nevi', 'Ghiacci'], ['Volpe', 'Lupo'], ['Quattro', 'Cinque'], ['Stivali', 'Scarpe'], ['Code', 'Teste']],
    x: 'Gatto delle nevi, il Gatto e la Volpe, quattro gatti, il gatto con gli stivali, gatto a nove code.'},
  {d: 3, a: 'PORTA', p: [['Pia', 'Devota'], ['Fortuna', 'Destino'], ['Aerei', 'Treni'], ['Girevole', 'Volante'], ['Foglio', 'Pagina']],
    x: 'Porta Pia, portafortuna, portaerei, porta girevole, portafoglio.'},
  {d: 3, a: 'TEMPO', p: [['Libero', 'Sciolto'], ['Reale', 'Regale'], ['Ammazzare', 'Ferire'], ['Passa', 'Salta'], ['Scaduto', 'Avariato']],
    x: 'Tempo libero, tempo reale, ammazzare il tempo, passatempo, tempo scaduto.'}
];



// Nomi per riempire i posti CPU (solo se ctx.cpu).
export const EXTRA_NAMES = ['Rita', 'Gino', 'Nora', 'Ettore', 'Ada', 'Bruno', 'Ugo', 'Lia', 'Franco', 'Mara', 'Sergio', 'Elsa'];
