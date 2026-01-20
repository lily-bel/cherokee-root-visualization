import React, { useState, useEffect, useMemo } from 'react';
import { Search, Moon, Sun, ArrowLeft, PieChart, List, SortAsc, SortDesc, Hash } from 'lucide-react';
import { loadData, normalize } from './utils/dataProcessor';
import VerbCard from './components/VerbCard';

function App() {
  // Data State
  const [data, setData] = useState({ csv: [], jsonByEntryNo: {}, jsonByRoot: {}, jsonByClass: {}, classesExpanded: {} });
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('search'); // 'search' | 'root' | 'index' | 'classes' | 'class-detail' | 'error'
  const [currentRoot, setCurrentRoot] = useState({ h: null, g: null });
  const [currentClass, setCurrentClass] = useState(null);
  const [rootData, setRootData] = useState([]);
  const [classData, setClassData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'count', direction: 'desc' });
  const [classSortConfig, setClassSortConfig] = useState({ key: 'count', direction: 'desc' });

  // Load Data
  useEffect(() => {
    loadData().then(loadedData => {
      if(loadedData) setData(loadedData);
      setLoading(false);
    });
  }, []);

  // Calculate Statistics
  const stats = useMemo(() => {
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

  // Root Index Data
  const rootIndex = useMemo(() => {
    return Object.entries(data.jsonByRoot).map(([root, formations]) => {
      const displayDefinition = formations[0]?.definition || "No definition";
      return {
        root,
        count: formations.length,
        definition: displayDefinition,
        glottal: formations[0]?.glottal_grade_root || "---"
      };
    }).sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'root') {
        comparison = a.root.localeCompare(b.root);
      } else if (sortConfig.key === 'count') {
        comparison = a.count - b.count;
      } else if (sortConfig.key === 'definition') {
        comparison = a.definition.localeCompare(b.definition);
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data.jsonByRoot, sortConfig]);

  // Classes Index Data
  const classesIndex = useMemo(() => {
    return Object.entries(data.jsonByClass || {}).map(([className, verbs]) => {
      return {
        className,
        count: verbs.length
      };
    }).sort((a, b) => {
      let comparison = 0;
      if (classSortConfig.key === 'className') {
        comparison = a.className.localeCompare(b.className);
      } else if (classSortConfig.key === 'count') {
        comparison = a.count - b.count;
      }
      return classSortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data.jsonByClass, classSortConfig]);

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

  // Handle Clicking a CSV Result or Root Index Item
  const handleSelectRoot = (rootName) => {
    const formations = data.jsonByRoot[rootName] || [];
    if (formations.length === 0) { setView('error'); return; }
    
    setCurrentRoot({ 
      h: rootName, 
      g: formations[0]?.glottal_grade_root || "---" 
    });
    setRootData(formations);
    setView('root');
  };

  const handleSelectClass = (className) => {
    const verbs = data.jsonByClass[className] || [];
    setCurrentClass(className);
    setClassData(verbs);
    setView('class-detail');
  };

  const handleSelectResult = (csvItem) => {
    const entryNo = parseInt(csvItem.Source_ID);
    const linkedJson = data.jsonByEntryNo[entryNo];
    if (!linkedJson) { setView('error'); return; }
    handleSelectRoot(linkedJson.h_grade_root || "Uncategorized");
  };

  const findCsvForEntryNo = (entryNo) => {
    return data.csv.find(c => parseInt(c.Source_ID) === entryNo);
  }

  const renderEndings = (className) => {
    const info = data.classesExpanded[className];
    if (!info) return null;
    
    const fields = [
      { label: 'pres', val: info.present },
      { label: 'impf', val: info.imperfective },
      { label: 'perf', val: info.perfective },
      { label: 'impr', val: info.imperative },
      { label: 'inf', val: info.infinitive }
    ];

    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {fields.map(f => (
          <div key={f.label} className="flex items-baseline gap-1">
            <span className="text-[8px] uppercase tracking-tighter opacity-40 font-bold">{f.label}:</span>
            <span className="text-[10px] font-mono font-bold text-[#5d4037] dark:text-[#b08e6e]">-{f.val || '∅'}</span>
          </div>
        ))}
      </div>
    );
  };

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
      <div className="max-w-3xl mx-auto flex justify-between items-center mb-8 pb-2 border-b border-[#8c7851]">
        {view === 'root' || view === 'class-detail' ? (
          <button 
            onClick={() => setView(view === 'root' ? 'index' : 'classes')} 
            className="flex items-center opacity-70 hover:opacity-100 uppercase text-xs tracking-[0.2em] font-bold py-1"
          >
            <ArrowLeft size={16} className="mr-2" /> Back
          </button>
        ) : (
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold font-cherokee opacity-80">
              Cherokee Verb Roots
            </h1>
            <nav className="flex gap-4">
              <button 
                onClick={() => setView('search')} 
                className={`text-[10px] uppercase tracking-widest font-bold pb-1 transition-all ${view === 'search' ? 'border-b-2 border-[#8c7851] opacity-100' : 'opacity-40'}`}
              >
                Search
              </button>
              <button 
                onClick={() => setView('index')} 
                className={`text-[10px] uppercase tracking-widest font-bold pb-1 transition-all ${view === 'index' ? 'border-b-2 border-[#8c7851] opacity-100' : 'opacity-40'}`}
              >
                Roots
              </button>
              <button 
                onClick={() => setView('classes')} 
                className={`text-[10px] uppercase tracking-widest font-bold pb-1 transition-all ${view === 'classes' ? 'border-b-2 border-[#8c7851] opacity-100' : 'opacity-40'}`}
              >
                Classes
              </button>
            </nav>
          </div>
        )}
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

        {view === 'index' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center border-b border-[#8c7851]/20 pb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Sort By:</span>
              <button 
                onClick={() => setSortConfig({ key: 'root', direction: sortConfig.key === 'root' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                className={`flex items-center gap-1 text-xs font-bold ${sortConfig.key === 'root' ? 'opacity-100' : 'opacity-40'}`}
              >
                Root {sortConfig.key === 'root' && (sortConfig.direction === 'asc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
              </button>
              <button 
                onClick={() => setSortConfig({ key: 'definition', direction: sortConfig.key === 'definition' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                className={`flex items-center gap-1 text-xs font-bold ${sortConfig.key === 'definition' ? 'opacity-100' : 'opacity-40'}`}
              >
                English {sortConfig.key === 'definition' && (sortConfig.direction === 'asc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
              </button>
              <button 
                onClick={() => setSortConfig({ key: 'count', direction: sortConfig.key === 'count' && sortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                className={`flex items-center gap-1 text-xs font-bold ${sortConfig.key === 'count' ? 'opacity-100' : 'opacity-40'}`}
              >
                Forms {sortConfig.key === 'count' && (sortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {rootIndex.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSelectRoot(item.root)}
                  className="flex items-center justify-between p-3 border-b border-[#8c7851]/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left"
                >
                  <div className="flex flex-col">
                    <span className="text-lg font-bold font-cherokee text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white transition-colors">
                      {item.root}
                    </span>
                    <span className="text-xs italic opacity-60">{item.definition}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                      {item.count} {item.count === 1 ? 'form' : 'forms'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'classes' && (
          <div className="space-y-6">
            <div className="flex gap-4 items-center border-b border-[#8c7851]/20 pb-4">
              <span className="text-[10px] uppercase tracking-widest font-bold opacity-40">Sort By:</span>
              <button 
                onClick={() => setClassSortConfig({ key: 'className', direction: classSortConfig.key === 'className' && classSortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                className={`flex items-center gap-1 text-xs font-bold ${classSortConfig.key === 'className' ? 'opacity-100' : 'opacity-40'}`}
              >
                Class {classSortConfig.key === 'className' && (classSortConfig.direction === 'asc' ? <SortDesc size={14} /> : <SortAsc size={14} />)}
              </button>
              <button 
                onClick={() => setClassSortConfig({ key: 'count', direction: classSortConfig.key === 'count' && classSortConfig.direction === 'desc' ? 'asc' : 'desc' })}
                className={`flex items-center gap-1 text-xs font-bold ${classSortConfig.key === 'count' ? 'opacity-100' : 'opacity-40'}`}
              >
                Frequency {classSortConfig.key === 'count' && (classSortConfig.direction === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classesIndex.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleSelectClass(item.className)}
                  className="p-4 border border-[#8c7851]/20 hover:border-[#8c7851] transition-colors group text-left"
                >
                  <div className="flex justify-between items-start">
                    <div className="text-lg font-mono tracking-tighter text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white">
                      {item.className}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">
                      {item.count} {item.count === 1 ? 'verb' : 'verbs'}
                    </div>
                  </div>
                  {renderEndings(item.className)}
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'class-detail' && (
          <div className="space-y-6">
            <div className="mb-8 border-l-4 border-[#8c7851] pl-6 py-1">
              <span className="opacity-40 text-[9px] uppercase tracking-[0.2em] font-bold block">Verb Class</span>
              <h1 className="text-2xl font-mono tracking-tighter text-[#5d4037] dark:text-[#b08e6e]">{currentClass}</h1>
              {renderEndings(currentClass)}
              <p className="opacity-50 italic text-xs mt-4">{classData.length} verbs in this class</p>
            </div>

            <div className="divide-y divide-[#8c7851]/20">
              {classData.map((verb, idx) => {
                const csv = findCsvForEntryNo(verb.entry_no);
                return (
                  <button 
                    key={idx}
                    onClick={() => handleSelectRoot(verb.h_grade_root)}
                    className="w-full py-4 text-left group hover:bg-black/5 dark:hover:bg-white/5 px-2 transition-colors flex justify-between items-baseline"
                  >
                    <div>
                      <div className="font-bold text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white">
                        {verb.definition}
                      </div>
                      <div className="text-xs italic opacity-40 mt-1">
                        {csv?.Syllabary || '---'} ({csv?.Entry || '---'})
                      </div>
                    </div>
                    <div className="text-xs font-cherokee opacity-60">
                      Root: {verb.h_grade_root}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'root' && (
          <div>
            <div className="mb-8 border-l-4 border-[#8c7851] pl-6 py-1">
              <div className="flex flex-wrap gap-x-12 gap-y-4">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <div>
                    <span className="opacity-40 text-[9px] uppercase tracking-[0.2em] font-bold block">H-Grade Root</span>
                    <h1 className="text-2xl font-bold font-cherokee text-[#5d4037] dark:text-[#b08e6e]">{currentRoot.h}</h1>
                  </div>
                  <div>
                    <span className="opacity-40 text-[9px] uppercase tracking-[0.2em] font-bold block">Glottal Root</span>
                    <h1 className="text-2xl font-bold font-cherokee text-[#5d4037] dark:text-[#b08e6e]">{currentRoot.g}</h1>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {rootData.map((verb, idx) => (
                <VerbCard 
                  key={idx} 
                  data={verb} 
                  linkedCsvEntry={findCsvForEntryNo(verb.entry_no)} 
                  classInfo={data.classesExpanded[verb.class_name]}
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

