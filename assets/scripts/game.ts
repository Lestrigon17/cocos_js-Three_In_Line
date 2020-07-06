const { ccclass, property } = cc._decorator;

class Gem extends cc.Node {
    coords: cc.Vec2;
    initGem: Function;
    onTouchStart: Function;
    onTouchEnd: Function;

    constructor(name) {
        super(name);
        this.initGem(this);
        this.on(cc.Node.EventType.MOUSE_DOWN, () => this.onTouchStart(this));
        this.on(cc.Node.EventType.MOUSE_UP, () => this.onTouchEnd(this));
    }

    setCoords(coords: cc.Vec2) {
        this.coords = coords;
    }

    // Координаты в двумерном массиве поля игры
    getCoords() {
        return this.coords;
    }
}

// Цвета гемов, имя ноды используется для сравнения цветов
class Blue extends Gem {
    constructor() {
        super("BlueGem");
        this.color = new cc.Color(0, 0, 255);
    }
}

class Purple extends Gem {
    constructor() {
        super("PurpleGem");
        this.color = new cc.Color(128, 0, 128);
    }
}

class Red extends Gem {
    constructor() {
        super("RedGem");
        this.color = new cc.Color(255, 0, 0);
    }
}

class Yellow extends Gem {
    constructor() {
        super("YellowGem");
        this.color = new cc.Color(255, 255, 0);
    }
}

class Orange extends Gem {
    constructor() {
        super("OrangeGem");
        this.color = new cc.Color(255, 165, 0);
    }
}

class Green extends Gem {
    constructor() {
        super("GreenGem");
        this.color = new cc.Color(0, 150, 0);
    }
}

class Map {
    tiledLayer: cc.TiledLayer;
    dimensions: cc.Size;
    tiles: Array<Number>;
    map: Array<Gem[]> = [];
    topRow: number = null;

    constructor(tiledMap: cc.TiledMap) {
        this.tiledLayer = tiledMap.getLayers()[0];
        this.dimensions = this.tiledLayer.getLayerSize();
        // Не нашел другого способа определить содержимое тайлов
        this.tiles = this.tiledLayer._tiles;

        // Формируем двумерный массив карты по TiledMap
        for (let y = 0; y < this.dimensions.height; y++) {
            let row: Array<Gem> = [];
            for (let x = 0; x < this.dimensions.width; x++) {
                if (this.tiles[x + y * this.dimensions.width]) {
                    // Записываем первый слой, на котором есть клетки
                    if (this.topRow === null) this.topRow = y;
                    row.push(null);
                } else {
                    row.push(undefined);
                }
            }
            this.map.push(row);
        }
    }

    // Считаем количество Гемов в линии
    checkDirection(coords: cc.Vec2, direction: cc.Vec2, count: number) {
        let next = coords.add(direction);
        // Если следующий гем того же цвета увеличиваем счетчик и смотрим дальше
        if (this.map[next.y] && this.map[next.y][next.x] && this.map[next.y][next.x].name === this.map[coords.y][coords.x].name) {
            return this.checkDirection(next, direction, count + 1);
        } else if (count > 2) {
            // Если гем другого цвета и в линии больше 2х Гемов - возвращаем координаты комбинации
            return { coords, direction, count };
        } else {
            return null;
        }
    }

    // Проверка горизонтальных и вертикальных комбинаций, горизонтальные в приоритете
    checkCombinations(coords: cc.Vec2) {
        let horizontal = this.checkDirection(coords, cc.v2(1, 0), 1);
        let vertical = this.checkDirection(coords, cc.v2(0, -1), 1);
        if (!horizontal && !vertical) {
            return null
        } else if (!horizontal) {
            return vertical;
        } else if (!vertical) {
            return horizontal;
        } else {
            return (vertical > horizontal) ? vertical : horizontal;
        }
    }

    // Поиск комбинаций среди новых гемов
    checkNewCombinations(coords: cc.Vec2): Gem[] {
        // Гемы снизу и слева уже смещены вниз, поэтому берем отступ на одну клетку по y
        let firstY = this.getTile(coords.x, coords.y + 2);
        let secondY = this.getTile(coords.x, coords.y + 3);
        let firstX = this.getTile(coords.x - 1, coords.y + 1);
        let secondX = this.getTile(coords.x - 2, coords.y + 1);
        // Если снизу или слева есть комбинации из 2х одинаковых гемов, то записываем их
        let combinationGems = [];
        if (firstY && secondY && firstY.name === secondY.name) {
            combinationGems.push(firstY);
        }
        if (firstX && secondX && firstX.name === secondX.name) {
            combinationGems.push(firstX);
        }
        return combinationGems;
    }

    // Отрисовать массив полей в консоли (Отладка)
    showArray() {
        let str = "";
        for (let y = 0; y < this.dimensions.height; y++) {
            for (let x = 0; x < this.dimensions.width; x++) {
                if (typeof this.map[y][x] === "undefined") {
                    str += 'X ';
                } else if (this.map[y][x] instanceof Gem) {
                    str += 'G ';
                } else {
                    str += '0 ';
                }
            }
            str += '\n\r';
        }
        cc.log(str);
    }

    // Возвращает содержимое клетки
    getTile(...params: number[] | cc.Vec2[]): Gem {
        let coords = cc.v2(...params);
        return this.map[coords.y][coords.x];
    }

    // Задает содержимое клетки по координатам
    setTile(gem: Gem, ...params: number[] | cc.Vec2[]) {
        let coords = cc.v2(...params);
        gem.setPosition(this.getTilePosition(coords));
        gem.setCoords(coords);
        this.map[coords.y][coords.x] = gem;
    }

    // Убирает содержимое клетки
    clearTile(...params: number[] | cc.Vec2[]): Gem {
        let coords = cc.v2(...params);
        if (typeof this.map[coords.y] !== "undefined" && typeof this.map[coords.y][coords.x] !== "undefined") {
            let gem = this.map[coords.y][coords.x];
            this.map[coords.y][coords.x] = null;
            return gem;
        }
    }

    // Расположение клетки на экране
    getTilePosition(v: cc.Vec2): cc.Vec2 {
        let pos: cc.Vec2 = this.tiledLayer.getPositionAt(v);
        pos.x += 31;
        pos.y += 31;
        return pos;
    }

    get width() {
        return this.dimensions.width;
    }

    get height() {
        return this.dimensions.height;
    }

    get top() {
        return this.topRow;
    }
}

@ccclass
export default class Game extends cc.Component {

    @property(cc.SpriteFrame)
    spriteFrame: cc.SpriteFrame = null;

    @property(cc.Float)
    animationSpeed: number = 0.5;

    gameMap: Map;
    timer: number = 0;
    noMoves: boolean = false;
    targetGem: Gem = null;
    canInteract: boolean = false;

    onLoad() {
        // Cоздаем игровое поле по TiledMap
        let tiledMap = this.node.getComponentInChildren(cc.TiledMap);
        this.gameMap = new Map(tiledMap);

        Gem.prototype.initGem = (self) => {
            // Передаём спрайт в класс Gem, потому что я не нашел как по-другому Т ^ Т
            self.addComponent(cc.Sprite).spriteFrame = this.spriteFrame;
            self.parent = tiledMap.node;
        };

        // При нажатии кнопки мыши берем начальный гем
        Gem.prototype.onTouchStart = (self) => {
            if (this.canInteract) {
                if (this.targetGem) {
                    this.swapGems(this.targetGem, self);
                } else {
                    this.selectGem(self);
                }
            }
        };

        // При отпускании кнопки мыши берем конечный гем и пытаемся поменять местами с начальным
        Gem.prototype.onTouchEnd = (self) => {
            if (this.canInteract) this.swapGems(this.targetGem, self);
        };
    }

    // start() {}}

    update(dt) {
        this.timer += dt;
        if (this.timer > this.animationSpeed) {
            // Проверяем карту на возможность движения и комбинации
            if (!this.noMoves) {
                this.timer = 0;
                this.traverseMap();
            }
        }
    }

    selectGem(targetGem: Gem) {
        this.targetGem = targetGem;
        // Выделенный гем увеличивается
        cc.tween(targetGem).to(0.3, { scale: 1.5 }).start();
    }

    unselectGem() {
        // Выделенный гем уменьшается
        cc.tween(this.targetGem).to(0.3, { scale: 1 }).start();
        this.targetGem = null;
    }

    swapGems(swapTarget: Gem, swapWith: Gem) {
        this.canInteract = false;
        let checkResult = this.canBeSwapped(swapTarget, swapWith);
        // Убираем выделение
        this.unselectGem();
        if (!checkResult) {
            // Если не удалось поменять местами выделяем конечный гем
            this.selectGem(swapWith);
            this.canInteract = true;
        } else {
            let swapTargetCoords = swapTarget.getCoords();
            this.moveGem(swapTarget, swapWith.getCoords());
            this.moveGem(swapWith, swapTargetCoords);
            // После перемещения сканируем карту на пустоты / комбинации
            setTimeout(
                () => this.noMoves = false,
                this.animationSpeed * 1000
            );
        }
    }

    // Могут ли два гема поменятся местами
    canBeSwapped(gem1: Gem, gem2: Gem): boolean {
        // Если два гема в одной клетке друг от друга (не по диагонали)
        let vector = gem1.getCoords().sub(gem2.getCoords());
        cc.log(vector.len());
        return vector.len() === 1 ? true : false;
    }

    traverseMap() {
        this.noMoves = true;
        let map = this.gameMap;
        // Проходим по полю начиная с левого нижнево угла
        for (let y = map.height - 1; y >= map.top; y--) {
            for (let x = 0; x < map.width; x++) {
                // Если в клетке что-то есть, проверяем на комбинации
                if (map.getTile(x, y) instanceof Gem) {
                    let combination = this.gameMap.checkCombinations(cc.v2(x, y));
                    // Если найдена комбинация активируем её
                    if (combination !== null) {
                        this.solveCombination(combination);
                    }
                }
                // Если ячейка пустая
                if (map.getTile(x, y) === null) {
                    let target: Gem;
                    let yy = y - 1;
                    // Если клетка сверху заполнена делаем её содержание целью
                    if (yy >= map.top && map.getTile(x, yy)) {
                        target = map.getTile(x, yy);
                        // Если сверху конец карты, берем новый Гем в качестве цели
                    } else if (yy < map.top) {
                        target = this.newGem(cc.v2(x, yy));
                        // c IF: Гемы по диагонали берутся только, если сверху отсутствует клетка,
                        // что делает движение Гемов вниз более линейным.
                    } else { //if (typeof map.getTile(x, yy) === "undefined") {

                        // Берем в качестве цели содержание ячеек по диагонали
                        let options = [];
                        if (map.getTile(x + 1, yy)) {
                            options.push(map.getTile(x + 1, yy));
                        }
                        if (map.getTile(x - 1, yy)) {
                            options.push(map.getTile(x - 1, yy));
                        }
                        if (options.length === 1) {
                            target = options[0];
                        } else if (options.length === 2) {
                            if (Math.random() < 0.5) {
                                target = options[0];
                            } else {
                                target = options[1];
                            }
                        }
                    }
                    // Если цель определена двигаем её на место текущей пустой клетки
                    if (target) {
                        this.noMoves = false;
                        //cc.log(yy, target.getCoords().x, "to", y, x);
                        let moveFrom = target.getCoords();
                        this.moveGem(target, cc.v2(x, y));
                        this.gameMap.clearTile(moveFrom);
                    }
                }
            }
        }
        // Движение закончилось, можно кликать
        if (this.noMoves) this.canInteract = true;
    }

    // Активировать комбинацию
    solveCombination(combination) {
        let { coords, direction, count } = combination;
        for (let i = 0; i < count; i++) {
            let gem = this.gameMap.clearTile(coords.sub(direction.mul(i)));
            this.removeGem(gem);
        }
    }

    // Убираем гем с экрана
    removeGem(gem: Gem) {
        // Анимация исчезновения
        cc.tween(gem).to(this.animationSpeed, { scale: 0 }).start();
        gem.destroy;
    }

    // Помещает гем в целевую ячейку и производит анимацию движения к ней
    moveGem(gem: Gem, moveTo: cc.Vec2) {
        cc.tween(gem)
            .to(this.animationSpeed, { position: cc.v3(this.gameMap.getTilePosition(moveTo), 0) })
            // Правильный способ, но вызов .call() ломает анимацию движения!
            // .call(() => { this.makeNextMove = true })
            .start();
        this.gameMap.setTile(gem, moveTo);
    }

    newGem(coords: cc.Vec2): Gem {
        // Генерируем случайный гем, но исключаем комбинации более 2х в ряд
        let exeptions = this.gameMap.checkNewCombinations(coords);
        let newGem = this.randomGem(exeptions);
        newGem.scale = 0;
        let vector1 = this.gameMap.getTilePosition(coords);
        newGem.setPosition(vector1);
        newGem.setCoords(coords);
        // Анимация появление
        cc.tween(newGem).to(this.animationSpeed, { scale: 1 }).start();
        return newGem;
    }

    // Выбираем случайный цвет с исключениями
    randomGem(exeptions: Gem[]): Gem {
        let colors = [Blue, Purple, Red, Yellow, Orange, Green];
        for (let exeption of exeptions) {
            for (let i = 0; i < colors.length; i++) {
                // Убираем цвета исключений из массива
                if (exeption instanceof colors[i]) {
                    colors.splice(i, 1);
                    break;
                }
            }
        }
        return new colors[Math.floor(Math.random() * colors.length)];
    }
}
