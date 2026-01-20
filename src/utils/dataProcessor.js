import Papa from 'papaparse';

// Normalizes text to handle the quote quirk and case sensitivity
export const normalize = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes with straight quote
    .trim();
};

// Parses the "Other Forms" column (pipe and caret separated)
// Example: ...:gadadega^ᎦᏓᏕᎦ^gạdạdéga|...
const parseOtherForms = (rawString) => {
  if (!rawString) return [];
  const entries = rawString.split('|');
  const forms = [];
  
  entries.forEach(entry => {
    const parts = entry.split(':');
    if (parts.length > 1) {
      const subParts = parts[1].split('^');
      // Add Latin and Syllabary parts to searchable array
      subParts.forEach(sp => forms.push(sp.trim()));
    }
  });
  return forms;
};

const parseCsv = (text) => new Promise((resolve) => {
  Papa.parse(text, {
    header: true,
    complete: (results) => resolve(results.data)
  });
});

export const loadData = async () => {
  try {
    // 1. Fetch all data in parallel
    const [jsonRes, csvRes, sentencesRes, joinRes, classesRes] = await Promise.all([
      fetch('/data/reconstructable_verbs.json'),
      fetch('/data/dictionary.csv'),
      fetch('/data/sentences.csv'),
      fetch('/data/join_table.csv'),
      fetch('/data/classses_expanded.json')
    ]);

    const jsonData = await jsonRes.json();
    const csvText = await csvRes.text();
    const sentencesText = await sentencesRes.text();
    const joinText = await joinRes.text();
    const classesExpanded = await classesRes.json();

    // 2. Parse CSVs
    const [csvData, sentencesData, joinData] = await Promise.all([
      parseCsv(csvText),
      parseCsv(sentencesText),
      parseCsv(joinText)
    ]);

    // 3. Process Sentences
    // Map: Sentence_ID -> Sentence Object
    const sentencesById = {};
    sentencesData.forEach(s => {
      if (s.ID) {
        sentencesById[s.ID.trim()] = s;
      }
    });

    // Map: Entry_ID (Dictionary Index) -> Array of Sentence Objects
    const sentencesByEntryId = {};
    const seenSentences = {}; // Map: Entry_ID -> Set(Sentence_ID)

    joinData.forEach(link => {
      const entryId = link.Entry_ID?.trim();
      const sentenceId = link.Sentence_ID?.trim();
      const wordIndex = link.Word_Index?.trim();

      if (entryId && sentenceId) {
        if (!sentencesByEntryId[entryId]) {
          sentencesByEntryId[entryId] = [];
          seenSentences[entryId] = new Set();
        }
        
        const sentence = sentencesById[sentenceId];
        // Deduplicate sentences per entry, but allow same sentence if Word_Index is different
        const dedupeKey = `${sentenceId}-${wordIndex}`;
        if (sentence && !seenSentences[entryId].has(dedupeKey)) {
          sentencesByEntryId[entryId].push({
            ...sentence,
            wordIndex: wordIndex
          });
          seenSentences[entryId].add(dedupeKey);
        }
      }
    });

    // 4. Process Dictionary Data
    // Index JSON by Entry Number for fast linking with CSV Source_ID
    const jsonByEntryNo = {}; // Map: entry_no -> json object
    
    // Index JSON by Root for the final grouping view
    const jsonByRoot = {}; // Map: root -> [objects]
    
    // Index JSON by Class
    const jsonByClass = {}; // Map: class -> [objects]

    jsonData.forEach(item => {
      if (item.entry_no) {
        jsonByEntryNo[item.entry_no] = item;
      }
      
      const root = item.h_grade_root || "Uncategorized";
      if (!jsonByRoot[root]) jsonByRoot[root] = [];
      jsonByRoot[root].push(item);

      const className = item.class_name || "Unclassified";
      if (!jsonByClass[className]) jsonByClass[className] = [];
      jsonByClass[className].push(item);
    });

    // Process CSV for Search Optimization and attach Sentences
    const searchableCsv = csvData
      .filter(row => row.Entry && row.Part_of_Speech && row.Part_of_Speech.toLowerCase().includes('verb'))
      .map(row => {
        // Attach linked sentences
        const linkedSentences = sentencesByEntryId[row.Index] || [];

        return {
          ...row,
          sentences: linkedSentences,
          searchMeta: [
            normalize(row.Entry),
            normalize(row.Syllabary),
            normalize(row.Definition),
            ...parseOtherForms(row.Other_Forms).map(f => normalize(f))
          ].join(' ') // Create a giant search string for simple .includes()
        };
      });

    return { csv: searchableCsv, jsonByEntryNo, jsonByRoot, jsonByClass, classesExpanded };

  } catch (error) {
    console.error("Error loading data:", error);
    return null;
  }
};
