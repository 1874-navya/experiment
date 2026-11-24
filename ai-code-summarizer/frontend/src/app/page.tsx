"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, BookOpen, Braces, Check, ChevronDown, CircleHelp, Code2, FileCode2, FileText, FolderOpen, Layers3, LoaderCircle, Plus, Settings2, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import type { AnalysisResult } from "@/lib/api";
import { getJob, submitAnalysis } from "@/lib/api";

const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const SAMPLE = "";

function bytesLabel(size: number) {
  if (size < 1024) return size + " B";
  if (size < 1048576) return (size / 1024).toFixed(1) + " KB";
  return (size / 1048576).toFixed(1) + " MB";
}

export default function Home() {
  const [code, setCode] = useState(SAMPLE);
  const [files, setFiles] = useState<File[]>([]);
  const [language, setLanguage] = useState("python");
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("idle");
  const [stage, setStage] = useState("Ready to analyze");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [tab, setTab] = useState("overview");
  const [activeFile, setActiveFile] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = ["QUEUED", "PENDING", "STARTED", "PROGRESS"].includes(status);
  const totalSize = useMemo(() => files.reduce((n, file) => n + file.size, 0), [files]);

  function addFiles(incoming: FileList | File[]) {
    const additions = Array.from(incoming);
    setFiles((current) => {
      const keys = new Set(current.map((file) => file.name + file.size + file.lastModified));
      return current.concat(additions.filter((file) => !keys.has(file.name + file.size + file.lastModified)));
    });
    setError("");
  }

  useEffect(() => {
    if (!jobId || !busy) return;
    let cancelled = false;
    async function poll() {
      try {
        const data = await getJob(jobId);
        if (cancelled) return;
        setStatus(data.status);
        if (data.status === "SUCCESS" && data.result) {
          setResult(data.result);
          setTab("overview");
          setStage("Analysis complete");
        } else if (data.status === "FAILURE") {
          setError(data.error || "Analysis failed. Check the API and worker logs.");
        } else if (data.progress?.stage) setStage(data.progress.stage);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to check analysis status.");
      }
    }
    poll();
    const timer = window.setInterval(poll, 1800);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [jobId, busy]);

  async function runAnalysis() {
    if (!code.trim() && !files.length) { setError("Paste code or attach at least one source file."); return; }
    setError(""); setResult(null); setStatus("QUEUED"); setStage("Uploading source files");
    try {
      const job = await submitAnalysis(code, files, language);
      setJobId(job.job_id); setStatus("PENDING");
    } catch (err) {
      setStatus("idle");
      setError(err instanceof Error ? err.message : "Unable to start analysis.");
    }
  }

  const selectedFile = result?.files.find((item) => item.path === activeFile);
  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-icon"><Braces size={20}/></div><div><b>codescope</b><small>INTELLIGENCE STUDIO</small></div></div>
        <button className="workspace"><span className="avatar">N</span><span><b>Personal workspace</b><small>Developer plan</small></span><ChevronDown size={14}/></button>
        <label className="nav-label">WORKSPACE</label>
        <button className="nav-item active"><Plus size={16}/>New analysis</button>
        <button className="nav-item"><FolderOpen size={16}/>Projects</button>
        <button className="nav-item"><Activity size={16}/>Recent analyses</button>
        <label className="nav-label spaced">YOUR LIBRARY</label>
        <button className="nav-item"><FileCode2 size={16}/>Saved codebases</button>
        <button className="nav-item"><BookOpen size={16}/>Documentation</button>
        <div className="sidebar-bottom">
          <div className="quota"><div><span>MONTHLY USAGE</span><b>0 / 50</b></div><i/><small>Analyses included in your plan</small></div>
          <button className="nav-item"><CircleHelp size={16}/>Help & feedback</button>
          <div className="profile"><span className="avatar">NS</span><span><b>Developer</b><small>Personal account</small></span><Settings2 size={16}/></div>
        </div>
      </aside>
      <section className="main">
        <header className="topbar"><div className="crumb">Workspace <span>/</span> <b>New analysis</b></div><div className="top-actions"><span><ShieldCheck size={14}/> Private workspace</span><CircleHelp size={17}/><i>NS</i></div></header>
        <div className="content">
          <div className="page-title"><div><label><Sparkles size={13}/> CODE INTELLIGENCE</label><h1>Understand your codebase.</h1><p>Drop in a file or paste code. Get the context, architecture, and details that matter.</p></div><span className="ready"><i/> AI engine ready</span></div>
          <div className="grid">
            <section className="editor-card">
              <div className="editor-head"><div><span className="selected"><Code2 size={14}/> Playground</span><span><FolderOpen size={14}/> Upload project</span></div><small>SOURCE INPUT</small></div>
              <div className="subhead"><button className="active"><Code2 size={14}/> Paste code</button><button onClick={() => inputRef.current?.click()}><UploadCloud size={14}/> Add files</button><small>Paste or drag source files below</small></div>
              <div className="editor-meta"><select value={language} onChange={(event) => setLanguage(event.target.value)}><option value="python">Python</option><option value="typescript">TypeScript</option><option value="javascript">JavaScript</option><option value="java">Java</option><option value="sql">SQL</option><option value="go">Go</option><option value="plaintext">Plain text</option></select><span>{code.length.toLocaleString()} characters</span></div>
              <div className="code-editor" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(event.dataTransfer.files); }}>
                <Editor height="420px" language={language} theme="vs-dark" value={code} onChange={(value) => setCode(value || "")} options={{ minimap: { enabled: false }, fontSize: 13, lineHeight: 23, padding: { top: 17 }, scrollBeyondLastLine: false, wordWrap: "on", automaticLayout: true, overviewRulerLanes: 0, scrollbar: { verticalScrollbarSize: 7 }, fontFamily: "JetBrains Mono, monospace" }}/>
              </div>
              <div className="editor-status"><span><i/> Editor ready</span><span>UTF-8 · LF · {language.toUpperCase()}</span></div>
              <input ref={inputRef} type="file" multiple className="hidden" accept=".py,.pyi,.js,.jsx,.ts,.tsx,.java,.go,.rs,.sql,.json,.yaml,.yml,.md,.txt,.zip,.html,.css,.sh,.ipynb,.rb,.php,.cs,.cpp,.c,.h,.tf" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }}/>
              {files.length > 0 && <div className="files"><div className="files-title">ATTACHED FILES <b>{files.length}</b><button onClick={() => setFiles([])}>Remove all</button></div><div className="file-list">{files.map((file) => <div className="file-pill" key={file.name + file.size}><FileCode2 size={14}/><span>{file.name}</span><small>{bytesLabel(file.size)}</small><button onClick={() => setFiles((old) => old.filter((item) => item !== file))}><X size={13}/></button></div>)}</div><small className="total-files">{files.length} files · {bytesLabel(totalSize)}</small></div>}
              <div className="editor-bottom"><span><ShieldCheck size={14}/> Source is analyzed as text, never executed.</span><button onClick={runAnalysis} disabled={busy}>{busy ? <LoaderCircle className="spin" size={15}/> : <Sparkles size={15}/>} {busy ? "Analyzing…" : "Understand this code"} <ArrowRight size={15}/></button></div>
            </section>
            <aside className="settings-card">
              <div className="settings-heading"><div className="setting-icon"><Sparkles size={16}/></div><div><b>Analysis settings</b><small>Tailor your code walkthrough</small></div><Settings2 size={15}/></div>
              <section><label>ANALYSIS DEPTH</label><div className="depth"><span><Activity size={15}/></span><div><b>Quick overview</b><small>Purpose & key components</small></div></div><div className="depth chosen"><span><Layers3 size={15}/></span><div><b>Deep dive</b><small>Architecture, logic & dependencies</small></div><Check size={14}/></div></section>
              <section><label>WHAT TO EXPLORE</label><ul className="check-list"><li><Check size={13}/> Architecture & structure</li><li><Check size={13}/> Functions & classes</li><li><Check size={13}/> Data flow & dependencies</li><li><Check size={13}/> Potential risks & improvements</li><li><Check size={13}/> Suggested test coverage</li></ul></section>
              <section><label>INPUT SUMMARY</label><div className="summary-row"><Code2 size={14}/>Editor content <b>{code.length ? "Ready" : "Empty"}</b></div><div className="summary-row"><FileText size={14}/>Attached files <b>{files.length}</b></div><div className="summary-row"><Layers3 size={14}/>Estimated input <b>{bytesLabel(new Blob([code]).size + totalSize)}</b></div></section>
              <div className="privacy"><ShieldCheck size={16}/><b>Private by design</b><p>Uploads are untrusted text. Configure private storage and retention before deploying publicly.</p></div>
            </aside>
          </div>
          {(busy || error || result) && <section className="results">
            <div className="result-heading"><div><label><Sparkles size={13}/> CODE INSIGHTS</label><h2>{result ? "Your code, explained." : error ? "Analysis could not finish." : "Understanding your code…"}</h2><p>{result ? "A structured walkthrough of the submitted source." : error || stage}</p></div>{result && <span className="complete"><Check size={13}/> Complete</span>}</div>
            {error && <div className="error">{error}</div>}{busy && <div className="progress"><i/></div>}
            {result && <><div className="stats">{[["Files analyzed", result.stats.file_count], ["Lines of code", result.stats.total_lines.toLocaleString()], ["Analysis chunks", result.stats.total_chunks], ["Characters", result.stats.total_characters.toLocaleString()]].map(([name, value]) => <div key={name}><b>{value}</b><small>{name}</small></div>)}</div>
              {!result.provider_configured && <div className="notice">LLM provider is not configured. This is a static inventory, not an AI explanation.</div>}
              <div className="result-tabs"><button className={tab === "overview" ? "active" : ""} onClick={() => { setTab("overview"); setActiveFile(""); }}>Project overview</button><button className={tab === "files" ? "active" : ""} onClick={() => setTab("files")}>Files & symbols</button></div>
              {tab === "overview" ? <pre className="explanation">{result.summary}</pre> : <div className="file-results"><nav>{result.files.map((item) => <button className={activeFile === item.path ? "active" : ""} key={item.path} onClick={() => setActiveFile(item.path)}><FileCode2 size={13}/>{item.path}</button>)}</nav><article>{selectedFile ? <><h3>{selectedFile.path}</h3><pre>{selectedFile.summary}</pre><h4>Symbols</h4><ul>{(selectedFile.symbols || []).map((symbol) => <li key={symbol.kind + symbol.name + symbol.line}>{symbol.kind} {symbol.name} <small>Line {symbol.line}</small></li>)}</ul><h4>Imports</h4><p>{(selectedFile.imports || []).join(", ") || "No Python imports detected."}</p></> : <p>Select a file to inspect its summary and symbols.</p>}</article></div>}
              {result.warnings.length > 0 && <div className="notice">{result.warnings.join(" ")}</div>}
            </>}
          </section>}
          <footer>BUILT FOR ENGINEERS WHO LIKE CONTEXT. <span>CodeScope · AI code intelligence</span></footer>
        </div>
      </section>
    </main>
  );
}
