import {near, norm} from '../ui.js';

// Hit — catalogue of public-domain / traditional melodies, synthesized live with WebAudio (no recordings).
// Notes: "C4 D#4:.5 Bb3:1.5 r:.5" -> pitch+octave, optional ":beats" (default 1), "r" = rest.
// Fields: t title, alt accepted answers, hint, cat, d difficulty 1-5 (CPU), bpm, bar (beats per bar), pick (pickup beats),
//         ins lead instrument piano|strings|brass|organ, kit (drums+bass under the melody), n notes.
// Optional hook: add `audio: '/audio/file.mp3'` (file in public/audio/) and `len` (seconds) to play a local file instead of the synth.
//   Audio-file entries are excluded from Bid-a-Note (it needs exactly N notes). Use only files you own the rights to.
// Rule for new entries: the first 7 tokens must be notes, not rests (Bid-a-Note counts them).
// Deliberately left out: 'O sole mio (possible co-authorship claim, rights unverified), plus tunes whose melody could not be
// verified by ear here (Inno di Mameli, Va' pensiero, Nessun dorma, Funiculì funiculà, Santa Lucia). Add them in this format once checked.

const T = (t, alt, hint, cat, d, bpm, bar, pick, ins, kit, n) => ({t, alt, hint, cat, d, bpm, bar, pick, ins, kit, n});

export const TUNES = [
  T('Fra Martino', ['Frère Jacques', 'Fra Martino campanaro'], 'Canone popolare: un frate dorme e le campane suonano', 'Filastrocca', 1, 112, 4, 0, 'piano', true,
    'C4 D4 E4 C4 C4 D4 E4 C4 E4 F4 G4:2 E4 F4 G4:2 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 G4:.5 A4:.5 G4:.5 F4:.5 E4 C4 C4 G3 C4:2 C4 G3 C4:2'),
  T('Tanti auguri a te', ['Happy birthday', 'Buon compleanno', 'Tanti auguri'], 'Si canta davanti a una torta con le candeline', 'Filastrocca', 1, 100, 3, 1, 'piano', true,
    'G4:.75 G4:.25 A4 G4 C5 B4:2 G4:.75 G4:.25 A4 G4 D5 C5:2 G4:.75 G4:.25 G5 E5 C5 B4 A4 F5:.75 F5:.25 E5 C5 D5 C5:2'),
  T('Jingle Bells', ['Jingle bell', 'Din don dan'], 'Campanelle e slitte sulla neve', 'Natale', 1, 150, 4, 0, 'piano', true,
    'E4 E4 E4:2 E4 E4 E4:2 E4 G4 C4:1.5 D4:.5 E4:4 F4 F4 F4:1.5 F4:.5 F4 E4 E4 E4:.5 E4:.5 E4 D4 D4 E4 D4:2 G4:2'),
  T('Inno alla gioia', ['Ode alla gioia', 'Nona sinfonia', 'Inno europeo', 'Ode to joy'], 'Beethoven, Nona Sinfonia: oggi è l’inno d’Europa', 'Classica', 1, 120, 4, 0, 'brass', true,
    'E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:.5 D4:2 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:.5 C4:2'),
  T('Per Elisa', ['Für Elise', 'Fur Elise', 'Bagatella per Elisa'], 'Beethoven: il primo pezzo che si impara al pianoforte', 'Classica', 2, 130, 3, 1, 'piano', false,
    'E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1 r:.5 C4:.5 E4:.5 A4:.5 B4:1 r:.5 E4:.5 G#4:.5 B4:.5 C5:1 r:.5 E4:.5 E5:.5 D#5:.5 E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5 A4:1'),
  T('Marcia nuziale', ['Coro nuziale', 'Lohengrin', 'Here comes the bride'], 'Wagner, Lohengrin: la sposa entra in chiesa', 'Classica', 1, 84, 4, 1, 'organ', false,
    'C4 F4:.75 F4:.25 F4:2 C4 G4:.75 E4:.25 F4:2 C4 F4:.75 Bb4:.25 Bb4 A4:.75 G4:.25 F4 E4:.75 F4:.25 G4:2'),
  T('Habanera', ['Carmen', 'L’amour est un oiseau rebelle', 'L’amore è un uccello ribelle', 'Habanera della Carmen'], 'Bizet: a Siviglia l’amore è un uccello ribelle', 'Opera', 2, 72, 2, 0, 'strings', false,
    'D5:.75 C#5:.25 C5:.5 C5:.5 B4:.75 Bb4:.25 A4:.5 A4:.5 Ab4:1 G4:.5 F4:.75 G4:.25 A4:.5 F4:.5 E4:.5 D4:1.5'),
  T('Guglielmo Tell', ['William Tell', 'Ouverture del Guglielmo Tell', 'Lone Ranger'], 'Rossini: il galoppo più famoso, tra frecce e mele', 'Opera', 2, 152, 2, 0, 'brass', true,
    'G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 C5:.5 D5:.5 E5:1 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 G4:.5 G4:.25 G4:.25 E5:.5 D5:.5 C5:1'),
  T('La primavera', ['Primavera', 'Le quattro stagioni', 'Quattro stagioni'], 'Vivaldi, Le quattro stagioni: la stagione dei fiori', 'Classica', 2, 100, 4, .5, 'strings', false,
    'E4:.5 G#4:.5 G#4:.5 G#4:.5 F#4:.25 E4:.25 B4:1.5 B4:.25 A4:.25 G#4:.5 G#4:.5 G#4:.5 F#4:.25 E4:.25 B4:1.5 B4:.25 A4:.25 G#4:.5 A4:.5 B4:.5 A4:.5 G#4:.5 F#4:1.5'),
  T('Marcia turca', ['Rondò alla turca', 'Alla turca', 'Marcia alla turca'], 'Mozart imita le bande dei giannizzeri ottomani', 'Classica', 2, 120, 2, 1, 'piano', false,
    'B4:.25 A4:.25 G#4:.25 A4:.25 C5:1 D5:.25 C5:.25 B4:.25 C5:.25 E5:1 F5:.25 E5:.25 D#5:.25 E5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 B5:.25 A5:.25 G#5:.25 A5:.25 C6:2'),
  T('La donna è mobile', ['Rigoletto', 'La donna e mobile'], 'Verdi, Rigoletto: il Duca canta quanto è volubile la donna', 'Opera', 2, 112, 1.5, 0, 'brass', false,
    'E4:.5 E4:.5 E4:.5 G4:.75 F4:.25 D4:1.5 D4:.5 D4:.5 D4:.5 F4:.75 E4:.25 C4:1'),
  T('Ninna nanna di Brahms', ['Ninna nanna', 'Wiegenlied'], 'La ninna nanna più famosa del mondo, a tempo di valzer', 'Classica', 2, 96, 3, 1, 'strings', false,
    'E4:.5 E4:.5 G4:2 E4:.5 E4:.5 G4:2 E4:.5 G4:.5 C5 B4:1.5 A4:.5 A4 G4 D4:.5 E4:.5 F4 D4 D4:.5 E4:.5 F4:2 D4:.5 F4:.5 B4:.5 A4:.5 G4 B4 C5:3'),
  T('Bella ciao', ['O bella ciao'], 'Canto popolare: una mattina mi son svegliato…', 'Popolare', 1, 128, 4, 0, 'brass', true,
    'E4:.5 A4:.5 B4:.5 C5:.5 A4:2 E4:.5 A4:.5 B4:.5 C5:.5 A4:2 E4:.5 A4:.5 B4:.5 C5:1 B4:.5 A4:.5 C5:1 B4:.5 A4:.5 E5:1 E5:1 E5:.5 D5:.5 E5:.5 F5:.5 F5:2'),
  T('Brilla brilla la stellina', ['Brilla brilla', 'Ah vous dirai-je maman', 'Twinkle twinkle little star', 'Stellina'], 'Filastrocca della buonanotte: Mozart ci scrisse 12 variazioni', 'Filastrocca', 1, 110, 4, 0, 'piano', true,
    'C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2'),
  T('Piccola serenata notturna', ['Eine kleine Nachtmusik', 'Serenata notturna', 'Piccola serenata'], 'Mozart: una serenata per archi, in sol maggiore', 'Classica', 2, 120, 4, 0, 'strings', false,
    'G4:1.5 D4:.5 G4:1.5 D4:.5 G4:.5 D4:.5 G4:.5 B4:.5 D5:2 C5:1.5 A4:.5 C5:1.5 A4:.5 C5:.5 A4:.5 F#4:.5 A4:.5 D4:2'),
  T('Toreador', ['Marcia del toreador', 'Toréador'], 'Bizet, Carmen: il canto del torero Escamillo', 'Opera', 3, 104, 4, 0, 'brass', true,
    'C5:.75 D5:.25 C5 A4 A4 A4:.75 G4:.25 A4:.75 Bb4:.25 A4:2 Bb4 G4:.75 C5:.25 A4:2'),
  T('Canone di Pachelbel', ['Canone in re', 'Pachelbel', 'Canone'], 'Barocco tedesco: otto note che tornano all’infinito, matrimoni ovunque', 'Classica', 3, 70, 4, 0, 'strings', false,
    'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2'),
  T('Sul bel Danubio blu', ['Danubio blu', 'Il Danubio blu', 'Valzer del Danubio'], 'Strauss: il valzer di Vienna, Capodanno in TV', 'Classica', 2, 160, 3, 1, 'strings', true,
    'D4 D4 F#4 A4 A4:3 A5:2 A5 F#5:3 D4 D4 F#4 A4 A4:3 A5:2 A5 G5:3'),
  T('Valzer delle candele', ['Auld lang syne', 'Valzer delle candele (Auld Lang Syne)'], 'Canto scozzese della mezzanotte di Capodanno', 'Popolare', 2, 92, 4, 1, 'strings', true,
    'C4 F4:1.5 F4:.5 F4 A4 G4:1.5 F4:.5 G4 A4 F4:1.5 F4:.5 A4 C5 D5:3 D5 C5:1.5 A4:.5 A4 F4 G4:1.5 F4:.5 G4 A4 F4:1.5 D4:.5 D4 C4 F4:3'),
  T('When the saints go marching in', ['When the saints', 'Oh when the saints', 'The saints'], 'Gospel di New Orleans, suonato dalle bande jazz', 'Popolare', 1, 140, 4, 0, 'brass', true,
    'C4 E4 F4 G4:4 C4 E4 F4 G4:4 C4 E4 F4 G4:2 E4:2 C4:2 E4:2 D4:4'),
  T('Oh Susanna', ['Oh! Susanna', 'O Susanna'], 'Stephen Foster: un banjo sulle ginocchia', 'Popolare', 2, 132, 4, 1, 'piano', true,
    'C4:.5 D4:.5 E4 G4 G4:1.5 A4:.5 G4 E4 C4:1.5 D4:.5 E4 E4 D4 C4 D4:3'),
  T('Greensleeves', ['Green sleeves', 'Maniche verdi'], 'Ballata inglese del Cinquecento, attribuita a Enrico VIII', 'Popolare', 3, 96, 3, 1, 'strings', false,
    'A4 C5:2 D5 E5:1.5 F5:.5 E5 D5:2 B4 G4:1.5 A4:.5 B4 C5:2 A4 A4:1.5 G#4:.5 A4 B4:2 G#4 E4:2'),
  T('Oh my darling Clementine', ['Clementine', 'My darling Clementine'], 'Ballata del Far West: una ragazza e una miniera', 'Popolare', 3, 120, 3, 1, 'piano', true,
    'F4:.75 F4:.25 F4 C4 A4:.75 A4:.25 A4 F4 F4:.75 A4:.25 C5:1.5 C5:.5 Bb4:.5 A4:.5 G4:2'),
  T('La cucaracha', ['Cucaracha'], 'Canzone popolare messicana: uno scarafaggio che non cammina più', 'Popolare', 1, 132, 4, 0, 'brass', true,
    'C4:.33 C4:.33 C4:.34 F4 A4 C4:.33 C4:.33 C4:.34 F4 A4:2 F4:.5 F4:.5 E4:.5 E4:.5 D4:.5 D4:.5 C4:2'),
  T('Can-can', ['Can can', 'Galop infernale', 'Orfeo all’inferno'], 'Offenbach: gambe alzate al Moulin Rouge', 'Classica', 1, 150, 2, 0, 'brass', true,
    'C4 D4:.5 F4:.5 E4:.5 D4:.5 G4 G4 G4:.5 A4:.5 E4:.5 F4:.5 D4 D4 D4:.5 F4:.5 E4:.5 D4:.5 C4:.5 C5:.5 B4:.5 A4:.5 G4:.5 F4:.5 E4:.5 D4:.5'),
  T('Il mattino', ['Mattino', 'Morning'], 'Grieg, Peer Gynt: il sole sorge sui fiordi', 'Classica', 3, 76, 3, 0, 'strings', false,
    'G4:.5 E4:.5 D4:.5 C4:.5 D4:.5 E4:.5 G4:.5 E4:.5 D4:.5 C4:.5 D4:.25 E4:.25 D4:.25 E4:.25 G4:.5 E4:.5 G4:.5 A4:.5 E4:.5 A4:.5 G4:.5 E4:.5 D4:.5 C4:1.5'),
  T('Nell’antro del re della montagna', ['Antro del re della montagna', 'Re della montagna', 'In the hall of the mountain king'], 'Grieg: troll e folletti, sempre più veloce', 'Classica', 3, 120, 4, 0, 'strings', false,
    'A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4 D#4:.5 B3:.5 D#4 D4:.5 Bb3:.5 D4 A3:.5 B3:.5 C4:.5 D4:.5 E4:.5 C4:.5 E4:.5 A4:.5 G4:.5 E4:.5 C4:.5 E4:.5 G4:2'),
  T('Quinta sinfonia', ['Quinta di Beethoven', 'Il destino bussa alla porta'], 'Beethoven: il destino bussa alla porta, ta-ta-ta-taaa', 'Classica', 1, 108, 2, .5, 'strings', false,
    'G4:.5 G4:.5 G4:.5 Eb4:2.5 F4:.5 F4:.5 F4:.5 D4:3'),
  T('Astro del ciel', ['Silent night', 'Stille Nacht', 'Notte silenziosa'], 'Canto di Natale austriaco: notte santa, notte silenziosa', 'Natale', 2, 96, 3, 0, 'organ', false,
    'G4:1.5 A4:.5 G4 E4:3 G4:1.5 A4:.5 G4 E4:3 D5:2 D5 B4:3 C5:2 C5 G4:3'),
  T('We wish you a merry Christmas', ['We wish you a merry christmas', 'Merry christmas'], 'Canto natalizio inglese degli auguri', 'Natale', 1, 150, 3, 1, 'brass', true,
    'D4 G4 G4:.5 A4:.5 G4:.5 F#4:.5 E4 E4 E4 A4 A4:.5 B4:.5 A4:.5 G4:.5 F#4 D4 D4 B4 B4:.5 C5:.5 B4:.5 A4:.5 G4 E4 D4:.5 D4:.5 E4 A4 F#4 G4:2'),
  T('Deck the halls', ['Fa la la', 'Deck the hall'], 'Canto natalizio gallese: fa-la-la-la-la, la-la-la-la', 'Natale', 2, 132, 4, 0, 'piano', true,
    'C5:1.5 Bb4:.5 A4 G4 F4 G4 A4 F4 G4:.5 A4:.5 Bb4:.5 G4:.5 A4:1.5 G4:.5 F4 E4 F4:2'),
  T('Korobeiniki', ['Tetris', 'Tema di Tetris', 'Korobushka'], 'Canto popolare russo diventato il tema di un videogioco a blocchi', 'Popolare', 1, 140, 4, 0, 'brass', true,
    'E5 B4:.5 C5:.5 D5 C5:.5 B4:.5 A4 A4:.5 C5:.5 E5 D5:.5 C5:.5 B4:1.5 C5:.5 D5 E5 C5 A4 A4:2'),
  T('Il volo del calabrone', ['Volo del calabrone', 'Calabrone'], 'Rimsky-Korsakov: un insetto che ronza velocissimo', 'Classica', 2, 140, 4, 0, 'strings', false,
    'E5:.25 D#5:.25 D5:.25 C#5:.25 D5:.25 C#5:.25 C5:.25 B4:.25 C5:.25 B4:.25 Bb4:.25 A4:.25 Ab4:.25 G4:.25 F#4:.25 F4:.25 E4:.25 D#4:.25 D4:.25 C#4:.25 D4:.25 C#4:.25 C4:.25 B3:.25 E4:2'),
  T('Alleluia di Händel', ['Alleluia', 'Hallelujah', 'Messiah', 'Il Messia'], 'Händel, il Messia: il pubblico si alza in piedi', 'Classica', 2, 96, 4, 0, 'organ', false,
    'D5 A4:.75 B4:.25 A4:2 D5 A4:.75 B4:.25 A4:2 A4:.5 B4:.5 A4:.5 B4:.5 A4 D5 C#5:2'),
  T('Sinfonia dal Nuovo Mondo', ['Nuovo Mondo', 'Dal nuovo mondo', 'Largo del Nuovo Mondo'], 'Dvořák: nostalgia di casa dall’America, il Largo', 'Classica', 3, 66, 4, 0, 'brass', false,
    'E4 G4 G4:2 E4 D4 C4:2 D4 E4 G4 E4 D4:3 E4 G4 G4:2 E4 D4 C4:2 D4 E4 D4 C4 C4:3'),
  T('Il lago dei cigni', ['Lago dei cigni', 'Swan lake'], 'Čajkovskij: un balletto di cigni bianchi e neri', 'Balletto', 2, 84, 4, 0, 'strings', false,
    'F#4:4 B3:.5 C#4:.5 D4:.5 E4:.5 F#4:1.5 D4:.5 F#4:1.5 D4:.5 F#4:1.5 B3:.5 D4:.5 B3:.5 G3:.5 D4:.5 B3:3'),
  T('Marcia funebre', ['Marcia funebre di Chopin'], 'Chopin, Sonata n. 2: passo lento e solenne', 'Classica', 2, 60, 4, 0, 'piano', false,
    'Bb3 Bb3:.75 Bb3:.25 Bb3 Db4:.75 C4:.25 C4:.75 Bb3:.25 Bb3:.75 A3:.25 Bb3:2'),
  T('Toccata e fuga in re minore', ['Toccata e fuga', 'Toccata'], 'Bach all’organo: l’attacco dei film dell’orrore', 'Classica', 2, 60, 4, 0, 'organ', false,
    'A5:.25 G5:.25 A5:1.5 G5:.25 F5:.25 E5:.25 D5:.25 C#5 D5:2 A4:.25 G4:.25 A4:1.5 E4:.5 F4:.5 C#4:.5 D4:2'),
  T('Nella vecchia fattoria', ['Vecchia fattoria', 'Old MacDonald', 'Ia ia o'], 'Filastrocca degli animali: ia-ia-o!', 'Filastrocca', 1, 128, 4, 0, 'piano', true,
    'G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:3 D4 G4 G4 G4 D4 E4 E4 D4:2 B4 B4 A4 A4 G4:3'),
  T('La cavalcata delle valchirie', ['Cavalcata delle valchirie', 'Valchirie'], 'Wagner: guerriere a cavallo… ed elicotteri al cinema', 'Opera', 3, 96, 3, 0, 'brass', true,
    'F#4:.375 B3:.125 D4:.5 F#4:1 D4 F#4:.375 D4:.125 F#4:.5 A4:1 F#4 A4:.375 F#4:.125 A4:.5 C#5:1 C#4 F#4:.375 C#4:.125 F#4:.5 B4:2'),
  T('Sinfonia n. 40', ['Sinfonia 40', 'Quarantesima di Mozart', 'Mozart 40'], 'Mozart in sol minore: suoneria di mille telefoni', 'Classica', 3, 120, 4, 0, 'strings', false,
    'Eb5:.5 D5:.5 D5 Eb5:.5 D5:.5 D5 Eb5:.5 D5:.5 D5:.5 Bb5:1.5 Bb5:.5 A5:.5 G5 G5:.5 F5:.5 Eb5 Eb5:.5 D5:.5 C5 C5'),
  T('Al chiaro di luna', ['Au clair de la lune', 'Chiaro di luna'], 'Canzoncina francese: un amico Pierrot e una penna', 'Filastrocca', 2, 104, 4, 0, 'piano', true,
    'C4 C4 C4 D4 E4:2 D4:2 C4 E4 D4 D4 C4:4'),
  T('La Marsigliese', ['Marsigliese', 'Inno francese', 'La Marseillaise'], 'Inno nazionale francese: allons enfants de la patrie', 'Inni', 2, 104, 4, 1, 'brass', true,
    'D4:.75 D4:.25 G4 G4 A4 A4 D5:1.5 B4:.5 G4:.75 G4:.25 B4:.75 G4:.25 E4:2 C5 A4:.75 F#4:.25 G4:3'),
  T('The Entertainer', ['Entertainer', 'La stangata'], 'Scott Joplin: il ragtime del film La stangata', 'Classica', 3, 96, 2, 0, 'piano', true,
    'D4:.25 D#4:.25 E4:.25 C5:.5 E4:.25 C5:.5 E4:.25 C5:1.5 C5:.25 D5:.25 D#5:.25 E5:.25 C5:.25 D5:.25 E5:.5 B4:.25 D5:.5 C5:1.5'),
  T('Minuetto in sol', ['Minuetto', 'Minuetto di Bach', 'Minuet in G'], 'Dal quaderno di Anna Magdalena Bach, lezione di piano', 'Classica', 3, 120, 3, 0, 'piano', false,
    'D5 G4:.5 A4:.5 B4:.5 C5:.5 D5 G4 G4 E5 C5:.5 D5:.5 E5:.5 F#5:.5 G5 G4 G4'),
  T('O Tannenbaum', ['O albero di Natale', 'Oh albero', 'Mio albero'], 'Canto tedesco dell’abete sempreverde', 'Natale', 3, 92, 3, 1, 'organ', false,
    'C4 F4:.75 F4:.25 F4:1.5 G4:.5 A4:.75 A4:.25 A4:1.5 A4:.5 G4:.5 A4:.5 Bb4 E4 G4 F4:2')
];

// ---------- parsing ----------
const PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
export function parse(str) {
  return str.trim().split(/\s+/).map(tok => {
    const m = /^(r|([A-G])([#b]?)(-?\d))(?::([\d.]+))?$/.exec(tok);
    if (!m) throw new Error('nota non valida: ' + tok);
    const d = m[5] ? +m[5] : 1;
    if (m[1] === 'r') return {m: null, d};
    return {m: 12 * (+m[4] + 1) + PC[m[2]] + (m[3] === '#' ? 1 : m[3] === 'b' ? -1 : 0), d};
  });
}
for (const t of TUNES) { t.notes = parse(t.n); t.cnt = t.notes.filter(x => x.m !== null).length; }

// tolerant answer check: typo-tolerant near() on title/aliases; loose=true also accepts the full alias inside a longer answer
export function matches(v, titles, loose = true) {
  const n = norm(v);
  if (n.length < 3) return false;
  return titles.some(a => near(v, a) || (loose && norm(a).length >= 6 && n.includes(norm(a))));
}
