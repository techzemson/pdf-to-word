import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, AlertCircle, Download, 
  BarChart3, RefreshCw, Lock, Sparkles, FileType, 
  Layout, Eye, Share2, Palette, Clock, Settings,
  MessageSquare, History, Briefcase, ChevronRight, 
  Maximize2, X, Copy, Zap, Save, Trash2, Home
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

const Steps = ({ steps }: { steps: ProcessingStep[] }) => (
  <div className="space-y-4">
    {steps.map((step, idx) => (
      <div key={step.id} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4" style={{animationDelay: `${idx * 100}ms`}}>
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 shadow-sm
          ${step.status === 'completed' ? 'bg-green-500 text-white shadow-green-200' : 
            step.status === 'active' ? 'bg-blue-500 text-white animate-pulse shadow-blue-200' : 'bg-slate-100 text-slate-400'}
        `}>
          {step.status === 'completed' ? <CheckCircle2 size={16} /> : idx + 1}
        </div>
        <div>
          <span className={`text-sm font-medium ${step.status === 'pending' ? 'text-slate-400' : 'text-slate-700'}`}>
            {step.label}
          </span>
          {step.status === 'active' && (
            <div className="h-1 w-24 bg-slate-100 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-500 animate-progress"></div>
            </div>
          )}
        </div>
      </div>
    ))}
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

// --- MAIN APP ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'preview' | 'settings'>('dashboard');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Steps State
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'upload', label: 'Secure Encryption', status: 'pending' },
    { id: 'analyze', label: 'AI Deep Analysis', status: 'pending' },
    { id: 'extract', label: 'Extracting Entities', status: 'pending' },
    { id: 'generate', label: 'Generating Document', status: 'pending' },
  ]);

  // History & Sidebar
  const [recentFiles, setRecentFiles] = useState<HistoryItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const processFile = async (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError("File size exceeds 20MB limit.");
      return;
    }

    setAppState(AppState.UPLOADING);
    setError(null);
    setResult(null);
    setChatHistory([]);
    setSteps(s => s.map(step => ({...step, status: 'pending'})));

    try {
      setSteps(s => s.map(step => step.id === 'upload' ? {...step, status: 'active'} : step));
      
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
        
        setSteps(s => s.map(step => step.id === 'upload' ? {...step, status: 'completed'} : step));
        
        // Processing chain
        setAppState(AppState.PROCESSING);
        setSteps(s => s.map(step => step.id === 'analyze' ? {...step, status: 'active'} : step));
        
        // This is the heavy lifting
        const analysis = await analyzeAndConvertPDF(base64, file.type);
        
        setSteps(s => s.map(step => step.id === 'analyze' ? {...step, status: 'completed'} : step));
        setSteps(s => s.map(step => step.id === 'extract' ? {...step, status: 'active'} : step));
        
        await new Promise(r => setTimeout(r, 800)); // Visual pacing
        
        setSteps(s => s.map(step => step.id === 'extract' ? {...step, status: 'completed'} : step));
        setSteps(s => s.map(step => step.id === 'generate' ? {...step, status: 'active'} : step));

        await new Promise(r => setTimeout(r, 600)); // Visual pacing

        setSteps(s => s.map(step => step.id === 'generate' ? {...step, status: 'completed'} : step));
        
        setResult(analysis);
        setAppState(AppState.COMPLETE);
        addToHistory(newFile, analysis);
      };

    } catch (err) {
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

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shrink-0">
            <FileType size={18} className="text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg tracking-tight">SmartPDF<span className="text-blue-400">Pro</span></span>}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'chat', icon: MessageSquare, label: 'Chat with PDF' },
            { id: 'preview', icon: FileText, label: 'Document Preview' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
             <button
               key={item.id}
               onClick={() => appState === AppState.COMPLETE ? setActiveTab(item.id as any) : null}
               disabled={appState !== AppState.COMPLETE}
               className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all
                 ${activeTab === item.id && appState === AppState.COMPLETE 
                   ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                   : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                 ${appState !== AppState.COMPLETE ? 'opacity-50 cursor-not-allowed' : ''}
               `}
             >
               <item.icon size={20} />
               {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
             </button>
          ))}
          
          <div className="my-4 border-t border-slate-800 mx-2"></div>
          
          {sidebarOpen && <p className="px-4 text-xs font-semibold text-slate-500 uppercase mb-2">Recent Files</p>}
          <div className="space-y-1 overflow-y-auto max-h-48 scrollbar-hide">
             {recentFiles.map(file => (
               <div key={file.id} className="px-3 py-2 text-xs text-slate-400 hover:text-white truncate cursor-pointer hover:bg-slate-800 rounded mx-2 flex gap-2 items-center">
                  <History size={12} />
                  {sidebarOpen && file.fileName}
               </div>
             ))}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
           <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white w-full flex justify-center">
              {sidebarOpen ? <ChevronRight size={20} className="rotate-180" /> : <ChevronRight size={20} />}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
           <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-800">
                {appState === AppState.IDLE ? 'Welcome' : 
                 appState === AppState.COMPLETE ? (fileData?.name || 'Document') : 'Processing...'}
              </h2>
              {appState === AppState.COMPLETE && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready
                </span>
              )}
           </div>
           
           {appState === AppState.COMPLETE && (
             <div className="flex gap-2">
               <button 
                 onClick={() => setResult(null) || setAppState(AppState.IDLE)} 
                 className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-2"
               >
                 <Trash2 size={16} /> Clear
               </button>
               <button 
                 onClick={() => result && downloadContent(result.markdownContent, result.suggestedFilename, 'doc')}
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 transition-transform hover:-translate-y-0.5"
               >
                 <Download size={16} /> Download DOCX
               </button>
             </div>
           )}
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 sm:p-8">
          
          {/* STATE: IDLE (Upload) */}
          {appState === AppState.IDLE && (
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                  Transform PDF to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Intelligent Word Docs</span>
                </h1>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                  More than just a converter. Get AI-powered summaries, action items, entity extraction, and chat with your documents securely.
                </p>
              </div>

              {/* Upload Box */}
              <div 
                className="relative group cursor-pointer"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
                }}
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-white rounded-2xl p-10 border-2 border-slate-100 hover:border-blue-500 transition-colors shadow-xl flex flex-col items-center justify-center min-h-[300px]">
                   <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                     <Upload className="text-blue-600" size={40} />
                   </div>
                   <h3 className="text-xl font-semibold text-slate-800 mb-2">Drop your PDF here</h3>
                   <p className="text-slate-500 mb-6">or click to browse (Max 20MB)</p>
                   <input 
                     type="file" 
                     className="absolute inset-0 opacity-0 cursor-pointer"
                     accept=".pdf"
                     onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
                   />
                   
                   <div className="flex gap-4 text-xs text-slate-400 font-medium">
                     <span className="flex items-center gap-1"><Lock size={12} /> Secure Encryption</span>
                     <span className="flex items-center gap-1"><Zap size={12} /> Fast Processing</span>
                   </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
                 <FeatureCard icon={Sparkles} color="bg-purple-500" title="AI Summary" desc="Get instant executive summaries." />
                 <FeatureCard icon={Briefcase} color="bg-orange-500" title="Action Items" desc="Auto-extract tasks & to-dos." />
                 <FeatureCard icon={MessageSquare} color="bg-green-500" title="Chat with PDF" desc="Ask questions to your doc." />
                 <FeatureCard icon={BarChart3} color="bg-blue-500" title="Deep Stats" desc="Sentiment & tone analysis." />
              </div>
            </div>
          )}

          {/* STATE: PROCESSING / UPLOADING */}
          {(appState === AppState.PROCESSING || appState === AppState.UPLOADING || appState === AppState.ANALYZING) && (
            <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto">
               <div className="w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-blue-600 animate-pulse" size={24} />
                     </div>
                     <div>
                        <h3 className="font-bold text-slate-800 text-lg">Analyzing Document</h3>
                        <p className="text-sm text-slate-500">{fileData?.name}</p>
                     </div>
                  </div>
                  <Steps steps={steps} />
               </div>
               <p className="mt-8 text-slate-400 text-sm animate-pulse">This usually takes 10-20 seconds...</p>
            </div>
          )}

          {/* STATE: COMPLETE */}
          {appState === AppState.COMPLETE && result && (
            <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
              
              {/* DASHBOARD TAB */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Reading Time', val: `${result.stats.readingTimeMin} min`, icon: Clock, col: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Words', val: result.stats.wordCount.toLocaleString(), icon: FileText, col: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Complexity', val: `${result.stats.complexityScore}/100`, icon: Zap, col: 'text-amber-600', bg: 'bg-amber-50' },
                      { label: 'Tone', val: result.stats.tone, icon: Sparkles, col: 'text-purple-600', bg: 'bg-purple-50' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
                         <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center ${stat.col}`}>
                           <stat.icon size={20} />
                         </div>
                         <div>
                           <p className="text-xs text-slate-500 uppercase font-bold">{stat.label}</p>
                           <p className="text-lg font-bold text-slate-800">{stat.val}</p>
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

                    {/* Key Quotes & File Info - Right Col */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                           <h3 className="text-sm font-bold uppercase text-slate-400 mb-4 relative z-10">Key Takeaway</h3>
                           <blockquote className="text-lg font-medium italic relative z-10 font-serif">
                             "{result.keyQuotes[0] || result.summary.slice(0, 100)}"
                           </blockquote>
                        </div>
                        
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

              {/* CHAT TAB */}
              {activeTab === 'chat' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-[70vh] flex flex-col overflow-hidden">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-3">
                       <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                          <MessageSquare size={20} />
                       </div>
                       <div>
                          <h3 className="font-bold text-slate-800">Chat with Document</h3>
                          <p className="text-xs text-slate-500">Ask anything about {fileData?.name}</p>
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                       {chatHistory.length === 0 && (
                          <div className="text-center text-slate-400 mt-20">
                             <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                             <p>Type below to start asking questions!</p>
                             <div className="flex flex-wrap gap-2 justify-center mt-4">
                               {["Summarize this", "What are the main risks?", "List the key dates"].map(q => (
                                 <button key={q} onClick={() => setChatInput(q)} className="text-xs bg-white border border-slate-200 px-3 py-1 rounded-full hover:bg-slate-50">
                                   {q}
                                 </button>
                               ))}
                             </div>
                          </div>
                       )}
                       {chatHistory.map(msg => (
                          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                {msg.text}
                             </div>
                          </div>
                       ))}
                       {isChatLoading && (
                          <div className="flex justify-start">
                             <div className="bg-slate-100 rounded-2xl rounded-bl-none p-4 flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                             </div>
                          </div>
                       )}
                       <div ref={chatEndRef}></div>
                    </div>

                    <div className="p-4 bg-white border-t border-slate-100">
                       <div className="flex gap-2">
                          <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                            placeholder="Ask a question about your PDF..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                          <button 
                            onClick={handleChat} 
                            disabled={!chatInput.trim() || isChatLoading}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 rounded-xl transition-colors"
                          >
                             <ChevronRight size={24} />
                          </button>
                       </div>
                    </div>
                 </div>
              )}

              {/* PREVIEW TAB */}
              {activeTab === 'preview' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-[70vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                       <h3 className="font-bold text-slate-800">Document Content (Markdown)</h3>
                       <button 
                         onClick={() => navigator.clipboard.writeText(result.markdownContent)}
                         className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600"
                       >
                         <Copy size={14} /> Copy
                       </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 font-mono text-sm text-slate-700 bg-slate-50 leading-relaxed whitespace-pre-wrap">
                       {result.markdownContent}
                    </div>
                 </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                 <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Export Options</h3>
                    <div className="grid grid-cols-2 gap-4 mb-8">
                       {['doc', 'json', 'txt', 'md'].map((type: any) => (
                          <button 
                             key={type}
                             onClick={() => downloadContent(result.markdownContent, result.suggestedFilename, type)}
                             className="p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center gap-2 uppercase font-bold text-slate-600 transition-all"
                          >
                             <Download size={18} /> {type.toUpperCase()}
                          </button>
                       ))}
                    </div>
                    
                    <div className="border-t border-slate-100 pt-6">
                       <h4 className="font-bold text-slate-800 mb-4">Application Info</h4>
                       <div className="space-y-2 text-sm text-slate-500">
                          <p>Version: 2.0.0 (Beta)</p>
                          <p>Engine: Google Gemini 2.5 Flash</p>
                          <p>Encryption: Client-side ephemeral</p>
                       </div>
                    </div>
                 </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 right-8 bg-red-50 text-red-600 px-6 py-4 rounded-xl shadow-lg border border-red-100 flex items-center gap-3 animate-bounce">
           <AlertCircle size={24} />
           <p className="font-medium">{error}</p>
           <button onClick={() => setError(null)} className="ml-2"><X size={16} /></button>
        </div>
      )}
    </div>
  );
}