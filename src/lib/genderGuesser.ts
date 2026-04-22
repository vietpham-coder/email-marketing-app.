// Basic Gender Dictionary for common male/female names (Vietnamese & English)
// This is a simplified static list for fast synchronous detection

const maleNames = new Set([
  // VN
  "viet", "dung", "cuong", "hung", "minh", "hoang", "tuan", "quang", 
  "dat", "son", "phuc", "duc", "thang", "huy", "khanh", "phong", "tuyen", 
  "vinh", "long", "tung", "thanh", "kien", "quan", "nam", "bao", "phat",
  "khoa", "hieu", "lam",
  // EN
  "john", "james", "robert", "michael", "william", "david", "richard", 
  "joseph", "thomas", "charles", "christopher", "daniel", "matthew", "anthony", 
  "mark", "paul", "steven", "andrew", "kenneth", "joshua", "kevin", "brian",
  "chris"
]);

const femaleNames = new Set([
  // VN
  "lan", "huong", "trang", "thao", "nga", "linh", "anh", "mai", "hoa", 
  "ngoc", "tuyet", "dung", "yen", "oanh", "trinh", "thu", "thuy", "phuong", 
  "hong", "lien", "hien", "my", "chi", "quynh", "vy", "nhi", "tram", "thao",
  "uyen", "ly", "giang", "van",
  // EN
  "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan", 
  "jessica", "sarah", "karen", "nancy", "lisa", "betty", "margaret", "sandra", 
  "ashley", "kimberly", "emily", "donna", "michelle"
]);

// Ambiguous names intentionally left out (e.g. Thanh, Binh, Hai in VN can be both)

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

export function guessGenderFromName(fullName: string): string {
  if (!fullName) return "";
  
  // Clean string
  const cleanName = removeAccents(fullName.trim());
  const words = cleanName.split(/\s+/);
  if (words.length === 0) return "";

  // The strategy: Look at the last word (common in VN like "Phạm Quốc Việt" -> "viet")
  // and the first word (common in EN like "John Doe" -> "john")
  
  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  let potentialTitle = "";

  // Test Last Word first (prefer VN pattern)
  if (maleNames.has(lastWord)) potentialTitle = "Mr.";
  else if (femaleNames.has(lastWord)) potentialTitle = "Ms.";

  // If last word didn't match, test First Word (EN pattern)
  if (!potentialTitle) {
    if (maleNames.has(firstWord)) potentialTitle = "Mr.";
    else if (femaleNames.has(firstWord)) potentialTitle = "Ms.";
  }

  // If we couldn't find a strong match, return blank for human review
  return potentialTitle;
}
