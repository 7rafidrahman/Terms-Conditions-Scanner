import React, { useState, useRef, useCallback } from 'react';
import type { ImageFile, SummaryReport } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { generateSummaryFromImages } from './services/geminiService';
import CameraCapture from './components/CameraCapture';
import ChatAssistant from './components/ChatAssistant';
import { ArrowLeftIcon, BookOpenIcon, CameraIcon, SaveIcon, SparklesIcon, UploadIcon, XCircleIcon } from './components/icons';

type View = 'scanner' | 'saved' | 'summaryDetail';

const App: React.FC = () => {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [summary, setSummary] = useState<SummaryReport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [view, setView] = useState<View>('scanner');
    const [activeSummary, setActiveSummary] = useState<SummaryReport | null>(null);
    const [savedSummaries, setSavedSummaries] = useLocalStorage<SummaryReport[]>('savedSummaries', []);
    const [summaryTitle, setSummaryTitle] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            // FIX: Explicitly type `files` as an array of `File` objects to fix type inference issues in the forEach loop.
            const files: File[] = Array.from(event.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        const newImage: ImageFile = {
                            id: `${file.name}-${Date.now()}`,
                            name: file.name,
                            dataUrl: e.target.result as string,
                        };
                        setImages(prev => [...prev, newImage]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleCameraCapture = (dataUrl: string) => {
        const newImage: ImageFile = {
            id: `capture-${Date.now()}`,
            name: `Capture ${images.length + 1}.png`,
            dataUrl,
        };
        setImages(prev => [...prev, newImage]);
        setIsCameraOpen(false);
    };

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const handleSummarize = async () => {
        if (images.length === 0) return;
        setIsLoading(true);
        setError(null);
        setSummary(null);
        try {
            const result = await generateSummaryFromImages(images);
            const newSummary: SummaryReport = {
                id: `summary-${Date.now()}`,
                title: `Summary ${new Date().toLocaleString()}`,
                timestamp: new Date().toISOString(),
                ...result,
            };
            setSummary(newSummary);
            setSummaryTitle(newSummary.title);
        // FIX: Improved error handling to be more type-safe.
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message || "An unknown error occurred.");
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const saveSummary = () => {
        if (summary) {
            const isSaved = savedSummaries.some(s => s.id === summary.id);
            if (!isSaved) {
                const summaryToSave = { ...summary, title: summaryTitle || summary.title };
                setSavedSummaries([summaryToSave, ...savedSummaries]);
                alert('Summary saved!');
            } else {
                 alert('Summary is already saved.');
            }
        }
    };

    const deleteSummary = (id: string) => {
        if(window.confirm('Are you sure you want to delete this summary?')) {
            setSavedSummaries(savedSummaries.filter(s => s.id !== id));
            if(activeSummary?.id === id) {
                setView('saved');
                setActiveSummary(null);
            }
        }
    }
    
    const showSummaryDetail = (summaryToShow: SummaryReport) => {
        setActiveSummary(summaryToShow);
        setView('summaryDetail');
    }

    const resetScanner = () => {
        setImages([]);
        setSummary(null);
        setError(null);
        setIsLoading(false);
        setSummaryTitle('');
    };

    const renderScanner = () => (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
            <div className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-teal-300">
                    T&C Summarizer
                </h1>
                <p className="mt-2 text-slate-400">Scan terms and conditions to get a simple summary.</p>
            </div>

            <div className="bg-slate-800 rounded-xl shadow-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <button
                        onClick={() => setIsCameraOpen(true)}
                        className="flex flex-col items-center justify-center p-6 bg-slate-700 rounded-lg hover:bg-sky-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <CameraIcon className="w-12 h-12 text-sky-300 mb-2" />
                        <span className="font-semibold">Use Camera</span>
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center justify-center p-6 bg-slate-700 rounded-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-105"
                    >
                        <UploadIcon className="w-12 h-12 text-teal-300 mb-2" />
                        <span className="font-semibold">Upload Images</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        multiple
                        accept="image/*"
                        className="hidden"
                    />
                </div>
                
                {images.length > 0 && (
                    <div className="mb-6">
                        <h3 className="font-bold text-lg mb-2 text-slate-300">Selected Images:</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {images.map(img => (
                                <div key={img.id} className="relative group">
                                    <img src={img.dataUrl} alt={img.name} className="rounded-md w-full h-24 object-cover" />
                                    <button onClick={() => removeImage(img.id)} className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full text-white p-1 hover:bg-opacity-75 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <XCircleIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        onClick={handleSummarize}
                        disabled={images.length === 0 || isLoading}
                        className="flex items-center justify-center w-full md:w-auto px-8 py-4 bg-gradient-to-r from-sky-500 to-teal-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <SparklesIcon className="w-6 h-6 mr-2" />
                        {isLoading ? 'Analyzing...' : 'Summarize'}
                    </button>
                </div>
            </div>

            {isLoading && (
                 <div className="mt-8 text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
                    <p className="mt-4 text-slate-400">AI is reading the fine print... this may take a moment.</p>
                </div>
            )}
            {error && <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">{error}</div>}
            
            {summary && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <input 
                            type="text" 
                            value={summaryTitle} 
                            onChange={(e) => setSummaryTitle(e.target.value)}
                            className="text-2xl font-bold bg-transparent border-b-2 border-slate-700 focus:border-sky-500 outline-none w-full mr-4"
                        />
                        <button onClick={saveSummary} className="flex items-center px-4 py-2 bg-slate-700 hover:bg-sky-700 rounded-lg transition-colors text-sky-300">
                            <SaveIcon className="w-5 h-5 mr-2" />
                            Save
                        </button>
                    </div>
                    <SummaryDisplay summary={summary} />
                    <ChatAssistant documentContext={summary.full_text} />
                    <div className="text-center mt-6">
                        <button onClick={resetScanner} className="text-sky-400 hover:text-sky-300 font-semibold">Start New Scan</button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderSaved = () => (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
            <h1 className="text-4xl font-bold text-center mb-8 text-sky-300">Saved Summaries</h1>
            {savedSummaries.length === 0 ? (
                <p className="text-center text-slate-400">You have no saved summaries.</p>
            ) : (
                <div className="space-y-4">
                    {savedSummaries.map(s => (
                         <div key={s.id} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center shadow-lg">
                             <div>
                                <h3 className="font-bold text-lg text-white">{s.title}</h3>
                                <p className="text-sm text-slate-400">{new Date(s.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="flex space-x-2">
                                <button onClick={() => showSummaryDetail(s)} className="px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded-md text-sm font-semibold">View</button>
                                <button onClick={() => deleteSummary(s.id)} className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded-md text-sm font-semibold">Delete</button>
                            </div>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
    
    const renderSummaryDetail = () => {
        if (!activeSummary) return null;
        return (
            <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
                <button onClick={() => setView('saved')} className="flex items-center mb-4 text-sky-400 hover:text-sky-300">
                    <ArrowLeftIcon className="w-5 h-5 mr-2"/>
                    Back to Saved List
                </button>
                <h1 className="text-3xl font-bold mb-2 text-white">{activeSummary.title}</h1>
                <p className="text-sm text-slate-400 mb-6">Saved on {new Date(activeSummary.timestamp).toLocaleString()}</p>
                <SummaryDisplay summary={activeSummary} />
                <ChatAssistant documentContext={activeSummary.full_text} />
            </div>
        );
    };

    const renderView = () => {
        switch (view) {
            case 'scanner':
                return renderScanner();
            case 'saved':
                return renderSaved();
            case 'summaryDetail':
                return renderSummaryDetail();
            default:
                return renderScanner();
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-gray-900 text-slate-200 font-sans">
            <nav className="bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex items-center justify-center h-16">
                         <div className="flex items-baseline space-x-4">
                              <button onClick={() => { setView('scanner'); resetScanner(); }} className={`px-3 py-2 rounded-md text-sm font-medium ${view === 'scanner' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                                Scanner
                              </button>
                              <button onClick={() => setView('saved')} className={`px-3 py-2 rounded-md text-sm font-medium ${view === 'saved' || view === 'summaryDetail' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                                Saved Summaries ({savedSummaries.length})
                              </button>
                         </div>
                    </div>
                </div>
            </nav>
            <main>
                {renderView()}
            </main>
            {isCameraOpen && <CameraCapture onCapture={handleCameraCapture} onClose={() => setIsCameraOpen(false)} />}
        </div>
    );
};


interface SummaryDisplayProps {
    summary: SummaryReport;
}
const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary }) => {
    const [lang, setLang] = useState<'en' | 'bn'>('en');

    const clauseTranslations: { [key: string]: string } = {
        'Acceptance of Terms by Using Services': 'পরিষেবা ব্যবহারের মাধ্যমে শর্তাবলীর স্বীকৃতি',
        'Mandatory Acceptance for Service Use': 'পরিষেবা ব্যবহারের জন্য বাধ্যতামূলক স্বীকৃতি',
        'Terms Can Be Updated': 'শর্তাবলী আপডেট করা যেতে পারে',
        'Continued Use Implies Agreement': 'অবিরত ব্যবহার চুক্তি বোঝায়',
        'Lawful and Non-Infringing Use': 'আইনসম্মত এবং লঙ্ঘনহীন ব্যবহার',
        'Personal, Non-Commercial Use Only': 'শুধুমাত্র ব্যক্তিগত, অ-বাণিজ্যিক ব্যবহার',
    };

    return (
        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 space-y-6">
            <div>
                <div className="flex border-b border-slate-700 mb-4">
                    <button onClick={() => setLang('en')} className={`px-4 py-2 font-semibold ${lang === 'en' ? 'border-b-2 border-sky-400 text-sky-300' : 'text-slate-400'}`}>English</button>
                    <button onClick={() => setLang('bn')} className={`px-4 py-2 font-semibold ${lang === 'bn' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-slate-400'}`}>বাংলা (Bengali)</button>
                </div>
                <div>
                    <h3 className="text-xl font-bold mb-2 text-sky-300">{lang === 'en' ? 'Summary' : 'সারসংক্ষেপ'}</h3>
                    <p className="text-slate-300 leading-relaxed">{lang === 'en' ? summary.summary_en : summary.summary_bn}</p>
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-bold mb-3 text-sky-300">{lang === 'en' ? 'Key Clauses' : 'মূল ধারা'}</h3>
                <div className="space-y-4">
                    {summary.key_clauses.map((item, index) => (
                        <div key={index} className="bg-slate-900/50 p-4 rounded-lg border-l-4 border-yellow-500">
                            <h4 className="font-bold text-yellow-400">{lang === 'en' ? item.clause : (clauseTranslations[item.clause.replace(/\.$/, '')] || item.clause)}</h4>
                            <p className="mt-1 text-slate-300">{lang === 'en' ? item.explanation_en : item.explanation_bn}</p>
                        </div>
                    ))}
                </div>
            </div>

            <details className="bg-slate-900/50 p-3 rounded-lg">
                <summary className="font-semibold cursor-pointer text-slate-400 hover:text-white">
                    {lang === 'en' ? 'View Full Extracted Text' : 'সম্পূর্ণ নিষ্কাশিত পাঠ্য দেখুন'}
                </summary>
                <p className="mt-4 text-sm text-slate-400 whitespace-pre-wrap max-h-60 overflow-y-auto p-2 border-t border-slate-700">{summary.full_text}</p>
            </details>
        </div>
    );
};

export default App;
