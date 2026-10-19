const policy=`You are a cautious content-safety triage service for a moderated discussion platform. Evaluate submitted text and the accompanying source URL (not external page content). Look for explicit targeted identity-based hatred, dehumanization, calls for violence, credible threats, targeted harassment and bullying. Distinguish quotation, reporting, condemnation, satire and counterspeech. Avoid treating discussion of religion, politics or identities as automatically hateful. Output only JSON: {"decision":"allow|review|hold","categories":["..."],"message":"brief neutral reason"}. HOLD only clear, severe targeted abuse or credible threats. REVIEW ambiguous targeted harassment or hateful expression. ALLOW other content. Media itself is NOT provided; do not claim to have inspected it. Deepfake authenticity cannot be determined from a filename or URL.`;
const valid=new Set(['allow','review','hold']);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'POST required.'});
 const key=process.env.GEMINI_API_KEY,url=process.env.SUPABASE_URL||'https://tpamrwhrrxsadtenpxeb.supabase.co',anon=process.env.SUPABASE_ANON_KEY;
 if(!key||!anon)return res.status(503).json({error:'Screening configuration incomplete.'});
 const bearer=String(req.headers.authorization||'').match(/^Bearer (.+)$/);if(!bearer)return res.status(401).json({error:'Sign in before posting.'});
 try{
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:anon,authorization:'Bearer '+bearer[1]}});if(!auth.ok)return res.status(401).json({error:'Invalid session.'});
  const b=req.body||{},title=String(b.title||''),body=String(b.body||''),source=String(b.source_url||'');
  if(title.length<8||title.length>160||body.length<20||body.length>5000||source.length>500)return res.status(400).json({error:'Invalid discussion length.'});
  const model=process.env.RESO_GEMINI_MODEL||'gemini-2.5-flash';
  const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(key),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({systemInstruction:{parts:[{text:policy}]},contents:[{parts:[{text:JSON.stringify({title,body,source,media_type:b.media_type||null})}]}],generationConfig:{responseMimeType:'application/json',temperature:0.1}})});
  if(!response.ok)return res.status(503).json({error:'Safety screening temporarily unavailable.'});
  const payload=await response.json(),raw=payload.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  let decision;try{decision=JSON.parse(raw)}catch{return res.status(503).json({error:'Invalid screening response.'})}
  if(!valid.has(decision.decision))return res.status(503).json({error:'Invalid screening verdict.'});
  return res.status(200).json({decision:decision.decision,message:String(decision.message||'').slice(0,400),categories:Array.isArray(decision.categories)?decision.categories.slice(0,6):[],scope:'Text and submitted link only; media bytes not inspected.'});
 }catch{return res.status(503).json({error:'Safety screening unavailable. Please try later.'})}
}
