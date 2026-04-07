// ─────────────────────────────────────────────────────────────
// Topic taxonomy — canonical topics mapped to all their aliases
// Add new topics here as students use the app.
// Keys are canonical topic names (lowercase, used as cache keys).
// Values are arrays of synonyms and related keywords.
// ─────────────────────────────────────────────────────────────
const TOPIC_TAXONOMY = {

  // ── Biology ──────────────────────────────────────────────
  'photosynthesis': [
    'photosynthesis', 'plants make food', 'chlorophyll', 'light energy',
    'plant food', 'chloroplast', 'sunlight energy', 'carbon dioxide oxygen',
    'how plants grow', 'plant energy', 'green plants', 'plant process'
  ],
  'cellular respiration': [
    'cellular respiration', 'cell respiration', 'atp', 'mitochondria',
    'energy from food', 'glucose energy', 'aerobic respiration',
    'anaerobic respiration', 'how cells get energy', 'cell energy'
  ],
  'mitosis': [
    'mitosis', 'cell division', 'cells divide', 'chromosomes splitting',
    'cell replication', 'somatic cell division', 'cell cycle', 'cytokinesis',
    'prophase metaphase', 'how cells multiply'
  ],
  'meiosis': [
    'meiosis', 'sexual reproduction cells', 'gametes', 'sex cells',
    'reproductive cell division', 'sperm egg formation', 'haploid cells'
  ],
  'dna': [
    'dna', 'deoxyribonucleic acid', 'double helix', 'genes', 'genetics',
    'nucleotides', 'base pairs', 'adenine thymine', 'genetic code',
    'what is dna', 'how dna works', 'chromosomes genes'
  ],
  'evolution': [
    'evolution', 'natural selection', 'darwin', 'species change',
    'adaptation', 'survival of fittest', 'evolutionary biology',
    'common ancestor', 'mutation selection', 'how species evolve'
  ],
  'human digestive system': [
    'digestion', 'digestive system', 'stomach', 'intestines',
    'how we digest food', 'enzymes digestion', 'absorption nutrients',
    'oesophagus stomach', 'small intestine large intestine'
  ],
  'ecosystems': [
    'ecosystem', 'food chain', 'food web', 'predator prey',
    'producer consumer', 'decomposer', 'biome', 'habitat',
    'energy flow ecosystem', 'trophic levels'
  ],

  // ── Chemistry ─────────────────────────────────────────────
  'periodic table': [
    'periodic table', 'elements', 'atomic number', 'atomic mass',
    'mendeleev', 'groups periods', 'metals nonmetals', 'element symbols',
    'how periodic table works', 'chemical elements'
  ],
  'chemical bonding': [
    'chemical bonding', 'covalent bond', 'ionic bond', 'metallic bond',
    'electron sharing', 'electron transfer', 'molecule formation',
    'how atoms bond', 'chemical bonds', 'valence electrons'
  ],
  'acids and bases': [
    'acid base', 'acids bases', 'ph scale', 'ph level', 'neutralisation',
    'neutralization', 'titration', 'hydrogen ions', 'alkaline acid',
    'strong weak acid', 'litmus test', 'indicators'
  ],
  'chemical reactions': [
    'chemical reaction', 'reactants products', 'exothermic endothermic',
    'activation energy', 'catalyst', 'rate of reaction',
    'balanced equation', 'conservation of mass', 'stoichiometry'
  ],
  'atomic structure': [
    'atomic structure', 'atom', 'protons neutrons electrons',
    'nucleus', 'electron shells', 'bohr model', 'subatomic particles',
    'atomic number mass number', 'isotopes', 'how atom looks'
  ],

  // ── Physics ───────────────────────────────────────────────
  'gravity': [
    'gravity', 'gravitational force', 'newton gravity', 'falling objects',
    'weight mass gravity', 'gravitational acceleration', '9.8 m/s',
    'why things fall', 'gravitational field', 'free fall'
  ],
  'newtons laws': [
    'newton laws', 'newtons laws', 'laws of motion', 'first law inertia',
    'second law f=ma', 'third law action reaction', 'force mass acceleration',
    'newtons first second third', 'how forces work'
  ],
  'electricity': [
    'electricity', 'electric current', 'voltage', 'resistance', 'ohm',
    'ohms law', 'circuit', 'conductor insulator', 'series parallel circuit',
    'how electricity works', 'watts power', 'coulombs'
  ],
  'waves': [
    'waves', 'wave frequency', 'amplitude', 'wavelength', 'transverse longitudinal',
    'sound waves', 'light waves', 'electromagnetic waves', 'wave speed',
    'period frequency', 'how waves travel', 'wave properties'
  ],
  'energy': [
    'energy', 'kinetic energy', 'potential energy', 'conservation of energy',
    'energy transfer', 'work done', 'power joules', 'forms of energy',
    'thermal energy', 'how energy works', 'energy transformation'
  ],
  'magnetism': [
    'magnetism', 'magnetic field', 'electromagnet', 'magnetic force',
    'north south pole', 'compass', 'magnetic flux', 'solenoid',
    'how magnets work', 'induced current'
  ],
  'light': [
    'light', 'reflection', 'refraction', 'diffraction', 'spectrum',
    'prism colours', 'wavelength colour', 'lens mirror', 'optics',
    'how light behaves', 'visible light', 'photons'
  ],

  // ── Mathematics ───────────────────────────────────────────
  'pythagoras theorem': [
    'pythagoras', 'pythagorean theorem', 'right angle triangle',
    'hypotenuse', 'a squared b squared c squared', 'right triangle sides',
    'how to find hypotenuse', 'triangle calculation'
  ],
  'quadratic equations': [
    'quadratic', 'quadratic equation', 'quadratic formula', 'factoring',
    'completing the square', 'ax squared bx c', 'roots of equation',
    'parabola', 'discriminant', 'solving quadratics'
  ],
  'calculus': [
    'calculus', 'derivative', 'differentiation', 'integration', 'integral',
    'limits', 'rate of change', 'dy dx', 'gradient function',
    'fundamental theorem calculus', 'how calculus works'
  ],
  'algebra': [
    'algebra', 'algebraic expressions', 'solving equations', 'variables',
    'linear equation', 'simultaneous equations', 'inequalities',
    'expanding brackets', 'factorising', 'substitution'
  ],
  'statistics': [
    'statistics', 'mean median mode', 'average', 'standard deviation',
    'probability', 'normal distribution', 'correlation', 'histogram',
    'data analysis', 'how to find mean', 'statistical analysis'
  ],
  'trigonometry': [
    'trigonometry', 'sin cos tan', 'sine cosine tangent', 'sohcahtoa',
    'trig ratios', 'unit circle', 'radians degrees', 'trig identities',
    'how trig works', 'angle calculation'
  ],
  'fractions': [
    'fractions', 'numerator denominator', 'simplify fraction',
    'adding fractions', 'multiplying fractions', 'mixed numbers',
    'equivalent fractions', 'how fractions work', 'fraction division'
  ],

  // ── History ───────────────────────────────────────────────
  'world war 2': [
    'world war 2', 'world war two', 'ww2', 'wwii', 'second world war',
    'hitler', 'nazi', 'allied powers', 'axis powers', 'holocaust',
    'd day', 'pearl harbor', 'hiroshima', 'causes of ww2'
  ],
  'world war 1': [
    'world war 1', 'world war one', 'ww1', 'wwi', 'first world war',
    'trench warfare', 'archduke franz ferdinand', 'triple alliance entente',
    'causes of ww1', 'versailles treaty'
  ],
  'french revolution': [
    'french revolution', 'bastille', 'napoleon', 'marie antoinette',
    'reign of terror', 'robespierre', 'liberty equality fraternity',
    'causes french revolution', 'france 1789'
  ],
  'industrial revolution': [
    'industrial revolution', 'steam engine', 'factory system', 'urbanisation',
    'james watt', 'mass production', 'cotton gin', 'child labour history',
    'how industrial revolution started', 'britain industrialisation'
  ],

  // ── English / Literature ──────────────────────────────────
  'shakespeare': [
    'shakespeare', 'william shakespeare', 'hamlet', 'macbeth', 'romeo juliet',
    'othello', 'sonnets', 'elizabethan era', 'globe theatre',
    'shakespeare plays', 'iambic pentameter'
  ],
  'essay writing': [
    'essay writing', 'how to write essay', 'thesis statement', 'introduction conclusion',
    'paragraph structure', 'argumentative essay', 'analytical essay',
    'topic sentence', 'essay structure', 'writing techniques'
  ],

  // ── Computer Science ──────────────────────────────────────
  'sorting algorithms': [
    'sorting algorithm', 'bubble sort', 'merge sort', 'quick sort',
    'insertion sort', 'selection sort', 'how sorting works',
    'algorithm complexity', 'big o notation sorting'
  ],
  'binary': [
    'binary', 'binary numbers', 'bits bytes', 'base 2', 'binary conversion',
    'binary to decimal', 'how computers store numbers', 'binary code',
    'ones zeros computer'
  ],
};

// ─────────────────────────────────────────────────────────────
// Build reverse index at startup
// Every keyword maps back to its canonical topic key
// ─────────────────────────────────────────────────────────────
const KEYWORD_TO_TOPIC = {};
for (const [topic, keywords] of Object.entries(TOPIC_TAXONOMY)) {
  KEYWORD_TO_TOPIC[topic] = topic;
  for (const kw of keywords) {
    KEYWORD_TO_TOPIC[kw.toLowerCase()] = topic;
  }
}

// ─────────────────────────────────────────────────────────────
// Resolve a raw student message to a canonical topic
// Returns the best-matching canonical topic key, or null if unknown
// ─────────────────────────────────────────────────────────────
function resolveCanonicalTopic(message) {
  if (!message || typeof message !== 'string') return null;

  const cleaned = message.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words   = cleaned.split(/\s+/).filter(Boolean);
  const scores  = {};

  // Score single-word matches
  for (const word of words) {
    if (KEYWORD_TO_TOPIC[word]) {
      const canonical = KEYWORD_TO_TOPIC[word];
      scores[canonical] = (scores[canonical] || 0) + 1;
    }
  }

  // Score two-word bigram matches (higher weight — more specific)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = words[i] + ' ' + words[i + 1];
    if (KEYWORD_TO_TOPIC[bigram]) {
      const canonical = KEYWORD_TO_TOPIC[bigram];
      scores[canonical] = (scores[canonical] || 0) + 3;
    }
  }

  // Score three-word trigram matches (highest weight)
  for (let i = 0; i < words.length - 2; i++) {
    const trigram = words[i] + ' ' + words[i + 1] + ' ' + words[i + 2];
    if (KEYWORD_TO_TOPIC[trigram]) {
      const canonical = KEYWORD_TO_TOPIC[trigram];
      scores[canonical] = (scores[canonical] || 0) + 5;
    }
  }

  if (Object.keys(scores).length === 0) return null;

  // Return the highest-scoring canonical topic
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}

// Get all topics in a subject area (for pre-warming suggestions)
function getTopicsInSubject(topic) {
  const subjects = {
    biology:    ['photosynthesis', 'cellular respiration', 'mitosis', 'meiosis',
                 'dna', 'evolution', 'ecosystems', 'human digestive system'],
    chemistry:  ['atomic structure', 'periodic table', 'chemical bonding',
                 'chemical reactions', 'acids and bases'],
    physics:    ['gravity', 'newtons laws', 'electricity', 'waves',
                 'energy', 'magnetism', 'light'],
    maths:      ['algebra', 'fractions', 'pythagoras theorem', 'trigonometry',
                 'quadratic equations', 'statistics', 'calculus'],
    history:    ['world war 1', 'world war 2', 'french revolution', 'industrial revolution'],
  };
  for (const [subject, topics] of Object.entries(subjects)) {
    if (topics.includes(topic)) {
      return topics.filter(t => t !== topic);
    }
  }
  return [];
}

module.exports = { resolveCanonicalTopic, getTopicsInSubject, TOPIC_TAXONOMY, KEYWORD_TO_TOPIC };
