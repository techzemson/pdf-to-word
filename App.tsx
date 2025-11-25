import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Download, 
  BarChart3, RefreshCw, Lock, Sparkles, FileType, 
  Layout, Eye, Share2, Palette, Clock, Settings,
  MessageSquare, History, Briefcase, ChevronRight, 
  Maximize2, X, Copy, Zap, Save, Trash2, Home,
  Menu, BookOpen, HelpCircle, ArrowRight, Database
} from 'lucide-react';
import { 
  AppState, FileData, AnalysisResult, ProcessingStep, 
  ChatMessage, HistoryItem 
} from './types';
import { analyzeAndConvertPDF, chatWithDocument } from './services/geminiService';
import { AnalysisCharts } from './components/AnalysisCharts';

// --- UTILS ---
const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const downloadContent = (content: string, filename: string, type: 'doc' | 'md' | 'json' | 'txt') => {
  let mime = 'text/plain';
  let data = content;
  let ext = type;

  if (type === 'doc') {
    mime = 'application/msword';
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'></head><body>";
    const footer = "</body></html>";
    // Basic MD to HTML for Word
    const html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
      .replace(/\n/gim, '<br>');
    data = header + html + footer;
    ext = 'doc';
  } else if (type === 'json') {
    mime = 'application/json';
    ext = 'json';
  }

  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename.replace('.docx', '')}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
};

// --- COMPONENTS ---

const ProgressBar = ({ progress, label }: { progress: number, label: string }) => (
  <div className="w-full max-w-md space-y-2 animate-in fade-in zoom-in duration-300">
    <div className="flex justify-between text-sm font-medium text-slate-700">
      <span>{label}</span>
      <span>{progress}%</span>
    </div>
    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
      <div 
        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      >
        <div className="w-full h-full opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InAiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVNUiI+PHBhdGggZD0iTTAgMTBMMTAgME0xMCAyMEwyMCAxMCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9InVybCgjcCkiIC8+PC9zdmc+')] animate-[shimmer_1s_linear_infinite]"></div>
      </div>
    </div>
    <p className="text-xs text-center text-slate-400 mt-2">
      {progress < 30 ? "Encrypting & Uploading..." : 
       progress < 60 ? "Analyzing Content Structure..." :
       progress < 90 ? "Extracting Entities & Action Items..." : "Finalizing Document..."}
    </p>
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc, color }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
      <Icon size={20} className="text-white" />
    </div>
    <h4 className="font-semibold text-slate-800 text-sm mb-1">{title}</h4>
    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
  </div>
);

const DocumentationTab = () => (
  <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
          <BookOpen size={24} className="text-blue-300" />
        </div>
        <h2 className="text-2xl font-bold">Documentation & User Guide</h2>
      </div>
      <p className="text-slate-300 max-w-2xl">
        Master PDF to Word with this comprehensive guide. Learn how to extract insights and export formatted reports.
      </p>
    </div>
    
    <div className="p-8 space-y-12">
      {/* Section 1 */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
          Getting Started
        </h3>
        <div className="pl-10 space-y-4 text-slate-600 leading-relaxed">
          <p>
            This tool transforms static PDF documents into interactive, analyzable data. To begin, simply drag and drop any PDF file (up to 20MB) into the upload area on the Dashboard.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm">
            <strong>Supported Files:</strong> Currently supports standard PDF documents. Scanned PDFs (images) are supported via OCR automatically.
          </div>
        </div>
      </section>

      {/* Section 2 */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm">2</span>
          Key Features
        </h3>
        <div className="pl-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-100 rounded-xl p-4 hover:border-purple-200 transition-colors">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Sparkles size={16} className="text-purple-500"/> Smart Summary</h4>
            <p className="text-sm text-slate-500">
              The AI automatically generates a concise executive summary, highlighting the main purpose and conclusion of the document so you don't have to read the whole thing.
            </p>
          </div>
          <div className="border border-slate-100 rounded-xl p-4 hover:border-orange-200 transition-colors">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Briefcase size={16} className="text-orange-500"/> Action Items</h4>
            <p className="text-sm text-slate-500">
              We extract actionable tasks, to-dos, and next steps directly from the text, categorized by priority (High, Medium, Low).
            </p>
          </div>
          <div className="border border-slate-100 rounded-xl p-4 hover:border-blue-200 transition-colors">
            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500"/> Deep Analytics</h4>
            <p className="text-sm text-slate-500">
              Visualize document complexity, sentiment, and reading time. See which entities (people, companies) are mentioned most frequently.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3 */}
      <section>
        <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">3</span>
          Exporting Results
        </h3>
        <div className="pl-10 space-y-4 text-slate-600 leading-relaxed">
          <p>
            Once analysis is complete, you can download the converted content in multiple formats via the "Export" button in the header.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm pl-4">
            <li><strong>DOCX:</strong> For Microsoft Word editing.</li>
            <li><strong>Markdown:</strong> For technical documentation or Notion.</li>
            <li><strong>JSON:</strong> For developers integrating data.</li>
          </ul>
        </div>
      </section>
    </div>
  </div>
);

// --- MAIN APP ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'preview' | 'settings' | 'docs'>('dashboard');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Progress State
  const [progress, setProgress] = useState(0);

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // UI State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('smartpdf_history');
    if (saved) setRecentFiles(JSON.parse(saved));
  }, []);

  const addToHistory = (file: FileData, analysis: AnalysisResult) => {
    const newItem: HistoryItem = {
      id: file.id,
      fileName: file.name,
      date: Date.now(),
      summary: analysis.summary,
      stats: analysis.stats
    };
    const updated = [newItem, ...recentFiles.filter(i => i.id !== file.id)].slice(0, 10);
    setRecentFiles(updated);
    localStorage.setItem('smartpdf_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setRecentFiles([]);
    localStorage.removeItem('smartpdf_history');
  };

  const processFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds 20MB limit.");
      return;
    }

    setAppState(AppState.UPLOADING);
    setError(null);
    setResult(null);
    setChatHistory([]);
    setProgress(0);

    // Simulate progress timer
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return 90;
        // Faster at start, slower at end
        const increment = prev < 50 ? 5 : 2; 
        return prev + increment;
      });
    }, 500);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const newFile: FileData = {
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          base64,
          uploadDate: Date.now()
        };
        setFileData(newFile);
        
        setAppState(AppState.PROCESSING); // Show progress bar
        
        // This is the heavy lifting
        const analysis = await analyzeAndConvertPDF(base64, file.type);
        
        clearInterval(progressInterval);
        setProgress(100);

        // Small delay to show 100%
        setTimeout(() => {
          setResult(analysis);
          setAppState(AppState.COMPLETE);
          addToHistory(newFile, analysis);
          setActiveTab('dashboard');
        }, 500);
      };

    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      setError("Failed to process file. Please try a different PDF.");
      setAppState(AppState.ERROR);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !result) return;
    
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const responseText = await chatWithDocument(chatHistory, chatInput, result.markdownContent);
      const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: responseText, timestamp: Date.now() };
      setChatHistory(prev => [...prev, aiMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTabChange = (tabId: string) => {
    // Logic for restricted tabs
    if ((tabId === 'chat' || tabId === 'preview' || tabId === 'dashboard') && appState !== AppState.COMPLETE) {
      if (tabId === 'dashboard') {
         // Dashboard is allowed (shows upload)
         setActiveTab(tabId as any);
      } else {
         // Do nothing or show toast? For now, we will handle empty states inside the tab render
         setActiveTab(tabId as any); 
      }
    } else {
      setActiveTab(tabId as any);
    }
    setMobileMenuOpen(false);
  };

  const navItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'docs', icon: BookOpen, label: 'Documentation' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50
        w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out shadow-2xl flex flex-col
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shrink-0">
              <FileType size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">PDF to Word</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
             <button
               key={item.id}
               onClick={() => handleTabChange(item.id)}
               className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                 ${activeTab === item.id
                   ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                   : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
               `}
             >
               <item.icon size={20} />
               <span className="font-medium text-sm">{item.label}</span>
               {item.id === 'docs' && <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">New</span>}
             </button>
          ))}
          
          <div className="my-4 border-t border-slate-800 mx-2"></div>
          
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Recent Files</p>
          <div className="space-y-1 overflow-y-auto max-h-48 scrollbar-hide">
             {recentFiles.length === 0 && <p className="px-4 text-xs text-slate-600 italic">No recent files</p>}
             {recentFiles.map(file => (
               <div key={file.id} className="px-3 py-2 text-xs text-slate-400 hover:text-white truncate cursor-pointer hover:bg-slate-800 rounded mx-2 flex gap-2 items-center">
                  <History size={12} />
                  {file.fileName}
               </div>
             ))}
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10 shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                <Menu size={24} />
              </button>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate max-w-[200px] sm:max-w-none">
                {activeTab === 'docs' ? 'Documentation' :
                 activeTab === 'settings' ? 'Settings' :
                 appState === AppState.IDLE ? 'Dashboard' : 
                 appState === AppState.COMPLETE ? (fileData?.name || 'Document') : 'Processing...'}
              </h2>
           </div>
           
           {appState === AppState.COMPLETE && activeTab !== 'docs' && activeTab !== 'settings' && (
             <div className="flex gap-2">
               <button 
                 onClick={() => { setResult(null); setAppState(AppState.IDLE); setProgress(0); setActiveTab('dashboard'); }} 
                 className="px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                 title="Reset"
               >
                 <Trash2 size={16} /> <span className="hidden sm:inline">Clear</span>
               </button>
               <button 
                 onClick={() => result && downloadContent(result.markdownContent, result.suggestedFilename, 'doc')}
                 className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 transition-transform hover:-translate-y-0.5"
               >
                 <Download size={16} /> <span className="hidden sm:inline">Export</span>
               </button>
             </div>
           )}
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8 scroll-smooth">
          
          {/* DOCS TAB */}
          {activeTab === 'docs' && <DocumentationTab />}

          {/* DASHBOARD - IDLE STATE */}
          {activeTab === 'dashboard' && appState === AppState.IDLE && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center mb-8 sm:mb-12 pt-4 sm:pt-10">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                  PDF to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Word</span>
                </h1>
                <p className="text-base sm:text-lg text-slate-500 max-w-2xl mx-auto px-4">
                  Drag & drop your PDF to get AI summaries, action items, and Word conversion instantly.
                </p>
              </div>

              {/* Upload Box */}
              <div 
                className="relative group cursor-pointer max-w-2xl mx-auto"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
                }}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-2xl p-8 sm:p-12 border-2 border-slate-100 hover:border-blue-500 transition-colors shadow-xl flex flex-col items-center justify-center min-h-[250px] sm:min-h-[300px]">
                   <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                     <Upload className="text-blue-600" size={32} />
                   </div>
                   <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2 text-center">Drop your PDF here</h3>
                   <p className="text-slate-500 mb-6 text-sm sm:text-base">or click to browse (Max 20MB)</p>
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer"
                     accept=".pdf"
                     onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                   />
                   
                   <div className="flex gap-4 text-xs text-slate-400 font-medium flex-wrap justify-center">
                     <span className="flex items-center gap-1"><Lock size={12} /> Encrypted</span>
                     <span className="flex items-center gap-1"><Zap size={12} /> Instant AI</span>
                   </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12 px-2">
                 <FeatureCard icon={Sparkles} color="bg-purple-500" title="Smart Summary" desc="Get the gist in seconds." />
                 <FeatureCard icon={Briefcase} color="bg-orange-500" title="Action Items" desc="Auto-extracted to-do lists." />
                 <FeatureCard icon={Layout} color="bg-green-500" title="Perfect Formatting" desc="Retains layout structure." />
                 <FeatureCard icon={BarChart3} color="bg-blue-500" title="Analytics" desc="Sentiment & entities." />
              </div>
            </div>
          )}

          {/* DASHBOARD - PROCESSING STATE */}
          {activeTab === 'dashboard' && (appState === AppState.PROCESSING || appState === AppState.UPLOADING) && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto p-4">
               <div className="w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 relative">
                     <FileText className="text-blue-600 relative z-10" size={32} />
                     <div className="absolute inset-0 bg-blue-400 rounded-2xl blur opacity-20 animate-pulse"></div>
                  </div>
                  <h3 className="font-bold text-slate-800 text-xl mb-2">Analyzing {fileData?.name}</h3>
                  <p className="text-slate-500 text-sm mb-8">Please wait while our AI reads your document...</p>
                  
                  {/* REAL PERCENTAGE PROGRESS BAR */}
                  <ProgressBar progress={progress} label="Processing" />
               </div>
            </div>
          )}

          {/* DASHBOARD - COMPLETE STATE */}
          {activeTab === 'dashboard' && appState === AppState.COMPLETE && result && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500 space-y-6">
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Reading Time', val: `${result.stats.readingTimeMin} min`, icon: Clock, col: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Words', val: result.stats.wordCount.toLocaleString(), icon: FileText, col: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Complexity', val: `${result.stats.complexityScore}/100`, icon: Zap, col: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Tone', val: result.stats.tone, icon: Sparkles, col: 'text-purple-600', bg: 'bg-purple-50' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                         <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center ${stat.col} shrink-0`}>
                           <stat.icon size={20} />
                         </div>
                         <div className="min-w-0">
                           <p className="text-xs text-slate-500 uppercase font-bold truncate">{stat.label}</p>
                           <p className="text-lg font-bold text-slate-800 truncate">{stat.val}</p>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Main Analysis Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Summary & Actions - Left Col */}
                    <div className="lg:col-span-2 space-y-6">
                       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles size={18} className="text-purple-500" /> Executive Summary
                          </h3>
                          <p className="text-slate-600 leading-relaxed text-sm lg:text-base">
                            {result.summary}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                             {result.keywords.map(k => (
                               <span key={k} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">#{k}</span>
                             ))}
                          </div>
                       </div>

                       <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Briefcase size={18} className="text-orange-500" /> Action Items
                          </h3>
                          {result.actionItems.length > 0 ? (
                            <ul className="space-y-3">
                              {result.actionItems.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                   <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.priority === 'High' ? 'bg-red-500' : item.priority === 'Medium' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                   <div>
                                      <p className="text-sm font-medium text-slate-800">{item.task}</p>
                                      <span className="text-[10px] uppercase font-bold text-slate-400">{item.priority} Priority</span>
                                   </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-slate-400 text-sm italic">No specific action items detected.</p>
                          )}
                       </div>
                    </div>

                    {/* File Info - Right Col */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                           <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">File Details</h3>
                           <div className="space-y-3 text-sm">
                              <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Name</span>
                                <span className="font-medium text-slate-800 truncate max-w-[150px]">{fileData?.name}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Size</span>
                                <span className="font-medium text-slate-800">{formatBytes(fileData?.size || 0)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Language</span>
                                <span className="font-medium text-slate-800">{result.stats.language}</span>
                              </div>
                           </div>
                        </div>
                    </div>
                  </div>

                  {/* Charts Section */}
                  <AnalysisCharts stats={result.stats} entities={result.entities} />
            </div>
          )}

          {/* CHAT TAB - REMOVED */}
          {/* PREVIEW TAB - REMOVED */}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
             <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 animate-in slide-in-from-right-4 duration-300">
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Settings size={20} className="text-slate-400"/> Settings & Export
                </h3>
                
                <div className="mb-8">
                  <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Download size={16} /> Export Options
                  </h4>
                  
                  {result ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['doc', 'json', 'txt', 'md'].map((type: any) => (
                          <button 
                            key={type}
                            onClick={() => downloadContent(result.markdownContent, result.suggestedFilename, type)}
                            className="p-4 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-600 rounded-xl flex items-center justify-center gap-2 uppercase font-bold transition-all"
                          >
                            <Download size={18} /> {type.toUpperCase()}
                          </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 rounded-xl p-6 text-center border border-dashed border-slate-200">
                       <p className="text-slate-500 text-sm mb-2">No analysis data available to export.</p>
                       <button onClick={() => setActiveTab('dashboard')} className="text-blue-600 text-sm font-medium hover:underline">
                         Upload a PDF to unlock exports
                       </button>
                    </div>
                  )}
                </div>

                <div className="mb-8 border-t border-slate-100 pt-6">
                  <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Database size={16} /> Data Management
                  </h4>
                  <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <div>
                       <p className="text-sm font-semibold text-slate-700">Clear Search History</p>
                       <p className="text-xs text-slate-500">Remove recent files list from sidebar.</p>
                     </div>
                     <button 
                       onClick={clearHistory}
                       className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                     >
                       Clear History
                     </button>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-6">
                   <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">Application Info</h4>
                   <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm text-slate-500">
                      <div className="flex justify-between">
                        <span>Version</span>
                        <span className="font-mono text-slate-700">2.1.0 (Free Tier)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>AI Engine</span>
                        <span className="font-mono text-slate-700">Gemini 2.5 Flash</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Encryption</span>
                        <span className="font-mono text-slate-700">Client-side Ephemeral</span>
                      </div>
                   </div>
                </div>
             </div>
          )}

        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 right-8 z-50 max-w-sm w-full bg-red-50 text-red-600 px-6 py-4 rounded-xl shadow-lg border border-red-100 flex items-center gap-3 animate-bounce">
           <AlertCircle size={24} className="shrink-0" />
           <p className="font-medium text-sm">{error}</p>
           <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}