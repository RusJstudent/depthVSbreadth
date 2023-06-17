'use strict';

const grid = document.querySelector('.grid');
const startButton = document.querySelector('.controls__start');
const rebuildButton = document.querySelector('.controls__rebuild');
const changeButton = document.querySelector('.controls__change');
const checkpointButton = document.querySelector('.controls__checkpoint');
const probabilityButton = document.querySelector('.controls__probability');
const numberButton = document.querySelector('.controls__number');
const algorithmButton = document.querySelector('.controls__algorithm');
const speedButton = document.querySelector('.controls__speed');
const saveButton = document.querySelector('.controls__save');
const showButton = document.querySelector('.controls__show');
let startBlock = null;
let finishBlock = null;
let cordsSF = {
    start: {},
    finish: {},
};
const blockInfo = {
    'initial': 0,
    'road': 1,
    'wall': 2,
    'start': 3,
    'finish': 4,
};
const stack = [];
const path = [];
let gridArr = [];
let chance = 0.5;
let currentSquares = 6;
let searchSpeed = 150;
let isChanging = false;
let isAddingCheckpoint = false;
let isDepthSearch = false;
if (localStorage.getItem('arr') === null) {
    createGridItems(currentSquares);
} else {
    let squares = localStorage.getItem('squares');
    
    grid.style.gridTemplateColumns = `repeat(${squares}, 1fr)`;
    grid.style.gridTemplateColumns = `repeat(${squares}, 1fr)`;

    grid.innerHTML = JSON.parse( localStorage.getItem('grid') );
    gridArr = JSON.parse( localStorage.getItem('arr') );
    cordsSF = JSON.parse( localStorage.getItem('cords') );
    startBlock = grid.querySelector('[data-block="start"]');
    finishBlock = grid.querySelector('[data-block="finish"]');
    grid.querySelectorAll('[data-color]').forEach(elem => elem.removeAttribute('data-color'));

    grid.querySelectorAll('*').forEach( block => {
        block.style.fontSize = `${24 / squares}vmin`;
    });
}

grid.onclick = function(e) {
    const block = e.target.dataset.block;
    if (!block) return;

    let cords = getCords(e.target);

    if (isChanging) {
        switch (block) {
            case 'wall':
                e.target.dataset.block = 'road';
                gridArr[cords[0]][cords[1]] = blockInfo.road;
                break;
            case 'road':
                e.target.dataset.block = 'wall';
                gridArr[cords[0]][cords[1]] = blockInfo.wall;
                break;
            case 'start':
                e.target.dataset.block = 'road';
                startBlock = null;
                gridArr[cords[0]][cords[1]] = blockInfo.road;
                cordsSF.start = {};
                break;
            case 'finish':
                e.target.dataset.block = 'road';
                finishBlock = null;
                gridArr[cords[0]][cords[1]] = blockInfo.road;
                cordsSF.finish = {};
                break;
        }
    }

    if (isAddingCheckpoint) {
        if (block === 'wall') return;
        if (block === 'road') {
            if (startBlock && finishBlock) {
                alert('Старт и финиш уже обозначены');
                return;
            }

            let [i, j] = e.target.dataset.cords.split(',');
            if (startBlock === null) {
                startBlock = e.target;
                e.target.dataset.block = 'start';
                
                gridArr[i][j] = blockInfo.start;
                cordsSF.start.i = +i;
                cordsSF.start.j = +j;
                return;
            } else {
                finishBlock = e.target;
                e.target.dataset.block = 'finish';

                gridArr[i][j] = blockInfo.finish;
                cordsSF.finish.i = +i;
                cordsSF.finish.j = +j;
                return;
            }
        }
    }
}

document.onkeydown = function(e) {
    if (e.code === 'KeyR') rebuild(e);
    if (e.code === 'KeyE') change(e);
    if (e.code === 'KeyA') checkpoint(e);
    if (e.code === 'KeyS') save(e);
    if (e.code === 'KeyF') startSearch(e);
    if (e.code === 'KeyQ') showPath(7000);
    if (e.code === 'KeyD') algorithmToggle(e);
}

rebuildButton.onclick = e => rebuild(e);
changeButton.onclick = e => change(e);
checkpointButton.onclick = e => checkpoint(e);
startButton.onclick = e => startSearch(e);
algorithmButton.onclick = e => algorithmToggle(e);

showButton.onclick = e => showPath(7000);
probabilityButton.onclick = function(e) {
    let result = prompt('Вероятность сгенерировать стену, от 0 до 100', '');
    if (result === null) return;
    let probability = Math.floor(+result);
    if (probability >= 0 && probability <= 100) {
        chance = probability / 100;
    } else {
        alert('Число должно быть в диапазоне от 0 до 100');
    }
}
numberButton.onclick = function(e) {
    let result = prompt('Количество блоков по горизонтали и вертикали, от 2 до 20', 6);
    if (result === null) return;
    
    let squares = Math.floor(+result);
    if (squares >= 2 && squares <= 20) {
        currentSquares = squares;
    } else {
        alert('Число должно быть в диапазоне от 2 до 20');
    }
}
function algorithmToggle(e) {
    algorithmButton.classList.toggle('active-button');
    isDepthSearch = !isDepthSearch;
}
speedButton.onclick = function(e) {
    let result = prompt('Задержка в миллисекундах, от 0 до 1000', '');
    if (result === null) return;
    let speed = Math.floor(+result);
    if (speed < 0 || speed > 1000) {
        alert('Число должно быть в диапазоне от 0 до 100');
        return;
    }
    searchSpeed = speed;
}
saveButton.onclick = e => save(e);

function save(e) {
    let gridInner = JSON.stringify( grid.innerHTML );
    let arrData = JSON.stringify( gridArr );
    let cords = JSON.stringify( cordsSF );

    localStorage.setItem('grid', gridInner);
    localStorage.setItem('arr', arrData);
    localStorage.setItem('cords', cords);
    localStorage.setItem('squares', gridArr[0].length);
}


function getCords(block) {
    let i = +block.dataset.cords.split(',')[0];
    let j = +block.dataset.cords.split(',')[1];

    return [i, j];
}

function getBlock(cords) {
    return grid.querySelector(`[data-cords="${cords[0]},${cords[1]}"]`);
}

function rebuild(e) {
    path.length = 0;
    gridArr.length = 0;
    grid.innerHTML = '';
    startBlock = null;
    finishBlock = null;
    createGridItems(currentSquares);
}

function change(e) {
    if (isAddingCheckpoint) {
        isAddingCheckpoint = false;
        grid.style.cursor = 'auto';
        checkpointButton.classList.toggle('active-button');
    }
    isChanging = !isChanging;
    changeButton.classList.toggle('active-button');
    grid.style.cursor = isChanging ? 'pointer' : 'auto';
}

function checkpoint(e) {
    if (isChanging) {
        isChanging = false;
        grid.style.cursor = 'auto';
        changeButton.classList.toggle('active-button');
    }
    isAddingCheckpoint = !isAddingCheckpoint;
    checkpointButton.classList.toggle('active-button');
    grid.style.cursor = isAddingCheckpoint ? 'pointer' : 'auto';
}

function createGridItems(squares) {
    let i = 0;
    let j = 0;

    grid.style.gridTemplateColumns = `repeat(${squares}, 1fr)`;
    grid.style.gridTemplateColumns = `repeat(${squares}, 1fr)`;

    for (let i = 0; i < squares; i++) {
        gridArr.push([]);
        for (let j = 0; j < squares; j++) {
            gridArr[i][j] = blockInfo.initial;
            let square = document.createElement('div');
            square.textContent = `${i+1}:${j+1}`;
            square.dataset.block = 'initial';
            square.dataset.cords = `${i},${j}`;
            grid.append(square);
        }
    }

    grid.querySelectorAll('*').forEach( block => {
        block.style.fontSize = `${24 / currentSquares}vmin`;
        });

    createGridItem(chance, squares, i, j);

    function createGridItem(chance, squares, i, j) {
        let currentNum = i * squares + j;
        let square = grid.children[currentNum];

        if (Math.random() < chance) {
            square.dataset.block = 'wall';
            gridArr[i][j] = blockInfo.wall;
        } else {
            square.dataset.block = 'road';
            gridArr[i][j] = blockInfo.road;
        }
    
        j++;
        if (j === squares) {
            j = 0;
            i++;
            if (i === squares) return;
        }
    
        setTimeout(() => createGridItem(chance, squares, i, j), 700 / currentSquares ** 1.75);
    }
}

function getSiblings(cords) {
    let i = cords[0];
    let j = cords[1];

    let result = [];
    let top = gridArr[i - 1]?.[j];
    if (top !== undefined && top !== blockInfo.wall) result.push([i - 1, j]);
    let right = gridArr[i][j + 1];
    if (right !== undefined && right !== blockInfo.wall) result.push([i, j + 1]);
    let bottom = gridArr[i + 1]?.[j];
    if (bottom !== undefined && bottom !== blockInfo.wall) result.push([i + 1, j]);
    let left = gridArr[i][j - 1];
    if (left !== undefined && left !== blockInfo.wall) result.push([i, j - 1]);

    return result;
}

function getUnvisitedSiblings(cords) {
    let result = [];
    let siblings = getSiblings(cords);
    siblings.forEach(sibling => {
        if (getBlock(sibling).dataset.num === undefined) {
            result.push(sibling);
        }
    });
    return result;
}

function addToStackWithNum(items, num) {
    items.forEach( item => {
        getBlock(item).dataset.num = num + 1;
        stack.push(item);
    } );
}

async function startSearch(e) {
    if (!startBlock || !finishBlock) {
        alert('Сначала задайте начальную и конечную точки');
        return;
    }
    if (grid.children[grid.children.length - 1].dataset.block === 'initial') {
        alert('Сетка еще не построена');
        return;
    }

    clearSearch(); // removing data-num attribute for each element

    let startCords = getCords(startBlock);

    startBlock.dataset.num = 0;
    stack.push(startCords);
    
    await search();
    if (path.length === 0) return;

    finalAnimation();

    function finalAnimation() {
        let pathCopy = path.concat();
        deferStep();
        function deferStep() {
            let elem = pathCopy.shift();
            getBlock(elem).dataset.color = 'backward';
            setTimeout(() => {
                getBlock(elem).removeAttribute('data-color');
                if (pathCopy.length) {
                    deferStep();
                }
                else {
                    showPath(1500);
                }
            }, searchSpeed / 2);
        }
    }
}

function clearSearch() {
    stack.length = 0;
    path.length = 0;
    for (let i = 0; i < grid.children.length; i++) {
        grid.children[i].removeAttribute('data-num');
    }
}

function deferAnimation(cords, ms) {
    return new Promise((resolve, reject) => {
        getBlock(cords).dataset.color = 'searching';
        setTimeout(() => {
            getBlock(cords).removeAttribute('data-color');
            resolve();
        }, ms);
    });
}

async function search() {
    let finishCords;
    do {
        let cords;
        if (isDepthSearch) {
            cords = depthFirstSearch();
        } else {
            cords = breadthFirstSearch()
        }

        await deferAnimation(cords, searchSpeed);

        if (getBlock(cords).dataset.block === 'finish') {
            finishCords = cords;
            break;
        }

        let num = +getBlock(cords).dataset.num;

        let unvisited = getUnvisitedSiblings(cords);
        addToStackWithNum(unvisited, num);
    } while (stack.length);

    await Promise.resolve();

    if (!finishCords) {
        alert('Маршрут невозможно построить');
        path.length = 0;
        return;
    }

    path.push(finishCords);
    let num = +getBlock(finishCords).dataset.num;

    let currentCords = finishCords;
    while (num > 0) {
        if (isDepthSearch) {
            currentCords = getSiblings(currentCords).reverse().find(elem => +getBlock(elem).dataset.num === num - 1);
        } else {
            currentCords = getSiblings(currentCords).find(elem => +getBlock(elem).dataset.num === num - 1);
        }
        num--;
        path.push(currentCords);
    }
}

function showPath(ms) {
    if (!path.length) {
        alert('Сначала постройте маршрут');
        return;
    }
    path.slice(1, path.length - 1).forEach(item => {
        getBlock(item).dataset.color = 'purple';
        setTimeout(() => {
            getBlock(item).removeAttribute('data-color');
        }, ms)
    });
}

const breadthFirstSearch = () => stack.shift();
const depthFirstSearch = () => stack.pop();