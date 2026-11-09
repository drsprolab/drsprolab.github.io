// Editorial compiler. Generated English runtimes are checked in as source;
// ordinary Jekyll builds do not require Node packages or sibling repositories.
// ACORN_MODULE=/path/to/acorn node tools/build_english_apps.cjs
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const acorn = require(process.env.ACORN_MODULE || 'acorn');
const dict = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e',
  'puts %w[text apps conference].map{|n|YAML.load_file("_data/english/"+n+".yml")}.reduce({},:merge).to_json'], {encoding:'utf8'}));
const hangul = /[가-힣]/;
const unknown = new Set();
function text(s) {
  const key = s.trim();
  if (Object.hasOwn(dict,key)) return s.replace(key,dict[key]);
  if (!hangul.test(s)) return s;
  // A few display fragments surround dynamic values or inline emphasis.
  let v=s;
  for (const k of Object.keys(dict).filter(k=>k.length>=2).sort((a,b)=>b.length-a.length)) {
    if(v.includes(k)) v=v.split(k).join(dict[k]);
  }
  if (hangul.test(v)) unknown.add(s);
  return v;
}
function markup(s) {
  return s.split(/(<[^>]*>)/g).map(part=>part.startsWith('<')
    ? part.replace(/((?:title|alt|placeholder|aria-label)=["'])(.*?)(["'])/g,(_,a,b,c)=>a+text(b)+c)
    : text(part)).join('');
}
function javascript(source, conference=false) {
  const ast=acorn.parse(source,{ecmaVersion:'latest'}), edits=[];
  function walk(n){
    if(!n||typeof n!=='object') return;
    if(conference&&n.type==='VariableDeclarator'&&n.id.name==='ALL'){
      // Titles, author names, venues, and schedule records are original sources.
      // Translate the controlled keyword vocabulary without changing graph keys.
      for(const item of n.init.elements||[]) for(const prop of item.properties||[])
        if((prop.key.name||prop.key.value)==='k') walk(prop.value);
      return;
    }
    if(n.type==='Literal'&&typeof n.value==='string'&&hangul.test(n.value)){
      edits.push([n.start,n.end,JSON.stringify(markup(n.value))]);return;
    }
    if(n.type==='TemplateElement'&&hangul.test(n.value.cooked||'')){
      edits.push([n.start,n.end,markup(n.value.cooked).replace(/\\/g,'\\\\').replace(/`/g,'\\`').replace(/\$\{/g,'\\${')]);return;
    }
    for(const [k,v]of Object.entries(n)){
      if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);
    }
  }
  walk(ast);
  for(const [a,b,v]of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,a)+v+source.slice(b);
  acorn.parse(source,{ecmaVersion:'latest'});
  return source;
}
function replaceFunction(source,name,body){
  const ast=acorn.parse(source,{ecmaVersion:'latest'});let found;
  function walk(n){if(!n||typeof n!=='object')return;if(n.type==='FunctionDeclaration'&&n.id.name===name)found=n;
    for(const v of Object.values(n)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v)}}
  walk(ast);return found?source.slice(0,found.body.start)+'{\n'+body+'\n  }'+source.slice(found.body.end):source;
}
function write(relative,source){const dest=path.join('_translations/runtime',relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,source);}
for(const app of ['proax-lab-review','lo-review']){
  for(const name of fs.readdirSync('_translations/apps/'+app+'/js')){
    let out=javascript(fs.readFileSync('_translations/apps/'+app+'/js/'+name,'utf8'));
    if(name==='app.js'){
      out=replaceFunction(out,'weekTitle',app==='lo-review'
        ? "    var n = PL.courseWeek(key); return n ? 'Week ' + n : (key || 'No week assigned');"
        : "    var m = String(key || '').match(/^(\\d{4})-W(\\d{2})$/); return m ? m[1] + ' · Week ' + Number(m[2]) : (key || 'No week assigned');");
      out=replaceFunction(out,'foldNote',"    return 'Grouped on ' + d.toLocaleDateString('en-US', {month:'short',day:'numeric',weekday:'short'}) + ' at ' + d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) + ' KST';");
    }
    if(name==='api.js'){
      out=replaceFunction(out,'weekLabel',"    var s=weekKeyToDate(key); if(!s)s=weekStart(key?new Date(key):new Date()); var e=new Date(s);e.setDate(e.getDate()+6);var i=isoWeek(s);return i.year+' · Week '+i.week+' · '+md(s)+'–'+md(e);");
      out=replaceFunction(out,'weekShort',"    var m=String(key||'').match(/^(\\d{4})-W(\\d{2})$/);return m?m[1]+' · W'+Number(m[2]):String(key||'');");
    }
    acorn.parse(out,{ecmaVersion:'latest'});write(app+'/js/'+name,out);
  }
}
for(const name of ['appointment.js','appointment-admin.js']){
  let out=javascript(fs.readFileSync('assets/js/'+name,'utf8'));
  if(name==='appointment.js'){
    out=out.replace(/monthLabel\.textContent = .*?;/,"monthLabel.textContent = new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(start);");
    out=out.replace(/button\.setAttribute\('aria-label', year .*?\);/,"button.setAttribute('aria-label', new Intl.DateTimeFormat('en-US',{dateStyle:'full',timeZone:'UTC'}).format(date));");
  }
  write('assets/js/'+name,out);
}
for(const name of fs.readdirSync('assets/conference')){
  let source=fs.readFileSync('assets/conference/'+name,'utf8');
  source=source.replace(/<script([^>]*)>([\s\S]*?)<\/script>/g,(_,attrs,js)=>'<script'+attrs+'>'+ (js.trim()?javascript(js,true):js)+'</script>');
  // Static HTML uses the same editorial vocabulary; script data is already done.
  const chunks=source.split(/(<(?:script|style)\b[\s\S]*?<\/(?:script|style)>)/gi);
  source=chunks.map((s,i)=>i%2?s:markup(s)).join('').replace('<html lang="ko">','<html lang="en">');
  source=source.replaceAll('href="/conference/','href="/en/conference/');
  source=source.replace('</head>','<meta name="robots" content="noindex,nofollow"></head>');
  source=source.replace('<main>','<p class="english-original-note" style="margin:12px 28px">Interface and keywords are in English. Presentation titles, authors, and program details retain their original language.</p><main>');
  write('assets/conference/'+name,source);
}
fs.writeFileSync('/tmp/proax-english-unmatched.json',JSON.stringify([...unknown],null,2));
console.log('English application runtimes compiled. Unmatched fragments: '+unknown.size+' (see /tmp/proax-english-unmatched.json)');
