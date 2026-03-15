import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ── DEFAULT PLAN ──────────────────────────────────────────────────────────────
const DEFAULT_PLAN = {
  name: "8-Week Strength Foundation",
  weeks: Array.from({ length: 8 }, (_, wi) => ({
    week: wi + 1,
    phase: wi < 4 ? 1 : 2,
    days: [
      {
        id: `w${wi+1}d1`, label: "Push Day", emoji: "🔥",
        exercises: [
          { id: `w${wi+1}d1e1`, name: "Barbell Bench Press", sets: wi < 4 ? 3 : 4, reps: wi < 4 ? "8–10" : "6–8" },
          { id: `w${wi+1}d1e2`, name: "Overhead Press", sets: 3, reps: wi < 4 ? "10–12" : "8–10" },
          { id: `w${wi+1}d1e3`, name: "Incline Dumbbell Press", sets: 3, reps: "10–12" },
          { id: `w${wi+1}d1e4`, name: "Lateral Raises", sets: 3, reps: "15–20" },
          { id: `w${wi+1}d1e5`, name: "Tricep Pushdowns", sets: 3, reps: "12–15" },
        ],
      },
      {
        id: `w${wi+1}d2`, label: "Pull Day", emoji: "💪",
        exercises: [
          { id: `w${wi+1}d2e1`, name: "Barbell Deadlift", sets: wi < 4 ? 3 : 4, reps: wi < 4 ? "6–8" : "4–6" },
          { id: `w${wi+1}d2e2`, name: "Pull-Ups", sets: 3, reps: "max" },
          { id: `w${wi+1}d2e3`, name: "Barbell Row", sets: 3, reps: "8–10" },
          { id: `w${wi+1}d2e4`, name: "Face Pulls", sets: 3, reps: "15–20" },
          { id: `w${wi+1}d2e5`, name: "Hammer Curls", sets: 3, reps: "12–15" },
        ],
      },
      {
        id: `w${wi+1}d3`, label: "Leg Day", emoji: "🦵",
        exercises: [
          { id: `w${wi+1}d3e1`, name: "Back Squat", sets: wi < 4 ? 3 : 4, reps: wi < 4 ? "8–10" : "6–8" },
          { id: `w${wi+1}d3e2`, name: "Romanian Deadlift", sets: 3, reps: "10–12" },
          { id: `w${wi+1}d3e3`, name: "Leg Press", sets: 3, reps: "12–15" },
          { id: `w${wi+1}d3e4`, name: "Leg Curl", sets: 3, reps: "12–15" },
          { id: `w${wi+1}d3e5`, name: "Calf Raises", sets: 4, reps: "15–20" },
        ],
      },
    ],
  })),
};

// ── STORAGE ───────────────────────────────────────────────────────────────────
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

// ── PLAN PARSER ───────────────────────────────────────────────────────────────
// Expected columns: Week | Phase | Day Label | Day Emoji | Exercise Name | Sets | Reps
function parseSheetToPlan(rows, planName) {
  // rows is array of objects with keys from header row
  const normalize = (s) => String(s||"").trim().toLowerCase();
  
  // Find header row keys flexibly
  if (!rows.length) throw new Error("Spreadsheet is empty.");
  
  const firstRow = rows[0];
  const keys = Object.keys(firstRow);
  
  const findKey = (...candidates) => keys.find(k => candidates.some(c => normalize(k).includes(c))) || null;
  
  const kWeek    = findKey("week");
  const kPhase   = findKey("phase");
  const kDayLbl  = findKey("day label","day name","day");
  const kDayEmoji= findKey("emoji","icon");
  const kExName  = findKey("exercise","name","movement");
  const kSets    = findKey("sets");
  const kReps    = findKey("reps","rep");
  
  if (!kWeek || !kExName || !kSets || !kReps) {
    throw new Error(`Missing required columns. Need: Week, Exercise Name, Sets, Reps.\nFound: ${keys.join(", ")}`);
  }
  
  const weekMap = new Map();
  
  rows.forEach((row, i) => {
    const weekNum = parseInt(row[kWeek]);
    if (!weekNum || isNaN(weekNum)) return;
    
    const exName = String(row[kExName]||"").trim();
    if (!exName) return;
    
    const dayLabel = kDayLbl ? String(row[kDayLbl]||"Day 1").trim() : "Day 1";
    const dayEmoji = kDayEmoji ? String(row[kDayEmoji]||"💪").trim() : "💪";
    const phase    = kPhase ? (parseInt(row[kPhase])||1) : (weekNum <= 4 ? 1 : 2);
    const sets     = parseInt(row[kSets]) || 3;
    const reps     = String(row[kReps]||"10").trim();
    
    if (!weekMap.has(weekNum)) weekMap.set(weekNum, { week: weekNum, phase, days: new Map() });
    const wk = weekMap.get(weekNum);
    
    const dayKey = dayLabel;
    if (!wk.days.has(dayKey)) wk.days.set(dayKey, { label: dayLabel, emoji: dayEmoji, exercises: [] });
    const day = wk.days.get(dayKey);
    
    day.exercises.push({ name: exName, sets, reps });
  });
  
  if (!weekMap.size) throw new Error("No valid rows found. Make sure Week and Exercise Name columns have data.");
  
  // Convert map to plan structure with stable IDs
  const sortedWeeks = [...weekMap.values()].sort((a,b) => a.week - b.week);
  
  return {
    name: planName || "Imported Plan",
    weeks: sortedWeeks.map(w => ({
      week: w.week,
      phase: w.phase,
      days: [...w.days.values()].map((d, di) => ({
        id: `w${w.week}d${di+1}`,
        label: d.label,
        emoji: d.emoji,
        exercises: d.exercises.map((ex, ei) => ({
          id: `w${w.week}d${di+1}e${ei+1}`,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
        })),
      })),
    })),
  };
}

// ── TEMPLATE GENERATOR ────────────────────────────────────────────────────────
function generateTemplate() {
  const wb = XLSX.utils.book_new();
  
  // ── Instructions sheet ──
  const instrData = [
    ["Volume — Workout Plan Import Template"],
    [""],
    ["HOW TO USE:"],
    ["1. Fill in the 'Workout Plan' sheet with your exercises"],
    ["2. Each row = one exercise in a specific week/day"],
    ["3. Save the file and import it into Volume"],
    [""],
    ["REQUIRED COLUMNS:"],
    ["Week", "The week number (1–8, or however many weeks you want)"],
    ["Day Label", "Name of the training day (e.g. Push Day, Upper Body, Monday)"],
    ["Exercise Name", "Full name of the exercise"],
    ["Sets", "Number of sets (number)"],
    ["Reps", "Rep target (e.g. 8, 8–10, max, 3x5)"],
    [""],
    ["OPTIONAL COLUMNS:"],
    ["Phase", "Training phase number (e.g. 1 or 2). Auto-detected from week if omitted."],
    ["Day Emoji", "An emoji for the day (🔥💪🦵etc). Defaults to 💪 if omitted."],
    [""],
    ["TIPS:"],
    ["• You can have any number of weeks and days"],
    ["• Days are grouped by their exact Day Label text — make sure spelling is consistent"],
    ["• You can add extra columns — they'll be ignored"],
    ["• Delete these instructions before importing if you like — the app reads the Workout Plan sheet"],
  ];
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs["!cols"] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");
  
  // ── Workout Plan sheet with sample data ──
  const headers = ["Week", "Phase", "Day Label", "Day Emoji", "Exercise Name", "Sets", "Reps"];
  const sampleRows = [
    // Week 1
    [1, 1, "Push Day", "🔥", "Barbell Bench Press", 3, "8–10"],
    [1, 1, "Push Day", "🔥", "Overhead Press", 3, "10–12"],
    [1, 1, "Push Day", "🔥", "Incline Dumbbell Press", 3, "10–12"],
    [1, 1, "Push Day", "🔥", "Lateral Raises", 3, "15–20"],
    [1, 1, "Push Day", "🔥", "Tricep Pushdowns", 3, "12–15"],
    [1, 1, "Pull Day", "💪", "Barbell Deadlift", 3, "6–8"],
    [1, 1, "Pull Day", "💪", "Pull-Ups", 3, "max"],
    [1, 1, "Pull Day", "💪", "Barbell Row", 3, "8–10"],
    [1, 1, "Pull Day", "💪", "Face Pulls", 3, "15–20"],
    [1, 1, "Pull Day", "💪", "Hammer Curls", 3, "12–15"],
    [1, 1, "Leg Day", "🦵", "Back Squat", 3, "8–10"],
    [1, 1, "Leg Day", "🦵", "Romanian Deadlift", 3, "10–12"],
    [1, 1, "Leg Day", "🦵", "Leg Press", 3, "12–15"],
    [1, 1, "Leg Day", "🦵", "Leg Curl", 3, "12–15"],
    [1, 1, "Leg Day", "🦵", "Calf Raises", 4, "15–20"],
    // Week 2 (abbreviated to show pattern)
    [2, 1, "Push Day", "🔥", "Barbell Bench Press", 3, "8–10"],
    [2, 1, "Push Day", "🔥", "Overhead Press", 3, "10–12"],
    [2, 1, "Push Day", "🔥", "Add your exercises here...", 3, "10–12"],
    [2, 1, "Pull Day", "💪", "Barbell Deadlift", 3, "6–8"],
    [2, 1, "Pull Day", "💪", "Add your exercises here...", 3, "8–10"],
    [2, 1, "Leg Day", "🦵", "Back Squat", 3, "8–10"],
    [2, 1, "Leg Day", "🦵", "Add your exercises here...", 3, "10–12"],
  ];
  
  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Column widths
  ws["!cols"] = [
    { wch: 8 },  // Week
    { wch: 8 },  // Phase
    { wch: 16 }, // Day Label
    { wch: 10 }, // Day Emoji
    { wch: 28 }, // Exercise Name
    { wch: 6 },  // Sets
    { wch: 10 }, // Reps
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, "Workout Plan");
  
  XLSX.writeFile(wb, "volume-workout-template.xlsx");
}

// ── BACKUP / RESTORE ──────────────────────────────────────────────────────────
function exportBackup(plan) {
  const log = store.get("wlog") || {};
  const backup = { version: 1, exportedAt: new Date().toISOString(), plan, log };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = `volume-backup-${date}.json`;
  a.click(); URL.revokeObjectURL(url);
}

function parseBackup(text) {
  const data = JSON.parse(text);
  if (!data.plan || !data.log) throw new Error("Invalid backup file — missing plan or log data.");
  if (!data.plan.weeks?.length) throw new Error("Backup contains an empty plan.");
  return data;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#f5f0e8;font-family:'DM Sans',sans-serif;text-align:left;}
  #root{text-align:left;max-width:none;margin:0;padding:0;}
  ::-webkit-scrollbar{width:5px;}
  ::-webkit-scrollbar-thumb{background:#c8f040;border-radius:99px;}

  .card{background:#fff;border-radius:20px;box-shadow:0 2px 24px rgba(0,0,0,.06);}
  .lime-card{background:#c8f040;border-radius:20px;}

  .tab-wrap{background:#ede8de;border-radius:99px;padding:4px;display:inline-flex;gap:2px;}
  .tab-btn{border-radius:99px;border:none;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:9px 22px;transition:all .2s;letter-spacing:-.01em;}
  .tab-btn.on{background:#1a1a1a;color:#fff;}
  .tab-btn.off{background:transparent;color:#888;}
  .tab-btn.off:hover{color:#1a1a1a;}

  .week-btn{border-radius:99px;border:2px solid #e0dbd0;background:#fff;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:5px 14px;transition:all .15s;color:#999;}
  .week-btn.on{background:#1a1a1a;color:#fff;border-color:#1a1a1a;}
  .week-btn:hover:not(.on){border-color:#b5e030;color:#1a1a1a;}

  .day-btn{border-radius:14px;border:2px solid #e0dbd0;background:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:10px 18px;transition:all .15s;color:#777;display:flex;align-items:center;gap:7px;}
  .day-btn.on{background:#c8f040;border-color:#c8f040;color:#1a1a1a;}
  .day-btn:hover:not(.on){border-color:#c8f040;}

  .ex-card{background:#fff;border-radius:16px;border:2px solid #ede8de;transition:all .2s;margin-bottom:10px;overflow:hidden;}
  .ex-card:hover{border-color:#c8f040;box-shadow:0 4px 20px rgba(180,229,60,.18);}
  .ex-card.done{background:#fafaf6;border-color:#c8f040;}

  .chk{width:22px;height:22px;border-radius:7px;border:2px solid #d5cfc4;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
  .chk.on{background:#c8f040;border-color:#c8f040;}

  .inp{border:2px solid #ede8de;border-radius:10px;background:#faf8f4;font-family:'DM Sans',sans-serif;font-size:14px;padding:8px 12px;width:100%;outline:none;color:#1a1a1a;transition:border-color .15s;}
  .inp:focus{border-color:#c8f040;}
  .inp::placeholder{color:#ccc;}

  .btn-dark{border-radius:99px;border:none;background:#1a1a1a;color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:10px 22px;transition:all .2s;}
  .btn-dark:hover{background:#333;transform:translateY(-1px);}
  .btn-lime{border-radius:99px;border:none;background:#c8f040;color:#1a1a1a;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:10px 22px;transition:all .2s;}
  .btn-lime:hover{background:#b5d838;transform:translateY(-1px);}
  .btn-ghost{border-radius:10px;border:2px solid #ede8de;background:transparent;color:#888;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:7px 14px;transition:all .15s;}
  .btn-ghost:hover{border-color:#c8f040;color:#1a1a1a;background:#f9fce8;}
  .btn-outline{border-radius:99px;border:2px solid #1a1a1a;background:transparent;color:#1a1a1a;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;padding:9px 20px;transition:all .2s;}
  .btn-outline:hover{background:#1a1a1a;color:#fff;}
  .rest-chip{border-radius:99px;border:2px solid #e0dbd0;background:#fff;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;cursor:pointer;padding:4px 12px;transition:all .15s;color:#aaa;}
  .rest-chip.on{background:#c8f040;border-color:#c8f040;color:#1a1a1a;}

  .stat{background:#f5f0e8;border-radius:14px;padding:16px;text-align:center;}
  .modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:300;padding:16px;backdrop-filter:blur(6px);}
  @keyframes pop{from{transform:scale(.9);opacity:0;}to{transform:scale(1);opacity:1;}}
  .modal-box{animation:pop .22s ease;}
  @keyframes fu{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  .fu{animation:fu .28s ease forwards;}
  .bar{border-radius:6px 6px 0 0;transition:height .4s ease;min-height:4px;}

  .drop-zone{border:2.5px dashed #d5cfc4;border-radius:16px;padding:32px 24px;text-align:center;transition:all .2s;cursor:pointer;background:#faf8f4;}
  .drop-zone:hover,.drop-zone.drag-over{border-color:#c8f040;background:#f9fce8;}
  .drop-zone.drag-over{transform:scale(1.01);}

  .import-step{display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:2px solid #f5f0e8;}
  .import-step:last-child{border-bottom:none;}
  .step-num{width:28px;height:28px;border-radius:99px;background:#c8f040;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;color:#1a1a1a;flex-shrink:0;margin-top:2px;}

  .tag{border-radius:99px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;padding:3px 10px;display:inline-block;}
  .tag-lime{background:#c8f040;color:#1a1a1a;}
  .tag-muted{background:#f5f0e8;color:#888;}
  .tag-dark{background:#1a1a1a;color:#fff;}

  .error-box{background:#fff0f0;border:2px solid #ffcccc;border-radius:12px;padding:14px 16px;margin-top:12px;}
  .success-box{background:#f0fff4;border:2px solid #b5e550;border-radius:12px;padding:14px 16px;margin-top:12px;}
`;

const Squiggle = ({ color="#b5e550", width=80 }) => (
  <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" style={{display:"block",marginTop:4}}>
    <path d={`M0 4 ${Array.from({length:Math.floor(width/10)},(_,i)=>`Q${i*10+5} ${i%2===0?0:8} ${(i+1)*10} 4`).join(" ")}`}
      stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </svg>
);

// ── IMPORT PAGE ───────────────────────────────────────────────────────────────
function ImportPage({ onImport, onRestore, plan }) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState(null);
  const [planName, setPlanName] = useState("");
  const [pendingPlan, setPendingPlan] = useState(null);
  const [restoreStatus, setRestoreStatus] = useState(null);
  const [pendingRestore, setPendingRestore] = useState(null);
  const fileRef = useRef(null);
  const restoreRef = useRef(null);

  const processFile = (file) => {
    setStatus(null); setPendingPlan(null);
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx","xls","csv"].includes(ext)) {
      setStatus({type:"error", msg:`Unsupported file type ".${ext}". Please upload an .xlsx, .xls, or .csv file.`});
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, {type:"array"});
        const sheetName = wb.SheetNames.includes("Workout Plan") ? "Workout Plan" : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, {defval:""});
        const name = planName.trim() || file.name.replace(/\.[^.]+$/,"");
        const parsed = parseSheetToPlan(rows, name);
        setPendingPlan(parsed);
        setStatus({type:"success", msg:`Found ${parsed.weeks.length} week(s) with ${parsed.weeks.reduce((a,w)=>a+w.days.length,0)} training days and ${parsed.weeks.reduce((a,w)=>a+w.days.reduce((b,d)=>b+d.exercises.length,0),0)} total exercises.`});
      } catch(err) {
        setStatus({type:"error", msg: err.message || "Could not parse the spreadsheet."});
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processRestoreFile = (file) => {
    setRestoreStatus(null); setPendingRestore(null);
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      setRestoreStatus({type:"error", msg:"Please select a .json backup file."});
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = parseBackup(e.target.result);
        const logCount = Object.keys(data.log).length;
        setPendingRestore(data);
        setRestoreStatus({type:"success", msg:`Backup from ${new Date(data.exportedAt).toLocaleDateString()} — "${data.plan.name}", ${logCount} logged session${logCount!==1?"s":""}.`});
      } catch(err) {
        setRestoreStatus({type:"error", msg: err.message || "Could not read backup file."});
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); };
  const handleConfirm = () => { if (pendingPlan) onImport(pendingPlan); };
  const handleRestore = () => { if (pendingRestore) onRestore(pendingRestore); };
  const logCount = Object.keys(store.get("wlog") || {}).length;

  return (
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Import & Backup</div>
        <Squiggle width={170}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>Import a new plan or back up your workout data</div>
      </div>

      {/* BACKUP */}
      <div className="lime-card" style={{padding:24,marginBottom:16}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#5a7a00",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Backup Your Data</div>
            <div style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a",marginBottom:4}}>Export Backup</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3d5700",lineHeight:1.5,maxWidth:340}}>
              Saves your plan + all logged history as a <code style={{background:"#b5d838",padding:"1px 5px",borderRadius:4,fontSize:12}}>volume-backup-[date].json</code> file. Keep it in iCloud or Google Drive — it's your safety net.
            </div>
            {logCount > 0 && (
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#5a7a00",marginTop:8,fontWeight:600}}>
                {logCount} logged session{logCount!==1?"s":""} will be included
              </div>
            )}
          </div>
          <button className="btn-dark" onClick={()=>exportBackup(plan)} style={{whiteSpace:"nowrap",alignSelf:"flex-start"}}>
            ↓ Download Backup
          </button>
        </div>
      </div>

      {/* RESTORE */}
      <div className="card" style={{padding:24,marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Restore from Backup</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#888",marginBottom:16,lineHeight:1.5}}>
          Restores your plan <em>and</em> all workout history from a previous backup. This replaces everything currently in the app.
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <button className="btn-ghost" onClick={()=>restoreRef.current?.click()}>Choose backup file…</button>
          <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#ccc"}}>.json files only</span>
          <input ref={restoreRef} type="file" accept=".json" style={{display:"none"}} onChange={e=>processRestoreFile(e.target.files[0])}/>
        </div>
        {restoreStatus?.type==="error" && (
          <div className="error-box" style={{marginTop:12}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#cc3333",marginBottom:2}}>Error</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#cc3333"}}>{restoreStatus.msg}</div>
          </div>
        )}
        {restoreStatus?.type==="success" && (
          <div className="success-box" style={{marginTop:12}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#3a7a00",marginBottom:4}}>Backup file read successfully</div>
            <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3a7a00",marginBottom:12}}>{restoreStatus.msg}</div>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <button className="btn-lime" onClick={handleRestore}>↑ Restore Everything</button>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#888"}}>Replaces your current plan and all logs</div>
            </div>
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div style={{display:"flex",alignItems:"center",gap:12,margin:"24px 0"}}>
        <div style={{flex:1,height:2,background:"#ede8de"}}/>
        <span style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.1em"}}>Import New Plan</span>
        <div style={{flex:1,height:2,background:"#ede8de"}}/>
      </div>

      {/* HOW IT WORKS */}
      <div className="card" style={{padding:24,marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>How It Works</div>
        {[
          {num:"1",title:"Download the template",body:"Get the pre-formatted Excel template with correct columns and sample data already filled in."},
          {num:"2",title:"Fill in your exercises",body:"Edit the 'Workout Plan' sheet. Each row is one exercise. Use any number of weeks, days, and exercises."},
          {num:"3",title:"Upload your file",body:"Drop your completed .xlsx or .csv below. The app shows a preview before replacing your plan."},
        ].map(s=>(
          <div key={s.num} className="import-step">
            <div className="step-num">{s.num}</div>
            <div>
              <div style={{fontFamily:"'DM Sans'",fontSize:14,fontWeight:600,color:"#1a1a1a",marginBottom:3}}>{s.title}</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#888",lineHeight:1.5}}>{s.body}</div>
            </div>
          </div>
        ))}
        <div style={{marginTop:18,display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn-lime" onClick={generateTemplate}>↓ Download Template</button>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",alignSelf:"center"}}>volume-workout-template.xlsx</div>
        </div>
      </div>

      {/* COLUMN REF */}
      <div className="card" style={{padding:20,marginBottom:16}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:14}}>Required Column Format</div>
        <div style={{display:"grid",gridTemplateColumns:"auto 1fr auto",gap:"6px 16px",alignItems:"start"}}>
          {[
            {col:"Week",ex:"1, 2, 3…",req:true},
            {col:"Day Label",ex:"Push Day, Upper Body…",req:true},
            {col:"Exercise Name",ex:"Barbell Bench Press",req:true},
            {col:"Sets",ex:"3, 4",req:true},
            {col:"Reps",ex:"8–10, max, 5",req:true},
            {col:"Phase",ex:"1 or 2",req:false},
            {col:"Day Emoji",ex:"🔥 💪 🦵",req:false},
          ].map(({col,ex,req})=>(
            <>
              <span key={col+"c"} style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:600,color:"#1a1a1a"}}>{col}</span>
              <span key={col+"e"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",fontStyle:"italic"}}>{ex}</span>
              <span key={col+"r"} className={`tag ${req?"tag-dark":"tag-muted"}`}>{req?"required":"optional"}</span>
            </>
          ))}
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Plan Name (optional)</div>
        <input className="inp" value={planName} onChange={e=>setPlanName(e.target.value)} placeholder="e.g. My 8-Week Hypertrophy Program" style={{maxWidth:400}}/>
      </div>

      <div className={`drop-zone ${dragOver?"drag-over":""}`}
        onDragOver={e=>{e.preventDefault();setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={handleDrop}
        onClick={()=>fileRef.current?.click()}
        style={{marginBottom:4}}>
        <div style={{fontSize:36,marginBottom:12}}>📂</div>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:20,color:"#1a1a1a",marginBottom:6}}>Drop your spreadsheet here</div>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa"}}>or click to browse — .xlsx, .xls, or .csv</div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>
      </div>

      {status?.type==="error" && (
        <div className="error-box">
          <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#cc3333",marginBottom:4}}>Import Error</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#cc3333",whiteSpace:"pre-wrap"}}>{status.msg}</div>
        </div>
      )}
      {status?.type==="success" && (
        <div className="success-box">
          <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#3a7a00",marginBottom:4}}>Plan Parsed Successfully</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#3a7a00",marginBottom:14}}>{status.msg}</div>
          {pendingPlan && (
            <div style={{marginBottom:14}}>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:"#5a7a00",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Preview</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {pendingPlan.weeks.slice(0,6).map(w=>(
                  <div key={w.week} style={{background:"#fff",borderRadius:10,padding:"8px 12px",border:"2px solid #c8f040"}}>
                    <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#5a7a00"}}>Week {w.week}</div>
                    {w.days.map(d=>(
                      <div key={d.id} style={{fontFamily:"'DM Sans'",fontSize:11,color:"#888",marginTop:2}}>{d.emoji} {d.label} · {d.exercises.length} ex</div>
                    ))}
                  </div>
                ))}
                {pendingPlan.weeks.length>6 && (
                  <div style={{background:"#f5f0e8",borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center"}}>
                    <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa"}}>+{pendingPlan.weeks.length-6} more weeks</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            <button className="btn-lime" onClick={handleConfirm} style={{fontSize:14,padding:"11px 28px"}}>Import This Plan</button>
            <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa"}}>Workout logs are kept</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function Timer() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [restSec, setRestSec] = useState(90);
  const [restLeft, setRestLeft] = useState(0);
  const [restOn, setRestOn] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    if(running){ref.current=setInterval(()=>{setElapsed(e=>e+1);setRestLeft(r=>Math.max(0,r-1));},1000);}
    else clearInterval(ref.current);
    return()=>clearInterval(ref.current);
  },[running]);
  const startRest=()=>{setRestLeft(restSec);setRestOn(true);if(!running)setRunning(true);};
  const reset=()=>{setRunning(false);setElapsed(0);setRestLeft(0);setRestOn(false);};
  const pct=restOn?(restLeft/restSec)*100:0;
  return(
    <div className="card" style={{padding:20,marginBottom:20}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
        <div>
          <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Workout Timer</div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:54,color:"#1a1a1a",lineHeight:1,letterSpacing:"-0.03em"}}>{fmt(elapsed)}</div>
        </div>
        {restOn&&(
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>Rest</div>
            <div style={{fontFamily:"'DM Serif Display'",fontSize:54,lineHeight:1,letterSpacing:"-0.03em",color:restLeft<10?"#e84040":"#1a1a1a"}}>{fmt(restLeft)}</div>
            <div style={{marginTop:8,background:"#ede8de",borderRadius:99,height:5,width:150,overflow:"hidden",marginLeft:"auto"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"#c8f040",borderRadius:99,transition:"width 1s linear"}}/>
            </div>
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:8,marginTop:18,flexWrap:"wrap",alignItems:"center"}}>
        <button className="btn-dark" onClick={()=>setRunning(!running)}>{running?"Pause":elapsed>0?"Resume":"Start"}</button>
        <button className="btn-ghost" onClick={startRest}>Rest</button>
        <button className="btn-ghost" onClick={reset}>Reset</button>
        <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
          <span style={{fontFamily:"'DM Sans'",fontSize:10,color:"#bbb",fontWeight:700,marginRight:2}}>SEC</span>
          {[60,90,120,180].map(t=>(
            <button key={t} className={`rest-chip ${restSec===t?"on":""}`} onClick={()=>setRestSec(t)}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EXERCISE CARD ─────────────────────────────────────────────────────────────
function ExCard({ex,logData,onLogChange,checked,onCheck}){
  const[open,setOpen]=useState(false);
  const sets=logData?.sets||[];
  const note=logData?.note||"";
  const upSets=s=>onLogChange({...logData,sets:s});
  const addSet=()=>{const l=sets[sets.length-1]||{};upSets([...sets,{weight:l.weight||"",reps:l.reps||"",rpe:""}]);};
  const upSet=(i,s)=>{const n=[...sets];n[i]=s;upSets(n);};
  const rmSet=i=>upSets(sets.filter((_,j)=>j!==i));
  const vol=sets.reduce((a,s)=>a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);
  return(
    <div className={`ex-card fu ${checked?"done":""}`}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",cursor:"pointer"}} onClick={()=>setOpen(!open)}>
        <div className={`chk ${checked?"on":""}`} onClick={e=>{e.stopPropagation();onCheck();}}>
          {checked&&<svg width="12" height="9" viewBox="0 0 12 9"><path d="M1 4.5l3 3L11 1" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'DM Sans'",fontWeight:600,fontSize:15,color:checked?"#bbb":"#1a1a1a",textDecoration:checked?"line-through":"none"}}>{ex.name}</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#bbb",marginTop:1}}>{ex.sets} sets × {ex.reps}</div>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {vol>0&&<span className="tag tag-lime">{vol.toLocaleString()} lbs</span>}
          {sets.length>0&&!vol&&<span className="tag tag-muted">{sets.length} sets</span>}
          <span style={{color:"#ccc",fontSize:13,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform .2s"}}>▾</span>
        </div>
      </div>
      {open&&(
        <div style={{padding:"2px 16px 16px",borderTop:"2px solid #f5f0e8"}}>
          {sets.length>0&&(
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr 28px",gap:6,margin:"12px 0 6px"}}>
              <div/>{["Weight","Reps","RPE"].map(l=><div key={l} style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.07em"}}>{l}</div>)}<div/>
            </div>
          )}
          {sets.map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr 28px",gap:6,alignItems:"center",marginBottom:6}}>
              <span style={{fontFamily:"'DM Sans'",fontSize:11,color:"#ccc",textAlign:"center",fontWeight:600}}>{i+1}</span>
              <input className="inp" type="number" placeholder="0 lbs" value={s.weight} onChange={e=>upSet(i,{...s,weight:e.target.value})} style={{textAlign:"center"}}/>
              <input className="inp" type="number" placeholder="0" value={s.reps} onChange={e=>upSet(i,{...s,reps:e.target.value})} style={{textAlign:"center"}}/>
              <input className="inp" type="number" placeholder="—" min="1" max="10" value={s.rpe} onChange={e=>upSet(i,{...s,rpe:e.target.value})} style={{textAlign:"center"}}/>
              <button onClick={()=>rmSet(i)} style={{background:"none",border:"none",color:"#ccc",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
            </div>
          ))}
          <button className="btn-ghost" onClick={addSet} style={{marginTop:8,marginBottom:14}}>+ Add Set</button>
          <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Notes</div>
          <textarea className="inp" value={note} onChange={e=>onLogChange({...logData,note:e.target.value})}
            placeholder="How it felt, cues, adjustments..."
            style={{resize:"vertical",minHeight:60,fontFamily:"'DM Sans'",fontSize:13,lineHeight:1.5}}/>
        </div>
      )}
    </div>
  );
}

// ── SUMMARY MODAL ─────────────────────────────────────────────────────────────
function Summary({day,log,onClose}){
  const totalVol=day.exercises.reduce((a,ex)=>{const s=log[ex.id]?.sets||[];return a+s.reduce((b,s)=>b+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);},0);
  const totalSets=day.exercises.reduce((a,ex)=>a+(log[ex.id]?.sets||[]).length,0);
  const done=day.exercises.filter(ex=>log[ex.id]?.checked).length;
  return(
    <div className="modal-bg">
      <div className="card modal-box" style={{maxWidth:440,width:"100%",padding:32}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:10}}>{day.emoji}✅</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#bbb",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>Workout Complete</div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:32,color:"#1a1a1a"}}>{day.label}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:24}}>
          {[{label:"Volume",value:totalVol>0?totalVol.toLocaleString():"—",unit:totalVol>0?"lbs":""},{label:"Sets",value:totalSets},{label:"Done",value:`${done}/${day.exercises.length}`}].map(({label,value,unit})=>(
            <div key={label} className="stat">
              <div style={{fontFamily:"'DM Serif Display'",fontSize:28,color:"#1a1a1a",lineHeight:1}}>{value}</div>
              {unit&&<div style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa",fontWeight:600}}>{unit}</div>}
              <div style={{fontFamily:"'DM Sans'",fontSize:10,color:"#bbb",marginTop:4,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{marginBottom:24}}>
          {day.exercises.map(ex=>{const s=log[ex.id]?.sets||[];if(!s.length)return null;const v=s.reduce((a,s)=>a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);return(
            <div key={ex.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"2px solid #f5f0e8"}}>
              <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:500,color:"#333"}}>{ex.name}</span>
              <div style={{display:"flex",gap:8}}>
                <span style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa"}}>{s.length}×</span>
                {v>0&&<span style={{fontFamily:"'DM Sans'",fontSize:12,fontWeight:700,color:"#1a1a1a"}}>{v.toLocaleString()} lbs</span>}
              </div>
            </div>
          );})}
        </div>
        <button className="btn-lime" style={{width:"100%",fontSize:14,padding:"13px"}} onClick={onClose}>Close 🎉</button>
      </div>
    </div>
  );
}

// ── WORKOUT PAGE ──────────────────────────────────────────────────────────────
function WorkoutPage({plan}){
  const[wk,setWk]=useState(0);
  const[dy,setDy]=useState(0);
  const[log,setLog]=useState(()=>store.get("wlog")||{});
  const[sum,setSum]=useState(false);
  const safeWk=Math.min(wk,plan.weeks.length-1);
  const safeDy=Math.min(dy,(plan.weeks[safeWk]?.days?.length||1)-1);
  const day=plan.weeks[safeWk].days[safeDy];
  const getLog=id=>log[`${day.id}::${id}`]||{};
  const setExLog=(id,data)=>{const u={...log,[`${day.id}::${id}`]:data};setLog(u);store.set("wlog",u);};
  return(
    <div>
      {sum&&<Summary day={day} log={Object.fromEntries(day.exercises.map(ex=>[ex.id,getLog(ex.id)]))} onClose={()=>setSum(false)}/>}
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a",lineHeight:1.1}}>Today's Session</div>
        <Squiggle width={160}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
        {plan.weeks.map((w,i)=><button key={i} className={`week-btn ${safeWk===i?"on":""}`} onClick={()=>{setWk(i);setDy(0);}}>W{w.week}</button>)}
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:24}}>
        {plan.weeks[safeWk].days.map((d,i)=><button key={i} className={`day-btn ${safeDy===i?"on":""}`} onClick={()=>setDy(i)}><span>{d.emoji}</span>{d.label}</button>)}
      </div>
      <Timer/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:24,color:"#1a1a1a"}}>{day.emoji} {day.label}</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#aaa",marginTop:2,fontWeight:500}}>Week {safeWk+1} · Phase {plan.weeks[safeWk].phase} · {day.exercises.length} exercises</div>
        </div>
        <button className="btn-lime" onClick={()=>setSum(true)}>Finish ✓</button>
      </div>
      {day.exercises.map(ex=><ExCard key={ex.id} ex={ex} logData={getLog(ex.id)} onLogChange={d=>setExLog(ex.id,d)} checked={!!getLog(ex.id).checked} onCheck={()=>setExLog(ex.id,{...getLog(ex.id),checked:!getLog(ex.id).checked})}/>)}
    </div>
  );
}

// ── PLAN PAGE ─────────────────────────────────────────────────────────────────
function PlanPage({plan}){
  const[open,setOpen]=useState({0:true});
  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>{plan.name}</div>
        <Squiggle width={220}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>{plan.weeks.length} weeks · {plan.weeks[0]?.days.length||3} days/week</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        {[...new Set(plan.weeks.map(w=>w.phase))].map(ph=>{
          const wksInPhase=plan.weeks.filter(w=>w.phase===ph);
          return(
            <div key={ph} className="lime-card" style={{padding:20}}>
              <div style={{fontSize:28,marginBottom:8}}>{ph===1?"📈":"🏋️"}</div>
              <div style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a"}}>Phase {ph}</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:11,fontWeight:700,color:"#5a7a00",marginBottom:6}}>Weeks {wksInPhase[0].week}–{wksInPhase[wksInPhase.length-1].week}</div>
              <div style={{fontFamily:"'DM Sans'",fontSize:12,color:"#3d5700"}}>{wksInPhase.length} week{wksInPhase.length!==1?"s":""} · {wksInPhase[0].days.length} days/week</div>
            </div>
          );
        })}
      </div>
      {plan.weeks.map((w,wi)=>(
        <div key={wi} className="card" style={{marginBottom:10,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",cursor:"pointer"}} onClick={()=>setOpen(o=>({...o,[wi]:!o[wi]}))}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{background:w.phase===1?"#c8f040":"#1a1a1a",color:w.phase===1?"#1a1a1a":"#fff",borderRadius:99,fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,padding:"3px 10px",letterSpacing:"0.06em"}}>PHASE {w.phase}</span>
              <span style={{fontFamily:"'DM Serif Display'",fontSize:22,color:"#1a1a1a"}}>Week {w.week}</span>
            </div>
            <span style={{color:"#ccc",transform:open[wi]?"rotate(180deg)":"none",transition:"transform .2s",fontSize:15}}>▾</span>
          </div>
          {open[wi]&&(
            <div style={{padding:"0 20px 20px",borderTop:"2px solid #f5f0e8"}}>
              {w.days.map(d=>(
                <div key={d.id} style={{marginTop:18}}>
                  <div style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#1a1a1a",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>{d.emoji}</span>{d.label}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 60px 80px",gap:"4px 12px"}}>
                    {["Exercise","Sets","Reps"].map(l=><div key={l} style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.07em",paddingBottom:6,borderBottom:"2px solid #f5f0e8",textAlign:l==="Exercise"?"left":"center"}}>{l}</div>)}
                    {d.exercises.map(ex=>(
                      <>
                        <div key={ex.id+"n"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#333",padding:"6px 0",borderBottom:"1px solid #f5f0e8"}}>{ex.name}</div>
                        <div key={ex.id+"s"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa",textAlign:"center",padding:"6px 0",borderBottom:"1px solid #f5f0e8"}}>{ex.sets}</div>
                        <div key={ex.id+"r"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa",textAlign:"center",padding:"6px 0",borderBottom:"1px solid #f5f0e8"}}>{ex.reps}</div>
                      </>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── TRENDS PAGE ───────────────────────────────────────────────────────────────
function TrendsPage({plan}){
  const log=store.get("wlog")||{};
  const[selEx,setSelEx]=useState("");
  const allEx=[...new Set(plan.weeks.flatMap(w=>w.days.flatMap(d=>d.exercises.map(e=>e.name))))];
  const history=[];
  if(selEx){
    plan.weeks.forEach(w=>w.days.forEach(d=>d.exercises.forEach(ex=>{
      if(ex.name===selEx){
        const entry=log[`${d.id}::${ex.id}`];
        if(entry?.sets?.length){
          const s=entry.sets;
          const vol=s.reduce((a,s)=>a+(parseFloat(s.weight)||0)*(parseInt(s.reps)||0),0);
          const maxW=Math.max(...s.map(s=>parseFloat(s.weight)||0));
          history.push({label:`W${w.week}`,sets:s,vol,maxW,note:entry.note});
        }
      }
    })));
  }
  const maxVol=Math.max(...history.map(h=>h.vol),1);
  const maxW=Math.max(...history.map(h=>h.maxW),1);
  return(
    <div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Serif Display'",fontSize:36,color:"#1a1a1a"}}>Progress Trends</div>
        <Squiggle width={170}/>
        <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#999",marginTop:8,fontWeight:500}}>Track volume and strength gains over time</div>
      </div>
      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>Choose an Exercise</div>
        <select className="inp" value={selEx} onChange={e=>setSelEx(e.target.value)} style={{maxWidth:360,appearance:"none"}}>
          <option value="">— select exercise —</option>
          {allEx.map(e=><option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      {selEx&&history.length===0&&(
        <div className="card" style={{padding:48,textAlign:"center"}}>
          <div style={{fontSize:40,marginBottom:12}}>📊</div>
          <div style={{fontFamily:"'DM Serif Display'",fontSize:24,color:"#1a1a1a",marginBottom:8}}>No data yet</div>
          <div style={{fontFamily:"'DM Sans'",fontSize:13,color:"#aaa"}}>Log some sets in the Workout tab to see trends here.</div>
        </div>
      )}
      {history.length>0&&(
        <div style={{display:"grid",gap:14}}>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Total Volume per Session (lbs)</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:160,paddingBottom:28}}>
              {history.map((h,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                  <div style={{fontFamily:"'DM Sans'",fontSize:9,fontWeight:700,color:"#5a7a00",marginBottom:2}}>{h.vol>0?h.vol.toLocaleString():""}</div>
                  <div className="bar" style={{width:"100%",height:`${(h.vol/maxVol)*110}px`,background:"#c8f040"}}/>
                  <div style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa",fontWeight:600,marginTop:4}}>{h.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{padding:20}}>
            <div style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:16}}>Top Weight per Session (lbs)</div>
            <div style={{display:"flex",alignItems:"flex-end",gap:8,height:130,paddingBottom:28}}>
              {history.map((h,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
                  <div style={{fontFamily:"'DM Sans'",fontSize:9,fontWeight:700,color:"#888",marginBottom:2}}>{h.maxW>0?h.maxW:""}</div>
                  <div className="bar" style={{width:"100%",height:`${(h.maxW/maxW)*80}px`,background:"#1a1a1a"}}/>
                  <div style={{fontFamily:"'DM Sans'",fontSize:11,color:"#aaa",fontWeight:600,marginTop:4}}>{h.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{overflow:"hidden"}}>
            <div style={{padding:"16px 20px 12px",fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#bbb",textTransform:"uppercase",letterSpacing:"0.08em"}}>Session Breakdown</div>
            {history.map((h,i)=>(
              <div key={i} style={{borderTop:"2px solid #f5f0e8",padding:"14px 20px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontFamily:"'DM Serif Display'",fontSize:20,color:"#1a1a1a"}}>{h.label}</span>
                  <div style={{display:"flex",gap:7}}>
                    <span className="tag tag-muted">{h.sets.length} sets</span>
                    {h.vol>0&&<span className="tag tag-lime">{h.vol.toLocaleString()} lbs</span>}
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr",gap:8,marginBottom:h.note?10:0}}>
                  {["#","Weight","Reps","RPE"].map(l=><div key={l} style={{fontFamily:"'DM Sans'",fontSize:10,fontWeight:700,color:"#ccc",textTransform:"uppercase",letterSpacing:"0.06em",paddingBottom:4}}>{l}</div>)}
                  {h.sets.map((s,j)=>(
                    <>
                      <div key={j+"i"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#bbb"}}>{j+1}</div>
                      <div key={j+"w"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#333"}}>{s.weight?`${s.weight} lbs`:"—"}</div>
                      <div key={j+"r"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#333"}}>{s.reps||"—"}</div>
                      <div key={j+"p"} style={{fontFamily:"'DM Sans'",fontSize:13,color:"#bbb"}}>{s.rpe||"—"}</div>
                    </>
                  ))}
                </div>
                {h.note&&<div style={{background:"#f5f0e8",borderRadius:10,padding:"8px 12px",fontFamily:"'DM Sans'",fontSize:12,color:"#777",fontStyle:"italic"}}>"{h.note}"</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ── WORDMARK ──────────────────────────────────────────────────────────────────
function VolumeWordmark({ height = 32 }) {
  return (
    <img
      src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMjI0Ljg3OTk5IDc0Ljk5OTk5NyI+PGRlZnM+PGcvPjxjbGlwUGF0aCBpZD0iYjVlMGEyOWJmZCI+PHBhdGggZD0iTSA2IDQgTCAyMjMgNCBMIDIyMyA3NC45ODA0NjkgTCA2IDc0Ljk4MDQ2OSBaIE0gNiA0ICIgY2xpcC1ydWxlPSJub256ZXJvIi8+PC9jbGlwUGF0aD48Y2xpcFBhdGggaWQ9ImMyODlmY2QxYzMiPjxyZWN0IHg9IjAiIHk9IjAiLz48L2NsaXBQYXRoPjwvZGVmcz48ZyBjbGlwLXBhdGg9InVybCgjYjVlMGEyOWJmZCkiPjxnIHRyYW5zZm9ybT0ibWF0cml4KDEsIDAsIDAsIDEsIDYsIDQpIj48ZyBjbGlwLXBhdGg9InVybCgjYzI4OWZjZDFjMykiPjxnIGZpbGw9IiNjOGVjNDMiIGZpbGwtb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMS4wODM1MjMsIDU0LjM0NDg4NSkiPjxnPjxwYXRoIGQ9Ik0gMTAuODkwNjI1IC0xLjI2NTYyNSBDIDkuMjEwOTM4IC0xLjg0NzY1NiA3Ljc2NTYyNSAtMy4xNjQwNjIgNi41NDY4NzUgLTUuMjE4NzUgQyA1LjMyODEyNSAtNy4yNjk1MzEgNC4yNTM5MDYgLTEwLjIyNjU2MiAzLjMyODEyNSAtMTQuMDkzNzUgQyAyLjg2NzE4OCAtMTYuMDE5NTMxIDIuMzY3MTg4IC0xOC40NTMxMjUgMS44MjgxMjUgLTIxLjM5MDYyNSBDIDEuMjczNDM4IC0yNC4zNjcxODggMC42NjQwNjIgLTI3Ljk1MzEyNSAwIC0zMi4xNDA2MjUgTCAwIC0zMi40Njg3NSBDIDAgLTMyLjc1NzgxMiAwLjA2MjUgLTMzLjA5Mzc1IDAuMTg3NSAtMzMuNDY4NzUgQyAwLjMxMjUgLTMzLjk2ODc1IDAuNSAtMzQuMzkwNjI1IDAuNzUgLTM0LjczNDM3NSBDIDEuMDUwNzgxIC0zNS4xMDkzNzUgMS40NTMxMjUgLTM1LjM5ODQzOCAxLjk1MzEyNSAtMzUuNjA5Mzc1IEMgMi40MTAxNTYgLTM1Ljg1OTM3NSAyLjkyOTY4OCAtMzUuOTYwOTM4IDMuNTE1NjI1IC0zNS45MjE4NzUgQyA0LjA2NjQwNiAtMzUuOTIxODc1IDQuNTMxMjUgLTM1LjgzNTkzOCA0LjkwNjI1IC0zNS42NzE4NzUgQyA1LjI4MTI1IC0zNS40NjA5MzggNS42Nzk2ODggLTM1LjE0ODQzOCA2LjEwOTM3NSAtMzQuNzM0Mzc1IEMgNi40NDE0MDYgLTM0LjM0NzY1NiA2LjY0ODQzOCAtMzMuOTI1NzgxIDYuNzM0Mzc1IC0zMy40Njg3NSBDIDYuODU5Mzc1IC0zMy4wNTA3ODEgNy4xNDg0MzggLTMxLjM1MTU2MiA3LjYwOTM3NSAtMjguMzc1IEMgOC4wMjM0MzggLTI1LjcyNjU2MiA4LjQ0NTMxMiAtMjMuMzE2NDA2IDguODc1IC0yMS4xNDA2MjUgQyA5LjI4OTA2MiAtMTguOTUzMTI1IDkuNjY0MDYyIC0xNy4xOTE0MDYgMTAgLTE1Ljg1OTM3NSBDIDEwLjQ1NzAzMSAtMTQuMDAzOTA2IDEwLjk2MDkzOCAtMTIuMzY3MTg4IDExLjUxNTYyNSAtMTAuOTUzMTI1IEMgMTIuMDU0Njg4IC05LjQ4NDM3NSAxMi40NzI2NTYgLTguNjQ0NTMxIDEyLjc2NTYyNSAtOC40Mzc1IEMgMTMuMDY2NDA2IC04LjI1NzgxMiAxMy42MTMyODEgLTguODQzNzUgMTQuNDA2MjUgLTEwLjE4NzUgQyAxNS4yMDcwMzEgLTExLjUzMTI1IDE1LjkyMTg3NSAtMTMuMDYyNSAxNi41NDY4NzUgLTE0Ljc4MTI1IEMgMTcuNjc5Njg4IC0xNy44MDA3ODEgMTguNjAxNTYyIC0yMS4xNTYyNSAxOS4zMTI1IC0yNC44NDM3NSBDIDE5Ljk4ODI4MSAtMjguNSAyMC41MzUxNTYgLTMyLjczODI4MSAyMC45NTMxMjUgLTM3LjU2MjUgQyAyMS4wMzUxNTYgLTM5LjA3MDMxMiAyMS4xMTcxODggLTQwLjAzNTE1NiAyMS4yMDMxMjUgLTQwLjQ1MzEyNSBDIDIxLjI4NTE1NiAtNDAuODY3MTg4IDIxLjQyOTY4OCAtNDEuMjQyMTg4IDIxLjY0MDYyNSAtNDEuNTc4MTI1IEMgMjIuMzA0Njg4IC00Mi41ODU5MzggMjMuMjY5NTMxIC00My4wOTM3NSAyNC41MzEyNSAtNDMuMDkzNzUgQyAyNS43NSAtNDMuMDkzNzUgMjYuNjkxNDA2IC00Mi41NjY0MDYgMjcuMzU5Mzc1IC00MS41MTU2MjUgQyAyNy42MTcxODggLTQxLjE0MDYyNSAyNy43Njk1MzEgLTQwLjgyODEyNSAyNy44MTI1IC00MC41NzgxMjUgQyAyNy44NTE1NjIgLTQwLjQxMDE1NiAyNy44NzUgLTQwLjA3ODEyNSAyNy44NzUgLTM5LjU3ODEyNSBMIDI3Ljg3NSAtMzguNzUgQyAyNy44MzIwMzEgLTM3LjMyMDMxMiAyNy42Nzk2ODggLTM1LjI4OTA2MiAyNy40MjE4NzUgLTMyLjY1NjI1IEMgMjcuMTI4OTA2IC0yOS45Njg3NSAyNi44MTY0MDYgLTI3LjY2MDE1NiAyNi40ODQzNzUgLTI1LjczNDM3NSBDIDI1Ljc3MzQzOCAtMjEuNTc4MTI1IDI0LjgzMjAzMSAtMTcuNzM4MjgxIDIzLjY1NjI1IC0xNC4yMTg3NSBDIDIyLjQ3NjU2MiAtMTAuNjU2MjUgMjEuMTk1MzEyIC03LjgyMDMxMiAxOS44MTI1IC01LjcxODc1IEMgMTkuMjY5NTMxIC00LjkyNTc4MSAxOC41NzgxMjUgLTQuMTI4OTA2IDE3LjczNDM3NSAtMy4zMjgxMjUgQyAxNi44OTg0MzggLTIuNTc4MTI1IDE2LjE0NDUzMSAtMi4wMzUxNTYgMTUuNDY4NzUgLTEuNzAzMTI1IEMgMTQuODQzNzUgLTEuMzY3MTg4IDE0LjA3MDMxMiAtMS4xNTYyNSAxMy4xNTYyNSAtMS4wNjI1IEwgMTIuNDUzMTI1IC0xLjA2MjUgQyAxMS44NjcxODggLTEuMDYyNSAxMS4zNDc2NTYgLTEuMTI4OTA2IDEwLjg5MDYyNSAtMS4yNjU2MjUgWiBNIDEwLjg5MDYyNSAtMS4yNjU2MjUgIi8+PC9nPjwvZz48L2c+PGcgZmlsbD0iI2M4ZWM0MyIgZmlsbC1vcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNC43MDU5MjMsIDU0LjM0NDg4NSkiPjxnPjxwYXRoIGQ9Ik0gMTcuMDQ2ODc1IC0zMi4wNzgxMjUgQyAxOC44NDc2NTYgLTMxLjI4NTE1NiAyMC4zMzU5MzggLTMwLjE1NjI1IDIxLjUxNTYyNSAtMjguNjg3NSBDIDIyLjY5MTQwNiAtMjcuMjE4NzUgMjMuNTA3ODEyIC0yNS40Mzc1IDIzLjk2ODc1IC0yMy4zNDM3NSBDIDI0LjMwMDc4MSAtMjIuMDgyMDMxIDI0LjQ2ODc1IC0yMC45MjU3ODEgMjQuNDY4NzUgLTE5Ljg3NSBDIDI0LjQ2ODc1IC0xOC44MzIwMzEgMjQuMzAwNzgxIC0xNy41OTc2NTYgMjMuOTY4NzUgLTE2LjE3MTg3NSBDIDIzLjU5Mzc1IC0xNC40NTMxMjUgMjMuMDY2NDA2IC0xMi45ODQzNzUgMjIuMzkwNjI1IC0xMS43NjU2MjUgQyAyMS43NjU2MjUgLTEwLjU4NTkzOCAyMC44NjMyODEgLTkuNDI5Njg4IDE5LjY4NzUgLTguMjk2ODc1IEMgMTguMDkzNzUgLTYuNzk2ODc1IDE2LjIyNjU2MiAtNS43ODkwNjIgMTQuMDkzNzUgLTUuMjgxMjUgQyAxMy4yMDcwMzEgLTUuMDcwMzEyIDEyLjM2NzE4OCAtNC45ODgyODEgMTEuNTc4MTI1IC01LjAzMTI1IEMgMTAuMzk4NDM4IC01LjAzMTI1IDkuMjY1NjI1IC01LjIzODI4MSA4LjE3MTg3NSAtNS42NTYyNSBDIDYuNjE3MTg4IC02LjI4OTA2MiA1LjI4MTI1IC03LjMyMDMxMiA0LjE1NjI1IC04Ljc1IEMgMy4wMTk1MzEgLTEwLjE3NTc4MSAyLjIyMjY1NiAtMTEuODEyNSAxLjc2NTYyNSAtMTMuNjU2MjUgQyAxLjQ3MjY1NiAtMTQuOTU3MDMxIDEuMzA0Njg4IC0xNi4xNDg0MzggMS4yNjU2MjUgLTE3LjIzNDM3NSBDIDEuMjY1NjI1IC0xOC4zMjgxMjUgMS40MTAxNTYgLTE5LjYyODkwNiAxLjcwMzEyNSAtMjEuMTQwNjI1IEMgMS45OTIxODggLTIyLjYwOTM3NSAyLjM0NzY1NiAtMjMuOTA2MjUgMi43NjU2MjUgLTI1LjAzMTI1IEMgMy4xNzk2ODggLTI2LjIwNzAzMSAzLjc2OTUzMSAtMjcuNDQ1MzEyIDQuNTMxMjUgLTI4Ljc1IEMgNS43ODkwNjIgLTMwLjg0Mzc1IDYuODU5Mzc1IC0zMi4yMDcwMzEgNy43MzQzNzUgLTMyLjg0Mzc1IEMgOC4zMjgxMjUgLTMzLjI1NzgxMiA4Ljk3NjU2MiAtMzMuNDY4NzUgOS42ODc1IC0zMy40Njg3NSBDIDEwLjA2MjUgLTMzLjQ2ODc1IDEwLjQ2MDkzOCAtMzMuNDI1NzgxIDEwLjg5MDYyNSAtMzMuMzQzNzUgQyAxMS4wOTc2NTYgLTMzLjI1NzgxMiAxMS40NzI2NTYgLTMzLjE5NTMxMiAxMi4wMTU2MjUgLTMzLjE1NjI1IEMgMTIuNTE1NjI1IC0zMy4wNzAzMTIgMTMuMDM5MDYyIC0zMi45ODgyODEgMTMuNTkzNzUgLTMyLjkwNjI1IEMgMTQuMDUwNzgxIC0zMi44NjMyODEgMTQuNDI1NzgxIC0zMi44MjAzMTIgMTQuNzE4NzUgLTMyLjc4MTI1IEMgMTUuMDA3ODEyIC0zMi43ODEyNSAxNS4yODUxNTYgLTMyLjczODI4MSAxNS41NDY4NzUgLTMyLjY1NjI1IEMgMTUuNzk2ODc1IC0zMi42MTMyODEgMTYuMDIzNDM4IC0zMi41NTA3ODEgMTYuMjM0Mzc1IC0zMi40Njg3NSBDIDE2LjQ4NDM3NSAtMzIuMzgyODEyIDE2Ljc1MzkwNiAtMzIuMjUzOTA2IDE3LjA0Njg3NSAtMzIuMDc4MTI1IFogTSAxMS4zMjgxMjUgLTI2LjEwOTM3NSBDIDEwLjk5MjE4OCAtMjYuMDIzNDM4IDEwLjU5Mzc1IC0yNS41IDEwLjEyNSAtMjQuNTMxMjUgQyA5LjY2NDA2MiAtMjMuNTcwMzEyIDkuMjUgLTIyLjUwMzkwNiA4Ljg3NSAtMjEuMzI4MTI1IEMgOC43MDcwMzEgLTIwLjcwMzEyNSA4LjU2MjUgLTIwLjA3MDMxMiA4LjQzNzUgLTE5LjQzNzUgQyA4LjMwMDc4MSAtMTguODUxNTYyIDguMjM0Mzc1IC0xOC4zMjgxMjUgOC4yMzQzNzUgLTE3Ljg1OTM3NSBDIDguMTkxNDA2IC0xNS43NjU2MjUgOC42MzI4MTIgLTE0LjE0ODQzOCA5LjU2MjUgLTEzLjAxNTYyNSBDIDEwLjUzMTI1IC0xMS45Mjk2ODggMTEuNzI2NTYyIC0xMS42NjAxNTYgMTMuMTU2MjUgLTEyLjIwMzEyNSBDIDE0LjMyMDMxMiAtMTIuNjYwMTU2IDE1LjMyODEyNSAtMTMuNTYyNSAxNi4xNzE4NzUgLTE0LjkwNjI1IEMgMTcuMDAzOTA2IC0xNi4yODkwNjIgMTcuNDQxNDA2IC0xNy43NTc4MTIgMTcuNDg0Mzc1IC0xOS4zMTI1IEMgMTcuNTIzNDM4IC0yMC42NTYyNSAxNy4yOTY4NzUgLTIxLjkxNDA2MiAxNi43OTY4NzUgLTIzLjA5Mzc1IEMgMTYuMjUzOTA2IC0yNC4yNTc4MTIgMTUuNTgyMDMxIC0yNS4wNTQ2ODggMTQuNzgxMjUgLTI1LjQ4NDM3NSBDIDE0LjYxMzI4MSAtMjUuNTY2NDA2IDE0LjQyNTc4MSAtMjUuNjQ4NDM4IDE0LjIxODc1IC0yNS43MzQzNzUgQyAxNC4wMDc4MTIgLTI1LjgxNjQwNiAxMy43ODEyNSAtMjUuODc4OTA2IDEzLjUzMTI1IC0yNS45MjE4NzUgQyAxMy4wNjI1IC0yNi4wNDY4NzUgMTIuNjE3MTg4IC0yNi4xMDkzNzUgMTIuMjAzMTI1IC0yNi4xMDkzNzUgQyAxMS43ODUxNTYgLTI2LjE0ODQzOCAxMS40OTIxODggLTI2LjE0ODQzOCAxMS4zMjgxMjUgLTI2LjEwOTM3NSBaIE0gMTEuMzI4MTI1IC0yNi4xMDkzNzUgIi8+PC9nPjwvZz48L2c+PGcgZmlsbD0iI2M4ZWM0MyIgZmlsbC1vcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2NC40OTExMjIsIDU0LjM0NDg4NSkiPjxnPjxwYXRoIGQ9Ik0gNy4wNDY4NzUgLTAuMDYyNSBDIDUuODI4MTI1IC0wLjU2MjUgNC44MDA3ODEgLTEuMjM0Mzc1IDMuOTY4NzUgLTIuMDc4MTI1IEMgMy4xMjUgLTIuODY3MTg4IDIuNDI5Njg4IC0zLjg3NSAxLjg5MDYyNSAtNS4wOTM3NSBDIDEuMTcxODc1IC02LjYwMTU2MiAwLjY2NDA2MiAtOC4zODI4MTIgMC4zNzUgLTEwLjQzNzUgQyAwLjEyNSAtMTIuMTEzMjgxIDAgLTE0LjM5ODQzOCAwIC0xNy4yOTY4NzUgTCAwIC0xOS4yNSBDIDAuMDM5MDYyNSAtMjEuMzAwNzgxIDAuMTI1IC0yMy42NzE4NzUgMC4yNSAtMjYuMzU5Mzc1IEMgMC4zNzUgLTI5LjA4NTkzOCAwLjU2MjUgLTMyLjIzNDM3NSAwLjgxMjUgLTM1Ljc5Njg3NSBDIDAuODk0NTMxIC0zNy4zMDQ2ODggMC45NzY1NjIgLTM4LjYyODkwNiAxLjA2MjUgLTM5Ljc2NTYyNSBDIDEuMTU2MjUgLTQwLjg0NzY1NiAxLjIyMjY1NiAtNDEuNzg5MDYyIDEuMjY1NjI1IC00Mi41OTM3NSBDIDEuNDI5Njg4IC00NC4zNTE1NjIgMS41OTc2NTYgLTQ1LjQyMTg3NSAxLjc2NTYyNSAtNDUuNzk2ODc1IEMgMS45NzI2NTYgLTQ2LjIxMDkzOCAyLjMwNDY4OCAtNDYuNjEzMjgxIDIuNzY1NjI1IC00NyBDIDMuMzk4NDM4IC00Ny40NTcwMzEgNC4wNzAzMTIgLTQ3LjY4NzUgNC43ODEyNSAtNDcuNjg3NSBDIDUuMTk1MzEyIC00Ny42ODc1IDUuNjQwNjI1IC00Ny41ODIwMzEgNi4xMDkzNzUgLTQ3LjM3NSBDIDcuMzE2NDA2IC00Ni44NzUgOC4wMjM0MzggLTQ1Ljk3MjY1NiA4LjIzNDM3NSAtNDQuNjcxODc1IEMgOC4yNzM0MzggLTQ0LjM3ODkwNiA4LjI1MzkwNiAtNDMuNjY0MDYyIDguMTcxODc1IC00Mi41MzEyNSBDIDguMTI4OTA2IC00MS4zNTE1NjIgOC4wNDY4NzUgLTQwLjAwNzgxMiA3LjkyMTg3NSAtMzguNSBDIDcuODM1OTM4IC0zNy4wNzAzMTIgNy43MTA5MzggLTM1LjE2NDA2MiA3LjU0Njg3NSAtMzIuNzgxMjUgQyA3LjQyMTg3NSAtMzAuNDI1NzgxIDcuMjk2ODc1IC0yOC4zMjgxMjUgNy4xNzE4NzUgLTI2LjQ4NDM3NSBDIDYuOTYwOTM4IC0yMS43MDMxMjUgNi44Nzg5MDYgLTE4LjAwNzgxMiA2LjkyMTg3NSAtMTUuNDA2MjUgQyA3LjAwMzkwNiAtMTIuODEyNSA3LjI1MzkwNiAtMTAuODAwNzgxIDcuNjcxODc1IC05LjM3NSBDIDguMDQ2ODc1IC04LjAzMTI1IDguNTMxMjUgLTcuMTcxODc1IDkuMTI1IC02Ljc5Njg3NSBDIDkuNjY0MDYyIC02LjM3ODkwNiAxMC41NDY4NzUgLTYuMjUzOTA2IDExLjc2NTYyNSAtNi40MjE4NzUgQyAxMi41NTQ2ODggLTYuNTQ2ODc1IDEzLjU4MjAzMSAtNi44MTY0MDYgMTQuODQzNzUgLTcuMjM0Mzc1IEMgMTYuMTAxNTYyIC03LjY5MTQwNiAxNy4zODI4MTIgLTguMjM4MjgxIDE4LjY4NzUgLTguODc1IEMgMTkuNTE5NTMxIC05LjI1IDIwLjEwOTM3NSAtOS40NzY1NjIgMjAuNDUzMTI1IC05LjU2MjUgQyAyMC43ODUxNTYgLTkuNjQ0NTMxIDIxLjE2MDE1NiAtOS42NjQwNjIgMjEuNTc4MTI1IC05LjYyNSBDIDIyLjIwMzEyNSAtOS41ODIwMzEgMjIuNzI2NTYyIC05LjQzNzUgMjMuMTU2MjUgLTkuMTg3NSBDIDIzLjU3MDMxMiAtOC45NzY1NjIgMjMuOTQ1MzEyIC04LjYxNzE4OCAyNC4yODEyNSAtOC4xMDkzNzUgQyAyNC40NDUzMTIgLTcuODE2NDA2IDI0LjU1MDc4MSAtNy41NDY4NzUgMjQuNTkzNzUgLTcuMjk2ODc1IEMgMjQuNjc1NzgxIC03LjA4NTkzOCAyNC43MTg3NSAtNi43OTY4NzUgMjQuNzE4NzUgLTYuNDIxODc1IEMgMjQuNzE4NzUgLTYuMzM1OTM4IDI0LjY5NTMxMiAtNi4yNTM5MDYgMjQuNjU2MjUgLTYuMTcxODc1IEMgMjQuNjU2MjUgLTUuMTE3MTg4IDI0LjM2MzI4MSAtNC4zNDM3NSAyMy43ODEyNSAtMy44NDM3NSBDIDIzLjE5NTMxMiAtMy4zMzIwMzEgMjEuNzY5NTMxIC0yLjU5NzY1NiAxOS41IC0xLjY0MDYyNSBDIDE4Ljc1IC0xLjM0NzY1NiAxNy45MTAxNTYgLTEuMDMxMjUgMTYuOTg0Mzc1IC0wLjY4NzUgQyAxNi4wMjM0MzggLTAuMzUxNTYyIDE1LjI1IC0wLjEwMTU2MiAxNC42NTYyNSAwLjA2MjUgQyAxMy43MzgyODEgMC4yNjk1MzEgMTMuMDQ2ODc1IDAuMzk0NTMxIDEyLjU3ODEyNSAwLjQzNzUgQyAxMi4zMjgxMjUgMC40NzY1NjIgMTIuMDM1MTU2IDAuNSAxMS43MDMxMjUgMC41IEMgMTEuMzI4MTI1IDAuNSAxMC44NjMyODEgMC40NzY1NjIgMTAuMzEyNSAwLjQzNzUgQyA5LjM5NDUzMSAwLjM5NDUzMSA4LjcyMjY1NiAwLjM1MTU2MiA4LjI5Njg3NSAwLjMxMjUgQyA3Ljg3ODkwNiAwLjIyNjU2MiA3LjQ2MDkzOCAwLjEwMTU2MiA3LjA0Njg3NSAtMC4wNjI1IFogTSA3LjA0Njg3NSAtMC4wNjI1ICIvPjwvZz48L2c+PC9nPjxnIGZpbGw9IiNjOGVjNDMiIGZpbGwtb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOTQuMjc2MzIxLCA1NC4zNDQ4ODUpIj48Zz48cGF0aCBkPSJNIDIzLjc4MTI1IC0xIEMgMjMuNDQ1MzEyIC0xLjEzMjgxMiAyMy4wOTM3NSAtMS4zOTA2MjUgMjIuNzE4NzUgLTEuNzY1NjI1IEMgMjIuMzc1IC0yLjA5NzY1NiAyMi4wOTc2NTYgLTIuNDI5Njg4IDIxLjg5MDYyNSAtMi43NjU2MjUgQyAyMS44MDQ2ODggLTIuOTcyNjU2IDIxLjcyMjY1NiAtMy4zOTQ1MzEgMjEuNjQwNjI1IC00LjAzMTI1IEMgMjEuNTU0Njg4IC00LjY1NjI1IDIxLjQ5MjE4OCAtNS41OTc2NTYgMjEuNDUzMTI1IC02Ljg1OTM3NSBDIDIxLjM2NzE4OCAtOC43NDIxODggMjEuMjg1MTU2IC0xMCAyMS4yMDMxMjUgLTEwLjYyNSBDIDIxLjE2MDE1NiAtMTEuMjU3ODEyIDIxLjA3ODEyNSAtMTEuNTc4MTI1IDIwLjk1MzEyNSAtMTEuNTc4MTI1IEMgMjAuOTEwMTU2IC0xMS41NzgxMjUgMjAuODA0Njg4IC0xMS40MTAxNTYgMjAuNjQwNjI1IC0xMS4wNzgxMjUgQyAyMC40Mjk2ODggLTEwLjc3MzQzOCAyMC4yMTg3NSAtMTAuNDE0MDYyIDIwIC0xMCBDIDE5LjQxNDA2MiAtOSAxOC44MzIwMzEgLTguMDk3NjU2IDE4LjI1IC03LjI5Njg3NSBDIDE3LjYxMzI4MSAtNi41MDM5MDYgMTYuODk4NDM4IC01Ljc1IDE2LjEwOTM3NSAtNS4wMzEyNSBDIDE0Ljk3MjY1NiAtMy45Mzc1IDEzLjc5Njg3NSAtMy4xNzk2ODggMTIuNTc4MTI1IC0yLjc2NTYyNSBDIDExLjMxNjQwNiAtMi4zNDc2NTYgMTAuMTAxNTYyIC0yLjI4NTE1NiA4LjkzNzUgLTIuNTc4MTI1IEMgNiAtMy4yOTY4NzUgMy44MzU5MzggLTUuODEyNSAyLjQ1MzEyNSAtMTAuMTI1IEMgMS4wMjM0MzggLTE0LjQwNjI1IDAuMjI2NTYyIC0yMC45MjU3ODEgMC4wNjI1IC0yOS42ODc1IEMgMC4wMTk1MzEyIC0zMS4xOTUzMTIgMCAtMzIuNTYyNSAwIC0zMy43ODEyNSBDIDAgLTM0Ljk1NzAzMSAwLjAxOTUzMTIgLTM1LjYyODkwNiAwLjA2MjUgLTM1Ljc5Njg3NSBDIDAuMTQ0NTMxIC0zNi4xMjg5MDYgMC4zOTQ1MzEgLTM2LjUzMTI1IDAuODEyNSAtMzcgQyAxLjIzODI4MSAtMzcuNDU3MDMxIDEuNjQwNjI1IC0zNy43NSAyLjAxNTYyNSAtMzcuODc1IEMgMi40Mjk2ODggLTM4LjA4MjAzMSAyLjg5MDYyNSAtMzguMTY0MDYyIDMuMzkwNjI1IC0zOC4xMjUgQyAzLjg5ODQzOCAtMzguMTI1IDQuMzYzMjgxIC0zOC4wMTk1MzEgNC43ODEyNSAtMzcuODEyNSBDIDUuNjY0MDYyIC0zNy4zOTQ1MzEgNi4yMTA5MzggLTM2Ljg0NzY1NiA2LjQyMTg3NSAtMzYuMTcxODc1IEMgNi42Mjg5MDYgLTM1LjQ2MDkzOCA2Ljc3MzQzOCAtMzMuNzY1NjI1IDYuODU5Mzc1IC0zMS4wNzgxMjUgQyA2Ljk4NDM3NSAtMjYuODc4OTA2IDcuMTcxODc1IC0yMy40NjA5MzggNy40MjE4NzUgLTIwLjgyODEyNSBDIDcuNjcxODc1IC0xOC4yMjI2NTYgOC4wNzAzMTIgLTE1Ljg3NSA4LjYyNSAtMTMuNzgxMjUgQyA4Ljg3NSAtMTIuNzI2NTYyIDkuMTY0MDYyIC0xMS44MDQ2ODggOS41IC0xMS4wMTU2MjUgQyA5LjgzMjAzMSAtMTAuMjUzOTA2IDEwLjEyNSAtOS43ODkwNjIgMTAuMzc1IC05LjYyNSBDIDEwLjU4MjAzMSAtOS41IDEwLjg3ODkwNiAtOS41ODIwMzEgMTEuMjY1NjI1IC05Ljg3NSBDIDExLjY3OTY4OCAtMTAuMTY0MDYyIDEyLjE0MDYyNSAtMTAuNjcxODc1IDEyLjY0MDYyNSAtMTEuMzkwNjI1IEMgMTQuMzU5Mzc1IC0xMy42OTE0MDYgMTUuODY3MTg4IC0xNy4wMDM5MDYgMTcuMTcxODc1IC0yMS4zMjgxMjUgQyAxOC40Mjk2ODggLTI1LjY5MTQwNiAxOS41NjY0MDYgLTMxLjM3NSAyMC41NzgxMjUgLTM4LjM3NSBDIDIwLjc4NTE1NiAtNDAuMDUwNzgxIDIwLjk3MjY1NiAtNDEuMTQwNjI1IDIxLjE0MDYyNSAtNDEuNjQwNjI1IEMgMjEuMzA0Njg4IC00Mi4xMDkzNzUgMjEuNjE3MTg4IC00Mi41NTA3ODEgMjIuMDc4MTI1IC00Mi45Njg3NSBDIDIyLjQ1MzEyNSAtNDMuMzAwNzgxIDIyLjg3NSAtNDMuNTMxMjUgMjMuMzQzNzUgLTQzLjY1NjI1IEMgMjMuNjMyODEyIC00My43MzgyODEgMjMuOTI1NzgxIC00My43ODEyNSAyNC4yMTg3NSAtNDMuNzgxMjUgTCAyNC45MDYyNSAtNDMuNzgxMjUgQyAyNS4zNzUgLTQzLjY5NTMxMiAyNS43NzM0MzggLTQzLjU1MDc4MSAyNi4xMDkzNzUgLTQzLjM0Mzc1IEMgMjYuNDQxNDA2IC00My4wOTM3NSAyNi44MTY0MDYgLTQyLjcxODc1IDI3LjIzNDM3NSAtNDIuMjE4NzUgQyAyNy4zNTkzNzUgLTQyLjA5Mzc1IDI3LjU1MDc4MSAtNDEuODU5Mzc1IDI3LjgxMjUgLTQxLjUxNTYyNSBDIDI3Ljg1MTU2MiAtMzguMjAzMTI1IDI3Ljg5NDUzMSAtMzMuMjM0Mzc1IDI3LjkzNzUgLTI2LjYwOTM3NSBDIDI3Ljk3NjU2MiAtMjIuMzY3MTg4IDI4LjAxOTUzMSAtMTguNDQ1MzEyIDI4LjA2MjUgLTE0Ljg0Mzc1IEMgMjguMTQ0NTMxIC0xMS4yMzgyODEgMjguMjA3MDMxIC04Ljg5MDYyNSAyOC4yNSAtNy43OTY4NzUgQyAyOC4zMzIwMzEgLTYuNDEwMTU2IDI4LjM3NSAtNS4zNjMyODEgMjguMzc1IC00LjY1NjI1IEwgMjguMzc1IC0zLjc4MTI1IEMgMjguMjg5MDYyIC0zLjEwMTU2MiAyOC4wNjI1IC0yLjUzNTE1NiAyNy42ODc1IC0yLjA3ODEyNSBDIDI3LjI1NzgxMiAtMS41MzUxNTYgMjYuNjcxODc1IC0xLjE1NjI1IDI1LjkyMTg3NSAtMC45Mzc1IEMgMjUuNTQ2ODc1IC0wLjg1MTU2MiAyNS4yMDcwMzEgLTAuODEyNSAyNC45MDYyNSAtMC44MTI1IEMgMjQuNDg4MjgxIC0wLjgxMjUgMjQuMTEzMjgxIC0wLjg3NSAyMy43ODEyNSAtMSBaIE0gMjMuNzgxMjUgLTEgIi8+PC9nPjwvZz48L2c+PGcgZmlsbD0iI2M4ZWM0MyIgZmlsbC1vcGFjaXR5PSIxIj48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMjcuODk4NzIsIDU0LjM0NDg4NSkiPjxnPjxwYXRoIGQ9Ik0gNDcuMjUgNC41OTM3NSBDIDQ2LjQ4ODI4MSA0LjEzMjgxMiA0Ni4wMDM5MDYgMy41NDY4NzUgNDUuNzk2ODc1IDIuODI4MTI1IEMgNDUuNTg1OTM4IDIuMTE3MTg4IDQ1LjU0Njg3NSAwLjkwNjI1IDQ1LjY3MTg3NSAtMC44MTI1IEMgNDUuNzk2ODc1IC0yLjY2NDA2MiA0NS44OTg0MzggLTQuNDkyMTg4IDQ1Ljk4NDM3NSAtNi4yOTY4NzUgQyA0Ni4wNjY0MDYgLTguMDk3NjU2IDQ2LjEwOTM3NSAtOS43OTY4NzUgNDYuMTA5Mzc1IC0xMS4zOTA2MjUgQyA0Ni4xMDkzNzUgLTE0LjM2NzE4OCA0Ni4wMDM5MDYgLTE2LjgyMDMxMiA0NS43OTY4NzUgLTE4Ljc1IEMgNDUuNTg1OTM4IC0yMC43MTg3NSA0NS4yOTY4NzUgLTIxLjc0MjE4OCA0NC45MjE4NzUgLTIxLjgyODEyNSBDIDQ0LjUwMzkwNiAtMjEuOTUzMTI1IDQzLjUxOTUzMSAtMjAuODQzNzUgNDEuOTY4NzUgLTE4LjUgQyA0MC4zNzUgLTE2LjE0NDUzMSAzOC44MjAzMTIgLTEzLjQ1NzAzMSAzNy4zMTI1IC0xMC40Mzc1IEMgMzUuNzE4NzUgLTcuMjUgMzQuNSAtNS4yMTg3NSAzMy42NTYyNSAtNC4zNDM3NSBDIDMyLjgyMDMxMiAtMy40MTQwNjIgMzEuNzM0Mzc1IC0yLjk5MjE4OCAzMC4zOTA2MjUgLTMuMDc4MTI1IEMgMjkuNDYwOTM4IC0zLjE2MDE1NiAyOC42ODc1IC0zLjUgMjguMDYyNSAtNC4wOTM3NSBDIDI3LjQyNTc4MSAtNC43MTg3NSAyNi45NjA5MzggLTUuNTU0Njg4IDI2LjY3MTg3NSAtNi42MDkzNzUgQyAyNi4zNzg5MDYgLTcuNjkxNDA2IDI2LjE5MTQwNiAtOS4zMjgxMjUgMjYuMTA5Mzc1IC0xMS41MTU2MjUgQyAyNi4wMjM0MzggLTEzLjY5MTQwNiAyNi4wMDM5MDYgLTE3LjQ4ODI4MSAyNi4wNDY4NzUgLTIyLjkwNjI1IEMgMjYuMDg1OTM4IC0yNS41MzkwNjIgMjYuMDg1OTM4IC0yNy45Mjk2ODggMjYuMDQ2ODc1IC0zMC4wNzgxMjUgQyAyNi4wMDM5MDYgLTMyLjIxMDkzOCAyNS45MjE4NzUgLTMzLjkxMDE1NiAyNS43OTY4NzUgLTM1LjE3MTg3NSBDIDI1Ljc1MzkwNiAtMzYuMDQ2ODc1IDI1LjcxMDkzOCAtMzYuNjA5Mzc1IDI1LjY3MTg3NSAtMzYuODU5Mzc1IEMgMjUuNTg1OTM4IC0zNy4xMTcxODggMjUuNDg0Mzc1IC0zNy4yMDcwMzEgMjUuMzU5Mzc1IC0zNy4xMjUgQyAyNS4yMzQzNzUgLTM2Ljk4ODI4MSAyNC43MjY1NjIgLTM1LjY4NzUgMjMuODQzNzUgLTMzLjIxODc1IEMgMjIuOTU3MDMxIC0zMC43MzgyODEgMjEuODkwNjI1IC0yNy41MzEyNSAyMC42NDA2MjUgLTIzLjU5Mzc1IEMgMTkuNjI4OTA2IC0yMC42MTMyODEgMTguNzUgLTE4LjAxNTYyNSAxOCAtMTUuNzk2ODc1IEMgMTcuMjM4MjgxIC0xMy41NjY0MDYgMTYuNTQ2ODc1IC0xMS42NTYyNSAxNS45MjE4NzUgLTEwLjA2MjUgQyAxNC43ODUxNTYgLTcuMTI1IDEzLjc5Njg3NSAtNS4wNTA3ODEgMTIuOTUzMTI1IC0zLjg0Mzc1IEMgMTIuMTYwMTU2IC0yLjYyNSAxMS4yNTc4MTIgLTEuNzY1NjI1IDEwLjI1IC0xLjI2NTYyNSBDIDkuNzA3MDMxIC0xLjAwMzkwNiA5LjE0NDUzMSAtMC44NTE1NjIgOC41NjI1IC0wLjgxMjUgQyA4LjAwNzgxMiAtMC44MTI1IDcuNDQxNDA2IC0wLjkxNDA2MiA2Ljg1OTM3NSAtMS4xMjUgQyA1LjIyMjY1NiAtMS43NTc4MTIgMy45NjA5MzggLTMuNTAzOTA2IDMuMDc4MTI1IC02LjM1OTM3NSBDIDIuMjAzMTI1IC05LjIwMzEyNSAxLjQyNTc4MSAtMTQuMDg1OTM4IDAuNzUgLTIxLjAxNTYyNSBDIDAuNjI1IC0yMi4xNDg0MzggMC40NzY1NjIgLTIzLjU1NDY4OCAwLjMxMjUgLTI1LjIzNDM3NSBDIDAuMTQ0NTMxIC0yNi45NTMxMjUgMCAtMjguNDM3NSAtMC4xMjUgLTI5LjY4NzUgQyAtMC4zMzIwMzEgLTMxLjgzMjAzMSAtMC40Mzc1IC0zMy4zMjAzMTIgLTAuNDM3NSAtMzQuMTU2MjUgTCAtMC40Mzc1IC0zNC42MDkzNzUgQyAtMC4zOTQ1MzEgLTM1LjMxNjQwNiAtMC4xMjUgLTM1LjkyMTg3NSAwLjM3NSAtMzYuNDIxODc1IEMgMC43NSAtMzYuODQ3NjU2IDEuMTcxODc1IC0zNy4xNjQwNjIgMS42NDA2MjUgLTM3LjM3NSBDIDIuMDU0Njg4IC0zNy41MzkwNjIgMi41NzgxMjUgLTM3LjYwMTU2MiAzLjIwMzEyNSAtMzcuNTYyNSBDIDQuMDg1OTM4IC0zNy40NzY1NjIgNC44MDA3ODEgLTM3LjE2MDE1NiA1LjM0Mzc1IC0zNi42MDkzNzUgQyA1Ljg5NDUzMSAtMzYuMDY2NDA2IDYuMjM0Mzc1IC0zNS4zMzIwMzEgNi4zNTkzNzUgLTM0LjQwNjI1IEMgNi4zOTg0MzggLTM0LjE1NjI1IDYuNTAzOTA2IC0zMy4yMzQzNzUgNi42NzE4NzUgLTMxLjY0MDYyNSBDIDYuODM1OTM4IC0zMC4wNDY4NzUgNy4wMDM5MDYgLTI4LjI2NTYyNSA3LjE3MTg3NSAtMjYuMjk2ODc1IEMgNy43MTA5MzggLTIwLjk3MjY1NiA4LjExMzI4MSAtMTcuMjM4MjgxIDguMzc1IC0xNS4wOTM3NSBDIDguNjY0MDYyIC0xMi45NTcwMzEgOC44OTQ1MzEgLTExLjg5MDYyNSA5LjA2MjUgLTExLjg5MDYyNSBDIDkuMTg3NSAtMTEuODQ3NjU2IDkuNTM5MDYyIC0xMi42NDQ1MzEgMTAuMTI1IC0xNC4yODEyNSBDIDEwLjcxODc1IC0xNS45MTQwNjIgMTEuNzUgLTE4Ljk3NjU2MiAxMy4yMTg3NSAtMjMuNDY4NzUgQyAxNC44OTQ1MzEgLTI4LjU4MjAzMSAxNi4xNDg0MzggLTMyLjI2OTUzMSAxNi45ODQzNzUgLTM0LjUzMTI1IEMgMTcuNzg1MTU2IC0zNi44NDM3NSAxOC41IC0zOC43MTA5MzggMTkuMTI1IC00MC4xNDA2MjUgQyAyMC4wMDc4MTIgLTQyLjE5MTQwNiAyMC44NDc2NTYgLTQzLjc4NTE1NiAyMS42NDA2MjUgLTQ0LjkyMTg3NSBDIDIyLjM5ODQzOCAtNDYuMDU0Njg4IDIzLjIzODI4MSAtNDYuODk0NTMxIDI0LjE1NjI1IC00Ny40Mzc1IEMgMjQuNjEzMjgxIC00Ny42ODc1IDI0Ljk3MjY1NiAtNDcuODUxNTYyIDI1LjIzNDM3NSAtNDcuOTM3NSBDIDI1LjQ4NDM3NSAtNDcuOTc2NTYyIDI1LjgzNTkzOCAtNDggMjYuMjk2ODc1IC00OCBMIDI2LjQyMTg3NSAtNDggQyAyOS4wMjM0MzggLTQ3Ljk1NzAzMSAzMC43ODUxNTYgLTQ2LjE1NjI1IDMxLjcwMzEyNSAtNDIuNTkzNzUgQyAzMi42NzE4NzUgLTM5LjAzMTI1IDMzLjA5Mzc1IC0zMi42MTMyODEgMzIuOTY4NzUgLTIzLjM0Mzc1IEwgMzIuOTY4NzUgLTE4LjkzNzUgQyAzMy4wMDc4MTIgLTE4LjIxODc1IDMzLjA3MDMxMiAtMTcuODU5Mzc1IDMzLjE1NjI1IC0xNy44NTkzNzUgQyAzMy4xOTUzMTIgLTE3Ljg1OTM3NSAzMy4zNjMyODEgLTE4LjA3MDMxMiAzMy42NTYyNSAtMTguNSBDIDMzLjk0NTMxMiAtMTguOTE0MDYyIDM0LjI2NTYyNSAtMTkuNDE0MDYyIDM0LjYwOTM3NSAtMjAgQyAzNS45ODQzNzUgLTIyLjM1MTU2MiAzNy4zODI4MTIgLTI0LjI4NTE1NiAzOC44MTI1IC0yNS43OTY4NzUgQyA0MC4yMzgyODEgLTI3LjMwNDY4OCA0MS42MjUgLTI4LjMzMjAzMSA0Mi45Njg3NSAtMjguODc1IEMgNDMuNTUwNzgxIC0yOS4xMjUgNDQuMDE1NjI1IC0yOS4yNjk1MzEgNDQuMzU5Mzc1IC0yOS4zMTI1IEMgNDQuNjkxNDA2IC0yOS4zNTE1NjIgNDUuMjM0Mzc1IC0yOS4zNTE1NjIgNDUuOTg0Mzc1IC0yOS4zMTI1IEMgNDYuNzQyMTg4IC0yOS4yMjY1NjIgNDcuMjY5NTMxIC0yOS4xNDQ1MzEgNDcuNTYyNSAtMjkuMDYyNSBDIDQ3Ljg1MTU2MiAtMjguOTc2NTYyIDQ4LjIwNzAzMSAtMjguNzg5MDYyIDQ4LjYyNSAtMjguNSBDIDQ5LjM0Mzc1IC0yOC4wODIwMzEgNDkuOTUzMTI1IC0yNy41MTU2MjUgNTAuNDUzMTI1IC0yNi43OTY4NzUgQyA1MC45OTIxODggLTI2LjA4NTkzOCA1MS40Mzc1IC0yNS4yMjY1NjIgNTEuNzgxMjUgLTI0LjIxODc1IEMgNTIuNDQ1MzEyIC0yMi4yNSA1Mi44NDM3NSAtMTkuNTQ2ODc1IDUyLjk2ODc1IC0xNi4xMDkzNzUgQyA1My4wMDc4MTIgLTE1LjAxNTYyNSA1My4wMzEyNSAtMTMuNzk2ODc1IDUzLjAzMTI1IC0xMi40NTMxMjUgQyA1My4wMzEyNSAtOS42NDA2MjUgNTIuOTI1NzgxIC02LjMyODEyNSA1Mi43MTg3NSAtMi41MTU2MjUgQyA1Mi42MzI4MTIgLTAuMzM1OTM4IDUyLjU1MDc4MSAxLjA2NjQwNiA1Mi40Njg3NSAxLjcwMzEyNSBDIDUyLjQyNTc4MSAyLjMyODEyNSA1Mi4zMjAzMTIgMi44MDQ2ODggNTIuMTU2MjUgMy4xNDA2MjUgQyA1MS45MDYyNSAzLjYwOTM3NSA1MS42NTYyNSAzLjk0NTMxMiA1MS40MDYyNSA0LjE1NjI1IEMgNTEuMTQ0NTMxIDQuNDA2MjUgNTAuNzg1MTU2IDQuNjMyODEyIDUwLjMyODEyNSA0Ljg0Mzc1IEMgNDkuOTUzMTI1IDQuOTY4NzUgNDkuNTU0Njg4IDUuMDMxMjUgNDkuMTQwNjI1IDUuMDMxMjUgTCA0OC44MTI1IDUuMDMxMjUgQyA0OC4yMjY1NjIgNC45ODgyODEgNDcuNzA3MDMxIDQuODQzNzUgNDcuMjUgNC41OTM3NSBaIE0gNDcuMjUgNC41OTM3NSAiLz48L2c+PC9nPjwvZz48ZyBmaWxsPSIjYzhlYzQzIiBmaWxsLW9wYWNpdHk9IjEiPjxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE4NS45OTExMzYsIDU0LjM0NDg4NSkiPjxnPjxwYXRoIGQ9Ik0gNi4xMDkzNzUgMCBDIDQuODkwNjI1IC0wLjM3NSAzLjg1OTM3NSAtMS4wMjM0MzggMy4wMTU2MjUgLTEuOTUzMTI1IEMgMi4xNzk2ODggLTIuODI4MTI1IDEuNTA3ODEyIC0zLjk3NjU2MiAxIC01LjQwNjI1IEMgMC41MzkwNjIgLTYuNjI1IDAuMjUgLTcuNzgxMjUgMC4xMjUgLTguODc1IEMgMC4wMzkwNjI1IC05LjkxNDA2MiAwIC0xMS45Njg3NSAwIC0xNS4wMzEyNSBDIDAgLTE3LjI1NzgxMiAwLjAxOTUzMTIgLTE4LjkzNzUgMC4wNjI1IC0yMC4wNjI1IEMgMC4xMDE1NjIgLTIxLjE1NjI1IDAuMjY5NTMxIC0yMy4wMDM5MDYgMC41NjI1IC0yNS42MDkzNzUgQyAwLjY4NzUgLTI2LjQ0MTQwNiAwLjgxMjUgLTI3LjQyNTc4MSAwLjkzNzUgLTI4LjU2MjUgQyAxLjA2MjUgLTI5LjY5NTMxMiAxLjIxMDkzOCAtMzEgMS4zOTA2MjUgLTMyLjQ2ODc1IEMgMS41NTQ2ODggLTMzLjg0Mzc1IDEuODA0Njg4IC0zNS44NzUgMi4xNDA2MjUgLTM4LjU2MjUgQyAxLjk3MjY1NiAtMzguNzI2NTYyIDEuNzQyMTg4IC0zOC45Mzc1IDEuNDUzMTI1IC0zOS4xODc1IEMgMC41MjM0MzggLTM5Ljk4ODI4MSAwLjA4MjAzMTIgLTQwLjk1NzAzMSAwLjEyNSAtNDIuMDkzNzUgQyAwLjIwNzAzMSAtNDMuMjU3ODEyIDAuNzM0Mzc1IC00NC4xNzk2ODggMS43MDMxMjUgLTQ0Ljg1OTM3NSBDIDIuMDc4MTI1IC00NS4xMDkzNzUgMy40MTQwNjIgLTQ1LjQyMTg3NSA1LjcxODc1IC00NS43OTY4NzUgQyA4LjAzMTI1IC00Ni4yMTA5MzggMTAuODIwMzEyIC00Ni42MTMyODEgMTQuMDkzNzUgLTQ3IEMgMTUuNTYyNSAtNDcuMTY0MDYyIDE2LjYyODkwNiAtNDcuMjUgMTcuMjk2ODc1IC00Ny4yNSBMIDE3LjY3MTg3NSAtNDcuMjUgQyAxOC4yNjU2MjUgLTQ3LjIwNzAzMSAxOC44MzIwMzEgLTQ2Ljk1MzEyNSAxOS4zNzUgLTQ2LjQ4NDM3NSBDIDE5LjcwNzAzMSAtNDYuMTkxNDA2IDIwIC00NS43OTY4NzUgMjAuMjUgLTQ1LjI5Njg3NSBDIDIwLjUwNzgxMiAtNDQuNzUzOTA2IDIwLjY0MDYyNSAtNDQuMjg5MDYyIDIwLjY0MDYyNSAtNDMuOTA2MjUgQyAyMC42NDA2MjUgLTQzLjM2MzI4MSAyMC40NDUzMTIgLTQyLjc4MTI1IDIwLjA2MjUgLTQyLjE1NjI1IEMgMTkuNjg3NSAtNDEuNTYyNSAxOS4yMjY1NjIgLTQxLjExNzE4OCAxOC42ODc1IC00MC44MjgxMjUgQyAxOC41NjI1IC00MC43NDIxODggMTguMDc4MTI1IC00MC42NDA2MjUgMTcuMjM0Mzc1IC00MC41MTU2MjUgQyAxNi4zNTkzNzUgLTQwLjM0NzY1NiAxNS4zOTQ1MzEgLTQwLjIwMzEyNSAxNC4zNDM3NSAtNDAuMDc4MTI1IEMgMTEuNjEzMjgxIC0zOS43NDIxODggMTAuMDgyMDMxIC0zOS41MTU2MjUgOS43NSAtMzkuMzkwNjI1IEMgOS40MTQwNjIgLTM5LjI5Njg3NSA5LjIwNzAzMSAtMzguOTU3MDMxIDkuMTI1IC0zOC4zNzUgQyA5IC0zNy41ODIwMzEgOC44NzUgLTM2LjY3OTY4OCA4Ljc1IC0zNS42NzE4NzUgQyA4LjYyNSAtMzQuNzAzMTI1IDguNSAtMzMuNjk1MzEyIDguMzc1IC0zMi42NTYyNSBMIDcuNzk2ODc1IC0yNy41NjI1IEMgNy42NzE4NzUgLTI2LjA1MDc4MSA3LjYyODkwNiAtMjUuMjk2ODc1IDcuNjcxODc1IC0yNS4yOTY4NzUgQyA3LjcxMDkzOCAtMjUuMjk2ODc1IDcuODc4OTA2IC0yNS4zMzU5MzggOC4xNzE4NzUgLTI1LjQyMTg3NSBDIDguNTE1NjI1IC0yNS41MDM5MDYgOC44OTQ1MzEgLTI1LjYyODkwNiA5LjMxMjUgLTI1Ljc5Njg3NSBDIDEwLjYxMzI4MSAtMjYuMTI4OTA2IDExLjYxNzE4OCAtMjYuMjUzOTA2IDEyLjMyODEyNSAtMjYuMTcxODc1IEMgMTMuMDg1OTM4IC0yNi4wODU5MzggMTMuNzM4MjgxIC0yNS43NTM5MDYgMTQuMjgxMjUgLTI1LjE3MTg3NSBDIDE0LjkwNjI1IC0yNC40OTIxODggMTUuMTk1MzEyIC0yMy42NzU3ODEgMTUuMTU2MjUgLTIyLjcxODc1IEMgMTUuMTU2MjUgLTIxLjc4OTA2MiAxNC44MDA3ODEgLTIwLjk5MjE4OCAxNC4wOTM3NSAtMjAuMzI4MTI1IEMgMTMuODgyODEyIC0yMC4xMDkzNzUgMTMuNTIzNDM4IC0xOS45MTQwNjIgMTMuMDE1NjI1IC0xOS43NSBDIDEyLjUxNTYyNSAtMTkuNTM5MDYyIDExLjc2NTYyNSAtMTkuMjY5NTMxIDEwLjc2NTYyNSAtMTguOTM3NSBDIDkuMTE3MTg4IC0xOC40NzY1NjIgOC4wNjY0MDYgLTE4LjE0NDUzMSA3LjYwOTM3NSAtMTcuOTM3NSBDIDcuMTQ4NDM4IC0xNy42NzU3ODEgNi44Nzg5MDYgLTE3LjQyMTg3NSA2Ljc5Njg3NSAtMTcuMTcxODc1IEMgNi43MTA5MzggLTE2LjgzNTkzOCA2LjY3MTg3NSAtMTUuOTE0MDYyIDYuNjcxODc1IC0xNC40MDYyNSBDIDYuNzEwOTM4IC0xMi44OTQ1MzEgNi43NzM0MzggLTExLjcwMzEyNSA2Ljg1OTM3NSAtMTAuODI4MTI1IEMgNi45ODQzNzUgLTkuODk4NDM4IDcuMTI4OTA2IC05LjA4MjAzMSA3LjI5Njg3NSAtOC4zNzUgQyA3LjQ2MDkzOCAtNy42NTYyNSA3LjY0ODQzOCAtNy4xNzE4NzUgNy44NTkzNzUgLTYuOTIxODc1IEMgOC4wNjY0MDYgLTYuNjcxODc1IDguNDI1NzgxIC02LjU2NjQwNiA4LjkzNzUgLTYuNjA5Mzc1IEMgOS40NzY1NjIgLTYuNjQ4NDM4IDEwLjE0ODQzOCAtNi44NTkzNzUgMTAuOTUzMTI1IC03LjIzNDM3NSBDIDExLjg2NzE4OCAtNy42OTE0MDYgMTIuODMyMDMxIC04LjMyMDMxMiAxMy44NDM3NSAtOS4xMjUgQyAxNC44NDM3NSAtOS44NzUgMTYuMDM1MTU2IC0xMC45NDE0MDYgMTcuNDIxODc1IC0xMi4zMjgxMjUgQyAxOC43NjU2MjUgLTEzLjYyODkwNiAxOS43MDcwMzEgLTE0LjQ0NTMxMiAyMC4yNSAtMTQuNzgxMjUgQyAyMC44MDA3ODEgLTE1LjA3MDMxMiAyMS40NzI2NTYgLTE1LjE1NjI1IDIyLjI2NTYyNSAtMTUuMDMxMjUgQyAyMi42NDg0MzggLTE0Ljk0NTMxMiAyMi45NDUzMTIgLTE0Ljg2MzI4MSAyMy4xNTYyNSAtMTQuNzgxMjUgQyAyMy40MDYyNSAtMTQuNjU2MjUgMjMuNjc1NzgxIC0xNC40MjU3ODEgMjMuOTY4NzUgLTE0LjA5Mzc1IEMgMjQuNTUwNzgxIC0xMy41MDc4MTIgMjQuOTA2MjUgLTEyLjg1OTM3NSAyNS4wMzEyNSAtMTIuMTQwNjI1IEMgMjUuMDgyMDMxIC0xMS45NzI2NTYgMjUuMTA5Mzc1IC0xMS43ODUxNTYgMjUuMTA5Mzc1IC0xMS41NzgxMjUgQyAyNS4xMDkzNzUgLTExLjA3ODEyNSAyNC45NzY1NjIgLTEwLjU1MDc4MSAyNC43MTg3NSAtMTAgQyAyNC41OTM3NSAtOS43ODkwNjIgMjQuMTU2MjUgLTkuMzEyNSAyMy40MDYyNSAtOC41NjI1IEMgMjIuNjQ0NTMxIC03Ljc1NzgxMiAyMS44MjgxMjUgLTYuOTYwOTM4IDIwLjk1MzEyNSAtNi4xNzE4NzUgQyAyMC4zNTkzNzUgLTUuNjE3MTg4IDE5Ljc4OTA2MiAtNS4wOTM3NSAxOS4yNSAtNC41OTM3NSBDIDE4LjcwNzAzMSAtNC4xMzI4MTIgMTguMjY5NTMxIC0zLjc1MzkwNiAxNy45Mzc1IC0zLjQ1MzEyNSBDIDE1LjcwNzAzMSAtMS43NzM0MzggMTMuNTg1OTM4IC0wLjY0NDUzMSAxMS41NzgxMjUgLTAuMDYyNSBDIDEwLjUyMzQzOCAwLjIyNjU2MiA5LjUxOTUzMSAwLjM3NSA4LjU2MjUgMC4zNzUgQyA3LjcxODc1IDAuMzc1IDYuODk4NDM4IDAuMjUgNi4xMDkzNzUgMCBaIE0gNi4xMDkzNzUgMCAiLz48L2c+PC9nPjwvZz48L2c+PC9nPjwvZz48L3N2Zz4="
      alt="Volume"
      style={{height, display:"block", width:"auto"}}
    />
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("workout");
  const [plan, setPlan] = useState(()=>store.get("plan")||DEFAULT_PLAN);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(()=>{
    const s=document.createElement("style");
    s.textContent=STYLES;
    document.head.appendChild(s);
    // favicon
    const link = document.querySelector("link[rel~='icon']") || document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMTUwIDE1Ny45MiI+PGRlZnM+PGcvPjxjbGlwUGF0aCBpZD0iMmIzNTdmNTJlMiI+PHBhdGggZD0iTSAwLjAzOTA2MjUgMCBMIDE0OS45NjA5MzggMCBMIDE0OS45NjA5MzggMTQ5LjkyNTc4MSBMIDAuMDM5MDYyNSAxNDkuOTI1NzgxIFogTSAwLjAzOTA2MjUgMCAiIGNsaXAtcnVsZT0ibm9uemVybyIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSI4YzE5MThjZmZjIj48cGF0aCBkPSJNIDI1IDAgTCAxMzggMCBMIDEzOCAxNDkuOTI1NzgxIEwgMjUgMTQ5LjkyNTc4MSBaIE0gMjUgMCAiIGNsaXAtcnVsZT0ibm9uemVybyIvPjwvY2xpcFBhdGg+PGNsaXBQYXRoIGlkPSJkZjQwYWY0NWJjIj48cmVjdCB4PSIwIiB5PSIwIi8+PC9jbGlwUGF0aD48L2RlZnM+PGcgY2xpcC1wYXRoPSJ1cmwoIzJiMzU3ZjUyZTIpIj48cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNIDAuMDM5MDYyNSAwIEwgMTQ5Ljk2MDkzOCAwIEwgMTQ5Ljk2MDkzOCAxNDkuOTI1NzgxIEwgMC4wMzkwNjI1IDE0OS45MjU3ODEgWiBNIDAuMDM5MDYyNSAwICIgZmlsbC1vcGFjaXR5PSIxIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48cGF0aCBmaWxsPSIjYzhlYzQzIiBkPSJNIDAuMDM5MDYyNSAwIEwgMTQ5Ljk2MDkzOCAwIEwgMTQ5Ljk2MDkzOCAxNDkuOTI1NzgxIEwgMC4wMzkwNjI1IDE0OS45MjU3ODEgWiBNIDAuMDM5MDYyNSAwICIgZmlsbC1vcGFjaXR5PSIxIiBmaWxsLXJ1bGU9Im5vbnplcm8iLz48L2c+PGcgY2xpcC1wYXRoPSJ1cmwoIzhjMTkxOGNmZmMpIj48ZyB0cmFuc2Zvcm09Im1hdHJpeCgxLCAwLCAwLCAxLCAyNSwgMC4wMDAwMDAwMDAwMDAwMDQ2NTMpIj48ZyBjbGlwLXBhdGg9InVybCgjZGY0MGFmNDViYykiPjxnIGZpbGw9IiNmMWU4ZDciIGZpbGwtb3BhY2l0eT0iMSI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMi4wNDQ1MjgsIDE0Ni4xMDAxODEpIj48Zz48cGF0aCBkPSJNIDM1LjIxODc1IC00LjA3ODEyNSBDIDI5Ljc4OTA2MiAtNS45NzI2NTYgMjUuMTA5Mzc1IC0xMC4yNDIxODggMjEuMTcxODc1IC0xNi44OTA2MjUgQyAxNy4yMzQzNzUgLTIzLjUzNTE1NiAxMy43Njk1MzEgLTMzLjEwMTU2MiAxMC43ODEyNSAtNDUuNTkzNzUgQyA5LjI4OTA2MiAtNTEuODMyMDMxIDcuNjY0MDYyIC01OS43MDMxMjUgNS45MDYyNSAtNjkuMjAzMTI1IEMgNC4xMzI4MTIgLTc4LjgzNTkzOCAyLjE2NDA2MiAtOTAuNDM3NSAwIC0xMDQgTCAwIC0xMDUuMDMxMjUgQyAwIC0xMDUuOTc2NTYyIDAuMjAzMTI1IC0xMDcuMDYyNSAwLjYwOTM3NSAtMTA4LjI4MTI1IEMgMS4wMTU2MjUgLTEwOS45MDYyNSAxLjYyNSAtMTExLjI2NTYyNSAyLjQzNzUgLTExMi4zNTkzNzUgQyAzLjM5NDUzMSAtMTEzLjU3ODEyNSA0LjY4NzUgLTExNC41MjM0MzggNi4zMTI1IC0xMTUuMjAzMTI1IEMgNy44MDA3ODEgLTExNi4wMTU2MjUgOS40OTIxODggLTExNi4zNTE1NjIgMTEuMzkwNjI1IC0xMTYuMjE4NzUgQyAxMy4xNjAxNTYgLTExNi4yMTg3NSAxNC42NTYyNSAtMTE1Ljk0NTMxMiAxNS44NzUgLTExNS40MDYyNSBDIDE3LjA5Mzc1IC0xMTQuNzI2NTYyIDE4LjM4MjgxMiAtMTEzLjcxMDkzOCAxOS43NSAtMTEyLjM1OTM3NSBDIDIwLjgzMjAzMSAtMTExLjEyODkwNiAyMS41MDc4MTIgLTEwOS43Njk1MzEgMjEuNzgxMjUgLTEwOC4yODEyNSBDIDIyLjE4NzUgLTEwNi45MjU3ODEgMjMuMTMyODEyIC0xMDEuNDI5Njg4IDI0LjYyNSAtOTEuNzk2ODc1IEMgMjUuOTc2NTYyIC04My4yNDIxODggMjcuMzM1OTM4IC03NS40NDE0MDYgMjguNzAzMTI1IC02OC4zOTA2MjUgQyAzMC4wNTQ2ODggLTYxLjMyODEyNSAzMS4yNzM0MzggLTU1LjYyODkwNiAzMi4zNTkzNzUgLTUxLjI5Njg3NSBDIDMzLjg0NzY1NiAtNDUuMzE2NDA2IDM1LjQ3NjU2MiAtNDAuMDIzNDM4IDM3LjI1IC0zNS40MjE4NzUgQyAzOS4wMDc4MTIgLTMwLjY3MTg3NSA0MC4zNjMyODEgLTI3Ljk1NzAzMSA0MS4zMTI1IC0yNy4yODEyNSBDIDQyLjI2OTUzMSAtMjYuNzI2NTYyIDQ0LjAzNTE1NiAtMjguNjI1IDQ2LjYwOTM3NSAtMzIuOTY4NzUgQyA0OS4xOTE0MDYgLTM3LjMxMjUgNTEuNSAtNDIuMjY1NjI1IDUzLjUzMTI1IC00Ny44MjgxMjUgQyA1Ny4xOTUzMTIgLTU3LjU5NzY1NiA2MC4xNzk2ODggLTY4LjQ1MzEyNSA2Mi40ODQzNzUgLTgwLjM5MDYyNSBDIDY0LjY2MDE1NiAtOTIuMjAzMTI1IDY2LjQyNTc4MSAtMTA1LjkxMDE1NiA2Ny43ODEyNSAtMTIxLjUxNTYyNSBDIDY4LjA1MDc4MSAtMTI2LjM5ODQzOCA2OC4zMjAzMTIgLTEyOS41MTk1MzEgNjguNTkzNzUgLTEzMC44NzUgQyA2OC44NjMyODEgLTEzMi4yMjY1NjIgNjkuMzM1OTM4IC0xMzMuNDQ1MzEyIDcwLjAxNTYyNSAtMTM0LjUzMTI1IEMgNzIuMTc5Njg4IC0xMzcuNzg5MDYyIDc1LjMwMDc4MSAtMTM5LjQyMTg3NSA3OS4zNzUgLTEzOS40MjE4NzUgQyA4My4zMTI1IC0xMzkuNDIxODc1IDg2LjM2MzI4MSAtMTM3LjcyMjY1NiA4OC41MzEyNSAtMTM0LjMyODEyNSBDIDg5LjM1MTU2MiAtMTMzLjEwOTM3NSA4OS44MzIwMzEgLTEzMi4wOTM3NSA4OS45Njg3NSAtMTMxLjI4MTI1IEMgOTAuMTAxNTYyIC0xMzAuNzM4MjgxIDkwLjE3MTg3NSAtMTI5LjY1NjI1IDkwLjE3MTg3NSAtMTI4LjAzMTI1IEwgOTAuMTcxODc1IC0xMjUuMzc1IEMgOTAuMDM1MTU2IC0xMjAuNzU3ODEyIDg5LjU1NDY4OCAtMTE0LjE3OTY4OCA4OC43MzQzNzUgLTEwNS42NDA2MjUgQyA4Ny43ODUxNTYgLTk2Ljk1MzEyNSA4Ni43Njk1MzEgLTg5LjQ4ODI4MSA4NS42ODc1IC04My4yNSBDIDgzLjM4MjgxMiAtNjkuODEyNSA4MC4zMzIwMzEgLTU3LjM5NDUzMSA3Ni41MzEyNSAtNDYgQyA3Mi43MjY1NjIgLTM0LjQ2ODc1IDY4LjU4NTkzOCAtMjUuMzA0Njg4IDY0LjEwOTM3NSAtMTguNTE1NjI1IEMgNjIuMzQ3NjU2IC0xNS45NDE0MDYgNjAuMTA5Mzc1IC0xMy4zNjMyODEgNTcuMzkwNjI1IC0xMC43ODEyNSBDIDU0LjY3OTY4OCAtOC4zNDM3NSA1Mi4yMzgyODEgLTYuNTgyMDMxIDUwLjA2MjUgLTUuNSBDIDQ4LjAzMTI1IC00LjQxNDA2MiA0NS41MjM0MzggLTMuNzM0Mzc1IDQyLjU0Njg3NSAtMy40NTMxMjUgTCA0MC4yOTY4NzUgLTMuNDUzMTI1IEMgMzguMzk4NDM4IC0zLjQ1MzEyNSAzNi43MDcwMzEgLTMuNjYwMTU2IDM1LjIxODc1IC00LjA3ODEyNSBaIE0gMzUuMjE4NzUgLTQuMDc4MTI1ICIvPjwvZz48L2c+PC9nPjwvZz48L2c+PC9nPjwvc3ZnPg==";
    document.head.appendChild(link);
    return()=>{ try{document.head.removeChild(s);}catch{} };
  },[]);

  const handleImport = (newPlan) => {
    setPlan(newPlan);
    store.set("plan", newPlan);
    setImportSuccess(true);
    setTab("workout");
    setTimeout(()=>setImportSuccess(false), 4000);
  };

  const handleRestore = (backup) => {
    setPlan(backup.plan);
    store.set("plan", backup.plan);
    store.set("wlog", backup.log);
    setImportSuccess(true);
    setTab("workout");
    setTimeout(()=>setImportSuccess(false), 4000);
  };

  return (
    <div style={{background:"#f5f0e8",minHeight:"100vh"}}>
      <header style={{background:"#fff",borderBottom:"2px solid #ede8de",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:800,margin:"0 auto",padding:"12px 20px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{marginRight:12,display:"flex",alignItems:"center",height:36}}>
            <VolumeWordmark height={36} />
          </div>
          <div className="tab-wrap">
            {[
              {id:"workout",label:"Workout"},
              {id:"plan",label:"Plan"},
              {id:"trends",label:"Trends"},
              {id:"import",label:"↑ Import"},
            ].map(t=>(
              <button key={t.id} className={`tab-btn ${tab===t.id?"on":"off"}`} onClick={()=>setTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      {importSuccess && (
        <div style={{background:"#c8f040",padding:"10px 20px",textAlign:"center"}}>
          <span style={{fontFamily:"'DM Sans'",fontSize:13,fontWeight:700,color:"#1a1a1a"}}>✓ Done! Now running: <em>{plan.name}</em></span>
        </div>
      )}

      <main style={{maxWidth:800,margin:"0 auto",padding:"28px 16px 60px"}}>
        {tab==="workout" && <WorkoutPage plan={plan}/>}
        {tab==="plan"    && <PlanPage plan={plan}/>}
        {tab==="trends"  && <TrendsPage plan={plan}/>}
        {tab==="import"  && <ImportPage onImport={handleImport} onRestore={handleRestore} plan={plan}/>}
      </main>
    </div>
  );
}
