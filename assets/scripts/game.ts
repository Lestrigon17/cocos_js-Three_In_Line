const { ccclass, property } = cc._decorator;

class Gem extends cc.Node {
    coords: cc.Vec2;
    initGem: Function;

    constructor(name) {
        super(name);
        this.initGem(this);
    }

    setCoords(coords: cc.Vec2) {
        this.coords = coords;
    }

    getCoords() {
        return this.coords;
    }
}

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
        this.color = new cc.Color(0, 255, 0);
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
        this.tiles = this.tiledLayer._tiles;

        // Формируем двумерный массив карты по TiledMap
        for (let y = 0; y < this.dimensions.height; y++) {
            let row: Array<Gem> = [];
            for (let x = 0; x < this.dimensions.width; x++) {
                if (this.tiles[x + y * this.dimensions.width]) {
                    if (this.topRow === null) this.topRow = y;
                    row.push(null);
                } else {
                    row.push(undefined);
                }
            }
            this.map.push(row);
        }
    }

    checkDirection(coords: cc.Vec2, direction: cc.Vec2, count: number) {
        let next = coords.sub(direction);
        if (this.map[next.y] && this.map[next.y][next.x] && typeof this.map[next.y][next.x] === typeof this.map[coords.y][coords.x]) {
            return this.checkDirection(next, direction, count++);
        } else if (count > 2) {
            return { coords, direction, count };
        } else {
            return null;
        }
    }

    checkCombinations(coords: cc.Vec2) {
        return this.checkDirection(coords, cc.v2(1, 0), 1) || this.checkDirection(coords, cc.v2(0, 1), 1);
    }

    solve(coords: cc.Vec2) {
        let combination = this.checkCombinations(coords);
        if (combination) {
            cc.log(combination);
            let { coords, direction, count } = combination;
            for (let i = 0; i < count; i++) {
                this.clearTile(coords.add(direction.mul(i))).destroy();
            }
        }
    }

    newGem(coords: cc.Vec2) {
        let newGem = this.randomGem();
        let vector1 = this.getTilePosition(coords);
        newGem.setPosition(vector1);
        newGem.setCoords(coords);
        return newGem;
    }

    randomGem() {
        let colors = [Blue, Purple, Red, Yellow, Orange, Green];
        return new colors[Math.floor(Math.random() * colors.length)];
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

    // Возвращает содержимое поля
    getTile(...params: number[] | cc.Vec2[]): Gem {
        let coords = cc.v2(...params);
        return this.map[coords.y][coords.x];
    }

    // Задает содержимое поля по координатам
    setTile(gem: Gem, ...params: number[] | cc.Vec2[]) {
        let coords = cc.v2(...params);
        gem.setPosition(this.getTilePosition(coords));
        gem.setCoords(coords);
        this.map[coords.y][coords.x] = gem;
    }

    // Убирает содержимое поля
    clearTile(...params: number[] | cc.Vec2[]): Gem {
        let coords = cc.v2(...params);
        if (typeof this.map[coords.y] !== "undefined" && typeof this.map[coords.y][coords.x] !== "undefined") {
            let gem = this.map[coords.y][coords.x];
            this.map[coords.y][coords.x] = null;
            return gem;
        }
    }

    // Расположение поля на экране
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
    moveSpeed: number = 500;

    gameMap: Map;
    timer: number = 0;
    noMoves = false;

    // onLoad() {}

    start() {
        // Cоздаем игровое поле по TiledMap
        let tiledMap = this.node.getComponentInChildren(cc.TiledMap);
        this.gameMap = new Map(tiledMap);

        Gem.prototype.initGem = (self) => {
            // Передаём спрайт в класс Gem, потому что я больше не знаю как Т ^ Т
            self.addComponent(cc.Sprite).spriteFrame = this.spriteFrame;
            self.parent = tiledMap.node;
        };
    }

    update(dt) {
        this.timer += dt;
        if (this.timer > this.moveSpeed) {
            this.timer = 0;
            this.traverseMap();
            this.gameMap.showArray();
        }
    }

    traverseMap() {
        this.noMoves = true;
        let map = this.gameMap;
        for (let y = map.height - 1; y >= map.top; y--) {
            for (let x = 0; x < map.width; x++) {
                if (map.getTile(x, y) === null) {
                    cc.log("Null tile:", y, x);
                    let target: Gem;
                    let yy = y - 1;
                    if (yy >= map.top && map.getTile(x, yy)) {
                        target = map.getTile(x, yy);
                    } else if (yy < map.top) {
                        target = map.newGem(cc.v2(x, yy));
                    } else { //if (typeof map.getTile(x, yy) === "undefined") {
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
                        } else {
                            break;
                        }
                    }
                    if (target) {
                        this.noMoves = false;
                        cc.log(yy, target.getCoords().x, "to", y, x);
                        this.moveGem(target, cc.v2(x, y));
                    }
                } else {
                    this.gameMap.solve(cc.v2(x, y));
                }
            }
        }
    }

    moveGem(gem: Gem, moveTo: cc.Vec2) {
        let moveFrom = gem.getCoords();
        cc.tween(gem)
            .to(0.5, { position: this.gameMap.getTilePosition(moveTo) })
            // Ломает анимацию!
            // .call(() => { this.makeNextMove = true })
            .start();
        this.gameMap.setTile(gem, moveTo);
        this.gameMap.clearTile(moveFrom);
    }
}
