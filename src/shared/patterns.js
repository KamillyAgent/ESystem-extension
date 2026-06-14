// Built-in detection patterns.
// URL_KEYWORDS: matched against hostname (lowercased) as substring
// TEXT_KEYWORDS: matched against page text + metadata as substring (case-insensitive)

const URL_KEYWORDS = [
  // Major domains
  'pornhub', 'xvideos', 'xnxx', 'xhamster', 'redtube', 'youporn', 'beeg',
  'xvideo', 'hentai', 'hdporn', 'onlyfans', 'chaturbate', 'brazzers',
  'bangbros', 'adultfriendfinder', 'ashleymadison', 'stripchat', 'livejasmin',
  'bongacams', 'camsoda', 'flirt4free', 'imlive', 'myfreecams', 'rabbitscams',
  'trueamateurs', 'twistys', 'voyeur', 'webcam', 'x-art', 'xtube', 'youjizz',
  // Generic terms
  'porn', 'nsfw', 'xxx', 'erotic', 'fetish', 'bdsm', 'fisting', 'gangbang',
  'creampie', 'bukkake', 'threesome', 'cuckold', 'swinger', 'milf', 'gilf',
  'jailbait', 'pedo', 'loli', 'shota', 'incest', 'rape', 'bestiality',
  'zoophilia', 'necrophilia', 'snuff', 'beastiality', 'tranny', 'shemale',
  'trannies', 'shemales', 'tgirl',
];

const TEXT_KEYWORDS = [
  // Core adult terms
  'porn', 'pornography', 'xxx', 'nsfw', 'adult content', '18+', 'hentai',
  'xvideos', 'xnxx', 'erotic', 'nude', 'nudity', 'topless', 'bottomless',
  'naked', 'stripper', 'strip', 'escort', 'prostitute', 'hooker', 'call girl',
  'sex worker',
  // Fetish / activity terms
  'fetish', 'bdsm', 'bondage', 'domination', 'submission', 'sadism',
  'masochism', 'orgasm', 'anal', 'oral sex', 'blowjob', 'handjob', 'cumshot',
  'creampie', 'gangbang', 'threesome', 'orgy', 'swinger', 'cuckold',
  'voyeur', 'exhibitionist', 'peeping tom',
  // Anatomy
  'vagina', 'penis', 'breast', 'boob', 'tit', 'pussy', 'dick', 'cock',
  'cum', 'semen', 'ass', 'butt',
  // Illegal / extreme
  'rape', 'incest', 'pedo', 'loli', 'shota', 'bestiality', 'zoophilia',
  'beastiality', 'necrophilia', 'snuff',
  // Identity / orientation terms often used in adult contexts
  'tranny', 'shemale', 'tgirl', 'ladyboy', 'futanari',
  // Anime / manga adult
  'tentacle', 'ahegao', 'doujinshi', 'ecchi', 'waifu', 'oppai', 'paizuri',
  'handbra',
  // Lingerie / clothing
  'lingerie', 'thong', 'gstring', 'corset', 'stockings', 'fishnets',
  'bikini', 'microkini', 'monokini', 'swimsuit',
  // Behavior / hidden
  'hidden cam', 'upskirt', 'downblouse', 'nip slip', 'wardrobe malfunction',
  'sideboob', 'cleavage', 'underboob',
];

// Maximum metadata length to scan (avoid huge titles like Twitter threads)
const MAX_META_LEN = 500;

// DOM element selectors we pull text from for text-pattern detection
const TEXT_SELECTORS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'article p',
  'a[href]',
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="keywords"]',
];

// Getter for combining with user's custom_words at runtime
function getCombinedKeywords(customWords = []) {
  const set = new Set(TEXT_KEYWORDS);
  for (const w of customWords) {
    if (typeof w === 'string' && w.length <= 64) {
      set.add(w.toLowerCase());
    }
  }
  return [...set];
}

// Export for both browser global and module contexts
if (typeof window !== 'undefined') {
  window.ESystemPatterns = { URL_KEYWORDS, TEXT_KEYWORDS, MAX_META_LEN, TEXT_SELECTORS, getCombinedKeywords };
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { URL_KEYWORDS, TEXT_KEYWORDS, MAX_META_LEN, TEXT_SELECTORS, getCombinedKeywords };
}
