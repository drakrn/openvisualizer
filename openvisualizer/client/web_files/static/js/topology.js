// Variables
const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

var motes = [];
var connections = [];
var mote_selection = undefined;
var connection_selection = undefined;

function resize() {
    /* Resize canvas to fit window */
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resize();

var rect = canvas.getBoundingClientRect();
var scaleX = canvas.width / rect.width;
var scaleY = canvas.height / rect.height;

function within(x, y) {
    /* Check if cursor is within a mote or connection link */

    // Search for cursor within a mote
    for(id in motes) {
        let mote = motes[id];
        let dx = x - mote.x;
        let dy = y - mote.y;
        if (dx*dx + dy*dy < mote.radius*mote.radius) {
            return [mote, 'mote']; // Return mote object and type
        }
    }


    // Search for cursor within a connection link
    let points = [];                                            // Points on a circle around cursor
    var radius = 2;                                             // Radius of circle
    var nbPoints = 15;                                          // Number of points on circle
    for(let i=0; i<nbPoints; i++) {
        points.push({x: radius*Math.cos(i*2*Math.PI/nbPoints) + x, y: radius*Math.sin(i*2*Math.PI/nbPoints) + y});
    }

    for(let i=0; i<connections.length; i++) {
        let connection = connections[i];
        let fromMote = connection.from;
        let toMote = connection.to;

        let xA = fromMote.x;
        let xB = toMote.x;
        let dx = xB - xA;
        let yA = fromMote.y;
        let yB = toMote.y;
        let dy = yB - yA;

        if( 
            ((x >= xA && x <= xB) && (y >= yA && y <= yB)) ||   // xA < x_cursor < xB && yA < y_cursor < yB
            ((x >= xA && x <= xB) && (y >= yB && y <= yA)) ||   // xA < x_cursor < xB && yB < y_cursor < yA
            ((x >= xB && x <= xA) && (y >= yA && y <= yB)) ||   // xB < x_cursor < xA && yA < y_cursor < yB
            ((x >= xB && x <= xA) && (y >= yB && y <= yA))      // xB < x_cursor < xA && yB < y_cursor < yA
        ) {
            for(let point in points) {
                let y_line = (points[point].x - xA)*dy/dx + yA;
                if(Math.abs(points[point].y - y_line) < 5) {
                    return [connection, 'connection'];          // Return connection object and type
                }
            }
        }
    }
}

function move(e) {
    /* Move mote or connection link */

    if(mote_selection && e.buttons) {
        mote_selection.x = (e.clientX-rect.left+window.scrollX)*scaleX;
        mote_selection.y = (e.clientY-rect.top+window.scrollY)*scaleY;
        var menu = document.getElementById('mote-menu');
        if(menu) {
            menu.style.left = mote_selection.x/scaleX + rect.left + 15 + 'px';
            menu.style.top =  mote_selection.y/scaleY + rect.top + 'px';
        }
        var menu = document.getElementById('connection-menu');
        if(menu) {
            menu.style.left = (connection_selection.from.x + connection_selection.to.x - menu.offsetWidth)/(2*scaleX) + rect.left + 'px';
            menu.style.top = (connection_selection.from.y + connection_selection.to.y - menu.offsetHeight)/(2*scaleY) + rect.top + 'px';
        }
        draw();
    }
}

function draw() {
    /* Draw motes and connection links */

    var maxLineWidth = 10;
    var maxPacketsLineWidth = 50;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var packetsMax = Math.max(...connections.map(c => c.packets));
    for (let i=0; i<connections.length; i++) {
        let fromMote = connections[i].from;
        let toMote = connections[i].to;
        ctx.beginPath();
        let alpha = (maxLineWidth - 1)/(maxPacketsLineWidth);       // Leading coefficient of the line width
        ctx.lineWidth = connections[i].packets > 0 ? Math.abs(connections[i].packets)/packetsMax * (connections[i].packets > maxPacketsLineWidth ? maxLineWidth : connections[i].packets*alpha) + 1 : 1;
        ctx.strokeStyle = connections[i].color;
        ctx.moveTo(fromMote.x, fromMote.y);
        ctx.lineTo(toMote.x, toMote.y);
        ctx.stroke();

        if(connections[i].arrowOnFrom) {                            // Draw arrow on "from" mote of the connection
            let angle = Math.atan2(fromMote.y - toMote.y, fromMote.x - toMote.x);
            let lineWidthOffset = ctx.lineWidth/2;
            let arrowX = fromMote.x - (20 + lineWidthOffset) * Math.cos(angle);
            let arrowY = fromMote.y - (20 + lineWidthOffset) * Math.sin(angle);

            ctx.beginPath();
            ctx.lineWidth /= 1.5;
            ctx.moveTo(arrowX - 20*Math.cos(angle - Math.PI/6), arrowY - 20*Math.sin(angle - Math.PI/6));
            ctx.lineTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 20*Math.cos(angle + Math.PI/6), arrowY - 20*Math.sin(angle + Math.PI/6));
            ctx.stroke();
        }
        if(connections[i].arrowOnTo) {                              // Draw arrow on "to" mote of the connection
            let angle = Math.atan2(toMote.y - fromMote.y, toMote.x - fromMote.x);
            let lineWidthOffset = ctx.lineWidth/2;
            let arrowX = toMote.x - (20 + lineWidthOffset) * Math.cos(angle);
            let arrowY = toMote.y - (20 + lineWidthOffset) * Math.sin(angle);

            ctx.beginPath();
            ctx.lineWidth /= 1.5;
            ctx.moveTo(arrowX - 20*Math.cos(angle - Math.PI/6), arrowY - 20*Math.sin(angle - Math.PI/6));
            ctx.lineTo(arrowX, arrowY);
            ctx.lineTo(arrowX - 20*Math.cos(angle + Math.PI/6), arrowY - 20*Math.sin(angle + Math.PI/6));
            ctx.stroke();
        }
    }
    
    for (id in motes) {
        let mote = motes[id];
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.fillStyle = mote.selected ? mote.selectedFill : mote.fillStyle;
        ctx.arc(mote.x, mote.y, mote.radius, 0, 2*Math.PI, true);
        ctx.strokeStyle = mote.strokeStyle;
        ctx.fill();
        ctx.stroke();
        ctx.font = '20px Arial';
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(mote.id, mote.x, mote.y+7);
        ctx.stroke();
    }
}

function down(e) {
    /* Select mote on mouse down */
    console.log((e.clientX-rect.left+window.scrollX)*scaleX, (e.clientY-rect.top+window.scrollY)*scaleY);

    let target = within((e.clientX-rect.left+window.scrollX)*scaleX, (e.clientY-rect.top+window.scrollY)*scaleY);
    if(mote_selection && mote_selection.selected) {
        mote_selection.selected = false;
    }
    if(target) {
        target = target[0];
        mote_selection = target;
        mote_selection.selected = true;
        draw();
    }
}

function up(e) {
    /* Unselect mote */

    if(mote_selection && !mote_selection.selected) {
        mote_selection = undefined;
    }
    draw();
}

function addParagraph(element, text, color='black') {
    /* Append a paragraph to an element */

    let p = document.createElement('p');
    p.style.color = color;
    p.textContent = text;
    element.appendChild(p);
}

function tdAddTable(tr, text, color='black'){
    /* Append a table data to a table row */

    let td = document.createElement('td');
    td.style.color = color;
    td.textContent = text;
    tr.appendChild(td);
}

function thAddTable(tr, text, color='black'){
    /* Append a table header to a table row */

    let th = document.createElement('th');
    th.style.color = color;
    th.textContent = text;
    tr.appendChild(th);
}

function openMenuTab(e, tabName) {
    /* Open a tab in the context menu element */

    let tabcontent = document.getElementsByClassName('tabcontent');
    for(let i=0; i<tabcontent.length; i++) {
        tabcontent[i].style.display = 'none';
    }
    let tablinks = document.getElementsByClassName('tablinks');
    for(let i=0; i<tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(' active', '');
    }
    document.getElementById(tabName).style.display = 'block';
    e.currentTarget.className += ' active';
}

function ctxmenu(e) {
    /* Open context menu */

    e.preventDefault();
    let target = within((e.clientX-rect.left+window.scrollX)*scaleX, (e.clientY-rect.top+window.scrollY)*scaleY);
    if(target) {
        if(target[1] == 'mote' && target[0] && target[0].selected) {
            let mote_target = target[0];
            if(document.getElementById('connection-menu')) { document.getElementById('connection-menu').remove(); }
            if(document.getElementById('mote-menu')) { document.getElementById('mote-menu').remove(); }
            else{
                var menu = document.createElement('div');
                menu.id = 'mote-menu';
                menu.className = 'menu'

                menu.style.position = 'absolute';
                menu.style.left = mote_target.x/scaleX + rect.left + 10 + 'px';
                menu.style.top = mote_target.y/scaleY + rect.top + 'px';
                menu.style.backgroundColor = '#ffffff';
                menu.style.border = '1px solid #000000';
                menu.style.padding = '5px';
                menu.style.zIndex = '1000';
                document.body.appendChild(menu);

                var tab = document.createElement('div');
                tab.className = 'tab';
                menu.appendChild(tab);

                var mote = document.createElement('button');
                mote.className = 'tablinks';
                mote.id = 'defaultOpen';
                mote.textContent = 'Mote';
                tab.appendChild(mote);
                mote.addEventListener('click', function(e){openMenuTab(e, 'mote')});

                var schedule = document.createElement('button');
                schedule.className = 'tablinks';
                schedule.textContent = 'Schedule';
                tab.appendChild(schedule);
                schedule.addEventListener('click', function(e){openMenuTab(e, 'schedule')});
                
                var mote_info = document.createElement('div');
                mote_info.id = 'mote';
                mote_info.className = 'tabcontent';
                menu.appendChild(mote_info);
                addParagraph(mote_info, 'id: ' + mote_target.id.toString().padStart(4, '0'));
                addParagraph(mote_info, 'lat: ' + mote_target.lat.toFixed(4));
                addParagraph(mote_info, 'lon: ' + mote_target.lon.toFixed(4));
                addParagraph(mote_info, 'isDAGroot: ' + mote_target.schedule.idJson.isDAGroot);
                addParagraph(mote_info, 'DAG rank: ' + mote_target.schedule.dagrank);
                

                var schedule_info = document.createElement('div');
                schedule_info.id = 'schedule';
                schedule_info.className = 'tabcontent';
                menu.appendChild(schedule_info);

                var table = document.createElement('table');
                table.style.borderCollapse = 'collapse';
                table.style.margin = 'auto';
                table.style.width = '100%';
                schedule_info.appendChild(table);

                var tr = document.createElement('tr');
                table.appendChild(tr);

                thAddTable(tr, 'slotOffset');
                thAddTable(tr, 'channelOffset');
                thAddTable(tr, 'neighbor');
                thAddTable(tr, 'lastUsedAsn');
                thAddTable(tr, 'type');
                thAddTable(tr, 'numRx');
                thAddTable(tr, 'numTx');
                thAddTable(tr, 'numTxACK');

                for(elt in mote_target.schedule.schedJson) {
                    if(mote_target.schedule.schedJson[elt].type !== '0 (OFF)') {
                        var tr = document.createElement('tr');
                        table.appendChild(tr);
                        
                        let color;
                        if(mote_target.schedule.schedJson[elt].neighbor == ' (anycast)' && mote_target.schedule.schedJson[elt].type == '2 (RX)') {
                            color = 'green';
                        }

                        tdAddTable(tr, mote_target.schedule.schedJson[elt].slotOffset, color);
                        tdAddTable(tr, mote_target.schedule.schedJson[elt].channelOffset, color);
                        tdAddTable(tr, mote_target.schedule.schedJson[elt].neighbor == ' (anycast)' ? ' anycast' : mote_target.schedule.schedJson[elt].neighbor.slice(0, -5), color);
                        tdAddTable(tr, parseInt(mote_target.schedule.schedJson[elt].lastUsedAsn), color);
                        tdAddTable(tr, mote_target.schedule.schedJson[elt].type.slice(3, -1), color);
                        tdAddTable(tr, mote_target.schedule.schedJson[elt].numRx, color);
                        tdAddTable(tr, mote_target.schedule.schedJson[elt].numTx, color);
                        tdAddTable(tr, mote_target.schedule.schedJson[elt].numTxACK, color);
                    }
                }

                mote.click();
            }
        }
        if(target[1] == 'connection' && target[0]) {
            let connection_target = target[0];
            connection_selection = connection_target;
            if(document.getElementById('mote-menu')) { document.getElementById('mote-menu').remove(); }
            if(document.getElementById('connection-menu')) { document.getElementById('connection-menu').remove(); }
            else{
                var menu = document.createElement('div');
                menu.id = 'connection-menu';
                menu.className = 'menu'

                menu.style.position = 'absolute';
                menu.style.backgroundColor = '#ffffff';
                menu.style.border = '1px solid #000000';
                menu.style.padding = '5px';
                menu.style.zIndex = '1000';
                document.body.appendChild(menu);
                menu.style.left = (connection_target.from.x + connection_target.to.x - menu.offsetWidth)/(2*scaleX) + rect.left + 'px';
                menu.style.top = (connection_target.from.y + connection_target.to.y - menu.offsetHeight)/(2*scaleY) + rect.top + 'px';
                
                var tab = document.createElement('div');
                tab.className = 'tab';
                menu.appendChild(tab);

                var connection = document.createElement('button');
                connection.className = 'tablinks';
                connection.id = 'defaultOpen';
                connection.textContent = 'Connection';
                tab.appendChild(connection);
                connection.addEventListener('click', function(e){openMenuTab(e, 'connection')});

                var schedule = document.createElement('button');
                schedule.className = 'tablinks';
                schedule.textContent = 'Schedule';
                tab.appendChild(schedule);
                schedule.addEventListener('click', function(e){openMenuTab(e, 'schedule')});
                
                var connection_info = document.createElement('div');
                connection_info.id = 'connection';
                connection_info.className = 'tabcontent';
                menu.appendChild(connection_info);
                addParagraph(connection_info, 'mote 1: ' + connection_target.from.id.toString().padStart(4, '0'));
                addParagraph(connection_info, 'mote 2: ' + connection_target.to.id.toString().padStart(4, '0'));
                addParagraph(connection_info, 'pdr: ' + connection_target.pdr.toFixed(2), connection_target.color);
                addParagraph(connection_info, 'packets: ' + connection_target.packets);
                

                var schedule_info = document.createElement('div');
                schedule_info.id = 'schedule';
                schedule_info.className = 'tabcontent';
                menu.appendChild(schedule_info);

                var table = document.createElement('table');
                table.style.borderCollapse = 'collapse';
                table.style.margin = 'auto';
                table.style.width = '100%';
                schedule_info.appendChild(table);

                var tr = document.createElement('tr');
                table.appendChild(tr);

                thAddTable(tr, 'slotOffset');
                thAddTable(tr, 'channelOffset');
                thAddTable(tr, 'lastUsedAsn');
                thAddTable(tr, 'transmition');


                for(elt1 in connection_target.from.schedule.schedJson) {
                    if(connection_target.from.schedule.schedJson[elt1].type !== '0 (OFF)') {
                        for(elt2 in connection_target.to.schedule.schedJson) {
                            if(connection_target.to.schedule.schedJson[elt2].type !== '0 (OFF)') {
                                if(connection_target.from.schedule.schedJson[elt1].slotOffset == connection_target.to.schedule.schedJson[elt2].slotOffset && connection_target.from.schedule.schedJson[elt1].channelOffset == connection_target.to.schedule.schedJson[elt2].channelOffset) {
                                    var tr = document.createElement('tr');
                                    table.appendChild(tr);

                                    tdAddTable(tr, connection_target.from.schedule.schedJson[elt1].slotOffset);
                                    tdAddTable(tr, connection_target.from.schedule.schedJson[elt1].channelOffset);
                                    tdAddTable(tr, parseInt(connection_target.from.schedule.schedJson[elt1].lastUsedAsn));
                                    if(connection_target.from.schedule.schedJson[elt1].type == '1 (TX)' && connection_target.to.schedule.schedJson[elt2].type == '2 (RX)') {
                                        tdAddTable(tr, connection_target.from.id + ' -> ' + connection_target.to.id);
                                    }
                                    else if(connection_target.from.schedule.schedJson[elt1].type == '2 (RX)' && connection_target.to.schedule.schedJson[elt2].type == '1 (TX)') {
                                        tdAddTable(tr, connection_target.to.id + ' -> ' + connection_target.from.id);
                                    }
                                    else if(connection_target.from.schedule.schedJson[elt1].type == '3 (TXRX)' && connection_target.to.schedule.schedJson[elt2].type == '3 (TXRX)') {
                                        tdAddTable(tr, connection_target.from.id + ' <-> ' + connection_target.to.id);
                                    }
                                    else {
                                        tdAddTable(tr, 'none');
                                    }
                                }
                            }
                        }
                    }
                }

                let from64bID = connection_target.from.schedule.idJson.my64bID;
                let to64bID = connection_target.to.schedule.idJson.my64bID;

                for(elt1 in connection_target.from.schedule.schedJson) {
                    if(connection_target.from.schedule.schedJson[elt1].type !== '0 (OFF)') {
                        let flag = false;
                        if(connection_target.from.schedule.schedJson[elt1].neighbor == to64bID) {
                            for(elt2 in connection_target.to.schedule.schedJson) {
                                if(connection_target.to.schedule.schedJson[elt2].type !== '0 (OFF)') {
                                    if(connection_target.from.schedule.schedJson[elt1].slotOffset == connection_target.to.schedule.schedJson[elt2].slotOffset && connection_target.from.schedule.schedJson[elt1].channelOffset == connection_target.to.schedule.schedJson[elt2].channelOffset) {
                                        flag = true;
                                    }
                                }
                            }
                            if(!flag) {
                                var tr = document.createElement('tr');
                                table.appendChild(tr);

                                tdAddTable(tr, connection_target.from.schedule.schedJson[elt1].slotOffset, 'red');
                                tdAddTable(tr, connection_target.from.schedule.schedJson[elt1].channelOffset, 'red');
                                tdAddTable(tr, parseInt(connection_target.from.schedule.schedJson[elt1].lastUsedAsn), 'red');
                                tdAddTable(tr, connection_target.from.id + ' -> ' + connection_target.to.id, 'red');
                            }
                        }
                    }
                }
                
                for(elt2 in connection_target.to.schedule.schedJson) {
                    if(connection_target.to.schedule.schedJson[elt2].type !== '0 (OFF)') {
                        let flag = false;
                        if(connection_target.to.schedule.schedJson[elt2].neighbor == from64bID) {
                            for(elt1 in connection_target.from.schedule.schedJson) {
                                if(connection_target.from.schedule.schedJson[elt1].type !== '0 (OFF)') {
                                    if(connection_target.from.schedule.schedJson[elt1].slotOffset == connection_target.to.schedule.schedJson[elt2].slotOffset && connection_target.from.schedule.schedJson[elt1].channelOffset == connection_target.to.schedule.schedJson[elt2].channelOffset) {
                                        flag = true;
                                    }
                                }
                            }
                            if(!flag) {
                                var tr = document.createElement('tr');
                                table.appendChild(tr);

                                tdAddTable(tr, connection_target.to.schedule.schedJson[elt2].slotOffset, 'red');
                                tdAddTable(tr, connection_target.to.schedule.schedJson[elt2].channelOffset, 'red');
                                tdAddTable(tr, parseInt(connection_target.to.schedule.schedJson[elt2].lastUsedAsn), 'red');
                                tdAddTable(tr, connection_target.to.id + ' -> ' + connection_target.from.id, 'red');
                            }
                        }
                    }
                }
                connection.click();
            }
        }
    } 
    else{
        if(document.getElementById('mote-menu')) { document.getElementById('mote-menu').remove(); }
        if(document.getElementById('connection-menu')) { document.getElementById('connection-menu').remove(); }
    }
}

function updateMenu(){
    /* Update context menu */

    if(document.getElementById('mote-menu')) {
        let mote_info = document.getElementById('mote');
        while(mote_info.firstChild) {
            mote_info.removeChild(mote_info.firstChild);
        }
        addParagraph(mote_info, 'id: ' + mote_selection.id.toString().padStart(4, '0'));
        addParagraph(mote_info, 'lat: ' + mote_selection.lat.toFixed(4));
        addParagraph(mote_info, 'lon: ' + mote_selection.lon.toFixed(4));
        addParagraph(mote_info, 'isDAGroot: ' + mote_selection.schedule.idJson.isDAGroot);
        addParagraph(mote_info, 'DAG rank: ' + mote_selection.schedule.dagrank);

        let schedule_info = document.getElementById('schedule');
        while(schedule_info.firstChild) {
            schedule_info.removeChild(schedule_info.firstChild);
        }

        var table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.margin = 'auto';
        table.style.width = '100%';
        schedule_info.appendChild(table);

        var tr = document.createElement('tr');
        table.appendChild(tr);

        thAddTable(tr, 'slotOffset');
        thAddTable(tr, 'channelOffset');
        thAddTable(tr, 'neighbor');
        thAddTable(tr, 'lastUsedAsn');
        thAddTable(tr, 'type');
        thAddTable(tr, 'numRx');
        thAddTable(tr, 'numTx');
        thAddTable(tr, 'numTxACK');

        for(elt in mote_selection.schedule.schedJson) {
            if(mote_selection.schedule.schedJson[elt].type !== '0 (OFF)') {
                var tr = document.createElement('tr');
                table.appendChild(tr);

                let color;
                if(mote_selection.schedule.schedJson[elt].neighbor == ' (anycast)' && mote_selection.schedule.schedJson[elt].type == '2 (RX)') {
                    color = 'green';
                }

                tdAddTable(tr, mote_selection.schedule.schedJson[elt].channelOffset, color);
                tdAddTable(tr, mote_selection.schedule.schedJson[elt].slotOffset, color);
                tdAddTable(tr, mote_selection.schedule.schedJson[elt].neighbor == ' (anycast)' ? ' anycast' : mote_selection.schedule.schedJson[elt].neighbor.slice(0, -5), color);
                tdAddTable(tr, parseInt(mote_selection.schedule.schedJson[elt].lastUsedAsn), color);
                tdAddTable(tr, mote_selection.schedule.schedJson[elt].type.slice(3, -1), color);
                tdAddTable(tr, mote_selection.schedule.schedJson[elt].numRx, color);
                tdAddTable(tr, mote_selection.schedule.schedJson[elt].numTx, color);
                tdAddTable(tr, mote_selection.schedule.schedJson[elt].numTxACK, color);
            }
        }
    }
    if(document.getElementById('connection-menu')) {
        let connection_info = document.getElementById('connection');
        while(connection_info.firstChild) {
            connection_info.removeChild(connection_info.firstChild);
        }

        addParagraph(connection_info, 'mote 1: ' + connection_selection.from.id.toString().padStart(4, '0'));
        addParagraph(connection_info, 'mote 2: ' + connection_selection.to.id.toString().padStart(4, '0'));
        addParagraph(connection_info, 'pdr: ' + connection_selection.pdr.toFixed(2));
        addParagraph(connection_info, 'packets: ' + connection_selection.packets);

        let schedule_info = document.getElementById('schedule');
        while(schedule_info.firstChild) {
            schedule_info.removeChild(schedule_info.firstChild);
        }

        var table = document.createElement('table');
        table.style.borderCollapse = 'collapse';
        table.style.margin = 'auto';
        table.style.width = '100%';
        schedule_info.appendChild(table);

        var tr = document.createElement('tr');
        table.appendChild(tr);

        thAddTable(tr, 'slotOffset');
        thAddTable(tr, 'channelOffset');
        thAddTable(tr, 'lastUsedAsn');
        thAddTable(tr, 'transmition');

        for(elt1 in connection_selection.from.schedule.schedJson) {
            if(connection_selection.from.schedule.schedJson[elt1].type !== '0 (OFF)') {
                for(elt2 in connection_selection.to.schedule.schedJson) {
                    if(connection_selection.to.schedule.schedJson[elt2].type !== '0 (OFF)') {
                        if(connection_selection.from.schedule.schedJson[elt1].slotOffset == connection_selection.to.schedule.schedJson[elt2].slotOffset && connection_selection.from.schedule.schedJson[elt1].channelOffset == connection_selection.to.schedule.schedJson[elt2].channelOffset) {
                            var tr = document.createElement('tr');
                            table.appendChild(tr);

                            tdAddTable(tr, connection_selection.from.schedule.schedJson[elt1].slotOffset);
                            tdAddTable(tr, connection_selection.from.schedule.schedJson[elt1].channelOffset);
                            tdAddTable(tr, parseInt(connection_selection.from.schedule.schedJson[elt1].lastUsedAsn));

                            if(connection_selection.from.schedule.schedJson[elt1].type == '1 (TX)' && connection_selection.to.schedule.schedJson[elt2].type == '2 (RX)') {
                                tdAddTable(tr, connection_selection.from.id + ' -> ' + connection_selection.to.id);
                            }
                            else if(connection_selection.from.schedule.schedJson[elt1].type == '2 (RX)' && connection_selection.to.schedule.schedJson[elt2].type == '1 (TX)') {
                                tdAddTable(tr, connection_selection.to.id + ' -> ' + connection_selection.from.id);
                            }
                            else if(connection_selection.from.schedule.schedJson[elt1].type == '3 (TXRX)' && connection_selection.to.schedule.schedJson[elt2].type == '3 (TXRX)') {
                                tdAddTable(tr, connection_selection.from.id + ' <-> ' + connection_selection.to.id);
                            }
                            else {
                                tdAddTable(tr, 'none');
                            }
                        }
                    }
                }
            }
        }

        let from64bID = connection_selection.from.schedule.idJson.my64bID;
        let to64bID = connection_selection.to.schedule.idJson.my64bID;

        for(elt1 in connection_selection.from.schedule.schedJson) {
            if(connection_selection.from.schedule.schedJson[elt1].type !== '0 (OFF)') {
                let flag = false;
                if(connection_selection.from.schedule.schedJson[elt1].neighbor == to64bID) {
                    for(elt2 in connection_selection.to.schedule.schedJson) {
                        if(connection_selection.to.schedule.schedJson[elt2].type !== '0 (OFF)') {
                            if(connection_selection.from.schedule.schedJson[elt1].slotOffset == connection_selection.to.schedule.schedJson[elt2].slotOffset && connection_selection.from.schedule.schedJson[elt1].channelOffset == connection_selection.to.schedule.schedJson[elt2].channelOffset) {
                                flag = true;
                            }
                        }
                    }
                    if(!flag) {
                        var tr = document.createElement('tr');
                        table.appendChild(tr);

                        tdAddTable(tr, connection_selection.from.schedule.schedJson[elt1].slotOffset, 'red');
                        tdAddTable(tr, connection_selection.from.schedule.schedJson[elt1].channelOffset, 'red');
                        tdAddTable(tr, parseInt(connection_selection.from.schedule.schedJson[elt1].lastUsedAsn), 'red');
                        tdAddTable(tr, connection_selection.from.id + ' -> ' + connection_selection.to.id, 'red');
                    }
                }
            }
        }
        
        for(elt2 in connection_selection.to.schedule.schedJson) {
            if(connection_selection.to.schedule.schedJson[elt2].type !== '0 (OFF)') {
                let flag = false;
                if(connection_selection.to.schedule.schedJson[elt2].neighbor == from64bID) {
                    for(elt1 in connection_selection.from.schedule.schedJson) {
                        if(connection_selection.from.schedule.schedJson[elt1].type !== '0 (OFF)') {
                            if(connection_selection.from.schedule.schedJson[elt1].slotOffset == connection_selection.to.schedule.schedJson[elt2].slotOffset && connection_selection.from.schedule.schedJson[elt1].channelOffset == connection_selection.to.schedule.schedJson[elt2].channelOffset) {
                                flag = true;
                            }
                        }
                    }
                    if(!flag) {
                        var tr = document.createElement('tr');
                        table.appendChild(tr);

                        tdAddTable(tr, connection_selection.to.schedule.schedJson[elt2].slotOffset, 'red');
                        tdAddTable(tr, connection_selection.to.schedule.schedJson[elt2].channelOffset, 'red');
                        tdAddTable(tr, parseInt(connection_selection.to.schedule.schedJson[elt2].lastUsedAsn), 'red');
                        tdAddTable(tr, connection_selection.to.id + ' -> ' + connection_selection.from.id, 'red');
                    }
                }
            }
        }
    }
}



function initialize(callback){
    /* Initialize the topology */

    getTopologyData(callback);
}

function getTopologyData(callback){
    /* Get the topology data from the server */

    $.ajax({
        url: '/advanced_topology/data',
        type: 'GET',
        success: handleNewData.bind(undefined, callback),
    })
    .fail(function() {
        console.log("ERROR: could not GET data for advanced topology");
    });

    window.setTimeout(getTopologyData, DATA_LOAD_INTERVAL);     // DATA_LOAD_INTERVAL is defined in advanced_topology.tmpl
}

function handleNewData(callback, newData){
    /* Handle the new data received from the server */

    for (id in motes) {
        motes[id].deleteMe = true;
    }
    
    for(let i=0; i<connections.length; i++) {
        connections[i].deleteMe = true;
    }

    var id;
    var minlat;
    var minlon;
    var maxlat;
    var maxlon;
    var lat;
    var lon;


    for (let i=0; i<newData.motes.length; i++) {
        lat     = newData.motes[i].lat;
        lon     = newData.motes[i].lon;

        if (minlat == undefined || lat < minlat) {
            minlat = lat;
        }
        if (minlon == undefined || lon < minlon) {
            minlon = lon;
        }
        if (maxlat == undefined || lat > maxlat) {
            maxlat = lat;
        }
        if (maxlon == undefined || lon > maxlon) {
            maxlon = lon;
        }
    }

    var offset = 0.1*Math.min(canvas.width, canvas.height);
    for (let i=0; i<newData.motes.length; i++) {
        id      = newData.motes[i].id;
        lat     = newData.motes[i].lat;
        lon     = newData.motes[i].lon;

        if(!(id in motes)) {
            motes[id] = {
                id          : id,
                x           : (lon - minlon) / (maxlon - minlon) * (canvas.width - 2*offset) + offset,
                y           : (lat - minlat) / (maxlat - minlat) * (canvas.height - 2*offset) + offset,
                lon         : lon,
                lat         : lat,
                radius      : 12,
                fillStyle   : '#22cccc',
                strokeStyle : '#009999',
                selectedFill: '#88aaaa',
                selected    : false,
                deleteMe    : false,
                schedule    : {}
            }
        }
        else motes[id].deleteMe = false;
    }

    for (id in motes) {
        if(motes[id].deleteMe) {
            delete motes[id];
            motes.length--;
        } else {
            getMoteData(parseInt(id));
        }
    }

    var from;
    var to;
    var pdr;
    var connectionIdx;
    var connectionColor;

    for (let i=0; i<newData.connections.length; i++) {
        from = newData.connections[i].fromMote;
        to = newData.connections[i].toMote;
        pdr = newData.connections[i].pdr;

        connectionIdx = getConnectionIdx(from, to);
        if(connectionIdx == null) {
            connections.push({
                from        : motes[from],
                to          : motes[to],
                packets     : 0,
                packetsAbs  : 0,
                arrowOnFrom : false,
                arrowOnTo   : false,
                deleteMe    : false
            });
        } else if(connectionIdx >= 0){
            connections[connectionIdx].from.schedule = motes[from].schedule;
            connections[connectionIdx].to.schedule = motes[to].schedule;
            connections[connectionIdx].deleteMe = false;
        }

        connectionIdx = connections.length - 1;

        connections[connectionIdx].pdr = pdr;
        

        /* color of the connection
        *  pdr in [0, 0.5] -> red to orange
        *  pdr in [0.5, 1] -> orange to green
        */
        if ( pdr < 0.5 ) {
            let r = 255;
            let g = Math.round(254*pdr);
            let b = 0;
            connectionColor = 'rgb(' + r + ',' + g + ',' + b + ')';
        } else {
            let r = Math.round(510*(1-pdr));
            let g = 127;
            let b = 0;
            connectionColor = 'rgb(' + r + ',' + g + ',' + b + ')';
        }
        connections[connectionIdx].color = connectionColor;

        if ( pdr >= 0 && pdr <= 1 ) connections[connectionIdx].width = Math.round(5*pdr + 1);

        connections[connectionIdx].deleteMe = false;
    }

    for (let i=0; i<connections.length; i++) {
        if(connections[i].deleteMe) {
            connections.splice(i, 1);
            i--;
        }
    }

    // Calculate the number of packets sent (not received) from each mote on each connection
    for(let i=0; i<connections.length; i++) {
        var connection = connections[i];
        let fromMote = connection.from;
        let toMote = connection.to;
        var newPackets = 0;
        var oldPackets = connection.packetsAbs;
        let flag1 = false;
        let flag2 = false;
        for(let elt1 in fromMote.schedule.schedJson) {
            if(fromMote.schedule.schedJson[elt1].type !== '0 (OFF)') {
                for(let elt2 in toMote.schedule.schedJson) {
                    if(toMote.schedule.schedJson[elt2].type !== '0 (OFF)') {
                        if(fromMote.schedule.schedJson[elt1].slotOffset == toMote.schedule.schedJson[elt2].slotOffset && fromMote.schedule.schedJson[elt1].channelOffset == toMote.schedule.schedJson[elt2].channelOffset
                            && fromMote.schedule.schedJson[elt1].slotOffset != 0 && fromMote.schedule.schedJson[elt1].channelOffset != 0
                            && toMote.schedule.schedJson[elt2].slotOffset != 0 && toMote.schedule.schedJson[elt2].channelOffset != 0) 
                        {
                            if(fromMote.schedule.schedJson[elt1].type == '1 (TX)' || fromMote.schedule.schedJson[elt1].type == '3 (TXRX)') {
                                newPackets += fromMote.schedule.schedJson[elt1].numTx;
                            }
                            if(toMote.schedule.schedJson[elt2].type == '1 (TX)' || toMote.schedule.schedJson[elt2].type == '3 (TXRX)') {
                                newPackets += toMote.schedule.schedJson[elt2].numTx;
                            }                
                            if(fromMote.schedule.schedJson[elt1].type == '2 (RX)' && fromMote.schedule.schedJson[elt1].neighbor != ' (anycast)') {
                                connection.arrowOnFrom = true;
                                flag1 = true;
                            }
                            if(toMote.schedule.schedJson[elt2].type == '2 (RX)' && toMote.schedule.schedJson[elt2].neighbor != ' (anycast)') {
                                connection.arrowOnTo = true;
                                flag2 = true;
                            }
                        }
                    }
                }
            }
        }
        if(!flag1) {
            connection.arrowOnFrom = false;
        }
        if(!flag2) {
            connection.arrowOnTo = false;
        }
        connection.packetsAbs = newPackets;
        connection.packets = newPackets-oldPackets;
        if(connection.packets < 0){connection.packets = 0;}
    }

    draw();
    if(callback){callback();}
}

function getConnectionIdx(fromMote,toMote) {
    /* Returns the index of the connection between fromMote and toMote */

    for (var i=0; i<connections.length; i++) {
        if  (connections[i].from && connections[i].to) {
            if  (connections[i].from.id == fromMote && connections[i].to.id == toMote){
                return i;
            }
        }
    }
    return null;
}

function getMoteData(moteId) {
    /* Gets the data for a mote from the server */

    $.ajax({
        type: 'GET',
        url: '/motedata/' + moteId.toString(16).padStart(4, '0'),
        success: function(json) {
            let mote = motes[moteId];
            let asnJson       = JSON.parse(json.Asn)[0];
            let idJson        = JSON.parse(json.IdManager)[0];
            let syncJson      = JSON.parse(json.IsSync)[0];
            let dagrankJson   = JSON.parse(json.MyDagRank)[0];
            let outbufJson    = JSON.parse(json.OutputBuffer)[0];
            let backoffJson   = JSON.parse(json.Backoff)[0];
            let macstatsJson  = JSON.parse(json.MacStats)[0];
            let schedJson     = JSON.parse(json.Schedule);
            let queueJson     = JSON.parse(json.Queue);
            let nbrsJson      = JSON.parse(json.Neighbors);
            let kaPeriodJson  = JSON.parse(json.kaPeriod)[0];
            let joinedJson    = JSON.parse(json.Joined)[0];

            mote.schedule.asn           = asnJson.asn;
            mote.schedule.idJson        = idJson;
            mote.schedule.synced        = syncJson.isSync;
            mote.schedule.dagrank       = dagrankJson.myDAGrank;
            mote.schedule.outbufJson    = outbufJson
            mote.schedule.backoffJson   = backoffJson;
            mote.schedule.macstatsJson  = macstatsJson;
            mote.schedule.schedJson     = schedJson;
            mote.schedule.queueJson     = queueJson;
            mote.schedule.nbrsJson      = nbrsJson;
            mote.schedule.kaPeriod      = kaPeriodJson.kaPeriod;
            mote.schedule.joined        = joinedJson.joinedAsn;

            if(mote_selection && moteId == mote_selection.id) {
                updateMenu();
            }
            if(connection_selection && connection_selection.from.id == moteId) {
                updateMenu();
            }
        }
    })
    .fail(function() {
        console.log("ERROR: could not GET mote data for mote " + moteId);
    });
}

window.addEventListener('load', () => {
    window.scrollTo(0, 0);
    initialize(() => {
        let select = document.getElementById('mote_select');
        for(id in motes) {
            let option = document.createElement('option');
            option.text = motes[id].id.toString(16).padStart(4, '0');
            select.appendChild(option);
        }
    });
});

window.addEventListener('resize', () => {
    rect = canvas.getBoundingClientRect();
    scaleX = canvas.width / rect.width;
    scaleY = canvas.height / rect.height;
    draw();
});

window.addEventListener('resize', resize);

canvas.addEventListener("mousemove", move);

canvas.addEventListener("mousedown", down);

canvas.addEventListener("mouseup", up);

canvas.addEventListener("contextmenu", ctxmenu);

document.addEventListener("contextmenu", (e) => {e.preventDefault();});

history.scrollRestoration = 'manual';
$(window).on('beforeunload', function(){
    $(window.scrollTo(0, 0));
});

