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
    <div
      dangerouslySetInnerHTML={{__html: `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 224.87999 74.999997"><defs><g/><clipPath id="b5e0a29bfd"><path d="M 6 4 L 223 4 L 223 74.980469 L 6 74.980469 Z M 6 4 " clip-rule="nonzero"/></clipPath><clipPath id="c289fcd1c3"><rect x="0" y="0"/></clipPath></defs><g clip-path="url(#b5e0a29bfd)"><g transform="matrix(1, 0, 0, 1, 6, 4)"><g clip-path="url(#c289fcd1c3)"><g fill="#c8ec43" fill-opacity="1"><g transform="translate(1.083523, 54.344885)"><g><path d="M 10.890625 -1.265625 C 9.210938 -1.847656 7.765625 -3.164062 6.546875 -5.21875 C 5.328125 -7.269531 4.253906 -10.226562 3.328125 -14.09375 C 2.867188 -16.019531 2.367188 -18.453125 1.828125 -21.390625 C 1.273438 -24.367188 0.664062 -27.953125 0 -32.140625 L 0 -32.46875 C 0 -32.757812 0.0625 -33.09375 0.1875 -33.46875 C 0.3125 -33.96875 0.5 -34.390625 0.75 -34.734375 C 1.050781 -35.109375 1.453125 -35.398438 1.953125 -35.609375 C 2.410156 -35.859375 2.929688 -35.960938 3.515625 -35.921875 C 4.066406 -35.921875 4.53125 -35.835938 4.90625 -35.671875 C 5.28125 -35.460938 5.679688 -35.148438 6.109375 -34.734375 C 6.441406 -34.347656 6.648438 -33.925781 6.734375 -33.46875 C 6.859375 -33.050781 7.148438 -31.351562 7.609375 -28.375 C 8.023438 -25.726562 8.445312 -23.316406 8.875 -21.140625 C 9.289062 -18.953125 9.664062 -17.191406 10 -15.859375 C 10.457031 -14.003906 10.960938 -12.367188 11.515625 -10.953125 C 12.054688 -9.484375 12.472656 -8.644531 12.765625 -8.4375 C 13.066406 -8.257812 13.613281 -8.84375 14.40625 -10.1875 C 15.207031 -11.53125 15.921875 -13.0625 16.546875 -14.78125 C 17.679688 -17.800781 18.601562 -21.15625 19.3125 -24.84375 C 19.988281 -28.5 20.535156 -32.738281 20.953125 -37.5625 C 21.035156 -39.070312 21.117188 -40.035156 21.203125 -40.453125 C 21.285156 -40.867188 21.429688 -41.242188 21.640625 -41.578125 C 22.304688 -42.585938 23.269531 -43.09375 24.53125 -43.09375 C 25.75 -43.09375 26.691406 -42.566406 27.359375 -41.515625 C 27.617188 -41.140625 27.769531 -40.828125 27.8125 -40.578125 C 27.851562 -40.410156 27.875 -40.078125 27.875 -39.578125 L 27.875 -38.75 C 27.832031 -37.320312 27.679688 -35.289062 27.421875 -32.65625 C 27.128906 -29.96875 26.816406 -27.660156 26.484375 -25.734375 C 25.773438 -21.578125 24.832031 -17.738281 23.65625 -14.21875 C 22.476562 -10.65625 21.195312 -7.820312 19.8125 -5.71875 C 19.269531 -4.925781 18.578125 -4.128906 17.734375 -3.328125 C 16.898438 -2.578125 16.144531 -2.035156 15.46875 -1.703125 C 14.84375 -1.367188 14.070312 -1.15625 13.15625 -1.0625 L 12.453125 -1.0625 C 11.867188 -1.0625 11.347656 -1.128906 10.890625 -1.265625 Z M 10.890625 -1.265625 "/></g></g></g><g fill="#c8ec43" fill-opacity="1"><g transform="translate(34.705923, 54.344885)"><g><path d="M 17.046875 -32.078125 C 18.847656 -31.285156 20.335938 -30.15625 21.515625 -28.6875 C 22.691406 -27.21875 23.507812 -25.4375 23.96875 -23.34375 C 24.300781 -22.082031 24.46875 -20.925781 24.46875 -19.875 C 24.46875 -18.832031 24.300781 -17.597656 23.96875 -16.171875 C 23.59375 -14.453125 23.066406 -12.984375 22.390625 -11.765625 C 21.765625 -10.585938 20.863281 -9.429688 19.6875 -8.296875 C 18.09375 -6.796875 16.226562 -5.789062 14.09375 -5.28125 C 13.207031 -5.070312 12.367188 -4.988281 11.578125 -5.03125 C 10.398438 -5.03125 9.265625 -5.238281 8.171875 -5.65625 C 6.617188 -6.289062 5.28125 -7.320312 4.15625 -8.75 C 3.019531 -10.175781 2.222656 -11.8125 1.765625 -13.65625 C 1.472656 -14.957031 1.304688 -16.148438 1.265625 -17.234375 C 1.265625 -18.328125 1.410156 -19.628906 1.703125 -21.140625 C 1.992188 -22.609375 2.347656 -23.90625 2.765625 -25.03125 C 3.179688 -26.207031 3.769531 -27.445312 4.53125 -28.75 C 5.789062 -30.84375 6.859375 -32.207031 7.734375 -32.84375 C 8.328125 -33.257812 8.976562 -33.46875 9.6875 -33.46875 C 10.0625 -33.46875 10.460938 -33.425781 10.890625 -33.34375 C 11.097656 -33.257812 11.472656 -33.195312 12.015625 -33.15625 C 12.515625 -33.070312 13.039062 -32.988281 13.59375 -32.90625 C 14.050781 -32.863281 14.425781 -32.820312 14.71875 -32.78125 C 15.007812 -32.78125 15.285156 -32.738281 15.546875 -32.65625 C 15.796875 -32.613281 16.023438 -32.550781 16.234375 -32.46875 C 16.484375 -32.382812 16.753906 -32.253906 17.046875 -32.078125 Z M 11.328125 -26.109375 C 10.992188 -26.023438 10.59375 -25.5 10.125 -24.53125 C 9.664062 -23.570312 9.25 -22.503906 8.875 -21.328125 C 8.707031 -20.703125 8.5625 -20.070312 8.4375 -19.4375 C 8.300781 -18.851562 8.234375 -18.328125 8.234375 -17.859375 C 8.191406 -15.765625 8.632812 -14.148438 9.5625 -13.015625 C 10.53125 -11.929688 11.726562 -11.660156 13.15625 -12.203125 C 14.320312 -12.660156 15.328125 -13.5625 16.171875 -14.90625 C 17.003906 -16.289062 17.441406 -17.757812 17.484375 -19.3125 C 17.523438 -20.65625 17.296875 -21.914062 16.796875 -23.09375 C 16.253906 -24.257812 15.582031 -25.054688 14.78125 -25.484375 C 14.613281 -25.566406 14.425781 -25.648438 14.21875 -25.734375 C 14.007812 -25.816406 13.78125 -25.878906 13.53125 -25.921875 C 13.0625 -26.046875 12.617188 -26.109375 12.203125 -26.109375 C 11.785156 -26.148438 11.492188 -26.148438 11.328125 -26.109375 Z M 11.328125 -26.109375 "/></g></g></g><g fill="#c8ec43" fill-opacity="1"><g transform="translate(64.491122, 54.344885)"><g><path d="M 7.046875 -0.0625 C 5.828125 -0.5625 4.800781 -1.234375 3.96875 -2.078125 C 3.125 -2.867188 2.429688 -3.875 1.890625 -5.09375 C 1.171875 -6.601562 0.664062 -8.382812 0.375 -10.4375 C 0.125 -12.113281 0 -14.398438 0 -17.296875 L 0 -19.25 C 0.0390625 -21.300781 0.125 -23.671875 0.25 -26.359375 C 0.375 -29.085938 0.5625 -32.234375 0.8125 -35.796875 C 0.894531 -37.304688 0.976562 -38.628906 1.0625 -39.765625 C 1.15625 -40.847656 1.222656 -41.789062 1.265625 -42.59375 C 1.429688 -44.351562 1.597656 -45.421875 1.765625 -45.796875 C 1.972656 -46.210938 2.304688 -46.613281 2.765625 -47 C 3.398438 -47.457031 4.070312 -47.6875 4.78125 -47.6875 C 5.195312 -47.6875 5.640625 -47.582031 6.109375 -47.375 C 7.316406 -46.875 8.023438 -45.972656 8.234375 -44.671875 C 8.273438 -44.378906 8.253906 -43.664062 8.171875 -42.53125 C 8.128906 -41.351562 8.046875 -40.007812 7.921875 -38.5 C 7.835938 -37.070312 7.710938 -35.164062 7.546875 -32.78125 C 7.421875 -30.425781 7.296875 -28.328125 7.171875 -26.484375 C 6.960938 -21.703125 6.878906 -18.007812 6.921875 -15.40625 C 7.003906 -12.8125 7.253906 -10.800781 7.671875 -9.375 C 8.046875 -8.03125 8.53125 -7.171875 9.125 -6.796875 C 9.664062 -6.378906 10.546875 -6.253906 11.765625 -6.421875 C 12.554688 -6.546875 13.582031 -6.816406 14.84375 -7.234375 C 16.101562 -7.691406 17.382812 -8.238281 18.6875 -8.875 C 19.519531 -9.25 20.109375 -9.476562 20.453125 -9.5625 C 20.785156 -9.644531 21.160156 -9.664062 21.578125 -9.625 C 22.203125 -9.582031 22.726562 -9.4375 23.15625 -9.1875 C 23.570312 -8.976562 23.945312 -8.617188 24.28125 -8.109375 C 24.445312 -7.816406 24.550781 -7.546875 24.59375 -7.296875 C 24.675781 -7.085938 24.71875 -6.796875 24.71875 -6.421875 C 24.71875 -6.335938 24.695312 -6.253906 24.65625 -6.171875 C 24.65625 -5.117188 24.363281 -4.34375 23.78125 -3.84375 C 23.195312 -3.332031 21.769531 -2.597656 19.5 -1.640625 C 18.75 -1.347656 17.910156 -1.03125 16.984375 -0.6875 C 16.023438 -0.351562 15.25 -0.101562 14.65625 0.0625 C 13.738281 0.269531 13.046875 0.394531 12.578125 0.4375 C 12.328125 0.476562 12.035156 0.5 11.703125 0.5 C 11.328125 0.5 10.863281 0.476562 10.3125 0.4375 C 9.394531 0.394531 8.722656 0.351562 8.296875 0.3125 C 7.878906 0.226562 7.460938 0.101562 7.046875 -0.0625 Z M 7.046875 -0.0625 "/></g></g></g><g fill="#c8ec43" fill-opacity="1"><g transform="translate(94.276321, 54.344885)"><g><path d="M 23.78125 -1 C 23.445312 -1.132812 23.09375 -1.390625 22.71875 -1.765625 C 22.375 -2.097656 22.097656 -2.429688 21.890625 -2.765625 C 21.804688 -2.972656 21.722656 -3.394531 21.640625 -4.03125 C 21.554688 -4.65625 21.492188 -5.597656 21.453125 -6.859375 C 21.367188 -8.742188 21.285156 -10 21.203125 -10.625 C 21.160156 -11.257812 21.078125 -11.578125 20.953125 -11.578125 C 20.910156 -11.578125 20.804688 -11.410156 20.640625 -11.078125 C 20.429688 -10.773438 20.21875 -10.414062 20 -10 C 19.414062 -9 18.832031 -8.097656 18.25 -7.296875 C 17.613281 -6.503906 16.898438 -5.75 16.109375 -5.03125 C 14.972656 -3.9375 13.796875 -3.179688 12.578125 -2.765625 C 11.316406 -2.347656 10.101562 -2.285156 8.9375 -2.578125 C 6 -3.296875 3.835938 -5.8125 2.453125 -10.125 C 1.023438 -14.40625 0.226562 -20.925781 0.0625 -29.6875 C 0.0195312 -31.195312 0 -32.5625 0 -33.78125 C 0 -34.957031 0.0195312 -35.628906 0.0625 -35.796875 C 0.144531 -36.128906 0.394531 -36.53125 0.8125 -37 C 1.238281 -37.457031 1.640625 -37.75 2.015625 -37.875 C 2.429688 -38.082031 2.890625 -38.164062 3.390625 -38.125 C 3.898438 -38.125 4.363281 -38.019531 4.78125 -37.8125 C 5.664062 -37.394531 6.210938 -36.847656 6.421875 -36.171875 C 6.628906 -35.460938 6.773438 -33.765625 6.859375 -31.078125 C 6.984375 -26.878906 7.171875 -23.460938 7.421875 -20.828125 C 7.671875 -18.222656 8.070312 -15.875 8.625 -13.78125 C 8.875 -12.726562 9.164062 -11.804688 9.5 -11.015625 C 9.832031 -10.253906 10.125 -9.789062 10.375 -9.625 C 10.582031 -9.5 10.878906 -9.582031 11.265625 -9.875 C 11.679688 -10.164062 12.140625 -10.671875 12.640625 -11.390625 C 14.359375 -13.691406 15.867188 -17.003906 17.171875 -21.328125 C 18.429688 -25.691406 19.566406 -31.375 20.578125 -38.375 C 20.785156 -40.050781 20.972656 -41.140625 21.140625 -41.640625 C 21.304688 -42.109375 21.617188 -42.550781 22.078125 -42.96875 C 22.453125 -43.300781 22.875 -43.53125 23.34375 -43.65625 C 23.632812 -43.738281 23.925781 -43.78125 24.21875 -43.78125 L 24.90625 -43.78125 C 25.375 -43.695312 25.773438 -43.550781 26.109375 -43.34375 C 26.441406 -43.09375 26.816406 -42.71875 27.234375 -42.21875 C 27.359375 -42.09375 27.550781 -41.859375 27.8125 -41.515625 C 27.851562 -38.203125 27.894531 -33.234375 27.9375 -26.609375 C 27.976562 -22.367188 28.019531 -18.445312 28.0625 -14.84375 C 28.144531 -11.238281 28.207031 -8.890625 28.25 -7.796875 C 28.332031 -6.410156 28.375 -5.363281 28.375 -4.65625 L 28.375 -3.78125 C 28.289062 -3.101562 28.0625 -2.535156 27.6875 -2.078125 C 27.257812 -1.535156 26.671875 -1.15625 25.921875 -0.9375 C 25.546875 -0.851562 25.207031 -0.8125 24.90625 -0.8125 C 24.488281 -0.8125 24.113281 -0.875 23.78125 -1 Z M 23.78125 -1 "/></g></g></g><g fill="#c8ec43" fill-opacity="1"><g transform="translate(127.89872, 54.344885)"><g><path d="M 47.25 4.59375 C 46.488281 4.132812 46.003906 3.546875 45.796875 2.828125 C 45.585938 2.117188 45.546875 0.90625 45.671875 -0.8125 C 45.796875 -2.664062 45.898438 -4.492188 45.984375 -6.296875 C 46.066406 -8.097656 46.109375 -9.796875 46.109375 -11.390625 C 46.109375 -14.367188 46.003906 -16.820312 45.796875 -18.75 C 45.585938 -20.71875 45.296875 -21.742188 44.921875 -21.828125 C 44.503906 -21.953125 43.519531 -20.84375 41.96875 -18.5 C 40.375 -16.144531 38.820312 -13.457031 37.3125 -10.4375 C 35.71875 -7.25 34.5 -5.21875 33.65625 -4.34375 C 32.820312 -3.414062 31.734375 -2.992188 30.390625 -3.078125 C 29.460938 -3.160156 28.6875 -3.5 28.0625 -4.09375 C 27.425781 -4.71875 26.960938 -5.554688 26.671875 -6.609375 C 26.378906 -7.691406 26.191406 -9.328125 26.109375 -11.515625 C 26.023438 -13.691406 26.003906 -17.488281 26.046875 -22.90625 C 26.085938 -25.539062 26.085938 -27.929688 26.046875 -30.078125 C 26.003906 -32.210938 25.921875 -33.910156 25.796875 -35.171875 C 25.753906 -36.046875 25.710938 -36.609375 25.671875 -36.859375 C 25.585938 -37.117188 25.484375 -37.207031 25.359375 -37.125 C 25.234375 -36.988281 24.726562 -35.6875 23.84375 -33.21875 C 22.957031 -30.738281 21.890625 -27.53125 20.640625 -23.59375 C 19.628906 -20.613281 18.75 -18.015625 18 -15.796875 C 17.238281 -13.566406 16.546875 -11.65625 15.921875 -10.0625 C 14.785156 -7.125 13.796875 -5.050781 12.953125 -3.84375 C 12.160156 -2.625 11.257812 -1.765625 10.25 -1.265625 C 9.707031 -1.003906 9.144531 -0.851562 8.5625 -0.8125 C 8.007812 -0.8125 7.441406 -0.914062 6.859375 -1.125 C 5.222656 -1.757812 3.960938 -3.503906 3.078125 -6.359375 C 2.203125 -9.203125 1.425781 -14.085938 0.75 -21.015625 C 0.625 -22.148438 0.476562 -23.554688 0.3125 -25.234375 C 0.144531 -26.953125 0 -28.4375 -0.125 -29.6875 C -0.332031 -31.832031 -0.4375 -33.320312 -0.4375 -34.15625 L -0.4375 -34.609375 C -0.394531 -35.316406 -0.125 -35.921875 0.375 -36.421875 C 0.75 -36.847656 1.171875 -37.164062 1.640625 -37.375 C 2.054688 -37.539062 2.578125 -37.601562 3.203125 -37.5625 C 4.085938 -37.476562 4.800781 -37.160156 5.34375 -36.609375 C 5.894531 -36.066406 6.234375 -35.332031 6.359375 -34.40625 C 6.398438 -34.15625 6.503906 -33.234375 6.671875 -31.640625 C 6.835938 -30.046875 7.003906 -28.265625 7.171875 -26.296875 C 7.710938 -20.972656 8.113281 -17.238281 8.375 -15.09375 C 8.664062 -12.957031 8.894531 -11.890625 9.0625 -11.890625 C 9.1875 -11.847656 9.539062 -12.644531 10.125 -14.28125 C 10.71875 -15.914062 11.75 -18.976562 13.21875 -23.46875 C 14.894531 -28.582031 16.148438 -32.269531 16.984375 -34.53125 C 17.785156 -36.84375 18.5 -38.710938 19.125 -40.140625 C 20.007812 -42.191406 20.847656 -43.785156 21.640625 -44.921875 C 22.398438 -46.054688 23.238281 -46.894531 24.15625 -47.4375 C 24.613281 -47.6875 24.972656 -47.851562 25.234375 -47.9375 C 25.484375 -47.976562 25.835938 -48 26.296875 -48 L 26.421875 -48 C 29.023438 -47.957031 30.785156 -46.15625 31.703125 -42.59375 C 32.671875 -39.03125 33.09375 -32.613281 32.96875 -23.34375 L 32.96875 -18.9375 C 33.007812 -18.21875 33.070312 -17.859375 33.15625 -17.859375 C 33.195312 -17.859375 33.363281 -18.070312 33.65625 -18.5 C 33.945312 -18.914062 34.265625 -19.414062 34.609375 -20 C 35.984375 -22.351562 37.382812 -24.285156 38.8125 -25.796875 C 40.238281 -27.304688 41.625 -28.332031 42.96875 -28.875 C 43.550781 -29.125 44.015625 -29.269531 44.359375 -29.3125 C 44.691406 -29.351562 45.234375 -29.351562 45.984375 -29.3125 C 46.742188 -29.226562 47.269531 -29.144531 47.5625 -29.0625 C 47.851562 -28.976562 48.207031 -28.789062 48.625 -28.5 C 49.34375 -28.082031 49.953125 -27.515625 50.453125 -26.796875 C 50.992188 -26.085938 51.4375 -25.226562 51.78125 -24.21875 C 52.445312 -22.25 52.84375 -19.546875 52.96875 -16.109375 C 53.007812 -15.015625 53.03125 -13.796875 53.03125 -12.453125 C 53.03125 -9.640625 52.925781 -6.328125 52.71875 -2.515625 C 52.632812 -0.335938 52.550781 1.066406 52.46875 1.703125 C 52.425781 2.328125 52.320312 2.804688 52.15625 3.140625 C 51.90625 3.609375 51.65625 3.945312 51.40625 4.15625 C 51.144531 4.40625 50.785156 4.632812 50.328125 4.84375 C 49.953125 4.96875 49.554688 5.03125 49.140625 5.03125 L 48.8125 5.03125 C 48.226562 4.988281 47.707031 4.84375 47.25 4.59375 Z M 47.25 4.59375 "/></g></g></g><g fill="#c8ec43" fill-opacity="1"><g transform="translate(185.991136, 54.344885)"><g><path d="M 6.109375 0 C 4.890625 -0.375 3.859375 -1.023438 3.015625 -1.953125 C 2.179688 -2.828125 1.507812 -3.976562 1 -5.40625 C 0.539062 -6.625 0.25 -7.78125 0.125 -8.875 C 0.0390625 -9.914062 0 -11.96875 0 -15.03125 C 0 -17.257812 0.0195312 -18.9375 0.0625 -20.0625 C 0.101562 -21.15625 0.269531 -23.003906 0.5625 -25.609375 C 0.6875 -26.441406 0.8125 -27.425781 0.9375 -28.5625 C 1.0625 -29.695312 1.210938 -31 1.390625 -32.46875 C 1.554688 -33.84375 1.804688 -35.875 2.140625 -38.5625 C 1.972656 -38.726562 1.742188 -38.9375 1.453125 -39.1875 C 0.523438 -39.988281 0.0820312 -40.957031 0.125 -42.09375 C 0.207031 -43.257812 0.734375 -44.179688 1.703125 -44.859375 C 2.078125 -45.109375 3.414062 -45.421875 5.71875 -45.796875 C 8.03125 -46.210938 10.820312 -46.613281 14.09375 -47 C 15.5625 -47.164062 16.628906 -47.25 17.296875 -47.25 L 17.671875 -47.25 C 18.265625 -47.207031 18.832031 -46.953125 19.375 -46.484375 C 19.707031 -46.191406 20 -45.796875 20.25 -45.296875 C 20.507812 -44.753906 20.640625 -44.289062 20.640625 -43.90625 C 20.640625 -43.363281 20.445312 -42.78125 20.0625 -42.15625 C 19.6875 -41.5625 19.226562 -41.117188 18.6875 -40.828125 C 18.5625 -40.742188 18.078125 -40.640625 17.234375 -40.515625 C 16.359375 -40.347656 15.394531 -40.203125 14.34375 -40.078125 C 11.613281 -39.742188 10.082031 -39.515625 9.75 -39.390625 C 9.414062 -39.296875 9.207031 -38.957031 9.125 -38.375 C 9 -37.582031 8.875 -36.679688 8.75 -35.671875 C 8.625 -34.703125 8.5 -33.695312 8.375 -32.65625 L 7.796875 -27.5625 C 7.671875 -26.050781 7.628906 -25.296875 7.671875 -25.296875 C 7.710938 -25.296875 7.878906 -25.335938 8.171875 -25.421875 C 8.515625 -25.503906 8.894531 -25.628906 9.3125 -25.796875 C 10.613281 -26.128906 11.617188 -26.253906 12.328125 -26.171875 C 13.085938 -26.085938 13.738281 -25.753906 14.28125 -25.171875 C 14.90625 -24.492188 15.195312 -23.675781 15.15625 -22.71875 C 15.15625 -21.789062 14.800781 -20.992188 14.09375 -20.328125 C 13.882812 -20.109375 13.523438 -19.914062 13.015625 -19.75 C 12.515625 -19.539062 11.765625 -19.269531 10.765625 -18.9375 C 9.117188 -18.476562 8.066406 -18.144531 7.609375 -17.9375 C 7.148438 -17.675781 6.878906 -17.421875 6.796875 -17.171875 C 6.710938 -16.835938 6.671875 -15.914062 6.671875 -14.40625 C 6.710938 -12.894531 6.773438 -11.703125 6.859375 -10.828125 C 6.984375 -9.898438 7.128906 -9.082031 7.296875 -8.375 C 7.460938 -7.65625 7.648438 -7.171875 7.859375 -6.921875 C 8.066406 -6.671875 8.425781 -6.566406 8.9375 -6.609375 C 9.476562 -6.648438 10.148438 -6.859375 10.953125 -7.234375 C 11.867188 -7.691406 12.832031 -8.320312 13.84375 -9.125 C 14.84375 -9.875 16.035156 -10.941406 17.421875 -12.328125 C 18.765625 -13.628906 19.707031 -14.445312 20.25 -14.78125 C 20.800781 -15.070312 21.472656 -15.15625 22.265625 -15.03125 C 22.648438 -14.945312 22.945312 -14.863281 23.15625 -14.78125 C 23.40625 -14.65625 23.675781 -14.425781 23.96875 -14.09375 C 24.550781 -13.507812 24.90625 -12.859375 25.03125 -12.140625 C 25.082031 -11.972656 25.109375 -11.785156 25.109375 -11.578125 C 25.109375 -11.078125 24.976562 -10.550781 24.71875 -10 C 24.59375 -9.789062 24.15625 -9.3125 23.40625 -8.5625 C 22.644531 -7.757812 21.828125 -6.960938 20.953125 -6.171875 C 20.359375 -5.617188 19.789062 -5.09375 19.25 -4.59375 C 18.707031 -4.132812 18.269531 -3.753906 17.9375 -3.453125 C 15.707031 -1.773438 13.585938 -0.644531 11.578125 -0.0625 C 10.523438 0.226562 9.519531 0.375 8.5625 0.375 C 7.71875 0.375 6.898438 0.25 6.109375 0 Z M 6.109375 0 "/></g></g></g></g></g></g></svg>`}}
      style={{height, display:"flex", alignItems:"center", lineHeight:0}}
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
