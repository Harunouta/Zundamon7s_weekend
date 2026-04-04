const fs = require('fs');
const path = require('path');

// ==========================================
// 設定
// ==========================================
const CONFIG = {
    START_HAPPINESS: 7,
    START_HEALTH: 15,
    MAX_HAPPINESS: 10,
    MAX_HEALTH: 15,
    MIN_VALUE: 0
};

// ==========================================
// CSV簡易パーサー
// ==========================================
function parseCSV(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split(/\r?\n/);
        return lines.slice(1).map(line => {
            const row = [];
            let current = '';
            let inQuote = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    row.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current);
            return row;
        });
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e.message);
        process.exit(1);
    }
}

// ==========================================
// ゲームクラス
// ==========================================
class GameSimulation {
    constructor(playerCount) {
        this.playerCount = Math.max(1, Math.min(6, playerCount));
        this.players = [];
        this.board = [];
        this.decks = { 'WAKUWAKU': [], 'DOKIDOKI': [], 'CharactorCard': [] };
        this.winner = null;
        this.totalTurns = 0;
        this.currentPlayerIndex = 0;
        this.logs = [];
        
        // 追加: カード切れイベント記録用
        this.emptyDeckEvents = [];
    }

    log(msg) {
        // console.log(msg); // ログを見たい場合はコメントアウトを外す
        this.logs.push(msg);
    }

    init() {
        const placeData = parseCSV(path.join(__dirname, 'place.csv'));
        this.board = placeData.map((row, i) => ({
            index: i,
            no: row[0],
            type: row[1].trim()
        }));

        const cardData = parseCSV(path.join(__dirname, 'card.csv'));
        cardData.forEach(row => {
            if (!row[1]) return;
            const card = {
                type: row[1].trim(),
                no: row[2],
                text: row[3],
                happiness: parseInt(row[4]) || 0,
                health: parseInt(row[5]) || 0,
                move: parseInt(row[6]) || 0
            };
            if (this.decks[card.type]) {
                this.decks[card.type].push(card);
            }
        });

        for (const key in this.decks) {
            this.shuffle(this.decks[key]);
        }

        for (let i = 0; i < this.playerCount; i++) {
            this.players.push({
                id: i,
                name: `Player ${i + 1}`,
                happiness: CONFIG.START_HAPPINESS,
                health: CONFIG.START_HEALTH,
                position: 0,
                finished: false
            });
        }
        
        this.currentPlayerIndex = 0;
    }

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    getNextPlayerIndex() {
        let minPos = Infinity;
        this.players.forEach(p => {
            if (p.position < minPos) minPos = p.position;
        });

        const candidates = this.players.filter(p => p.position === minPos);
        if (candidates.length === 1) return candidates[0].id;

        let searchIndex = (this.currentPlayerIndex + 1) % this.playerCount;
        for (let i = 0; i < this.playerCount; i++) {
            const p = this.players[searchIndex];
            if (p.position === minPos) return p.id;
            searchIndex = (searchIndex + 1) % this.playerCount;
        }
        return candidates[0].id;
    }

    rollDice() {
        return Math.floor(Math.random() * 6) + 1;
    }

    movePlayer(playerIndex, steps, source = 'dice') {
        const player = this.players[playerIndex];
        const maxPos = this.board.length - 1;
        let newPos = player.position + steps;

        if (newPos >= maxPos) newPos = maxPos;
        if (newPos < 0) newPos = 0;

        player.position = newPos;
        this.log(`${player.name} moves to ${newPos} (${this.board[newPos].type}) by ${source}`);

        if (newPos === maxPos) {
            this.winner = player;
            return;
        }

        this.checkTile(player, source);
    }

    checkTile(player, source) {
        const tile = this.board[player.position];
        const type = tile.type;

        if (source === 'card' && type !== 'C') {
            return;
        }

        if (['W', 'D', 'C'].includes(type)) {
            let cardType = '';
            if (type === 'W') cardType = 'WAKUWAKU';
            else if (type === 'D') cardType = 'DOKIDOKI';
            else if (type === 'C') cardType = 'CharactorCard';

            this.drawCard(cardType, player);
        }
    }

    drawCard(type, player) {
        const deck = this.decks[type];
        
        // デッキ切れチェック
        if (!deck || deck.length === 0) {
            this.log(`Deck ${type} is empty`);
            
            // 追加: カード切れ発生情報を記録
            this.emptyDeckEvents.push({
                turn: this.totalTurns,
                deckType: type
            });
            return;
        }

        const card = deck.pop();
        this.log(`${player.name} drew ${card.no}: ${card.text}`);

        player.happiness += card.happiness;
        player.health += card.health;

        player.happiness = Math.max(CONFIG.MIN_VALUE, Math.min(CONFIG.MAX_HAPPINESS, player.happiness));
        player.health = Math.max(CONFIG.MIN_VALUE, Math.min(CONFIG.MAX_HEALTH, player.health));

        if (card.move !== 0) {
            this.movePlayer(player.id, card.move, 'card');
        }
    }

    play() {
        this.init();

        while (!this.winner) {
            this.totalTurns++;
            const pIndex = this.currentPlayerIndex;
            const player = this.players[pIndex];

            const steps = this.rollDice();
            this.log(`Turn ${this.totalTurns}: ${player.name} rolled ${steps}`);

            this.movePlayer(pIndex, steps, 'dice');

            if (this.winner) break;

            this.currentPlayerIndex = this.getNextPlayerIndex();
            
            if (this.totalTurns > 10000) {
                console.error("Turn limit exceeded.");
                break;
            }
        }

        return this.getResult();
    }

    getResult() {
        return {
            totalTurns: this.totalTurns,
            winner: this.winner ? this.winner.name : "None",
            // 追加: カード切れイベント一覧
            emptyDeckEvents: this.emptyDeckEvents,
            // 追加: 終了時の残り枚数
            remainingDecks: {
                WAKUWAKU: this.decks['WAKUWAKU'].length,
                DOKIDOKI: this.decks['DOKIDOKI'].length,
                CharactorCard: this.decks['CharactorCard'].length
            },
            players: this.players.map(p => ({
                name: p.name,
                happiness: p.happiness,
                health: p.health,
                isWinner: p === this.winner
            }))
        };
    }
}

// ==========================================
// エントリーポイント
// ==========================================
function runSimulation(playerCount) {
    const game = new GameSimulation(playerCount);
    const result = game.play();
    return result;
}

if (require.main === module) {
    const args = process.argv.slice(2);
    const count = args[0] ? parseInt(args[0]) : 1;

    console.log(`Starting simulation with ${count} players...`);
    const result = runSimulation(count);
    
    console.log("\n=== GAME RESULT ===");
    console.log(JSON.stringify(result, null, 2));
}

module.exports = { runSimulation };
