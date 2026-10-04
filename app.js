const GEMINI_MODEL="gemini-3.5-flash-lite";
const AI_PROXY_URL=(window.STUDYFORGE_CONFIG&&window.STUDYFORGE_CONFIG.AI_PROXY_URL)||"https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/nim";
const KEY_STORE="studyforge_gemini_key";
let pendingTool=null, flashcards=[], flashIndex=0, quizData=[], quizScore=0, slideData=[], slideIndex=0;

const tools=[
{id:"resume",icon:"💼",name:"AI Resume Builder",desc:"Generate a polished, professional resume from your profile.",glow:"#7c68ff"},
{id:"notes",icon:"📘",name:"AI Notes Generator",desc:"Turn raw topics or textbook text into structured study notes.",glow:"#27c7ff"},
{id:"ppt",icon:"📊",name:"AI Presentation",desc:"Generate slide-wise content and export a real PowerPoint.",glow:"#8b7bff"},
{id:"mindmap",icon:"🧠",name:"Syllabus Mind Map",desc:"Convert a syllabus into a visual, expandable hierarchy.",glow:"#36e0aa"},
{id:"sheets",icon:"📈",name:"Google Sheets",desc:"Connect a published Apps Script endpoint and get AI insights.",glow:"#42c98c"},
{id:"quiz",icon:"📝",name:"AI Quiz / MCQs",desc:"Generate interactive multiple-choice questions with scoring.",glow:"#ff8a65"},
{id:"tutor",icon:"💬",name:"Subject Doubt Solver",desc:"Chat with an AI tutor and keep follow-up context.",glow:"#5b9dff"},
{id:"flashcards",icon:"🗂",name:"AI Flashcards",desc:"Create flippable Q&A cards for fast revision.",glow:"#b77cff"},
{id:"planner",icon:"📅",name:"AI Study Planner",desc:"Build a balanced day-wise timetable around your exams.",glow:"#f4c95d"},
{id:"ocr",icon:"📸",name:"Photo Notes OCR",desc:"Extract text from notes and turn it into a concise summary.",glow:"#ff6f91"}
];

const $=s=>document.querySelector(s);
function renderCards(){$("#toolGrid").innerHTML=tools.map((t,i)=>`<article class="tool-card" style="--glow:${t.glow}" onclick="openTool('${t.id}')"><span class="num">0${i+1}</span><div class="icon">${t.icon}</div><h3>${t.name}</h3><p>${t.desc}</p></article>`).join("")}
function show(id){$("#"+id).classList.remove("hidden");$("#"+id).setAttribute("aria-hidden","false")}
function hide(id){$("#"+id).classList.add("hidden");$("#"+id).setAttribute("aria-hidden","true")}
document.addEventListener("click",e=>{const b=e.target.closest("[data-close]");if(b)hide(b.dataset.close)});

function getKey(){return sessionStorage.getItem(KEY_STORE)}
function setStatus(){const ok=!!getKey();$("#apiStatus").classList.toggle("ok",ok);$("#apiStatus").innerHTML=`<i></i> ${ok?"Gemini connected":"Gemini not connected"}`}
function requireKey(tool){if(getKey())return true;pendingTool=tool;$("#apiKeyInput").value="";$("#keyError").textContent="";show("keyModal");return false}
async function saveKey(){
 const key=$("#apiKeyInput").value.trim();
 if(!key){$("#keyError").textContent="Please enter your Gemini API key.";return}
 if(key.length < 20){$("#keyError").textContent="That doesn't look like a Gemini API key.";return}
 $("#keyError").textContent="Checking key…";
 try{
   const r=await fetch(AI_PROXY_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model:GEMINI_MODEL,messages:[{role:"user",content:"Reply with exactly OK."}],max_tokens:8,temperature:0,stream:false})});
   if(!r.ok){let msg="Gemini rejected the key.";try{const x=await r.json();msg=x?.error?.message||msg}catch{}throw new Error(msg)}
   sessionStorage.setItem(KEY_STORE,key);setStatus();hide("keyModal");toast("Gemini connected");
   if(pendingTool){const t=pendingTool;pendingTool=null;openTool(t)}
 }catch(e){$("#keyError").textContent=e.message.includes("Failed to fetch")?"The Gemini proxy could not be reached. Check that your Netlify Function is deployed and that AI_PROXY_URL in config.js is correct.":e.message}
}
async function nim(messages,{temperature=.25,max_tokens=3000,json=false}={}){
 const key=getKey();if(!key)throw new Error("Gemini API key required.");
 const body={model:GEMINI_MODEL,messages,max_tokens,temperature,stream:false};
 if(json)body.response_format={type:"json_object"};
 const r=await fetch(AI_PROXY_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify(body)});
 if(!r.ok){let m=`Gemini request failed (${r.status})`;try{const x=await r.json();m=x?.error?.message||m}catch{}throw new Error(m)}
 const x=await r.json();return x?.choices?.[0]?.message?.content||"";
}
function loading(){return `<div class="loading"><i class="dot"></i> Generating with Gemini…</div>`}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(s){const x=$("#toast");x.textContent=s;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2400)}
function toolShell(title,eyebrow,body){$("#toolEyebrow").textContent=eyebrow;$("#toolTitle").textContent=title;$("#toolBody").innerHTML=body;show("toolModal")}

function openTool(id){
 if(!requireKey(id))return;
 const t=tools.find(x=>x.id===id);
 if(id==="resume")resumeUI();
 if(id==="notes")notesUI();
 if(id==="ppt")pptUI();
 if(id==="mindmap")mindmapUI();
 if(id==="sheets")sheetsUI();
 if(id==="quiz")quizUI();
 if(id==="tutor")tutorUI();
 if(id==="flashcards")flashUI();
 if(id==="planner")plannerUI();
 if(id==="ocr")ocrUI();
}
function err(e){return `<div class="error">${escapeHtml(e.message||String(e))}</div>`}
function resumeUI(){toolShell("AI Resume Builder","01 / RESUME",`<div class="tool-form">
<div class="two"><div class="field"><label>Name</label><input id="rName"></div><div class="field"><label>Contact</label><input id="rContact"></div></div>
<div class="two"><div class="field"><label>Education</label><textarea id="rEdu" rows="3"></textarea></div><div class="field"><label>Skills</label><textarea id="rSkills" rows="3"></textarea></div></div>
<div class="two"><div class="field"><label>Experience / Projects</label><textarea id="rExp" rows="4"></textarea></div><div class="field"><label>Objective</label><textarea id="rObj" rows="4"></textarea></div></div>
<button class="primary" onclick="generateResume()">Generate Resume <span>→</span></button></div><div id="rResult" class="result">Fill the profile and generate your resume.</div>`)}
async function generateResume(){const v={name:$("#rName").value,contact:$("#rContact").value,education:$("#rEdu").value,skills:$("#rSkills").value,experience:$("#rExp").value,objective:$("#rObj").value};$("#rResult").innerHTML=loading();try{const x=await nim([{role:"system",content:"You are a professional resume writer. Create concise, ATS-friendly resume content using only the supplied facts. Do not invent employers, degrees, dates or achievements."},{role:"user",content:`Create a polished resume for:\n${JSON.stringify(v)}`}]);$("#rResult").innerHTML=marked.parse(x)+`<div class="actions"><button class="mini" onclick="copyText(document.querySelector('#rResult').innerText)">Copy</button><button class="mini" onclick="pdfText('Resume',document.querySelector('#rResult').innerText)">Download PDF</button></div>`}catch(e){$("#rResult").innerHTML=err(e)}}

function notesUI(){toolShell("AI Notes Generator","02 / NOTES",`<div class="tool-form"><textarea id="nInput" rows="9" placeholder="Paste a topic, chapter, textbook paragraph or lecture content…"></textarea><button class="primary" onclick="generateNotes()">Generate Structured Notes <span>→</span></button></div><div id="nResult" class="result">Your notes will appear here.</div>`)}
async function generateNotes(){const s=$("#nInput").value.trim();if(!s)return toast("Add some text first.");$("#nResult").innerHTML=loading();try{const x=await nim([{role:"system",content:"Convert the supplied study material into accurate, compact Markdown notes. Use headings, bullets, definitions, formulas where present, and a short key-takeaways section. Do not add facts not supported by the source."},{role:"user",content:s}],{max_tokens:4000});$("#nResult").innerHTML=marked.parse(x)+`<div class="actions"><button class="mini" onclick="copyText(document.querySelector('#nResult').innerText)">Copy</button><button class="mini" onclick="downloadText('study-notes.txt',document.querySelector('#nResult').innerText)">Download TXT</button><button class="mini" onclick="pdfText('Study Notes',document.querySelector('#nResult').innerText)">Download PDF</button></div>`}catch(e){$("#nResult").innerHTML=err(e)}}

function pptUI(){toolShell("AI Presentation Generator","03 / PRESENTATION",`<div class="tool-form"><input id="pTopic" placeholder="Presentation topic"><div class="two"><input id="pCount" type="number" min="3" max="12" value="6" placeholder="Slides"><select id="pAudience"><option value="school students">School students</option><option value="college students" selected>College students</option><option value="professionals">Working professionals</option><option value="general audience">General audience</option><option value="technical team">Technical team</option></select></div><div class="two"><select id="pLevel"><option value="beginner">Beginner — simple foundations</option><option value="intermediate" selected>Intermediate — practical depth</option><option value="advanced">Advanced — expert detail</option></select><select id="pStyle"><option value="visual storytelling" selected>Visual storytelling</option><option value="clean academic">Clean academic</option><option value="executive briefing">Executive briefing</option><option value="workshop">Interactive workshop</option></select></div><button class="primary" onclick="generatePPT()">Generate Slides <span>→</span></button></div><div id="pResult" class="result">Slides will appear here.</div>`)}
async function generatePPT(){const topic=$("#pTopic").value.trim();if(!topic)return toast("Enter a topic.");$("#pResult").innerHTML=loading();try{const audience=$("#pAudience").value,level=$("#pLevel").value,style=$("#pStyle").value;const x=await nim([{role:"system",content:"Return ONLY valid JSON with this exact shape: {\"slides\":[{\"title\":\"...\",\"subtitle\":\"...\",\"bullets\":[\"...\",\"...\",\"...\"],\"visual\":\"process|comparison|timeline|bars|quote|none\",\"highlight\":\"...\"}]}. Create a coherent educational presentation. Adapt vocabulary, examples, pacing, and depth to the requested audience and level. Use one visual type per slide when useful; visual must be one of the listed values."},{role:"user",content:`Topic: ${topic}\nSlides: ${$("#pCount").value}\nAudience: ${audience}\nKnowledge level: ${level}\nPresentation style: ${style}`}],{max_tokens:6000,json:true});slideData=JSON.parse(x).slides;slideIndex=0;renderSlide();}catch(e){$("#pResult").innerHTML=err(e)}}
function renderSlide(){const s=slideData[slideIndex];$("#pResult").innerHTML=`<div class="slide"><div class="eyebrow">SLIDE ${slideIndex+1} / ${slideData.length}</div><h3>${escapeHtml(s.title)}</h3><ul>${s.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join("")}</ul></div><div class="actions"><button class="mini" onclick="slideIndex=Math.max(0,slideIndex-1);renderSlide()">← Previous</button><button class="mini" onclick="slideIndex=Math.min(slideData.length-1,slideIndex+1);renderSlide()">Next →</button><button class="mini" onclick="downloadPPT()">Export PPTX</button></div>`}
async function downloadPPT(){
 if(!slideData.length)return toast("Generate slides first.");
 if(typeof window.PptxGenJS!=="function")return toast("PowerPoint export is unavailable. Refresh and try again.");
 try{
  const ppt=new window.PptxGenJS();ppt.layout="LAYOUT_WIDE";ppt.author="StudyForge";ppt.subject="AI-generated presentation";ppt.company="StudyForge";
  slideData.forEach((s,index)=>{const sl=ppt.addSlide();const accent=["6C63FF","19C8D8","F4C95D","49D394"][index%4];sl.background={color:"080C14"};sl.addShape(ppt.ShapeType.rect,{x:0,y:0,w:13.333,h:.12,fill:{color:accent},line:{color:accent}});sl.addText(`${String(index+1).padStart(2,"0")}  /  STUDYFORGE`,{x:.7,y:.38,w:4,h:.22,fontSize:9,bold:true,charSpacing:2,color:accent});sl.addText(s.title,{x:.7,y:.78,w:7.5,h:.65,fontFace:"Aptos Display",fontSize:27,bold:true,color:"FFFFFF",margin:0});if(s.subtitle)sl.addText(s.subtitle,{x:.72,y:1.48,w:7.15,h:.35,fontSize:12,color:"9DAAC2",margin:0});sl.addShape(ppt.ShapeType.line,{x:.72,y:1.98,w:6.9,h:0,line:{color:"2A3448",width:1}});sl.addText(s.bullets.map(b=>({text:b,options:{bullet:{indent:16},breakLine:true}})),{x:.9,y:2.25,w:6.2,h:3.45,fontSize:17,color:"D7DFEF",breakLine:false,paraSpaceAfterPt:14,margin:0.05});addPptVisual(sl,ppt,s,accent);if(s.highlight)sl.addText(s.highlight,{x:.72,y:6.72,w:11.8,h:.25,fontSize:10,italic:true,color:"7F8CA8",margin:0});sl.addText("Generated for learning • Review facts before presenting",{x:8.2,y:7.12,w:4.4,h:.18,fontSize:8,color:"56647B",align:"right",margin:0})});
  await ppt.writeFile({fileName:"StudyForge-Presentation.pptx"});toast("Presentation exported.");
 }catch(e){toast(`Export failed: ${e.message||"unknown error"}`)}
}
function addPptVisual(sl,ppt,s,accent){
 const type=["process","comparison","timeline","bars","quote"].includes(s.visual)?s.visual:"none",x=7.65,y=2.25,w=4.75,h=3.7;
 sl.addShape(ppt.ShapeType.roundRect,{x,y,w,h,rectRadius:.08,fill:{color:"101827",transparency:8},line:{color:"26344B",width:1}});
 if(type==="quote"){sl.addText("“",{x:x+.35,y:y+.15,w:.6,h:.65,fontSize:42,bold:true,color:accent,margin:0});sl.addText(s.bullets[0]||s.title,{x:x+.55,y:y+1.15,w:3.7,h:1.35,fontFace:"Aptos Display",fontSize:22,bold:true,color:"FFFFFF",italic:true,margin:0.02,fit:"shrink"});return}
 if(type==="process"){const labels=(s.bullets||[]).slice(0,4);labels.forEach((label,i)=>{const cy=y+.55+i*.72;sl.addShape(ppt.ShapeType.ellipse,{x:x+.38,y:cy,w:.35,h:.35,fill:{color:accent},line:{color:accent}});sl.addText(String(i+1),{x:x+.38,y:cy+.06,w:.35,h:.12,fontSize:9,bold:true,color:"080C14",align:"center",margin:0});sl.addText(label,{x:x+.95,y:cy-.01,w:3.25,h:.3,fontSize:13,color:"D7DFEF",margin:0});if(i<labels.length-1)sl.addShape(ppt.ShapeType.line,{x:x+.55,y:cy+.36,w:0,h:.35,line:{color:"3A4860",width:1,dash:"dash"}})});return}
 if(type==="timeline"){const labels=(s.bullets||[]).slice(0,4),lineY=y+1.8;sl.addShape(ppt.ShapeType.line,{x:x+.5,y:lineY,w:3.7,h:0,line:{color:accent,width:3}});labels.forEach((label,i)=>{const px=x+.5+i*(3.7/Math.max(1,labels.length-1));sl.addShape(ppt.ShapeType.ellipse,{x:px-.1,y:lineY-.1,w:.2,h:.2,fill:{color:"FFFFFF"},line:{color:accent,width:2}});sl.addText(label,{x:px-.35,y:lineY+.3,w:.7,h:1.1,fontSize:10,color:"D7DFEF",align:"center",valign:"mid",margin:0,fit:"shrink"})});return}
 if(type==="comparison"){const half=1.7;["NOW","NEXT"].forEach((label,i)=>{const bx=x+.45+i*2.15;sl.addText(label,{x:bx,y:y+.48,w:half,h:.25,fontSize:10,bold:true,color:accent,align:"center",margin:0});(s.bullets||[]).slice(i*2,i*2+2).forEach((b,j)=>sl.addText("• "+b,{x:bx,y:y+1.05+j*.8,w:half,h:.55,fontSize:11,color:"D7DFEF",margin:0.03,fit:"shrink"}));});return}
 if(type==="bars"){(s.bullets||[]).slice(0,4).forEach((b,i)=>{const value=Math.max(25,Math.min(100,90-i*17));const by=y+.58+i*.67;sl.addText(b,{x:x+.4,y:by,w:1.7,h:.22,fontSize:10,color:"D7DFEF",margin:0,fit:"shrink"});sl.addShape(ppt.ShapeType.roundRect,{x:x+2.15,y:by+.02,w:2.05,h:.18,rectRadius:.04,fill:{color:"27364D"},line:{color:"27364D"}});sl.addShape(ppt.ShapeType.roundRect,{x:x+2.15,y:by+.02,w:2.05*value/100,h:.18,rectRadius:.04,fill:{color:accent},line:{color:accent}})});return}
 sl.addText("KEY IDEA",{x:x+.45,y:y+.55,w:3.5,h:.25,fontSize:10,bold:true,charSpacing:2,color:accent,margin:0});sl.addText(s.highlight||s.title,{x:x+.45,y:y+1.2,w:3.75,h:1.5,fontFace:"Aptos Display",fontSize:23,bold:true,color:"FFFFFF",margin:0,fit:"shrink"});
}

function mindmapUI(){toolShell("Syllabus Mind Map","04 / MIND MAP",`<div class="tool-form"><textarea id="mInput" rows="8" placeholder="Paste your syllabus or topic hierarchy…"></textarea><button class="primary" onclick="generateMindmap()">Generate Mind Map <span>→</span></button></div><div id="mResult" class="result">The generated hierarchy will be visualized here.</div>`)}
async function generateMindmap(){const s=$("#mInput").value.trim();if(!s)return toast("Paste a syllabus first.");$("#mResult").innerHTML=loading();try{const x=await nim([{role:"system",content:"Return ONLY valid JSON: {\"name\":\"root\",\"children\":[{\"name\":\"topic\",\"children\":[{\"name\":\"subtopic\"}]}]}. Build a concise hierarchy from the supplied syllabus."},{role:"user",content:s}],{max_tokens:4000,json:true});const data=JSON.parse(x);$("#mResult").innerHTML=`<div class="mindmap" id="mindSvg"></div>`;drawMindmap(data)}catch(e){$("#mResult").innerHTML=err(e)}}
function drawMindmap(data){const box=document.getElementById("mindSvg"),w=box.clientWidth,h=box.clientHeight;const svg=d3.select(box).append("svg").attr("viewBox",`0 0 ${w} ${h}`);const g=svg.append("g").attr("transform","translate(70,${h/2})");const root=d3.hierarchy(data);const tree=d3.tree().size([h-60,w-190]);tree(root);g.selectAll("line").data(root.links()).join("line").attr("x1",d=>d.source.y).attr("y1",d=>d.source.x).attr("x2",d=>d.target.y).attr("y2",d=>d.target.x).attr("stroke","#39445a");g.selectAll("circle").data(root.descendants()).join("circle").attr("cx",d=>d.y).attr("cy",d=>d.x).attr("r",6).attr("fill","#7b6cff");g.selectAll("text").data(root.descendants()).join("text").attr("x",d=>d.y+10).attr("y",d=>d.x+4).attr("fill","#dbe3f3").attr("font-size","12").text(d=>d.data.name)}

function sheetsUI(){toolShell("Google Sheets Backend","05 / SHEETS",`<div class="tool-form"><input id="sUrl" placeholder="Published Google Apps Script Web App URL"><div class="actions"><button class="primary" onclick="loadSheet()">Load Sheet Data <span>→</span></button><button class="mini" onclick="sheetInsight()">AI Insight</button></div></div><div id="sResult" class="result">Enter your Apps Script Web App URL. Your Apps Script should return JSON from doGet().</div>`)}
let sheetData=null;
async function loadSheet(){const u=$("#sUrl").value.trim();if(!u)return toast("Enter the Apps Script URL.");$("#sResult").innerHTML=loading();try{const r=await fetch(u);if(!r.ok)throw new Error("Could not fetch the Sheets endpoint.");sheetData=await r.json();renderSheet(sheetData)}catch(e){$("#sResult").innerHTML=err(e)}}
function renderSheet(d){const rows=Array.isArray(d)?d:(d.rows||d.data||[]);if(!rows.length){$("#sResult").textContent="Endpoint returned no rows.";return}const arr=rows.map(r=>Array.isArray(r)?r:Object.values(r));$("#sResult").innerHTML=`<div class="sheet-table"><table><tbody>${arr.map((r,i)=>`<tr>${r.map(c=>i===0?`<th>${escapeHtml(c)}</th>`:`<td>${escapeHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`}
async function sheetInsight(){if(!sheetData)return toast("Load sheet data first.");$("#sResult").innerHTML+=`<div id="sheetAI" class="result">${loading()}</div>`;try{const x=await nim([{role:"system",content:"Analyze the supplied spreadsheet data. Give a concise summary, notable patterns, and useful actions. Don't invent values."},{role:"user",content:JSON.stringify(sheetData)}],{max_tokens:1800});$("#sheetAI").innerHTML=marked.parse(x)}catch(e){$("#sheetAI").innerHTML=err(e)}}

function quizUI(){toolShell("AI Quiz / MCQs","06 / QUIZ",`<div class="tool-form"><textarea id="qInput" rows="6" placeholder="Topic or notes…"></textarea><div class="two"><input id="qNum" type="number" min="3" max="15" value="5"><input id="qLevel" placeholder="Difficulty e.g. medium"></div><button class="primary" onclick="generateQuiz()">Generate Quiz <span>→</span></button></div><div id="qResult" class="result">Your interactive quiz will appear here.</div>`)}
async function generateQuiz(){const s=$("#qInput").value.trim();if(!s)return toast("Add a topic or notes.");$("#qResult").innerHTML=loading();try{const x=await nim([{role:"system",content:"Return ONLY valid JSON: {\"questions\":[{\"question\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"answer\":0,\"explanation\":\"...\"}]}. Answer is the zero-based correct option index."},{role:"user",content:`Generate ${$("#qNum").value} ${$("#qLevel").value} MCQs from:\n${s}`}],{max_tokens:5000,json:true});quizData=JSON.parse(x).questions;quizScore=0;renderQuiz()}catch(e){$("#qResult").innerHTML=err(e)}}
function renderQuiz(){let done=0;$("#qResult").innerHTML=quizData.map((q,i)=>`<div class="quiz-q" id="qq${i}"><h4>${i+1}. ${escapeHtml(q.question)}</h4>${q.options.map((o,j)=>`<button class="option" onclick="answerQ(${i},${j},this)">${escapeHtml(o)}</button>`).join("")}</div>`).join("")+`<div id="score" class="eyebrow" style="margin-top:18px">Score: 0 / ${quizData.length}</div>`}
function answerQ(i,j,el){const box=$("#qq"+i);if(box.dataset.done)return;box.dataset.done="1";const q=quizData[i];[...box.querySelectorAll(".option")].forEach((b,k)=>{if(k===q.answer)b.classList.add("correct")});if(j===q.answer)quizScore++;else el.classList.add("wrong");$("#score").textContent=`Score: ${quizScore} / ${quizData.length}`}

let tutorHistory=[];
function tutorUI(){tutorHistory=[];toolShell("Subject Doubt Solver","07 / TUTOR",`<div id="chat" class="result" style="min-height:300px">Ask a question and the tutor will explain it simply with examples.</div><div class="actions"><input id="tInput" placeholder="Ask your doubt…" onkeydown="if(event.key==='Enter')sendTutor()"><button class="primary" onclick="sendTutor()">Send</button><button class="mini" onclick="tutorHistory=[];tutorUI()">Clear</button></div>`)}
async function sendTutor(){const q=$("#tInput").value.trim();if(!q)return;$("#tInput").value="";tutorHistory.push({role:"user",content:q});$("#chat").innerHTML+=`<p><b>You:</b> ${escapeHtml(q)}</p><p id="typing">${loading()}</p>`;try{const msgs=[{role:"system",content:"You are a patient academic tutor. Explain clearly, step by step, with simple examples. If the question is ambiguous, state the assumption."},...tutorHistory];const x=await nim(msgs,{max_tokens:2200});tutorHistory.push({role:"assistant",content:x});$("#typing").outerHTML=`<p><b>Tutor:</b> ${marked.parse(x)}</p>`}catch(e){$("#typing").outerHTML=err(e)}}

function flashUI(){toolShell("AI Flashcards","08 / FLASHCARDS",`<div class="tool-form"><textarea id="fInput" rows="6" placeholder="Topic or chapter text…"></textarea><button class="primary" onclick="generateFlash()">Generate Flashcards <span>→</span></button></div><div id="fResult" class="result">Your deck will appear here.</div>`)}
async function generateFlash(){const s=$("#fInput").value.trim();if(!s)return toast("Add some study content.");$("#fResult").innerHTML=loading();try{const x=await nim([{role:"system",content:"Return ONLY valid JSON: {\"cards\":[{\"question\":\"...\",\"answer\":\"...\"}]}. Create 8 concise revision flashcards from the source."},{role:"user",content:s}],{max_tokens:3500,json:true});flashcards=JSON.parse(x).cards;flashIndex=0;renderFlash()}catch(e){$("#fResult").innerHTML=err(e)}}
function renderFlash(){const c=flashcards[flashIndex];$("#fResult").innerHTML=`<div class="flash" onclick="this.classList.toggle('flipped')"><div class="flash-inner"><div class="face">${escapeHtml(c.question)}</div><div class="face back">${escapeHtml(c.answer)}</div></div></div><div style="text-align:center;color:#7f8ba0;font-size:12px">${flashIndex+1} / ${flashcards.length}</div><div class="actions" style="justify-content:center"><button class="mini" onclick="flashIndex=Math.max(0,flashIndex-1);renderFlash()">←</button><button class="mini" onclick="flashcards.sort(()=>Math.random()-.5);flashIndex=0;renderFlash()">Shuffle</button><button class="mini" onclick="flashIndex=Math.min(flashcards.length-1,flashIndex+1);renderFlash()">→</button></div>`}

function plannerUI(){toolShell("AI Study Planner","09 / PLANNER",`<div class="tool-form"><textarea id="plSubjects" rows="4" placeholder="Subjects, e.g. DSA, OS, DBMS, Java"></textarea><div class="three"><input id="plHours" placeholder="Hours/day"><input id="plStart" placeholder="Start time"><input id="plExam" type="date"></div><button class="primary" onclick="generatePlan()">Generate Timetable <span>→</span></button></div><div id="plResult" class="result">Your weekly plan will appear here.</div>`)}
async function generatePlan(){
 const x=$("#plResult"); x.innerHTML=loading();
 try{
  const out=await nim([
   {role:"system",content:"Return ONLY valid JSON with a days array. Each day has day and slots. Each slot has time, subject, task. Make a realistic balanced study timetable."},
   {role:"user",content:`Subjects: ${$("#plSubjects").value}\nHours per day: ${$("#plHours").value}\nStart time: ${$("#plStart").value}\nTarget/exam date: ${$("#plExam").value}`}
  ],{max_tokens:4500,json:true});
  const d=JSON.parse(out).days;
  const rows=d.map(a=>{
   const slots=a.slots.map(s=>`<b>${escapeHtml(s.time)}</b> — ${escapeHtml(s.subject)}<br><span style="color:#8994aa">${escapeHtml(s.task||"")}</span>`).join('<hr style="border:0;border-top:1px solid #ffffff0a;margin:7px 0">');
   return `<tr><th>${escapeHtml(a.day)}</th><td>${slots}</td></tr>`;
  }).join("");
  x.innerHTML=`<table class="schedule"><thead><tr><th>Day</th><th>Study slots</th></tr></thead><tbody>${rows}</tbody></table><div class="actions"><button class="mini" id="downloadPlanBtn">Download TXT</button></div>`;
  $("#downloadPlanBtn").onclick=()=>downloadText("study-plan.txt",x.innerText);
 }catch(e){x.innerHTML=err(e)}
}

function ocrUI(){toolShell("Photo Notes OCR","10 / OCR + AI",`<div class="drop">Upload a handwritten or printed note image.<br><input id="ocrFile" type="file" accept="image/*" onchange="previewOCR(this)"></div><div id="ocrPreview"></div><div class="actions"><button class="primary" onclick="runOCR()">Extract & Summarize <span>→</span></button></div><div id="ocrResult" class="result">OCR text and AI summary will appear here.</div>`)}
let ocrImage=null;
function previewOCR(inp){ocrImage=inp.files[0];if(!ocrImage)return;const u=URL.createObjectURL(ocrImage);$("#ocrPreview").innerHTML=`<img class="preview-img" src="${u}" alt="Uploaded notes">`}
async function runOCR(){if(!ocrImage)return toast("Upload an image first.");$("#ocrResult").innerHTML=loading();try{const r=await Tesseract.recognize(ocrImage,"eng",{logger:m=>{}});const text=r.data.text;$("#ocrResult").innerHTML=`<b>Extracted text</b><div class="ocr">${escapeHtml(text)}</div><hr style="border:0;border-top:1px solid #ffffff0b"><div id="ocrSummary">${loading()}</div>`;const x=await nim([{role:"system",content:"Summarize the OCR text into accurate study key points. Correct obvious OCR noise only when the intended word is clear."},{role:"user",content:text}],{max_tokens:2500});$("#ocrSummary").innerHTML=`<b>AI summary</b>${marked.parse(x)}`}catch(e){$("#ocrResult").innerHTML=err(e)}}

async function copyText(t){try{await navigator.clipboard.writeText(t);toast("Copied")}catch(e){toast("Copy failed. Please copy the text manually.")}}
function downloadText(name,text){
 const a=document.createElement("a"),url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("Download started.");
}
function pdfText(title,text){
 if(!window.jspdf?.jsPDF)return toast("PDF export is unavailable. Refresh and try again.");
 try{
  const doc=new window.jspdf.jsPDF(),lines=doc.splitTextToSize(text,180);let y=18;
  doc.setFontSize(16);doc.text(title,15,y);y+=10;doc.setFontSize(10);
  for(const line of lines){if(y>280){doc.addPage();y=15}doc.text(line,15,y);y+=5}
  doc.save(title.replace(/\s+/g,"-")+".pdf");toast("PDF exported.");
 }catch(e){toast(`PDF export failed: ${e.message||"unknown error"}`)}
}
$("#saveKey").onclick=saveKey;$("#settingsBtn").onclick=()=>{pendingTool=null;$("#apiKeyInput").value=getKey()||"";show("keyModal")};$("#connectHero").onclick=()=>{$("#apiKeyInput").value=getKey()||"";show("keyModal")};$("#toggleKey").onclick=()=>{$("#apiKeyInput").type=$("#apiKeyInput").type==="password"?"text":"password";$("#toggleKey").textContent=$("#apiKeyInput").type==="password"?"Show":"Hide"};
renderCards();setStatus();
