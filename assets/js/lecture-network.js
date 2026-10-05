(function () {
  'use strict';
  var root = document.getElementById('lecture-network');
  if (!root || !window.d3) return;
  var groups = JSON.parse(document.getElementById('lecture-network-data').textContent);
  var topicData = JSON.parse(document.getElementById("lecture-topic-data").textContent);
  var W = 760, H = 640, selected = '', query = '';
  var nodes = [{id:'lab', name:'PRO AnalytiX Lab', type:'lab', x:W/2,y:H/2}], links = [];
  groups.forEach(function (group, i) {
    var angle = -Math.PI/2 + i * Math.PI*2/3;
    var cx=W/2+Math.cos(angle)*180, cy=H/2+Math.sin(angle)*180;
    nodes.push({id:group.id,name:group.label,type:'group',group:group.id,color:group.color,x:cx,y:cy});
    links.push({source:'lab',target:group.id});
    group.items.forEach(function (name,j) {
      var a=angle-Math.PI/2+j/Math.max(1,group.items.length-1)*Math.PI;
      nodes.push({id:name,name:name,type:'org',group:group.id,color:group.color,x:cx+Math.cos(a)*125,y:cy+Math.sin(a)*125});
      links.push({source:group.id,target:name});
    });
  });
  topicData.topics.forEach(function(name,i){
    var a=i*Math.PI*2/topicData.topics.length;
    nodes.push({id:"topic:"+name,name:name,type:"topic",color:"#8b5ac5",x:W/2+Math.cos(a)*95,y:H/2+Math.sin(a)*95});
  });
  Object.keys(topicData.assignments).forEach(function(name){
    topicData.assignments[name].forEach(function(topic){links.push({source:name,target:"topic:"+topic,type:"topic"});});
  });
  var neighbors={};
  links.forEach(function(link){(neighbors[link.source]||(neighbors[link.source]=new Set())).add(link.target);(neighbors[link.target]||(neighbors[link.target]=new Set())).add(link.source);});
  var svg=d3.select(root.querySelector('svg')).attr('viewBox','0 0 '+W+' '+H);
  var layer=svg.append('g');
  var zoom=d3.zoom().scaleExtent([0.45,4]).on('zoom',function(e){layer.attr('transform',e.transform);});
  svg.call(zoom);
  var lines=layer.append('g').selectAll('line').data(links).join('line').attr('stroke','currentColor').attr('stroke-width',function(d){return d.type==='topic'?0.7:1;}).attr('stroke-dasharray',function(d){return d.type==='topic'?'3 4':null;});
  var node=layer.append('g').selectAll('g').data(nodes).join('g').attr('class','lecture-node').attr('tabindex',0).attr('role','button').attr('aria-label',function(d){return d.name;});
  node.append('circle').attr('r',function(d){return d.type==='lab'?27:d.type==='group'?17:d.type==='topic'?13:6;}).attr('fill',function(d){return d.color||'#324b73';});
  node.append('text').text(function(d){return d.name;}).attr('x',function(d){return d.type==='org'?10:0;}).attr('y',function(d){return d.type==='lab'?43:d.type==='group'?31:d.type==='topic'?26:3;}).attr('text-anchor',function(d){return d.type==='org'?'start':'middle';}).attr('class',function(d){return 'lecture-label lecture-label-'+d.type;});
  node.append('title').text(function(d){return d.name;});
  var sim=d3.forceSimulation(nodes).force('link',d3.forceLink(links).id(function(d){return d.id;}).distance(function(d){return d.type==='topic'?125:d.source.type==='lab'?165:85;}).strength(function(d){return d.type==='topic'?0.04:0.35;})).force('charge',d3.forceManyBody().strength(function(d){return d.type==='org'?-75:-400;})).force('collision',d3.forceCollide().radius(function(d){return d.type==='org'?15:47;})).force('x',d3.forceX(function(d){return d.type==='lab'||d.type==='topic'?W/2:W/2+Math.cos(-Math.PI/2+groups.findIndex(function(g){return g.id===d.group;})*Math.PI*2/3)*200;}).strength(0.07)).force('y',d3.forceY(function(d){return d.type==='lab'||d.type==='topic'?H/2:H/2+Math.sin(-Math.PI/2+groups.findIndex(function(g){return g.id===d.group;})*Math.PI*2/3)*200;}).strength(0.07));
  nodes[0].fx=W/2; nodes[0].fy=H/2;
  sim.on('tick',function(){lines.attr('x1',function(d){return d.source.x;}).attr('y1',function(d){return d.source.y;}).attr('x2',function(d){return d.target.x;}).attr('y2',function(d){return d.target.y;});node.attr('transform',function(d){return 'translate('+d.x+','+d.y+')';});});
  node.call(d3.drag().on('start',function(e,d){if(!e.active)sim.alphaTarget(0.2).restart();d.fx=d.x;d.fy=d.y;}).on('drag',function(e,d){d.fx=e.x;d.fy=e.y;}).on('end',function(e){if(!e.active)sim.alphaTarget(0);}));
  function matches(d){return !query||d.name.toLowerCase().includes(query)||(topicData.assignments[d.id]||[]).some(function(t){return t.toLowerCase().includes(query);});}
  function active(d){return (matches(d)||d.type==='lab')&&(!selected||d.id===selected||(neighbors[selected]&&neighbors[selected].has(d.id)));}
  function apply(){
    node.attr('opacity',function(d){return active(d)?1:0.12;});
    lines.attr('opacity',function(d){return active(d.source)&&active(d.target)?(d.type==='topic'?0.18:0.4):0.025;});
    root.querySelectorAll('[data-lecture-name]').forEach(function(b){b.classList.toggle('is-selected',b.dataset.lectureName===selected);var d=nodes.find(function(n){return n.id===b.dataset.lectureName;});b.classList.toggle('is-related',!!selected&&active(d));b.closest('li').hidden=!matches(d);});
    root.querySelectorAll('[data-lecture-group],[data-lecture-topic]').forEach(function(b){b.classList.toggle('is-selected',(b.dataset.lectureGroup||'topic:'+b.dataset.lectureTopic)===selected);});
    var chosen=nodes.find(function(d){return d.id===selected;});
    root.querySelector('.lecture-selection').textContent=chosen?chosen.name+(chosen.type==='org'?' · 예시 주제: '+topicData.assignments[chosen.id].join(' · '):' · 연결 기관 '+nodes.filter(function(d){return d.type==='org'&&neighbors[selected]&&neighbors[selected].has(d.id);}).length+'개'):'기관이나 주제를 누르면 연결된 항목이 강조됩니다.';
  }
  function choose(id){selected=selected===id?'':id;apply();}
  node.on('click',function(e,d){choose(d.id==='lab'?'':d.id);}).on('keydown',function(e,d){if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(d.id==='lab'?'':d.id);}});
  root.querySelectorAll('[data-lecture-name],[data-lecture-group],[data-lecture-topic]').forEach(function(b){b.addEventListener('click',function(){choose(b.dataset.lectureName||b.dataset.lectureGroup||'topic:'+b.dataset.lectureTopic);});});
  root.querySelector('#lecture-search').addEventListener('input',function(e){query=e.target.value.trim().toLowerCase();apply();});
  root.querySelector('.lecture-reset').addEventListener('click',function(){selected='';query='';root.querySelector('#lecture-search').value='';apply();});
  function fit(){var minX=d3.min(nodes,function(d){return d.x-35;}),maxX=d3.max(nodes,function(d){return d.x+(d.type==='org'?Math.min(170,d.name.length*8):85);}),minY=d3.min(nodes,function(d){return d.y-35;}),maxY=d3.max(nodes,function(d){return d.y+45;});var k=Math.min(W/(maxX-minX+40),H/(maxY-minY+40),1.2);svg.call(zoom.transform,d3.zoomIdentity.translate(W/2-k*(minX+maxX)/2,H/2-k*(minY+maxY)/2).scale(k));}
  root.querySelector('.lecture-fit').addEventListener('click',fit);
  sim.on('end',fit);apply();
})();
