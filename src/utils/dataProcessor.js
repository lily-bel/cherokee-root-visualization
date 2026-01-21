import Papa from 'papaparse';

// Normalizes text to handle the quote quirk and case sensitivity
export const normalize = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'") // Replace smart quotes with straight quote
    .trim();
};

export const scoreSearchResult = (item, query) => {
  const normalizedQuery = normalize(query);
  const queryNoHyphen = normalizedQuery.replace(/-/g, '');
  if (!normalizedQuery) return 0;

  let score = 0;
  const hRootClean = normalize(item.hRoot || "").replace(/-/g, '');
  const gRootClean = normalize(item.gRoot || "").replace(/-/g, '');
  
  // Priority 1: Exact root match (sans hyphens)
  if (queryNoHyphen && (hRootClean === queryNoHyphen || gRootClean === queryNoHyphen)) {
    score += 100;
  }
  
  // Priority 2: Exact entry/syllabary match
  if (normalize(item.Entry) === normalizedQuery || normalize(item.Syllabary) === normalizedQuery) {
    score += 50;
  }
  
  // Basic match
  if (item.searchMeta.includes(normalizedQuery)) {
    score += 1;
  }
  
  return score;
};

// Parses the "Other Forms" column (pipe and caret separated)
const parseOtherForms = (rawString) => {
  if (!rawString) return [];
  const entries = rawString.split('|');
  const forms = [];
  
  entries.forEach(entry => {
    const parts = entry.split(':');
    if (parts.length > 1) {
      const subParts = parts[1].split('^');
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

    const [csvData, sentencesData, joinData] = await Promise.all([
      parseCsv(csvText),
      parseCsv(sentencesText),
      parseCsv(joinText)
    ]);

    // Process Sentences
    const sentencesById = {};
    sentencesData.forEach(s => {
      if (s.ID) {
        sentencesById[s.ID.trim()] = s;
      }
    });

    const sentencesByEntryId = {};
    const seenSentences = {};

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

    // Process Dictionary Data
    const jsonByEntryNo = {};
    const jsonByRoot = {};
    const jsonByClass = {};

    jsonData.forEach(item => {
      if (item.entry_no !== undefined && item.entry_no !== null) {
        jsonByEntryNo[item.entry_no.toString()] = item;
      }
      
      let root = "unknown";
      if (item.h_grade_root === "") {
        root = "null";
      } else if (item.h_grade_root) {
        root = item.h_grade_root;
      }

      if (!jsonByRoot[root]) jsonByRoot[root] = [];
      jsonByRoot[root].push(item);

      const className = item.class_name || "Unclassified";
      if (!jsonByClass[className]) jsonByClass[className] = [];
      jsonByClass[className].push(item);
    });

    const searchableCsv = csvData
      .filter(row => row.Entry && row.Part_of_Speech && row.Part_of_Speech.toLowerCase().includes('verb'))
      .map(row => {
        const sourceId = row.Source_ID || "";
        const entryNo = sourceId.split('.')[0];
        const jsonMatch = jsonByEntryNo[entryNo];
        
        const hRoot = jsonMatch ? (jsonMatch.h_grade_root === "" ? "null" : (jsonMatch.h_grade_root || "unknown")) : "unknown";
        const gRoot = jsonMatch ? (jsonMatch.glottal_grade_root === "" ? "null" : (jsonMatch.glottal_grade_root || "unknown")) : "unknown";
        
        const linkedSentences = sentencesByEntryId[row.Index] || [];

        return {
          ...row,
          hRoot,
          gRoot,
          sentences: linkedSentences,
          searchMeta: [
            normalize(row.Entry),
            normalize(row.Syllabary),
            normalize(row.Definition),
            normalize(hRoot),
            normalize(hRoot.replace(/-/g, '')),
            normalize(gRoot),
            normalize(gRoot.replace(/-/g, '')),
            ...parseOtherForms(row.Other_Forms).map(f => normalize(f))
          ].join(' ')
        };
      });

    return { csv: searchableCsv, jsonByEntryNo, jsonByRoot, jsonByClass, classesExpanded };

  } catch (error) {
    console.error("Error loading data:", error);
    return null;
  }
};
