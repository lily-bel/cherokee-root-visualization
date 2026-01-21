import React, { useState, useEffect, useMemo } from 'react';
import { Search, Moon, Sun, ArrowLeft, PieChart, List, SortAsc, SortDesc, Hash } from 'lucide-react';
import { loadData, normalize, scoreSearchResult } from './utils/dataProcessor';
import VerbCard from './components/VerbCard';

function App() {
  // Data State
  const [data, setData] = useState({ csv: [], jsonByEntryNo: {}, jsonByRoot: {}, jsonByClass: {}, classesExpanded: {} });
  const [loading, setLoading] = useState(true);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [view, setView] = useState('search'); // 'search' | 'root' | 'index' | 'classes' | 'class-detail' | 'superclass-detail' | 'error'
  const [history, setHistory] = useState(['search']);
  const [currentRoot, setCurrentRoot] = useState({ h: null, g: null });

  const navigateTo = (newView) => {
    setHistory(prev => [...prev, newView]);
    setView(newView);
  };

  const goBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevView = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setView(prevView);
    } else {
      setView('search');
      setHistory(['search']);
    }
  };

  const [currentClass, setCurrentClass] = useState(null);
  const [rootData, setRootData] = useState([]);
  const [classData, setClassData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'count', direction: 'desc' });
  const [classSortConfig, setClassSortConfig] = useState({ key: 'count', direction: 'desc' });
  const [showGroupedClasses, setShowGroupedClasses] = useState(false);
  const [currentSuperclass, setCurrentSuperclass] = useState(null);

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

  const groupedClassesIndex = useMemo(() => {
    const groups = {};
    classesIndex.forEach(item => {
      const superclass = item.className.split('[')[0];
      if (!groups[superclass]) {
        groups[superclass] = {
          name: superclass,
          subclasses: [],
          totalVerbs: 0,
          hasExactMatch: false // Track if the superclass itself exists as a class
        };
      }
      
      if (item.className === superclass) {
         groups[superclass].hasExactMatch = true;
      }

      groups[superclass].subclasses.push(item);
      groups[superclass].totalVerbs += item.count;
    });

    return Object.values(groups).sort((a, b) => {
       // Re-use sort config if possible, or default to alpha
       if (classSortConfig.key === 'className') {
        return classSortConfig.direction === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else {
        return classSortConfig.direction === 'asc'
          ? a.totalVerbs - b.totalVerbs
          : b.totalVerbs - a.totalVerbs;
      }
    });
  }, [classesIndex, classSortConfig]);

  // Dark Mode Toggle
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

    // Handle Search

    useEffect(() => {

      if (!searchTerm || searchTerm.trim().length < 1) {

        setSearchResults([]);

        return;

      }

      

      const scoredResults = data.csv

        .map(item => ({

          item,

          score: scoreSearchResult(item, searchTerm)

        }))

        .filter(res => {

          // Hide "unknown" roots from results but keep the "null" ones

          return res.score > 0 && res.item.hRoot !== "unknown";

        })

        .sort((a, b) => b.score - a.score || a.item.Entry.localeCompare(b.item.Entry))

        .slice(0, 50)

        .map(res => res.item);

  

      setSearchResults(scoredResults);

    }, [searchTerm, data.csv]);

  

    // Handle Clicking a CSV Result or Root Index Item

    const handleSelectRoot = (rootName) => {

      const formations = data.jsonByRoot[rootName] || [];

      if (formations.length === 0) { navigateTo('error'); return; }

      

      setCurrentRoot({ 

        h: rootName, 

        g: formations[0]?.glottal_grade_root === "" ? "null" : (formations[0]?.glottal_grade_root || "unknown")

      });

      setRootData(formations);

      navigateTo('root');

    };

  

    const handleSelectClass = (className) => {

      const verbs = data.jsonByClass[className] || [];

      setCurrentClass(className);

      setClassData(verbs);

      navigateTo('class-detail');

    };

  

    const handleSelectSuperclass = (group) => {

      // If it only has one subclass and that subclass is the superclass itself (or just one child), maybe just go to class detail?

      // But the requirements say "clicking a class with no children... brings you to the normal page"

      // "No children" means subclasses length is 1 (itself) OR 0 (if logic is weird, but here it's built from existing classes)

      

      // Actually, if it's strictly just the parent class existing with no [subclass] variants:

      if (group.subclasses.length === 1 && group.hasExactMatch) {

         handleSelectClass(group.name);

         return;

      }

  

      // Otherwise, show superclass view

      setCurrentSuperclass(group);

      navigateTo('superclass-detail');

    };

  

    const handleSelectResult = (csvItem) => {

      const sourceId = csvItem.Source_ID || "";

      const entryNo = sourceId.split('.')[0];

      const linkedJson = data.jsonByEntryNo[entryNo];

      if (!linkedJson) { navigateTo('error'); return; }

      handleSelectRoot(linkedJson.h_grade_root === "" ? "null" : (linkedJson.h_grade_root || "unknown"));

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

              <span className="text-[10px] font-mono font-bold text-[#5d4037] dark:text-[#b08e6e] whitespace-nowrap">-{f.val || 'null'}</span>

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

               <button onClick={() => setShowStats(false)} className="mt-8 w-full py-3 border border-[#433422] dark:border-[#d4c3a9] font-bold italic hover:bg-black/5 transition-colors">Close</button>

            </div>

          </div>

        )}

  

        {/* Top Bar */}

        <div className="max-w-3xl mx-auto flex justify-between items-center mb-8 pb-2 border-b border-[#8c7851] gap-4">

          {view === 'root' || view === 'class-detail' || view === 'superclass-detail' ? (

            <button 

              onClick={goBack} 

              className="flex items-center opacity-70 hover:opacity-100 uppercase text-xs tracking-[0.2em] font-bold py-1"

            >

              <ArrowLeft size={16} className="mr-2" /> Back

            </button>

          ) : (

            <div className="flex items-center gap-3 sm:gap-6 overflow-hidden">

              <h1 className="text-sm sm:text-lg font-bold font-cherokee opacity-80 whitespace-nowrap">

                Verb Roots

              </h1>

              <nav className="flex gap-2 sm:gap-4 overflow-x-auto no-scrollbar">

                <button 

                  onClick={() => navigateTo('search')} 

                  className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold pb-1 transition-all whitespace-nowrap ${view === 'search' ? 'border-b-2 border-[#8c7851] opacity-100' : 'opacity-40'}`}

                >

                  Search

                </button>

                <button 

                  onClick={() => navigateTo('index')} 

                  className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold pb-1 transition-all whitespace-nowrap ${view === 'index' ? 'border-b-2 border-[#8c7851] opacity-100' : 'opacity-40'}`}

                >

                  Roots

                </button>

                <button 

                  onClick={() => navigateTo('classes')} 

                  className={`text-[9px] sm:text-[10px] uppercase tracking-widest font-bold pb-1 transition-all whitespace-nowrap ${view === 'classes' ? 'border-b-2 border-[#8c7851] opacity-100' : 'opacity-40'}`}

                >

                  Classes

                </button>

              </nav>

            </div>

          )}

          <div className="flex gap-3 sm:gap-4 items-center flex-shrink-0">

            <button onClick={() => setShowStats(true)} className="hover:opacity-60"><PieChart size={18} /></button>

            <button onClick={() => setDarkMode(!darkMode)} className="hover:opacity-60">{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>

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

                    // result.hRoot already contains "null" string if it's the null root

                    const root = result.hRoot;

                    if (!acc[root]) acc[root] = { root, definitions: [], results: [] };

                    acc[root].definitions.push(result.Definition);

                    acc[root].results.push(result);

                    return acc;

                  }, {});

  

                  return Object.values(groups).map((group, idx) => {

                    const root = group.root;

                    const formCount = data.jsonByRoot[root]?.length || 0;

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

                              <span className={`text-xl font-bold ${root === 'null' ? 'italic opacity-60' : 'font-cherokee'}`}>{root}</span>

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

                      <span className={`text-lg font-bold ${item.root === 'null' ? 'italic opacity-60' : 'font-cherokee'} text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white transition-colors`}>

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

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-[#8c7851]/20 pb-4">

                <div className="flex gap-4 items-center">

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

                

                <button 

                  onClick={() => setShowGroupedClasses(!showGroupedClasses)}

                  className="flex items-center gap-2 text-xs font-bold border border-[#8c7851] px-3 py-1 rounded-full hover:bg-[#8c7851]/10 transition-colors"

                >

                  <div className={`w-2 h-2 rounded-full ${showGroupedClasses ? 'bg-[#8c7851]' : 'bg-transparent border border-[#8c7851]'}`} />

                  Group Subclasses

                </button>

              </div>

  

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {!showGroupedClasses ? classesIndex.map((item, idx) => (

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

                )) : groupedClassesIndex.map((group, idx) => (

                  <button 

                    key={idx}

                    onClick={() => handleSelectSuperclass(group)}

                    className="p-4 border border-[#8c7851]/20 hover:border-[#8c7851] transition-colors group text-left relative overflow-hidden"

                  >

                    <div className="flex justify-between items-start relative z-10">

                      <div>

                        <div className="text-lg font-mono tracking-tighter text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white">

                          {group.name}

                        </div>

                        <div className="text-[10px] uppercase tracking-widest font-bold opacity-40 mt-1">

                          {group.subclasses.length - (group.hasExactMatch ? 1 : 0)} Subclasses

                        </div>

                      </div>

                      <div className="text-[10px] uppercase tracking-widest font-bold opacity-30">

                        {group.totalVerbs} verbs

                      </div>

                    </div>

                    {/* Preview endings of the superclass if it exists, else the first subclass */}

                    {renderEndings(group.hasExactMatch ? group.name : group.subclasses[0].className)}

                  </button>

                ))}

              </div>

            </div>

          )}

  

          {view === 'superclass-detail' && currentSuperclass && (

            <div className="space-y-8">

              <div className="mb-8 border-l-4 border-[#8c7851] pl-6 py-1">

                <span className="opacity-40 text-[9px] uppercase tracking-[0.2em] font-bold block">Verb Superclass</span>

                <h1 className="text-2xl font-mono tracking-tighter text-[#5d4037] dark:text-[#b08e6e] mb-2">{currentSuperclass.name}</h1>

                <p className="opacity-50 italic text-xs">{currentSuperclass.totalVerbs} verbs across {currentSuperclass.subclasses.length} variations</p>

              </div>

  

              {/* Comparison Table */}

              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">

                <table className="w-full text-left text-[10px] sm:text-xs font-mono border-collapse">

                  <thead>

                    <tr className="border-b border-[#8c7851]/20">

                      <th className="py-2 px-1 sm:px-2 font-bold uppercase tracking-wider opacity-60 min-w-[100px] sm:min-w-[140px]">Variation</th>

                      <th className="py-2 px-1 sm:px-2 font-bold opacity-60">Pres</th>

                      <th className="py-2 px-1 sm:px-2 font-bold opacity-60">Impf</th>

                      <th className="py-2 px-1 sm:px-2 font-bold opacity-60">Perf</th>

                      <th className="py-2 px-1 sm:px-2 font-bold opacity-60">Impr</th>

                      <th className="py-2 px-1 sm:px-2 font-bold opacity-60">Inf</th>

                    </tr>

                  </thead>

                  <tbody>

                                        {(() => {

                                          const superInfo = data.classesExpanded[currentSuperclass.name];

                    

                                                                                      // Sort subclasses: parent first, then by variation type priority, then alpha

                    

                                                                                      const sortedSubclasses = [...currentSuperclass.subclasses].sort((a, b) => {

                    

                                                                                        if (a.className === currentSuperclass.name) return -1;

                    

                                                                                        if (b.className === currentSuperclass.name) return 1;

                    

                                                                

                    

                                                                                        const getVariationWeight = (name) => {

                    

                                                                                          const match = name.match(/\[(.*)\]/);

                    

                                                                                          if (!match) return 999;

                    

                                                                                          const v = match[1].toLowerCase();

                    

                                                                                          if (v.includes('pres')) return 1;

                    

                                                                                          if (v.includes('impf')) return 2;

                    

                                                                                          if (v.includes('perf')) return 3;

                    

                                                                                          if (v.includes('imp')) return 4; // Matches 'imp' or 'impr'

                    

                                                                                          if (v.includes('inf')) return 5;

                    

                                                                                          return 6;

                    

                                                                                        };

                    

                                                                

                    

                                                                                        const weightA = getVariationWeight(a.className);

                    

                                                                                        const weightB = getVariationWeight(b.className);

                    

                                                                

                    

                                                                                                                if (weightA !== weightB) return weightA - weightB;

                    

                                                                

                    

                                                                                                                

                    

                                                                

                    

                                                                                                                const cleanA = a.className.replace(/[\[\]]/g, '');

                    

                                                                

                    

                                                                                                                const cleanB = b.className.replace(/[\[\]]/g, '');

                    

                                                                

                    

                                                                                                                return cleanA.localeCompare(cleanB);

                    

                                                                

                    

                                                                                                              });

                    

                                          const rows = sortedSubclasses.map(sub => {

                                            const info = data.classesExpanded[sub.className];

                                            if (!info) return null;

                                            

                                            const isSuper = sub.className === currentSuperclass.name;

                                            const label = isSuper ? "Parent Class" : sub.className.replace(currentSuperclass.name, '');

                                            

                                            const checkDiff = (field) => {

                                               if (!superInfo) return info[field];

                                               if (isSuper) return info[field];

                                               return info[field] === superInfo[field] ? '' : info[field];

                                            };

                    

                                            return (

                                              <tr key={sub.className} 

                                                  onClick={() => handleSelectClass(sub.className)}

                                                  className="border-b border-[#8c7851]/10 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"

                                              >

                                                <td className={`py-3 px-1 sm:px-2 ${isSuper ? 'font-bold text-[#8c7851]' : 'opacity-80'}`}>{label}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{checkDiff('present')}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{checkDiff('imperfective')}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{checkDiff('perfective')}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{checkDiff('imperative')}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{checkDiff('infinitive')}</td>

                                              </tr>

                                            );

                                          });

                                          

                                          if (!currentSuperclass.hasExactMatch && superInfo) {

                                             rows.unshift(

                                              <tr key={currentSuperclass.name} 

                                                  onClick={() => handleSelectClass(currentSuperclass.name)}

                                                  className="border-b border-[#8c7851]/10 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors bg-[#8c7851]/5"

                                              >

                                                <td className="py-3 px-1 sm:px-2 font-bold text-[#8c7851]">Parent Class (Ref)</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{superInfo.present}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{superInfo.imperfective}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{superInfo.perfective}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{superInfo.imperative}</td>

                                                <td className="py-3 px-1 sm:px-2 text-[#5d4037] dark:text-[#b08e6e] font-bold whitespace-nowrap">{superInfo.infinitive}</td>

                                              </tr>

                                             );

                                          }

                                          

                                          return rows;

                                        })()}

                  </tbody>

                </table>

              </div>
            
            <div className="pt-4">
               <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-4">All Verbs</h3>
               <div className="divide-y divide-[#8c7851]/20">
                  {(() => {
                     // Aggregate all verbs
                     const allVerbs = currentSuperclass.subclasses.flatMap(sub => 
                        (data.jsonByClass[sub.className] || []).map(v => ({...v, subClassName: sub.className}))
                     ).sort((a, b) => a.definition.localeCompare(b.definition));
                     
                     return allVerbs.map((verb, idx) => {
                        const csv = findCsvForEntryNo(verb.entry_no);
                        const isSuper = verb.subClassName === currentSuperclass.name;
                        const subLabel = isSuper ? "Parent" : verb.subClassName.replace(currentSuperclass.name, '');

                        return (
                           <button 
                             key={idx}
                             onClick={() => handleSelectRoot(verb.h_grade_root)}
                             className="w-full py-4 text-left group hover:bg-black/5 dark:hover:bg-white/5 px-2 transition-colors flex justify-between items-baseline"
                           >
                             <div className="flex-1 pr-4">
                               <div className="font-bold text-[#5d4037] dark:text-[#b08e6e] group-hover:text-black dark:group-hover:text-white">
                                 {verb.definition}
                               </div>
                               <div className="text-xs italic opacity-40 mt-1">
                                 {csv?.Syllabary || '---'} ({csv?.Entry || '---'})
                               </div>
                             </div>
                             <div className="text-right">
                                <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${isSuper ? 'bg-[#8c7851] text-[#f4ece1]' : 'bg-[#8c7851]/20 text-[#8c7851]'}`}>
                                   {subLabel}
                                </span>
                             </div>
                           </button>
                        );
                     });
                  })()}
               </div>
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
                    <h1 className={`text-2xl font-bold ${currentRoot.h === 'null' ? 'italic opacity-60' : 'font-cherokee'} text-[#5d4037] dark:text-[#b08e6e]`}>{currentRoot.h}</h1>
                  </div>
                  <div>
                    <span className="opacity-40 text-[9px] uppercase tracking-[0.2em] font-bold block">Glottal Root</span>
                    <h1 className={`text-2xl font-bold ${currentRoot.g === 'null' ? 'italic opacity-60' : 'font-cherokee'} text-[#5d4037] dark:text-[#b08e6e]`}>{currentRoot.g}</h1>
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

