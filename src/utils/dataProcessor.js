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

export const loadData = async () => {
  try {
    // 1. Fetch JSON
    const jsonRes = await fetch('/data/reconstructable_verbs.json');
    const jsonData = await jsonRes.json();

    // 2. Fetch CSV
    const csvRes = await fetch('/data/dictionary.csv');
    const csvText = await csvRes.text();
    
    return new Promise((resolve) => {
      Papa.parse(csvText, {
        header: true,
        complete: (results) => {
          const csvData = results.data;
          
          // Index JSON by Definition for fast linking
          const jsonByDef = {}; // Map: normalized definition -> json object
          
          // Also Index JSON by Root for the final grouping view
          const jsonByRoot = {}; // Map: root -> [objects]

          jsonData.forEach(item => {
            const normDef = normalize(item.definition);
            jsonByDef[normDef] = item;
            
            const root = item.glottal_grade_root || "Uncategorized";
            if (!jsonByRoot[root]) jsonByRoot[root] = [];
            jsonByRoot[root].push(item);
          });

          // Process CSV for Search Optimization
          const searchableCsv = csvData.map(row => {
            return {
              ...row,
              searchMeta: [
                normalize(row.Entry),
                normalize(row.Syllabary),
                normalize(row.Definition),
                ...parseOtherForms(row.Other_Forms).map(f => normalize(f))
              ].join(' ') // Create a giant search string for simple .includes()
            };
          }).filter(row => row.Entry); // Remove empty rows

          resolve({ csv: searchableCsv, jsonByDef, jsonByRoot });
        }
      });
    });
  } catch (error) {
    console.error("Error loading data:", error);
    return null;
  }
};
