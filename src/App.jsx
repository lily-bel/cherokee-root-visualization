import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, ArrowLeft, AlertCircle } from 'lucide-react';
import { loadData, normalize } from './utils/dataProcessor';
import VerbCard from './components/VerbCard';

function App() {
  // Data State
  const [data, setData] = useState({ csv: [], jsonByDef: {}, jsonByRoot: {} });
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('search'); // 'search' | 'root' | 'error'
  const [currentRoot, setCurrentRoot] = useState(null);
  const [rootData, setRootData] = useState([]);
  const [darkMode, setDarkMode] = useState(true);

  // Load Data
  useEffect(() => {
    loadData().then(loadedData => {
      if(loadedData) setData(loadedData);
      setLoading(false);
    });
  }, []);

  // Dark Mode Toggle
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Handle Search
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const normalizedQuery = normalize(searchTerm);
    const results = data.csv.filter(item => 
      item.searchMeta.includes(normalizedQuery)
    ).slice(0, 50); // Limit to 50 results for performance
    setSearchResults(results);
  }, [searchTerm, data.csv]);

  // Handle Clicking a CSV Result
  const handleSelectResult = (csvItem) => {
    const def = normalize(csvItem.Definition);
    const linkedJson = data.jsonByDef[def];

    if (!linkedJson) {
      setView('error');
      return;
    }

    const root = linkedJson.glottal_grade_root;
    
    // Gather all items that share this root
    const associatedVerbs = data.jsonByRoot[root];
    
    setCurrentRoot(root);
    setRootData(associatedVerbs);
    setView('root');
  };

  // Helper to find the CSV entry for a JSON definition (reverse lookup for the Card)
  const findCsvForDef = (def) => {
    const normDef = normalize(def);
    return data.csv.find(c => normalize(c.Definition) === normDef);
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500">Loading Dictionary...</div>;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 p-4 md:p-8">
      
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-700">
          Cherokee Verb Roots
        </h1>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-full bg-white dark:bg-slate-800 shadow text-slate-800 dark:text-slate-200"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto">
        
        {/* VIEW: Search */}
        {view === 'search' && (
          <div className="space-y-6">
            <div className="relative group">
              <input 
                type="text" 
                placeholder="Search definitions, syllabary, or forms..." 
                className="w-full p-4 pl-12 rounded-xl bg-white dark:bg-slate-800 shadow-xl border-2 border-transparent focus:border-emerald-500 outline-none text-lg text-slate-800 dark:text-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="grid gap-3">
              {searchResults.map((result, idx) => (
                <button 
                  key={`${result.Entry}-${idx}`}
                  onClick={() => handleSelectResult(result)}
                  className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow hover:shadow-md hover:translate-x-1 transition-all text-left group"
                >
                  <div className="flex justify-between items-baseline">
                    <span className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100">{result.Syllabary}</span>
                    <span className="text-sm font-mono text-emerald-600 group-hover:underline">{result.Entry}</span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">{result.Definition}</p>
                  {/* Show snippet of other forms if they matched */}
                  {result.Other_Forms && (
                     <p className="text-xs text-slate-400 mt-2 truncate">Forms: {result.Other_Forms.replace(/\|/g, ', ').replace(/\^/g, ' ')}</p>
                  )}
                </button>
              ))}
              {searchTerm && searchResults.length === 0 && (
                 <div className="text-center text-slate-400 mt-10">No matches found</div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: Error */}
        {view === 'error' && (
          <div className="text-center py-20 animate-fadeIn">
            <div className="inline-block p-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 mb-4">
              <AlertCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No Root Data Found</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
              We found the word in the dictionary, but it doesn't have a linked entry in the Verb Root database.
            </p>
            <button 
              onClick={() => setView('search')}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {/* VIEW: Root Detail */}
        {view === 'root' && (
          <div className="animate-slideIn">
            <button 
              onClick={() => setView('search')}
              className="mb-6 flex items-center text-emerald-600 hover:text-emerald-500 font-semibold"
            >
              <ArrowLeft size={20} className="mr-1" /> Back to Search
            </button>

            <div className="mb-8">
              <span className="text-slate-400 text-sm uppercase tracking-widest font-bold">Glottal Grade Root</span>
              <h1 className="text-4xl md:text-6xl font-black text-slate-800 dark:text-white font-mono mt-1">
                {currentRoot || "NULL"}
              </h1>
              <p className="text-slate-500 mt-2">
                Showing <strong className="text-emerald-500">{rootData.length}</strong> related formations
              </p>
            </div>

            {/* The File Cabinet List */}
            <div className="flex flex-col md:gap-4 pb-20">
              {rootData.map((verb, idx) => (
                <VerbCard 
                  key={idx} 
                  data={verb} 
                  // Find the CSV entry that corresponds to this specific JSON object
                  linkedCsvEntry={findCsvForDef(verb.definition)}
                  zIndex={rootData.length - idx}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

