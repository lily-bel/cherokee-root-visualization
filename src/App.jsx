import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, ArrowLeft, PieChart } from 'lucide-react';
import { loadData, normalize } from './utils/dataProcessor';
import VerbCard from './components/VerbCard';

function App() {
  // Data State
  const [data, setData] = useState({ csv: [], jsonByEntryNo: {}, jsonByRoot: {} });
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('search'); // 'search' | 'root' | 'error'
  const [currentRoot, setCurrentRoot] = useState({ h: null, g: null });
  const [rootData, setRootData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Load Data
  useEffect(() => {
    loadData().then(loadedData => {
      if(loadedData) setData(loadedData);
      setLoading(false);
    });
  }, []);

  // Calculate Statistics
  const stats = React.useMemo(() => {
    if (!data.csv.length) return null;
    const totalDict = data.csv.length;
    const matchedCount = data.csv.filter(item => data.jsonByEntryNo[parseInt(item.Source_ID)]).length;
    const classes = new Set();
    Object.values(data.jsonByRoot).flat().forEach(v => v.class_name && classes.add(v.class_name));
    return {
      totalDict,
      matchedCount,
      percent: ((matchedCount / totalDict) * 100).toFixed(1),
      totalRoots: Object.keys(data.jsonByRoot).length,
      totalClasses: classes.size
    };
  }, [data]);

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
    ).slice(0, 50);
    setSearchResults(results);
  }, [searchTerm, data.csv]);

  // Handle Clicking a CSV Result
  const handleSelectResult = (csvItem) => {
    const entryNo = parseInt(csvItem.Source_ID);
    const linkedJson = data.jsonByEntryNo[entryNo];
    if (!linkedJson) { setView('error'); return; }
    
    const hRoot = linkedJson.h_grade_root || "Uncategorized";
    const gRoot = linkedJson.glottal_grade_root || "---";
    
    setCurrentRoot({ h: hRoot, g: gRoot });
    setRootData(data.jsonByRoot[hRoot] || []);
    setView('root');
  };

  const findCsvForEntryNo = (entryNo) => {
    return data.csv.find(c => parseInt(c.Source_ID) === entryNo);
  }

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#f4ece1] dark:bg-[#1a1612] text-[#433422] dark:text-[#d4c3a9] font-serif text-xl italic">
      Consulting the dictionary...
    </div>
  );

  return (
    <div className="min-h-screen transition-colors duration-500 p-4 md:p-12 bg-[#f4ece1] dark:bg-[#1a1612] text-[#433422] dark:text-[#d4c3a9] font-serif">
      
      {/* Stats Modal */}
      {showStats && stats && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowStats(false)}>
          <div className="bg-[#f4ece1] dark:bg-[#251f18] text-[#433422] dark:text-[#d4c3a9] p-8 max-w-md w-full border border-[#8c7851] shadow-2xl" onClick={e => e.stopPropagation()}>
             <h2 className="text-2xl font-bold mb-4 font-cherokee border-b border-[#8c7851] pb-2">Statistics</h2>
             <div className="space-y-4 font-serif italic">
                <div className="flex justify-between items-baseline">
                   <span className="opacity-60 text-sm uppercase font-bold tracking-widest">Coverage</span>
                   <span className="text-3xl font-bold">{stats.percent}%</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 border border-[#8c7851]/30">
                      <div className="text-2xl font-bold">{stats.totalRoots}</div>
                      <div className="text-[10px] uppercase opacity-50 font-bold tracking-tighter">Roots Identified</div>
                   </div>
                   <div className="p-4 border border-[#8c7851]/30">
                      <div className="text-2xl font-bold">{stats.totalClasses}</div>
                      <div className="text-[10px] uppercase opacity-50 font-bold tracking-tighter">Verb Classes</div>
                   </div>
                </div>
             </div>
             <button onClick={() => setShowStats(false)} className="mt-8 w-full py-3 border border-[#433422] dark:border-[#d4c3a9] font-bold italic hover:bg-black/5 transition-colors">Close Folio</button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="max-w-3xl mx-auto flex justify-between items-center mb-12 pb-2 border-b border-[#8c7851]">
        <h1 className="text-2xl font-bold font-cherokee">
          Cherokee Verb Roots
        </h1>
        <div className="flex gap-4 items-center">
          <button onClick={() => setShowStats(true)} className="hover:opacity-60"><PieChart size={20} /></button>
          <button onClick={() => setDarkMode(!darkMode)} className="hover:opacity-60">{darkMode ? <Sun size={20} /> : <Moon size={20} />}</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto">
        {view === 'search' && (
          <div className="space-y-8">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-transparent outline-none py-2 text-2xl transition-all border-b border-[#8c7851] focus:border-[#433422] dark:focus:border-[#d4c3a9] font-serif"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-0 top-1/2 -translate-y-1/2 opacity-30" size={24} />
            </div>

            <div className="divide-y divide-[#8c7851]/20">
              {(() => {
                // Group search results by root
                const groups = searchResults.reduce((acc, result) => {
                  const entryNo = parseInt(result.Source_ID);
                  const linkedJson = data.jsonByEntryNo[entryNo];
                  const root = linkedJson?.h_grade_root || "unknown";
                  if (!acc[root]) acc[root] = { root, definitions: [], results: [] };
                  acc[root].definitions.push(result.Definition);
                  acc[root].results.push(result);
                  return acc;
                }, {});

                return Object.values(groups).map((group, idx) => {
                  const root = group.root !== "unknown" ? group.root : null;
                  const formCount = root ? (data.jsonByRoot[root]?.length || 0) : 0;
                  const displayDefinitions = [...new Set(group.definitions)];

                  return (
                    <button 
                      key={`${group.root}-${idx}`}
                      onClick={() => handleSelectResult(group.results[0])}
                      className="w-full py-4 text-left group hover:bg-black/5 dark:hover:bg-white/5 px-2 transition-colors"
                    >
                      <div className="flex items-baseline justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-3">
                            {root ? (
                              <span className="text-xl font-bold font-cherokee">{root}</span>
                            ) : (
                              <span className="text-sm opacity-40 italic">Root unknown</span>
                            )}
                            <span className="text-xs uppercase tracking-widest opacity-40 font-mono">
                              {group.results[0].Entry}
                            </span>
                          </div>
                          <div className="mt-1 text-sm italic opacity-70">
                            {displayDefinitions.join('; ')}
                          </div>
                        </div>
                        {formCount > 0 && (
                          <span className="text-[10px] uppercase tracking-widest opacity-40">
                            {formCount} {formCount === 1 ? 'form' : 'forms'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {view === 'root' && (
          <div>
            <button onClick={() => setView('search')} className="mb-12 flex items-center opacity-50 hover:opacity-100 uppercase text-xs tracking-widest font-bold">
              <ArrowLeft size={16} className="mr-2" /> Back
            </button>

            <div className="mb-12 border-l-4 border-[#8c7851] pl-6 py-2">
              <div className="flex flex-col md:flex-row md:items-baseline md:gap-8">
                <div>
                  <span className="opacity-40 text-[10px] uppercase tracking-[0.2em] font-bold">H-Grade Root</span>
                  <h1 className="text-5xl font-bold mt-1 font-cherokee">{currentRoot.h}</h1>
                </div>
                <div>
                  <span className="opacity-40 text-[10px] uppercase tracking-[0.2em] font-bold">Glottal Root</span>
                  <h1 className="text-4xl font-bold mt-1 font-cherokee opacity-80 italic">{currentRoot.g}</h1>
                </div>
              </div>
              <p className="opacity-50 italic mt-6 text-lg">{rootData.length} related formations</p>
            </div>

            <div className="space-y-6">
              {rootData.map((verb, idx) => (
                <VerbCard key={idx} data={verb} linkedCsvEntry={findCsvForEntryNo(verb.entry_no)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

