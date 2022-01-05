var container;
var table;
var size;
var board;

class Snake{
    direction = 0;
    headPos = [0, 0];
    length = 2;
    history = [];

    move(){
        if(this.history.length === 0 || this.history[0][0] !== this.headPos[0] || this.history[0][1] !== this.headPos[1])
            this.history.unshift([...this.headPos]);
        const delta = [[-1, 0], [0, -1], [1, 0], [0, 1]][this.direction];
        [0, 1].forEach(i => this.headPos[i] = Math.min(Math.max(this.headPos[i] + delta[i], 0), size-1));
        while(this.length < this.history.length){
            this.history.pop();
        }
    }
}

function hasElem(array, elem){
    for(const a of array){
        if(a[0] === elem[0] && a[1] === elem[1]){
            return true;
        }
    }
    return false;
}

function moveCheck(){
    let hasFood = false;
    for(let r = 0; r < size; r++){
        for(let c = 0; c < size; c++){
            // if(board[r * size + c] === 0 || (board[r * size + c] & fallEffectBit) !== 0){
                const inTail = hasElem(snake.history, [c, r]);
                if(snake.headPos[0] === c && snake.headPos[1] === r){
                    if(inTail){
                        becomeGameover();
                        return;
                    }
                    if(board[r * size + c] === 4){
                        snake.length++;
                        points++;
                    }
                    board[r * size + c] = 2;
                }
                else if(inTail)
                    board[r * size + c] = 3;
                else if(board[r * size + c] !== 4)
                    board[r * size + c] = 0;
                else
                    hasFood = true;
                // board[r * size + c] |= fallEffectBit;
                // if(0 < r)
                //     board[(r - 1) * size + c] = 0;
                fallTime = fallMaxTime;
            // }
        }
    }

    if(!hasFood){
        for(let tries = 0; tries < 1e3; tries++){
            const [c, r] = [0, 1].map(() => Math.floor(Math.random() * size));
            if(!board[r * size + c]){
                board[r * size + c] = 4;
                break;
            }
        }
    }
}

let snake = new Snake;

var cellElems;
var selectedCell = null;
var selectedCoords = null;
var cursorElem;
var messageElem;
var debugText;

// Constants
var eraseEffectBit = 0x100;
var fallEffectBit = 0x200;
var fallMaxTime = 3;
var rollMaxTime = 3;
var maxScoreTexts = 4;
var gaugeHeight = 128;
var cellsize = 32;
var cellImages = [
    '',
    'images/block.png',
    'images/a.gif',
    'images/b.gif',
    'images/c.gif',
    'images/d.gif',
    'images/e.gif',
];

var rollx, rolly = -1;
var rollTime = 0;
var rollDirection = 0;
var maingauge = 0;
var subgauge = 0;
var gameover = false;
var practiceMode = false;
var sizeHighScores = {};
var newscore = -1;

var gaugeElem;
var gaugeIntElem;
var subGaugeElem;
var subGaugeIntElem;
var gameOverElem;

var points = 0;             // score points
var chain = 0;              // chain count
var movement = 0;           // internal variable to count chains
var level = 0;              // game level
var erases = 0;             // internal variable to control level
var eraseEffectTime = 0;
var mouseTime = 0;
var fallTime = 0;


var scoreTexts = new Array(maxScoreTexts * 4); // r, c, point, life
for(var i = 0; i < scoreTexts.length; i++)
    scoreTexts[i] = 0;
var scoreTextElems = [];

function iterateCells(func){
    for(var iy = 0; iy < size; iy++){
        for(var ix = 0; ix < size; ix++){
            func(ix, iy);
        }
    }
}

window.onload = function(){

    // Load from the local storage before updating the table
    if(typeof(Storage) !== "undefined"){
        try{
            deserialize(localStorage.getItem("SnakeFlake"));
        }
        catch(e){
            // If something got wrong about the storage, clear everything.
            // Doing so would guarantee the problem no longer persists, or we
            // would be caught in the same problem repeatedly.
            sizeHighScores = {};
            localStorage.removeItem("SnakeFlake");
        }
        updateHighScores();
    }

    generateBoard();
    window.setInterval(function(){
        run();
    }, 200);
}

window.addEventListener('resize', updateGauges);

function createElements(){
    cellElems = new Array(size * size);

    // The containers are nested so that the inner container can be easily
    // discarded to recreate the whole game.
    var outerContainer = document.getElementById("container");
    if(container)
        outerContainer.removeChild(container);
    container = document.createElement("div");
    outerContainer.appendChild(container);
    if(cursorElem)
        cursorElem = null;

    table = document.createElement("div");
    table.style.borderStyle = 'solid';
    table.style.borderWidth = '1px';
    table.style.borderColor = 'red';
    table.style.position = 'relative';
    table.style.left = '50%';
    table.style.width = (size * 32. + 8) + 'px';
    table.style.height = (size * 32. + 8) + 'px';

    messageElem = document.createElement('div');
    container.appendChild(messageElem);
    messageElem.style.fontFamily = 'Sans-serif';
    messageElem.style.fontSize = '20pt';
    messageElem.style.position = 'relative';
    messageElem.style.color = 'red';

    container.appendChild(table);
    for(var iy = 0; iy < size; iy++){
        for(var ix = 0; ix < size; ix++){
            var cell = document.createElement("div");
            cellElems[ix + iy * size] = cell;
            cell.innerHTML = "";
            //cell.style.backgroundColor = colors[region[ix + iy * size] % 4];
            cell.style.width = '31px';
            cell.style.height = '31px';
            cell.style.position = 'absolute';
            cell.style.top = (32.0 * iy + 4) + 'px';
            cell.style.left = (32.0 * ix + 4) + 'px';
            cell.style.border = '1px black solid';
            cell.style.textAlign = 'left';
            cell.onmousedown = function(e){
                var idx = cellElems.indexOf(this);
                var c = idx % size;
                var r = Math.floor(idx / size);

                // If the player clicked on the last row or column,
                // ignore it because you cannot rotate beyond border.
                if(size - 1 <= c || size - 1 <= r)
                    return;

                // Rotate the blocks counterclockwise
                if(e.button === 0){
                    var f = 0, d = 0;
                    var a = board[r * size + c];
                    var b = board[r * size + c + 1];
                    if(r !== size - 1){
                        f = board[(r + 1) * size + c + 1];
                        d = board[(r + 1) * size + c];
                    }
    /*				else for(int n = r; 0 <= n; n--){
                        board[n * 7 + c + 1] = (0 < n ? board[(n - 1) * 7 + c + 1] : newblock());
                    }*/
                    board[r * size + c] = b;
                    if(r !== size - 1){
                        board[r * size + c + 1] = f;
                        board[(r + 1) * size + c + 1] = d;
                        board[(r + 1) * size + c] = a;
                    }
                    else{
                        board[r * size + c + 1] = 0;
                    }
                    rollDirection = 0;
                }
                else{// Rotate the blocks clockwise
                    var f = 0, d = 0;
                    var a = board[r * size + c];
                    var b = board[r * size + c + 1];
                    if(r !== size - 1){
                        f = board[(r + 1) * size + c + 1];
                        d = board[(r + 1) * size + c];
                    }
    /*				else for(int n = r; 0 <= n; n--){
                        board[n * 7 + c] = (0 < n ? board[(n - 1) * 7 + c] : newblock());
                    }*/
                    board[r * size + c + 1] = a;
                    if(r !== size - 1){
                        board[r * size + c] = d;
                        board[(r + 1) * size + c + 1] = b;
                        board[(r + 1) * size + c] = f;
                    }
                    else{
                        board[r * size + c] = 0;
                    }
                    rollDirection = 1;
                }
                return false;
            }

            // Prevent context menu from right clicking on the cell
            cell.oncontextmenu = function(e){
                e.preventDefault();
            }

            cell.onmousemove = function(){
                selectCell(this);
            }
            table.appendChild(cell);

            var img = document.createElement('img');
            img.src = cellImages[board[ix + iy * size] & ~(eraseEffectBit | fallEffectBit)];
            cell.appendChild(img);
            var eraseEffect = document.createElement('img');
            eraseEffect.src = 'images/light.png';
            eraseEffect.style.position = 'absolute';
            eraseEffect.style.left = '0px';
            eraseEffect.style.top = '0px';
            eraseEffect.style.display = board[ix + iy * size] & eraseEffectBit ? 'inline' : 'none';
            cell.appendChild(eraseEffect);
        }
    }
    // Set the margin after contents are initialized
    table.style.marginLeft = (-table.getBoundingClientRect().width / 2) + 'px';

    // Create elements for popup score texts, but hide them until needed.
    for(var i = 0; i < maxScoreTexts; i++){
        scoreTextElems[i] = document.createElement('div');
        scoreTextElems[i].style.position = 'absolute';
        scoreTextElems[i].style.display = 'none';
        scoreTextElems[i].style.fontFamily = 'Monospace';
        scoreTextElems[i].style.fontSize = '35px';
        scoreTextElems[i].style.color = '#ff0000';
        scoreTextElems[i].style.textShadow = '1px 1px 2px #000000';

        // Prevent context menu from right clicking on the text
        scoreTextElems[i].oncontextmenu = function(e){
            e.preventDefault();
        };

        table.appendChild(scoreTextElems[i]);
    }

    var containerRect = container.getBoundingClientRect();
    var tableRect = table.getBoundingClientRect();

    // Main gauge bar
    gaugeElem = document.createElement('div');
    gaugeElem.style.position = 'absolute';
    gaugeElem.style.backgroundColor = '#00003f';
    container.appendChild(gaugeElem);

    gaugeIntElem = document.createElement('div');
    gaugeIntElem.style.position = 'relative';
    gaugeIntElem.style.backgroundColor = '#0000ff';
    gaugeElem.appendChild(gaugeIntElem);

    // Sub gauge bar
    subGaugeElem = document.createElement('div');
    subGaugeElem.style.position = 'absolute';
    subGaugeElem.style.backgroundColor = '#003f3f';
    container.appendChild(subGaugeElem);

    subGaugeIntElem = document.createElement('div');
    subGaugeIntElem.style.position = 'relative';
    subGaugeIntElem.style.backgroundColor = '#00ffff';
    subGaugeElem.appendChild(subGaugeIntElem);

    updateGauges();

    // Game over text overlay
    gameOverElem = document.createElement('div');
    gameOverElem.innerHTML = 'GAME OVER';
    gameOverElem.style.position = 'absolute';
    gameOverElem.style.fontFamily = 'Sans-serif';
    gameOverElem.style.fontSize = '40px';
    gameOverElem.style.fontWeight = 'bold';
    gameOverElem.style.color = '#ff00ff';
    gameOverElem.style.pointerEvents = 'none';
    gameOverElem.style.textShadow = '0px 0px 3px #000000';
    container.appendChild(gameOverElem);
    var rect = gameOverElem.getBoundingClientRect();
    gameOverElem.style.display = 'none';
    gameOverElem.style.top = (tableRect.height / 2 - rect.height / 2) + 'px';
    gameOverElem.style.marginLeft = (-rect.width / 2) + 'px';

    debugText = document.createElement('div');
    container.appendChild(debugText);
}

// Respond to window size change
function updateGauges(){
    var tableRect = table.getBoundingClientRect();
    var rect = gaugeElem.getBoundingClientRect();
    gaugeElem.style.left = (tableRect.left - 50) + 'px';
    gaugeElem.style.top = '0px';
    gaugeElem.style.width = '20px';
    gaugeElem.style.height = tableRect.height + 'px';
    gaugeIntElem.style.top = (rect.height * (1. - maingauge)) + 'px';
    gaugeIntElem.style.width = '20px';
    gaugeIntElem.style.height = (rect.height * maingauge) + 'px';
    subGaugeElem.style.left = (tableRect.left - 20) + 'px';
    subGaugeElem.style.top = '0px';
    subGaugeElem.style.width = '10px';
    subGaugeElem.style.height = tableRect.height + 'px';
    subGaugeIntElem.style.top = (rect.height * (1. - subgauge)) + 'px';
    subGaugeIntElem.style.width = '10px';
    subGaugeIntElem.style.height = (rect.height * subgauge) + 'px';
}

function updateElements(){
    for(var iy = 0; iy < size; iy++){
        for(var ix = 0; ix < size; ix++){
            var cell = cellElems[ix + iy * size];
            cell.children[0].src = cellImages[board[ix + iy * size] & ~(eraseEffectBit | fallEffectBit)];
            cell.children[1].style.display = board[ix + iy * size] & eraseEffectBit ? 'inline' : 'none';
        }
    }

    // Popup scores
    for(i = 0; i < maxScoreTexts; i++){
        if(scoreTexts[i * 4 + 3] !== 0){
            var x = scoreTexts[i * 4 + 1];
            scoreTextElems[i].style.left = (x < 0 ? 0 : x) + 'px';
            var y = scoreTexts[i * 4 + 0] + scoreTexts[i * 4 + 3];
            scoreTextElems[i].style.top = (y < 20 ? 20 : y) + 'px';
            scoreTextElems[i].style.display = 'block';
            scoreTextElems[i].innerHTML = scoreTexts[i * 4 + 2];
        }
        else {
            scoreTextElems[i].style.display = 'none';
        }
    }

    // Update current score text
    var pointsElem = document.getElementById("points");
    if(pointsElem)
        pointsElem.innerHTML = 'Points: ' + points;

    var rect = gaugeElem.getBoundingClientRect();
    gaugeIntElem.style.top = (rect.height * (1. - maingauge)) + 'px';
    gaugeIntElem.style.height = (rect.height * maingauge) + 'px';
    subGaugeIntElem.style.top = (rect.height * (1. - subgauge)) + 'px';
    subGaugeIntElem.style.height = (rect.height * subgauge) + 'px';
}

function selectCell(sel){
    selectedCell = sel;
    var idx = cellElems.indexOf(sel);
    var ix = idx % size;
    var iy = Math.floor(idx / size);
    selectedCoords = [ix, iy];
    if(ix < size-1 && iy < size-1){
        if(!cursorElem){
            cursorElem = document.createElement('div');
            cursorElem.style.border = '2px blue solid';
            cursorElem.style.pointerEvents = 'none';
            table.appendChild(cursorElem);
        }
        cursorElem.style.position = 'absolute';
        cursorElem.style.top = (32.0 * iy + 4) + 'px';
        cursorElem.style.left = (32.0 * ix + 4) + 'px';
        cursorElem.style.width = '62px';
        cursorElem.style.height = '62px';
    }
}

function generateBoard(){
    var sizeStr = document.getElementById("sizeSelect").value;
    size = parseInt(sizeStr);
    snake.headPos = [Math.floor(size / 2), Math.floor(size / 2)];
    snake.length = 0;
    board = new Array(size * size);

    gameover = false;
    points = 0;
    chain = 0;
    level = 0;
    erases = 0;
    maingauge = 0.3;
    subgauge = 1.;
//			practiceMode = e.getButton() != e.BUTTON1;

    const halfSize = Math.floor(size / 2);
    for(var i = 0; i < size * size; i++){
        const x = i % size;
        const y = Math.floor(i / size);
        board[i] = x === halfSize && y === halfSize ? 2 : 0;
    }

    createElements();

    updateHighScores();
}

function newblock(){
    return (Math.random() * 150) == 0 ? 1 : Math.floor(Math.random() * 5) + 2;
}

function check(){

    if(eraseEffectTime !== 0 || fallTime !== 0 || rollTime !== 0)
        return;

    eraseFrame = 0;

    // horizontal
    for(var r = 0; r < size; r++) for(var c = 0; c < size - 3; c++){
        var n, i, cc = 1;
        var src = board[r * size + c] & ~(eraseEffectBit);
        if(src === 0 || src === 1)
            continue;
        for(i = 1; c + i < size; i++){
            var target = board[r * size + (c + i)];
            if((target & ~eraseEffectBit) != src)
                break;
            else if(0 === (target & eraseEffectBit))
                cc++;
        }
        if(i < 4 || cc === 1)
            continue;
        for(var j = 0; j < i; j++)
            board[r * size + (c + j)] |= eraseEffectBit;
/*			for(n = r; 0 <= n; n--) for(int j = 0; j < i; j++){
            if(n != 0)
                board[n * 7 + (c + j)] = board[(n - 1) * 7 + (c + j)] | (n == r ? eraseEffectBit : 0);
            else
                board[n * 7 + (c + j)] = newblock();
            board[n * 7 + (c + j)] |= (n == r ? eraseEffectBit : 0);
        }*/
        scorePoint(cc, r * cellsize, c * cellsize + i * cellsize / 2);
    }

    // vertical
    for(r = 0; r < size - 3; r++) for(c = 0; c < size; c++){
        var n, i, cc = 1;
        var src = board[r * size + c] & ~(eraseEffectBit);
        if(src === 0 || src === 1)
            continue;
        for(i = 1; r + i < size; i++){
            var target = board[(r + i) * size + c];
            if((target & ~eraseEffectBit) != src)
                break;
            else if(0 === (target & eraseEffectBit))
                cc++;
        }
        if(i < 4 || cc === 1)
            continue;
        for(var j = 0; j < i; j++)
            board[(r + j) * size + c] |= eraseEffectBit;
/*			for(n = r + i - 1; 0 <= n; n--){
            if(i < n)
                board[n * 7 + c] = board[(n - i) * 7 + c];
            else
                board[n * 7 + c] = newblock();
            board[n * 7 + c] |= (r <= n ? eraseEffectBit : 0);
        }*/
        scorePoint(cc, r * cellsize + i * cellsize / 2, c * cellsize);
    }

    // rightside-down diagonal
    for(r = 0; r < size - 3; r++) for(c = 0; c < size - 3; c++){
        var n, i, cc = 1;
        var src = board[r * size + c] & ~(eraseEffectBit);
        if(src === 0 || src === 1)
            continue;
        for(i = 1; c + i < size && r + i < size; i++){
            var target = board[(r + i) * size + (c + i)];
            if((target & ~eraseEffectBit) != src)
                break;
            else if(0 === (target & eraseEffectBit))
                cc++;
        }
        if(i < 4 || cc === 1)
            continue;
        for(var j = 0; j < i; j++)
            board[(r + j) * size + (c + j)] |= eraseEffectBit;
/*			for(int j = 0; j < i; j++) for(n = r + j; 0 <= n; n--) if(n != 0)
            board[n * 7 + (c + j)] = board[(n - 1) * 7 + (c + j)] | (n == r + j ? eraseEffectBit : 0);
        else
            board[n * 7 + (c + j)] = newblock();*/
        scorePoint(cc, r * cellsize + i * cellsize / 2, c * cellsize + i * cellsize / 2);
    }

    // rightside-up diagonal
    for(c = 0; c < size - 3; c++) for(r = 3; r < size; r++){
        var n, i, cc = 1;
        var src = board[r * size + c] & ~(eraseEffectBit);
        if(src === 0 || src === 1)
            continue;
        for(i = 1; c + i < size && 0 <= r - i; i++){
            var target = board[(r - i) * size + (c + i)];
            if((target & ~eraseEffectBit) != src)
                break;
            else if(0 === (target & eraseEffectBit))
                cc++;
        }
        if(i < 4 || cc === 1)
            continue;
        for(var j = 0; j < i; j++)
            board[(r - j) * size + (c + j)] |= eraseEffectBit;
/*			for(int j = 0; j < i; j++) for(n = r - j; 0 <= n; n--) if(n != 0)
            board[n * 7 + (c + j)] = board[(n - 1) * 7 + (c + j)] | (n == r - j ? eraseEffectBit : 0);
        else
            board[n * 7 + (c + j)] = newblock();*/
        scorePoint(cc, r * cellsize - i * cellsize / 2, c * cellsize + i * cellsize / 2);
    }

}

function scorePoint(cc, r, c){
    var point = (10 + (cc < 4 ? 0 : cc - 4) * 10) * (chain + 1) * (level + 1);
    points += point;
    movement = 0;
    eraseEffectTime = 10;
    if(1 <= chain)
        maingauge = maingauge + 0.05 < 1 ? maingauge + .05 : 1;
    if(eraseFrame == 0){
        eraseFrame = 1;
        chain++;
    }
    for(var i = 0; i < maxScoreTexts; i++) if(scoreTexts[i * 4 + 3] === 0){
        scoreTexts[i * 4 + 0] = r + 20;
        scoreTexts[i * 4 + 1] = c - 15;
        scoreTexts[i * 4 + 2] = point;
        scoreTexts[i * 4 + 3] = 20;
        break;
    }
    erases += cc;
    subgauge = 1;
}

function becomeGameover(){
    gameover = true;
    newscore = -1;
    if(!practiceMode){
        if(!sizeHighScores[size])
            sizeHighScores[size] = [];
        var highScores = sizeHighScores[size];

        // Update the high scores
        var insertionIdx = highScores.length;
        for(var j = 0; j < highScores.length; j++){
            if(highScores[j].score < points){
                insertionIdx = j;
                break;
            }
        }
        highScores.splice(insertionIdx, 0, {score: points, date: new Date()});
        // Limit the number of high scores
        if(20 < highScores.length)
            highScores.pop();

        if(typeof(Storage) !== "undefined"){
            localStorage.setItem("SnakeFlake", serialize());
        }
        updateHighScores();
    }
    gameOverElem.style.display = 'inline';
}

/// Update current high score ranking to the table.
function updateHighScores(){
    var elem = document.getElementById("highScores");

    var highScores = sizeHighScores[size];
    if(!highScores || highScores.length === 0){
        // Clear the table if no high scores are available
        elem.innerHTML = "";
        return;
    }
    // Table and its child nodes could be elements created by document.createElement(),
    // but this string concatenation is far simpler.
    var table = "High Scores for size " + size + ":<table><tr><th>Place</th><th>Date</th><th>Score</th></tr>";
    for(var i = 0; i < highScores.length; i++){
        table += "<tr><td>" + (i+1) + "</td><td>" + highScores[i].date.toLocaleString() + "</td><td>" + highScores[i].score + "</td></tr>";
    }
    table += "</table>";
    elem.innerHTML = table;
}

function deserialize(stream){
    var data = JSON.parse(stream);
    if(data !== null){
        sizeHighScores = {};
        for(var key in data.highScores){
            var jsonHighScores = data.highScores[key];
            if(!jsonHighScores)
                continue;
            var highScores = [];
            for(var i = 0; i < jsonHighScores.length; i++)
                highScores.push({score: jsonHighScores[i].score, date: new Date(jsonHighScores[i].date)});
            sizeHighScores[key] = highScores;
        }
    }
}

function serialize(){
    var jsonSizeHighScores = {};
    for(var key in sizeHighScores) {
        var highScores = sizeHighScores[key];
        var jsonHighScores = [];
        for(var i = 0; i < highScores.length; i++)
            jsonHighScores.push({score: highScores[i].score, date: highScores[i].date.toJSON()});
        jsonSizeHighScores[key] = jsonHighScores;
    }
    var saveData = {highScores: jsonSizeHighScores};
    return JSON.stringify(saveData);
}

function run() {
    if(!gameover){
        snake.move();
        moveCheck();
        check();

        var speed = fallTime !== 0 || eraseEffectTime !== 0 ? 0 : (level + 1) * (level % 6 == 5 ? 0.2 : 1) * 0.005;
        if(subgauge < speed){
            speed -= subgauge;
            subgauge = 0;
            speed *= 0.25;
            if(maingauge < speed){
                if(practiceMode)
                    maingauge = 0;
                else
                    becomeGameover();
            }
            else
                maingauge -= speed;
        }
        else
            subgauge -= speed;

        if(eraseEffectTime !== 0 && --eraseEffectTime === 0){
            for(var i = 0; i < size * size; i++){
                if((board[i] & eraseEffectBit) != 0){
                    board[i] = 0 /*&= ~eraseEffectBit*/;
                }
            }
        }
        if(fallTime !== 0 && --fallTime === 0){
            for(var r = size; 0 <= r; r--){
                for(var c = 0; c < size; c++){
                    if((board[r * size + c] & fallEffectBit) !== 0){
                        board[r * size + c] &= ~fallEffectBit;
                    }
                }
            }
        }
        if(rollTime !== 0 && --rollTime === 0)
            check();
        if(mouseTime !== 0)
            mouseTime--;
        if((level + 1) * 25 <= erases)
            level++;
        for(var i = 0; i < maxScoreTexts; i++){
            if(scoreTexts[i * 4 + 3] !== 0){
                scoreTexts[i * 4 + 3]--;
            }
        }

        updateElements();
    }
}

window.addEventListener("keydown", evt => {
    switch(evt.key){
        case "a": snake.direction = 0; break;
        case "w": snake.direction = 1; break;
        case "d": snake.direction = 2; break;
        case "s": snake.direction = 3; break;
    }
});

document.getElementById("arrow-left").addEventListener("click", () => snake.direction = 0);
document.getElementById("arrow-right").addEventListener("click", () => snake.direction = 2);
document.getElementById("arrow-up").addEventListener("click", () => snake.direction = 1);
document.getElementById("arrow-down").addEventListener("click", () => snake.direction = 3);
