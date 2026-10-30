// Ouija Board data: spirits, riddles, and haunting phrases

export const SPIRITS = [
  {
    id: 'barone',
    name: 'Il Barone Goffredo',
    title: 'Spirito dell’Antico Maniero (1842)',
    mood: 'Nobiliare e sarcastico',
    intro: 'Chi osa disturbare il mio sonno eterno senza nemmeno portare un bicchiere di brandy?!',
    secretWord: 'CASTELLO',
    riddle: 'Ho cento stanze ma nessun inquilino vivo. Cosa sono?',
    riddleAnswer: 'CASTELLO',
    answers: {
      yesno: true,
      who: 'GOFFREDO',
      where: 'NELLA CRIPTA',
      fear: 'IL VOSTRO CORAGGIO'
    }
  },
  {
    id: 'dama',
    name: 'La Dama Velata',
    title: 'Presenza Melanconica del Lago',
    mood: 'Misteriosa e spettrale',
    intro: 'Sento il calore delle vostre mani... cercate forse la verità che riposa nelle acque fredde?',
    secretWord: 'SPECCHIO',
    riddle: 'Ti guardo quando mi guardi, ma non parlo mai per prima. Cosa sono?',
    riddleAnswer: 'SPECCHIO',
    answers: {
      yesno: true,
      who: 'BEATRICE',
      where: 'NEL PROFONDO',
      fear: 'L OSCURITA'
    }
  },
  {
    id: 'poltergeist',
    name: 'Zep il Burlone',
    title: 'Poltergeist dei Bauli',
    mood: 'Caotico e dispettoso',
    intro: 'Uh uh uh! Finalmente qualcuno con cui giocare a nascondino al buio!',
    secretWord: 'FANTASMA',
    riddle: 'Attraverso i muri, spavento i gatti e non pago mai l’affitto. Chi sono?',
    riddleAnswer: 'FANTASMA',
    answers: {
      yesno: false,
      who: 'ZEP',
      where: 'DIETRO DI TE',
      fear: 'I RUMORI'
    }
  },
  {
    id: 'marinaio',
    name: 'Capitan Ruggero',
    title: 'Il Guardiano del Faro Perduto',
    mood: 'Ruvido e tempestoso',
    intro: 'C’è burrasca oltre il velo... tenete salda la bussola o vi perderete negli abissi!',
    secretWord: 'LANTERNA',
    riddle: 'Brucio senza consumarmi e guido chi vaga nella nebbia. Cosa sono?',
    riddleAnswer: 'LANTERNA',
    answers: {
      yesno: true,
      who: 'RUGGERO',
      where: 'TRA LE ONDE',
      fear: 'LA TEMPESTA'
    }
  }
];

export const SÉANCE_QUESTIONS = [
  { q: 'C’è qualcuno qui con noi stanotte?', type: 'yesno' },
  { q: 'Qual è il tuo vero nome, spirito?', type: 'name' },
  { q: 'Dove ti nascondi in questa stanza?', type: 'where' },
  { q: 'Qual è l’enigma per liberare la tua anima?', type: 'riddle' }
];
