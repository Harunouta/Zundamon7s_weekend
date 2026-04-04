        // ==========================================
        // 設定値
        // ==========================================
        const CONFIG = {
            START_HAPPINESS: 7,
            START_HEALTH: 15,
            MAX_HAPPINESS: 10,
            MAX_HEALTH: 15,
            MIN_VALUE: 0
        };

        const PLAYER_COLORS = ['#ff6b6b', '#1dd1a1', '#54a0ff', '#feca57', '#5f27cd', '#c8d6e5'];
        const boardBackgroundSrc = 'logo/background.PNG';
        const boardImageIntrinsicWidthPx = 667;
        const boardImageIntrinsicHeightPx = 357;
        /** 当たり判定・盤面の論理サイズ（背景_当たり判定.PNG / background.PNG と一致） */
        const boardLogicalWidthPx = 667;
        const boardLogicalHeightPx = 357;
        /**
         * data-nx / data-ny の正規化に使った設計キャンバス幅・高さ（#board-anchor-spec と同一）。
         * 実画像の naturalWidth/Height と違うとき、駒座標を ny_eff = ny * (basisH/natH) 等で合わせる。
         */
        let boardAnchorBasisWidthPx = boardLogicalWidthPx;
        let boardAnchorBasisHeightPx = boardLogicalHeightPx;
        const TOKEN_SIZE_PX = 26;
        const STATUS_TOKEN_SIZE_PX = 22;
        const TOKEN_OFFSET_STEP_PX = 6;
        const TOKEN_OVERLAP_COLUMNS = 3;

        const happinessNxStemLeftLinePx = 423;
        const happinessNxStemRightLinePx = 488;
        const happinessNxOddStem = happinessNxStemLeftLinePx / boardLogicalWidthPx;
        const happinessNxEvenStem = happinessNxStemRightLinePx / boardLogicalWidthPx;
        const happinessNxZeroPlaque = 0.77736132;
        const happinessNyZeroPlaque = 0.92016807;
        const healthNxStemLeftLinePx = 555;
        const healthNxStemRightLinePx = 631;
        const healthNxStemUserLeft = healthNxStemLeftLinePx / boardLogicalWidthPx;
        const healthNxStemUserRight = healthNxStemRightLinePx / boardLogicalWidthPx;

        /** #board-anchor-spec が無い・壊れているときの幸福度アンカー（従来式） */
        function buildHappinessAnchorsNormalizedFallback() {
            const happinessStemYTopN = 52 / boardLogicalHeightPx;
            const happinessStemYBottomN = 330 / boardLogicalHeightPx;
            const yLeft = (stepIndex) => happinessStemYBottomN - (stepIndex / 4) * (happinessStemYBottomN - happinessStemYTopN);
            const yRight = (stepIndex) => happinessStemYBottomN - (stepIndex / 5) * (happinessStemYBottomN - happinessStemYTopN);
            const list = [];
            list[0] = { nx: happinessNxZeroPlaque, ny: happinessNyZeroPlaque, tag: '「0」' };
            for (let value = 1; value <= 10; value++) {
                if (value % 2 === 1) {
                    const k = (value - 1) / 2;
                    list[value] = { nx: happinessNxOddStem, ny: yLeft(k), tag: `「${value}」` };
                } else {
                    const j = value / 2;
                    list[value] = { nx: happinessNxEvenStem, ny: yRight(j), tag: `「${value}」` };
                }
            }
            return list;
        }

        /** #board-anchor-spec が無い・壊れているときの体力アンカー（従来式） */
        function buildHealthAnchorsNormalizedFallback() {
            const healthStemYTopN = 52 / boardLogicalHeightPx;
            const healthStemYBottomN = 330 / boardLogicalHeightPx;
            const healthLeftCol = [15, 12, 10, 9, 6, 5, 2, 0];
            const healthRightCol = [14, 13, 11, 8, 7, 4, 3, 1];
            const list = [];
            for (let row = 0; row < 8; row++) {
                const nyRow = healthStemYTopN + (row / 7) * (healthStemYBottomN - healthStemYTopN);
                const leftValue = healthLeftCol[row];
                const rightValue = healthRightCol[row];
                list[leftValue] = { nx: healthNxStemUserLeft, ny: nyRow, tag: `「${leftValue}」` };
                list[rightValue] = { nx: healthNxStemUserRight, ny: nyRow, tag: `「${rightValue}」` };
            }
            return list;
        }

        function buildBoardTrackAnchorsNormalizedFallback() {
            const yTo357 = boardLogicalHeightPx / 359;
            const rawGrid = [
                { x: 30, y: 30 }, { x: 89, y: 30 }, { x: 148, y: 30 }, { x: 207, y: 30 }, { x: 266, y: 30 }, { x: 325, y: 30 },
                { x: 30, y: 89 }, { x: 89, y: 89 }, { x: 148, y: 89 }, { x: 207, y: 89 }, { x: 266, y: 89 }, { x: 325, y: 89 },
                { x: 30, y: 148 }, { x: 89, y: 148 }, { x: 148, y: 148 }, { x: 207, y: 148 }, { x: 266, y: 148 }, { x: 325, y: 148 },
                { x: 30, y: 207 }, { x: 89, y: 207 }, { x: 148, y: 207 }, { x: 207, y: 207 }, { x: 266, y: 207 }, { x: 325, y: 207 },
                { x: 30, y: 266 }, { x: 89, y: 266 }, { x: 148, y: 266 }, { x: 207, y: 266 }, { x: 266, y: 266 }, { x: 325, y: 266 },
                { x: 30, y: 325 }, { x: 89, y: 325 }, { x: 148, y: 325 }
            ];
            return rawGrid.map((cell, index) => ({
                nx: cell.x / boardLogicalWidthPx,
                ny: (cell.y * yTo357) / boardLogicalHeightPx,
                tag: `「盤${index}」`
            }));
        }

        function parseBoardAnchorAttributeNumber(el, attrName) {
            const raw = el.getAttribute(attrName);
            if (raw === null || raw === '') return null;
            const v = parseFloat(raw);
            return Number.isFinite(v) ? v : null;
        }

        /**
         * HTML の #board-anchor-spec（data-nx / data-ny）からアンカーを構築する。
         * nx, ny は盤画像の論理サイズ（data-logical-width/height、通常 667×357）上の 0〜1。
         */
        function parseBoardAnchorSpecFromDom() {
            const root = document.getElementById('board-anchor-spec');
            if (!root) return null;
            const boardSlots = root.querySelectorAll('section[data-track="board"] .board-anchor-slot');
            const happinessSlots = root.querySelectorAll('section[data-track="happiness"] .board-anchor-slot');
            const healthSlots = root.querySelectorAll('section[data-track="health"] .board-anchor-slot');
            if (boardSlots.length === 0 || happinessSlots.length === 0 || healthSlots.length === 0) return null;

            const board = [];
            let boardOk = true;
            boardSlots.forEach((el) => {
                const cell = parseInt(el.getAttribute('data-cell'), 10);
                const nx = parseBoardAnchorAttributeNumber(el, 'data-nx');
                const ny = parseBoardAnchorAttributeNumber(el, 'data-ny');
                if (Number.isNaN(cell) || cell < 0 || nx === null || ny === null) {
                    boardOk = false;
                    return;
                }
                const tagAttr = el.getAttribute('data-tag');
                const tag = (tagAttr && tagAttr.length > 0) ? tagAttr : `「盤${cell}」`;
                board[cell] = { nx, ny, tag };
            });
            if (!boardOk) return null;
            if (board.length < 33 || board.slice(0, 33).some((a) => !a)) return null;

            const happiness = [];
            let happinessOk = true;
            happinessSlots.forEach((el) => {
                const value = parseInt(el.getAttribute('data-value'), 10);
                const nx = parseBoardAnchorAttributeNumber(el, 'data-nx');
                const ny = parseBoardAnchorAttributeNumber(el, 'data-ny');
                if (Number.isNaN(value) || value < 0 || value > 10 || nx === null || ny === null) {
                    happinessOk = false;
                    return;
                }
                const tagAttr = el.getAttribute('data-tag');
                const tag = (tagAttr && tagAttr.length > 0) ? tagAttr : `「${value}」`;
                happiness[value] = { nx, ny, tag };
            });
            if (!happinessOk) return null;
            if (happiness.length < 11 || happiness.slice(0, 11).some((a) => !a)) return null;

            const health = [];
            let healthOk = true;
            healthSlots.forEach((el) => {
                const value = parseInt(el.getAttribute('data-value'), 10);
                const nx = parseBoardAnchorAttributeNumber(el, 'data-nx');
                const ny = parseBoardAnchorAttributeNumber(el, 'data-ny');
                if (Number.isNaN(value) || value < 0 || value > 15 || nx === null || ny === null) {
                    healthOk = false;
                    return;
                }
                const tagAttr = el.getAttribute('data-tag');
                const tag = (tagAttr && tagAttr.length > 0) ? tagAttr : `「${value}」`;
                health[value] = { nx, ny, tag };
            });
            if (!healthOk) return null;
            if (health.length < 16 || health.slice(0, 16).some((a) => !a)) return null;

            return { board, happiness, health };
        }

        let boardTrackAnchors = [];
        let happinessTrackAnchors = [];
        let healthTrackAnchors = [];

        function initBoardAnchorBasisFromDom() {
            const root = document.getElementById('board-anchor-spec');
            if (!root) return;
            const w = parseInt(root.getAttribute('data-logical-width'), 10);
            const h = parseInt(root.getAttribute('data-logical-height'), 10);
            if (Number.isFinite(w) && w > 0) boardAnchorBasisWidthPx = w;
            if (Number.isFinite(h) && h > 0) boardAnchorBasisHeightPx = h;
        }

        function initBoardAnchorMapsFromDom() {
            const parsed = parseBoardAnchorSpecFromDom();
            if (parsed) {
                boardTrackAnchors = parsed.board;
                happinessTrackAnchors = parsed.happiness;
                healthTrackAnchors = parsed.health;
                return;
            }
            boardTrackAnchors = buildBoardTrackAnchorsNormalizedFallback();
            happinessTrackAnchors = buildHappinessAnchorsNormalizedFallback();
            healthTrackAnchors = buildHealthAnchorsNormalizedFallback();
        }

        initBoardAnchorBasisFromDom();
        initBoardAnchorMapsFromDom();

        let boardContainerResizeObserver = null;
        let boardResizeFallbackAttached = false;

        // ==========================================
        // 状態管理
        // ==========================================
        const state = {
            players: [],
            board: [],
            // cards: [], // 旧：全カードリスト
            decks: {},    // 新：種類別の山札 { WAKUWAKU: [], ... }
            logs: [],
            debugHistory: [],
            currentPlayerIndex: 0,
            currentTab: -1,
            isProcessing: false,
            isGameEnded: false,
            winner: null,
            pendingMove: null,
            pendingDraw: null,
            lastDrawnCard: null,
            lastDrawnCardPending: null
        };

        // ==========================================
        // デバッグログ記録関数
        // ==========================================
        function recordDebug(action, playerIndex, details = {}) {
            const p = state.players[playerIndex];
            state.debugHistory.push({
                timestamp: new Date().toISOString(),
                turnCount: state.debugHistory.length + 1,
                player: p ? p.name : 'System',
                playerIndex: playerIndex,
                action: action,
                ...details
            });
        }

        // ==========================================
        // ファイル読み込み処理
        // ==========================================
        const placeInput = document.getElementById('place-csv');
        const cardInput = document.getElementById('card-csv');
        const loadBtn = document.getElementById('load-btn');
        const defaultLoadStatus = document.getElementById('default-load-status');

        const DEFAULT_DATA_PATHS = {
            placeCsv: 'place-vol2.csv',
            cardCsv: 'card-ver2.csv'
        };

        const ASSET_PATHS = {
            logo: 'logo/logo.PNG',
            cardFrontDir: 'card/front/',
            cardBack: {
                WAKUWAKU: 'card/back/Wback.PNG',
                DOKIDOKI: 'card/back/Dback.PNG',
                CharactorCard: 'card/back/Cback.PNG'
            }
        };

        /** カード読み上げ（TOP）：card.csv の No と同期して更新すること */
        const CARD_READ_ALOUD_BY_PREFIX = {
            A: [1, 2, 3, 4, 5],
            D: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
            I: [1, 2, 3, 4, 5],
            K: [1, 2, 3, 4, 5],
            M: [1, 2, 3, 4, 5],
            W: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
            Z: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        };
        const CARD_READ_ALOUD_PREFIX_TO_TYPE = {
            W: 'WAKUWAKU',
            D: 'DOKIDOKI',
            A: 'CharactorCard',
            I: 'CharactorCard',
            K: 'CharactorCard',
            M: 'CharactorCard',
            Z: 'CharactorCard'
        };

        const SE_STORAGE_KEY = 'zundamonSeEnabled';
        const VOICE_STORAGE_KEY = 'zundamonVoiceEnabled';
        const BGM_STORAGE_KEY = 'zundamonBgmEnabled';
        const SE_VOLUME_STORAGE_KEY = 'zundamonSeVolumePercent';
        const VOICE_VOLUME_STORAGE_KEY = 'zundamonVoiceVolumePercent';
        const BGM_VOLUME_STORAGE_KEY = 'zundamonBgmVolumePercent';
        const VOLUME_SLIDER_MAX = 100;
        const DEFAULT_VOLUME_PERCENT = 100;
        const SE_AUDIO_DIRECTORY = 'audio/';
        const BGM_THEME_PATH = `${SE_AUDIO_DIRECTORY}theme-inst.mp3`;
        const SE_FILE_PREFIX = 'SE_';
        const SE_FILE_EXTENSION = '.wav';
        const SE_VOLUME_PREVIEW_STEM = 'player1_choice';
        const VOICE_VOLUME_PREVIEW_NO = 'D28';
        /** ended が来ない場合のみ（通常は SE_card の長さに関係なく ended で再生） */
        const CARD_DRAW_SE_VOICE_FALLBACK_MS = 90000;
        const GAMESTART_TO_FIRST_TURN_SE_DELAY_MS = 2050;
        const CARD_VOICE_NO_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
        const seAudioByUrl = new Map();
        const cardVoiceAudioByUrl = new Map();
        let pendingGameStartTurnSeTimeoutId = null;
        let seEnabled = true;
        let voiceEnabled = true;
        let bgmEnabled = true;
        let bgmAudioEl = null;
        let seVolumePercent = DEFAULT_VOLUME_PERCENT;
        let voiceVolumePercent = DEFAULT_VOLUME_PERCENT;
        let bgmVolumePercent = DEFAULT_VOLUME_PERCENT;

        function readSeEnabledFromStorage() {
            try {
                const raw = localStorage.getItem(SE_STORAGE_KEY);
                if (raw === null) return true;
                return raw === '1' || raw === 'true';
            } catch {
                return true;
            }
        }

        function persistSeEnabled() {
            try {
                localStorage.setItem(SE_STORAGE_KEY, seEnabled ? '1' : '0');
            } catch {
                /* ignore */
            }
        }

        function readVoiceEnabledFromStorage() {
            try {
                const raw = localStorage.getItem(VOICE_STORAGE_KEY);
                if (raw === null) return true;
                return raw === '1' || raw === 'true';
            } catch {
                return true;
            }
        }

        function persistVoiceEnabled() {
            try {
                localStorage.setItem(VOICE_STORAGE_KEY, voiceEnabled ? '1' : '0');
            } catch {
                /* ignore */
            }
        }

        function readBgmEnabledFromStorage() {
            try {
                const raw = localStorage.getItem(BGM_STORAGE_KEY);
                if (raw === null) return true;
                return raw === '1' || raw === 'true';
            } catch {
                return true;
            }
        }

        function persistBgmEnabled() {
            try {
                localStorage.setItem(BGM_STORAGE_KEY, bgmEnabled ? '1' : '0');
            } catch {
                /* ignore */
            }
        }

        function readVolumePercentFromStorage(storageKey, fallbackPercent) {
            try {
                const raw = localStorage.getItem(storageKey);
                if (raw === null) return fallbackPercent;
                const n = parseInt(raw, 10);
                if (!Number.isFinite(n)) return fallbackPercent;
                return Math.max(0, Math.min(VOLUME_SLIDER_MAX, n));
            } catch {
                return fallbackPercent;
            }
        }

        function persistVolumePercent(storageKey, percent) {
            try {
                const n = Math.max(0, Math.min(VOLUME_SLIDER_MAX, percent));
                localStorage.setItem(storageKey, String(n));
            } catch {
                /* ignore */
            }
        }

        function volumePercentToAudioGain(percent) {
            const p = Number(percent);
            if (!Number.isFinite(p)) return 1;
            return Math.max(0, Math.min(1, p / VOLUME_SLIDER_MAX));
        }

        function applyBgmElementVolume() {
            if (bgmAudioEl) {
                bgmAudioEl.volume = volumePercentToAudioGain(bgmVolumePercent);
            }
        }

        function applySeVolumeToAllCached() {
            const gain = volumePercentToAudioGain(seVolumePercent);
            seAudioByUrl.forEach((a) => {
                a.volume = gain;
            });
        }

        function applyVoiceVolumeToAllCached() {
            const gain = volumePercentToAudioGain(voiceVolumePercent);
            cardVoiceAudioByUrl.forEach((a) => {
                a.volume = gain;
            });
        }

        function stopAllSeSounds() {
            const pauseAndReset = (a) => {
                a.pause();
                a.currentTime = 0;
            };
            seAudioByUrl.forEach(pauseAndReset);
            cardVoiceAudioByUrl.forEach(pauseAndReset);
        }

        function getBgmAudio() {
            if (!bgmAudioEl) {
                bgmAudioEl = new Audio(BGM_THEME_PATH);
                bgmAudioEl.loop = true;
                bgmAudioEl.preload = 'auto';
                bgmAudioEl.volume = volumePercentToAudioGain(bgmVolumePercent);
            }
            return bgmAudioEl;
        }

        function syncBgmPlayback() {
            const el = getBgmAudio();
            if (bgmEnabled) {
                const playPromise = el.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
            } else {
                el.pause();
            }
        }

        function updateBgmToggleUi() {
            const btn = document.getElementById('bgm-toggle-btn');
            if (!btn) return;
            btn.textContent = bgmEnabled ? 'BGM: ON' : 'BGM: OFF';
            btn.setAttribute('aria-pressed', bgmEnabled ? 'true' : 'false');
            btn.classList.toggle('se-off', !bgmEnabled);
        }

        function toggleBgmEnabled() {
            bgmEnabled = !bgmEnabled;
            persistBgmEnabled();
            updateBgmToggleUi();
            syncBgmPlayback();
        }

        function initBgmToggle() {
            bgmEnabled = readBgmEnabledFromStorage();
            getBgmAudio();
            const btn = document.getElementById('bgm-toggle-btn');
            if (btn) btn.addEventListener('click', toggleBgmEnabled);
            updateBgmToggleUi();
            syncBgmPlayback();
        }

        function normalizeSeFileName(stem) {
            let s = String(stem || '').trim();
            if (!s) return '';
            const lower = s.toLowerCase();
            if (lower.endsWith(SE_FILE_EXTENSION)) {
                s = s.slice(0, -SE_FILE_EXTENSION.length);
            }
            if (s.startsWith(SE_FILE_PREFIX)) {
                return `${s}${SE_FILE_EXTENSION}`;
            }
            return `${SE_FILE_PREFIX}${s}${SE_FILE_EXTENSION}`;
        }

        function updateSeToggleUi() {
            const btn = document.getElementById('se-toggle-btn');
            if (!btn) return;
            btn.textContent = seEnabled ? 'SE: ON' : 'SE: OFF';
            btn.setAttribute('aria-pressed', seEnabled ? 'true' : 'false');
            btn.classList.toggle('se-off', !seEnabled);
        }

        function toggleSeEnabled() {
            seEnabled = !seEnabled;
            persistSeEnabled();
            updateSeToggleUi();
        }

        /**
         * 効果音を鳴らす（SE がオフのときは何もしない）。
         * @param {string} stem `dice` または `SE_dice` → audio/SE_dice.wav
         * @param {{ bypassMute?: boolean }} [options] bypassMute なら SE オフ中でも再生（音量プレビュー用）
         */
        function playSe(stem, options = {}) {
            const bypassMute = options.bypassMute === true;
            if (!bypassMute && !seEnabled) return;
            const fileName = normalizeSeFileName(stem);
            if (!fileName) return;
            const url = `${SE_AUDIO_DIRECTORY}${fileName}`;
            let audio = seAudioByUrl.get(url);
            if (!audio) {
                audio = new Audio(url);
                seAudioByUrl.set(url, audio);
            }
            audio.volume = volumePercentToAudioGain(seVolumePercent);
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        }

        /**
         * カードNoに対応するセリフ音声（audio/{No}.wav）。
         * @param {{ no?: string }} card
         * @param {{ bypassMute?: boolean }} [options] 音量スライダー試聴時は bypassMute: true
         */
        function playCardVoice(card, options = {}) {
            const bypassMute = options.bypassMute === true;
            if (!bypassMute && !voiceEnabled) return;
            if (!card || card.no == null) return;
            const no = String(card.no).trim();
            if (!no || !CARD_VOICE_NO_PATTERN.test(no)) return;
            const fileName = `${no}${SE_FILE_EXTENSION}`;
            const url = `${SE_AUDIO_DIRECTORY}${fileName}`;
            cardVoiceAudioByUrl.forEach((a) => {
                a.pause();
                a.currentTime = 0;
            });
            let audio = cardVoiceAudioByUrl.get(url);
            if (!audio) {
                audio = new Audio(url);
                cardVoiceAudioByUrl.set(url, audio);
            }
            audio.volume = volumePercentToAudioGain(voiceVolumePercent);
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        }

        /**
         * カード取得演出で鳴らした SE_card 終了後にセリフを再生（被り防止）。日記クリックでは使わない。
         */
        function queuePlayCardVoiceAfterCardDrawSe(card) {
            const playVoice = () => playCardVoice(card);
            if (!seEnabled) {
                playVoice();
                return;
            }
            const fileName = normalizeSeFileName('card');
            const url = `${SE_AUDIO_DIRECTORY}${fileName}`;
            const cardSeAudio = seAudioByUrl.get(url);
            if (!cardSeAudio) {
                playVoice();
                return;
            }
            let played = false;
            let fallbackTid = null;
            const go = () => {
                if (played) return;
                played = true;
                if (fallbackTid !== null) clearTimeout(fallbackTid);
                cardSeAudio.removeEventListener('ended', onEnded);
                playVoice();
            };
            const onEnded = () => go();
            cardSeAudio.addEventListener('ended', onEnded, { once: true });
            fallbackTid = setTimeout(() => go(), CARD_DRAW_SE_VOICE_FALLBACK_MS);
        }

        function playTurnStartForCurrentPlayer() {
            if (state.isGameEnded) return;
            const p = state.players[state.currentPlayerIndex];
            if (!p || p.finished) return;
            playSe(`player${p.id + 1}turn`);
        }

        function initSeToggle() {
            seEnabled = readSeEnabledFromStorage();
            const btn = document.getElementById('se-toggle-btn');
            if (btn) btn.addEventListener('click', toggleSeEnabled);
            updateSeToggleUi();
        }

        function updateVoiceToggleUi() {
            const btn = document.getElementById('voice-toggle-btn');
            if (!btn) return;
            btn.textContent = voiceEnabled ? 'セリフ: ON' : 'セリフ: OFF';
            btn.setAttribute('aria-pressed', voiceEnabled ? 'true' : 'false');
            btn.classList.toggle('se-off', !voiceEnabled);
        }

        function toggleVoiceEnabled() {
            voiceEnabled = !voiceEnabled;
            persistVoiceEnabled();
            updateVoiceToggleUi();
        }

        function initVoiceToggle() {
            voiceEnabled = readVoiceEnabledFromStorage();
            const btn = document.getElementById('voice-toggle-btn');
            if (btn) btn.addEventListener('click', toggleVoiceEnabled);
            updateVoiceToggleUi();
        }

        function initAudioVolumeControls() {
            seVolumePercent = readVolumePercentFromStorage(SE_VOLUME_STORAGE_KEY, DEFAULT_VOLUME_PERCENT);
            voiceVolumePercent = readVolumePercentFromStorage(VOICE_VOLUME_STORAGE_KEY, DEFAULT_VOLUME_PERCENT);
            bgmVolumePercent = readVolumePercentFromStorage(BGM_VOLUME_STORAGE_KEY, DEFAULT_VOLUME_PERCENT);
            const seSlider = document.getElementById('se-volume-slider');
            const voiceSlider = document.getElementById('voice-volume-slider');
            const bgmSlider = document.getElementById('bgm-volume-slider');
            if (seSlider) {
                seSlider.value = String(seVolumePercent);
                seSlider.addEventListener('input', () => {
                    seVolumePercent = parseInt(seSlider.value, 10) || 0;
                    persistVolumePercent(SE_VOLUME_STORAGE_KEY, seVolumePercent);
                    applySeVolumeToAllCached();
                    playSe(SE_VOLUME_PREVIEW_STEM, { bypassMute: true });
                });
            }
            if (voiceSlider) {
                voiceSlider.value = String(voiceVolumePercent);
                voiceSlider.addEventListener('input', () => {
                    voiceVolumePercent = parseInt(voiceSlider.value, 10) || 0;
                    persistVolumePercent(VOICE_VOLUME_STORAGE_KEY, voiceVolumePercent);
                    applyVoiceVolumeToAllCached();
                    playCardVoice({ no: VOICE_VOLUME_PREVIEW_NO }, { bypassMute: true });
                });
            }
            if (bgmSlider) {
                bgmSlider.value = String(bgmVolumePercent);
                bgmSlider.addEventListener('input', () => {
                    bgmVolumePercent = parseInt(bgmSlider.value, 10) || 0;
                    persistVolumePercent(BGM_VOLUME_STORAGE_KEY, bgmVolumePercent);
                    applyBgmElementVolume();
                });
            }
            applySeVolumeToAllCached();
            applyVoiceVolumeToAllCached();
            applyBgmElementVolume();
        }

        const DRAW_ANIMATION = {
            flyMs: 420,
            flipMs: 220,
            endHoldMs: 140
        };

        const deckImageAspectRatios = {
            WAKUWAKU: null,
            DOKIDOKI: null,
            CharactorCard: null
        };

        function loadImageAspectRatio(path) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    if (!img.naturalWidth || !img.naturalHeight) return resolve(null);
                    resolve(img.naturalWidth / img.naturalHeight);
                };
                img.onerror = () => resolve(null);
                img.src = path;
            });
        }

        function applyDeckAspectRatio(deckType, ratio) {
            const deckEl = document.getElementById(`deck-${deckType}`);
            if (!deckEl || !ratio) return;
            deckEl.style.aspectRatio = String(ratio);
        }

        function getPortraitRatio(ratio) {
            if (!ratio) return 3 / 4;
            return ratio >= 1 ? 1 / ratio : ratio;
        }

        function getCardFrontPath(card) {
            return `${ASSET_PATHS.cardFrontDir}${card.no}front.PNG`;
        }

        function getDeckBackPath(deckType) {
            return ASSET_PATHS.cardBack[deckType] || '';
        }

        function updateDeckUi() {
            const types = ['WAKUWAKU', 'DOKIDOKI', 'CharactorCard'];
            types.forEach(t => {
                const deckCardEl = document.getElementById(`deck-${t}`);
                const deck = state.decks[t];
                const remaining = deck ? deck.length : 0;
                if (!deckCardEl) return;
                deckCardEl.classList.toggle('deck-empty', remaining <= 0);
            });
        }

        function updateLastDrawnCardUi() {
            const box = document.getElementById('last-drawn-card');
            const img = document.getElementById('last-drawn-card-img');
            if (!box || !img) return;

            const card = state.lastDrawnCard;
            if (!card) {
                box.classList.add('empty');
                box.classList.add('hidden');
                box.style.aspectRatio = '3 / 4';
                img.src = '';
                return;
            }

            box.classList.remove('empty');
            box.classList.remove('hidden');
            img.src = getCardFrontPath(card);
            img.onload = () => {
                if (!img.naturalWidth || !img.naturalHeight) return;
                const ratio = img.naturalWidth / img.naturalHeight;
                box.style.aspectRatio = String(ratio);
            };
            img.onerror = () => {
                img.src = getDeckBackPath(card.type);
            };
        }

        function setActionHint(text) {
            const el = document.getElementById('action-hint');
            if (!el) return;
            el.innerText = text;
        }

        function setStepButtonVisible(visible) {
            const btn = document.getElementById('step-btn');
            if (!btn) return;
            btn.style.display = visible ? 'block' : 'none';
        }

        function updateStepButtonLabel() {
            const btn = document.getElementById('step-btn');
            if (!btn) return;
            if (!state.pendingMove) {
                btn.innerText = 'クリックで1マス進む';
                return;
            }
            const isBack = state.pendingMove.direction < 0;
            btn.innerText = isBack ? 'クリックで1マス戻る' : 'クリックで1マス進む';
        }

        function setDeckClickable(deckType, clickable) {
            const deckEl = document.getElementById(`deck-${deckType}`);
            if (!deckEl) return;
            if (clickable) deckEl.classList.add('clickable');
            else deckEl.classList.remove('clickable');
        }

        function clearDeckClickables() {
            ['WAKUWAKU', 'DOKIDOKI', 'CharactorCard'].forEach(t => setDeckClickable(t, false));
        }

        function beginMoveByClick(pIndex, steps, source) {
            const player = state.players[pIndex];
            const maxPos = state.board.length - 1;
            const targetPos = Math.max(0, Math.min(maxPos, player.position + steps));
            const remaining = Math.abs(targetPos - player.position);

            state.pendingMove = {
                pIndex,
                remainingSteps: remaining,
                direction: targetPos >= player.position ? 1 : -1,
                source,
                oldPos: player.position,
                targetPos
            };
            setStepButtonVisible(true);
            updateStepButtonLabel();
            updatePendingMoveHint();
        }

        function updatePendingMoveHint() {
            if (!state.pendingMove) return;
            const pm = state.pendingMove;
            const remaining = pm.remainingSteps;
            const isBack = pm.direction < 0;
            const verb = isBack ? '戻る' : '進む';
            if (remaining <= 0) {
                setActionHint('移動完了。');
                return;
            }
            if (remaining === 1 && isBack) {
                setActionHint('盤面をクリック（または下のボタン）で「1マス戻る」。');
                return;
            }
            setActionHint(`盤面をクリック（または下のボタン）で1マスずつ${verb}（残り ${remaining} マス）`);
        }

        function advanceMoveStep() {
            if (!state.pendingMove) return;
            if (state.isGameEnded) return;

            const pm = state.pendingMove;
            const player = state.players[pm.pIndex];
            if (!player) return;

            if (pm.remainingSteps <= 0) {
                finishPendingMove();
                return;
            }

            player.position += pm.direction;
            pm.remainingSteps -= 1;
            renderBoard();
            updatePendingMoveHint();
            updateStepButtonLabel();

            if (pm.remainingSteps <= 0) {
                finishPendingMove();
            }
        }

        function finishPendingMove() {
            const pm = state.pendingMove;
            if (!pm) return;
            state.pendingMove = null;
            setStepButtonVisible(false);
            updateStepButtonLabel();
            setActionHint('止まったマスを確認中...');

            const player = state.players[pm.pIndex];
            recordDebug("MOVE_PLAYER", pm.pIndex, {
                from: pm.oldPos,
                to: player.position,
                steps: Math.abs(player.position - pm.oldPos),
                source: pm.source,
                mode: 'click'
            });

            const maxPos = state.board.length - 1;
            if (player.position === maxPos) {
                player.finished = true;
                recordDebug("PLAYER_FINISH", player.id, { position: player.position });
                renderBoard();
                updateTurnUI();

                if (areAllPlayersFinished()) {
                    playSe('finish');
                    setActionHint('全員ゴール！結果発表なのだ。');
                    setTimeout(() => finishGameAll(), 250);
                } else {
                    setActionHint(`${player.name} がゴール！次の人へ。`);
                    setTimeout(() => endTurn(), 250);
                }
                return;
            }

            setTimeout(() => checkTile(player, pm.source), 200);
        }

        function beginDrawByClick(deckType, player) {
            state.pendingDraw = { deckType, playerId: player.id };
            clearDeckClickables();
            setDeckClickable(deckType, true);
            setActionHint('山札をクリックしてカードを引きます。');
        }

        function tryHandleDeckClick(deckType) {
            if (!state.pendingDraw) return false;
            if (state.pendingDraw.deckType !== deckType) return false;
            const player = state.players[state.currentPlayerIndex];
            if (!player) return false;
            if (player.id !== state.pendingDraw.playerId) return false;

            state.pendingDraw = null;
            clearDeckClickables();
            setActionHint('カードを引いています...');
            drawCard(deckType, player);
            return true;
        }

        function playDrawAnimation(deckType, card, onDone) {
            const layer = document.getElementById('draw-anim-layer');
            const deckEl = document.getElementById(`deck-${deckType}`);
            if (!layer || !deckEl) {
                if (onDone) onDone();
                return;
            }

            const from = deckEl.getBoundingClientRect();
            const backRatio = deckImageAspectRatios[deckType];
            const portraitRatio = getPortraitRatio(backRatio);
            const toW = 168;
            const toH = Math.round(toW / portraitRatio);
            const toX = Math.round((window.innerWidth - toW) / 2);
            const toY = Math.round((window.innerHeight - toH) / 2);

            const cardEl = document.createElement('div');
            cardEl.className = 'draw-anim-card';
            cardEl.style.left = `${Math.round(from.left)}px`;
            cardEl.style.top = `${Math.round(from.top)}px`;
            cardEl.style.width = `${Math.round(from.width)}px`;
            cardEl.style.height = `${Math.round(from.height)}px`;
            cardEl.style.aspectRatio = String(portraitRatio);

            const img = document.createElement('img');
            img.alt = 'draw';
            img.src = getDeckBackPath(deckType);
            cardEl.appendChild(img);
            layer.appendChild(cardEl);

            requestAnimationFrame(() => {
                cardEl.style.transition = `left ${DRAW_ANIMATION.flyMs}ms cubic-bezier(0.2, 0.9, 0.2, 1), top ${DRAW_ANIMATION.flyMs}ms cubic-bezier(0.2, 0.9, 0.2, 1), width ${DRAW_ANIMATION.flyMs}ms cubic-bezier(0.2, 0.9, 0.2, 1), height ${DRAW_ANIMATION.flyMs}ms cubic-bezier(0.2, 0.9, 0.2, 1), transform ${DRAW_ANIMATION.flyMs}ms cubic-bezier(0.2, 0.9, 0.2, 1)`;
                cardEl.style.left = `${toX}px`;
                cardEl.style.top = `${toY}px`;
                cardEl.style.width = `${toW}px`;
                cardEl.style.height = `${toH}px`;
                cardEl.style.transform = 'rotate(-2deg)';
            });

            const onFlyEnd = () => {
                cardEl.removeEventListener('transitionend', onFlyEnd);
                cardEl.style.transition = `transform ${DRAW_ANIMATION.flipMs}ms ease`;
                cardEl.style.transform = 'rotate(0deg) scaleX(0.02)';
                setTimeout(() => {
                    // CharactorCardの表は横長だが、演出は縦長のまま見せて、最終表示（モーダル/日記）で横長にする
                    img.src = getCardFrontPath(card);
                    playSe('card');
                    cardEl.style.transform = 'rotate(0deg) scaleX(1)';
                    setTimeout(() => {
                        cardEl.remove();
                        if (onDone) onDone();
                    }, DRAW_ANIMATION.endHoldMs + DRAW_ANIMATION.flipMs);
                }, DRAW_ANIMATION.flipMs);
            };
            cardEl.addEventListener('transitionend', onFlyEnd);
        }

        const PLAYER_ICON_PATHS = [
            'player_icon/player1.PNG',
            'player_icon/player2.PNG',
            'player_icon/player3.PNG',
            'player_icon/player4.PNG',
            'player_icon/player5.PNG',
            'player_icon/player6.PNG'
        ];

        function playSeForPlayerIconPath(iconPath) {
            const idx = PLAYER_ICON_PATHS.indexOf(iconPath);
            if (idx < 0) return;
            playSe(`player${idx + 1}_choice`);
        }

        function getPlayerIconSelections() {
            const picker = document.getElementById('icon-picker');
            if (!picker) return [];
            const rows = [...picker.querySelectorAll('[data-player-id]')];
            return rows.map(row => row.dataset.selectedIcon || '');
        }

        function updateIconPickerAvailability() {
            const picker = document.getElementById('icon-picker');
            if (!picker) return;

            const rows = [...picker.querySelectorAll('[data-player-id]')];
            const selectedByPlayer = new Map();
            rows.forEach(row => {
                selectedByPlayer.set(row.dataset.playerId, row.dataset.selectedIcon || '');
            });

            const selectedSet = new Set([...selectedByPlayer.values()].filter(Boolean));

            rows.forEach(row => {
                const playerId = row.dataset.playerId;
                const selfSelected = selectedByPlayer.get(playerId) || '';
                const buttons = [...row.querySelectorAll('button[data-icon-path]')];
                buttons.forEach(btn => {
                    const path = btn.dataset.iconPath || '';
                    const isTaken = selectedSet.has(path) && path !== selfSelected;
                    btn.disabled = isTaken;
                    btn.setAttribute('aria-disabled', isTaken ? 'true' : 'false');
                });
            });
        }

        function renderIconPicker(playerCount) {
            const picker = document.getElementById('icon-picker');
            if (!picker) return;

            const safeCount = Math.max(1, Math.min(6, playerCount));
            const currentValues = getPlayerIconSelections();
            picker.innerHTML = '';

            for (let i = 0; i < safeCount; i++) {
                const row = document.createElement('div');
                row.className = 'icon-row';
                row.dataset.playerId = String(i);

                const label = document.createElement('div');
                label.innerText = `Player ${i + 1}`;
                label.style.fontWeight = 'bold';

                const grid = document.createElement('div');
                grid.className = 'icon-grid';

                const selectedValue = currentValues[i] || PLAYER_ICON_PATHS[i] || PLAYER_ICON_PATHS[0];
                row.dataset.selectedIcon = selectedValue;

                PLAYER_ICON_PATHS.forEach(path => {
                    const option = document.createElement('button');
                    option.type = 'button';
                    option.className = 'icon-option';
                    option.dataset.iconPath = path;
                    if (path === selectedValue) option.classList.add('selected');
                    option.setAttribute('aria-label', 'icon option');

                    const img = document.createElement('img');
                    img.src = path;
                    img.alt = 'icon';
                    option.appendChild(img);

                    option.addEventListener('click', () => {
                        playSeForPlayerIconPath(path);
                        row.dataset.selectedIcon = path;
                        [...grid.querySelectorAll('.icon-option')].forEach(btn => btn.classList.remove('selected'));
                        option.classList.add('selected');
                        updateIconPickerAvailability();
                    });

                    grid.appendChild(option);
                });

                row.appendChild(label);
                row.appendChild(grid);
                picker.appendChild(row);
            }

            updateIconPickerAvailability();
        }

        function checkFiles() {
            if (placeInput.files.length > 0 && cardInput.files.length > 0) {
                loadBtn.disabled = false;
            }
        }
        placeInput.addEventListener('change', checkFiles);
        cardInput.addEventListener('change', checkFiles);

        function parseFile(file) {
            return new Promise((resolve, reject) => {
                Papa.parse(file, {
                    header: false,
                    skipEmptyLines: true,
                    complete: results => resolve(results.data),
                    error: err => reject(err)
                });
            });
        }

        function parseCsvText(text) {
            return new Promise((resolve, reject) => {
                Papa.parse(text, {
                    header: false,
                    skipEmptyLines: true,
                    complete: results => resolve(results.data),
                    error: err => reject(err)
                });
            });
        }

        // 一時保存用変数
        let tempBoardData = [];
        let tempCardData = [];

        function showSetupScreen() {
            document.getElementById('loader-screen').classList.add('hidden');
            document.getElementById('setup-screen').classList.remove('hidden');
        }

        function setDefaultLoadStatus(text) {
            if (!defaultLoadStatus) return;
            defaultLoadStatus.innerText = text;
        }

        async function tryLoadDefaultData() {
            try {
                setDefaultLoadStatus('同梱CSVを読み込み中...');

                const [placeRes, cardRes] = await Promise.all([
                    fetch(DEFAULT_DATA_PATHS.placeCsv, { cache: 'no-store' }),
                    fetch(DEFAULT_DATA_PATHS.cardCsv, { cache: 'no-store' })
                ]);

                if (!placeRes.ok || !cardRes.ok) {
                    throw new Error(`fetch failed: place=${placeRes.status}, card=${cardRes.status}`);
                }

                const [placeText, cardText] = await Promise.all([
                    placeRes.text(),
                    cardRes.text()
                ]);

                const placeData = await parseCsvText(placeText);
                tempBoardData = placeData.slice(1).map((row, i) => ({
                    index: i,
                    no: row[0],
                    type: row[1].trim()
                }));

                const cardData = await parseCsvText(cardText);
                tempCardData = cardData.slice(1).map(row => ({
                    type: row[1]?.trim(),
                    no: row[2],
                    text: row[3],
                    happiness: parseInt(row[4]) || 0,
                    health: parseInt(row[5]) || 0,
                    move: parseInt(row[6]) || 0
                })).filter(c => c.type);

                setDefaultLoadStatus('同梱CSVの読み込みに成功しました。');
                showSetupScreen();
            } catch (e) {
                setDefaultLoadStatus('自動読み込みに失敗。下のファイル選択で読み込めます。');
            }
        }

        async function processFiles() {
            try {
                // place.csv
                const placeData = await parseFile(placeInput.files[0]);
                tempBoardData = placeData.slice(1).map((row, i) => ({
                    index: i,
                    no: row[0],
                    type: row[1].trim()
                }));

                // card.csv
                const cardData = await parseFile(cardInput.files[0]);
                tempCardData = cardData.slice(1).map(row => ({
                    type: row[1]?.trim(),
                    no: row[2],
                    text: row[3],
                    happiness: parseInt(row[4]) || 0,
                    health: parseInt(row[5]) || 0,
                    move: parseInt(row[6]) || 0
                })).filter(c => c.type);

                showSetupScreen();

            } catch (e) {
                alert("CSV読み込みエラー: " + e);
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            initAudioVolumeControls();
            initSeToggle();
            initVoiceToggle();
            initBgmToggle();
            const buildBadge = document.getElementById('build-badge');
            if (buildBadge) buildBadge.innerText = `build: ${new Date().toISOString()}`;
            bindRotateHintListeners();
            updateRotateHintOverlay();
            const playerCountInput = document.getElementById('player-count');
            if (playerCountInput) {
                renderIconPicker(parseInt(playerCountInput.value) || 1);
                playerCountInput.addEventListener('change', () => {
                    renderIconPicker(parseInt(playerCountInput.value) || 1);
                });
            }
            Promise.all([
                loadImageAspectRatio(getDeckBackPath('WAKUWAKU')),
                loadImageAspectRatio(getDeckBackPath('DOKIDOKI')),
                loadImageAspectRatio(getDeckBackPath('CharactorCard'))
            ]).then(([wRatio, dRatio, cRatio]) => {
                deckImageAspectRatios.WAKUWAKU = wRatio;
                deckImageAspectRatios.DOKIDOKI = dRatio;
                deckImageAspectRatios.CharactorCard = cRatio;
                applyDeckAspectRatio('WAKUWAKU', wRatio);
                applyDeckAspectRatio('DOKIDOKI', dRatio);
                applyDeckAspectRatio('CharactorCard', cRatio);
            });
            tryLoadDefaultData();
            setupBoardBackgroundImage();
            setupBoardContainerResizeObserver();
        });

        function applyBoardImageLayout() {
            const boardBg = document.getElementById('board-bg');
            const boardContainer = document.getElementById('board-container');
            if (!boardBg || !boardContainer) return;
            const naturalW = boardBg.naturalWidth || boardImageIntrinsicWidthPx;
            const naturalH = boardBg.naturalHeight || boardImageIntrinsicHeightPx;
            if (naturalW > 0 && naturalH > 0) {
                boardContainer.style.aspectRatio = `${naturalW} / ${naturalH}`;
            }
            if (state.players && state.players.length > 0) renderBoard();
        }

        function setupBoardBackgroundImage() {
            const boardBg = document.getElementById('board-bg');
            const boardContainer = document.getElementById('board-container');
            if (!boardBg || !boardContainer) return;
            boardBg.addEventListener('load', () => {
                boardContainer.classList.remove('board-bg-error');
                applyBoardImageLayout();
                const scheduleDecodeRender = () => {
                    if (state.players && state.players.length > 0) renderBoard();
                };
                if (typeof boardBg.decode === 'function') {
                    boardBg.decode().then(scheduleDecodeRender).catch(scheduleDecodeRender);
                } else {
                    requestAnimationFrame(scheduleDecodeRender);
                }
            });
            boardBg.addEventListener('error', () => {
                boardContainer.classList.add('board-bg-error');
                boardBg.alt = `盤面画像の読み込みに失敗しました: ${boardBg.src}`;
            });
            boardBg.src = boardBackgroundSrc;
            if (boardBg.complete && boardBg.naturalWidth > 0) {
                applyBoardImageLayout();
                const scheduleDecodeRender = () => {
                    if (state.players && state.players.length > 0) renderBoard();
                };
                if (typeof boardBg.decode === 'function') {
                    boardBg.decode().then(scheduleDecodeRender).catch(scheduleDecodeRender);
                } else {
                    requestAnimationFrame(scheduleDecodeRender);
                }
            }
        }

        /**
         * object-fit:contain と同じ含有矩形（レイヤー座標系）。
         * 画像未ロード時は boardImageIntrinsic* を仮の実寸として使い、フォールバックで全面伸ばしはしない。
         */
        function getBoardImageLayout() {
            const boardBg = document.getElementById('board-bg');
            const boardLayer = document.getElementById('board-track-layer');
            if (!boardLayer) return null;
            const natWRaw = boardBg && boardBg.naturalWidth > 0 ? boardBg.naturalWidth : boardImageIntrinsicWidthPx;
            const natHRaw = boardBg && boardBg.naturalHeight > 0 ? boardBg.naturalHeight : boardImageIntrinsicHeightPx;
            const natW = Math.max(1, natWRaw);
            const natH = Math.max(1, natHRaw);
            const layerRect = boardLayer.getBoundingClientRect();
            const layerW = layerRect.width;
            const layerH = layerRect.height;
            if (layerW <= 0 || layerH <= 0) return null;
            const containScale = Math.min(layerW / natW, layerH / natH);
            const drawW = natW * containScale;
            const drawH = natH * containScale;
            const offsetX = (layerW - drawW) / 2;
            const offsetY = (layerH - drawH) / 2;
            return { offsetX, offsetY, drawW, drawH, natW, natH, layoutScale: containScale };
        }

        function setupBoardContainerResizeObserver() {
            const boardContainer = document.getElementById('board-container');
            if (!boardContainer) return;
            if (typeof ResizeObserver === 'undefined') {
                if (!boardResizeFallbackAttached) {
                    boardResizeFallbackAttached = true;
                    window.addEventListener('resize', scheduleRenderBoardForResize);
                    if (window.visualViewport) {
                        window.visualViewport.addEventListener('resize', scheduleRenderBoardForResize);
                    }
                }
                return;
            }
            if (boardContainerResizeObserver) return;
            boardContainerResizeObserver = new ResizeObserver(() => scheduleRenderBoardForResize());
            boardContainerResizeObserver.observe(boardContainer);
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', scheduleRenderBoardForResize);
            }
        }

        let resizeRenderBoardPending = false;
        function scheduleRenderBoardForResize() {
            if (resizeRenderBoardPending) return;
            resizeRenderBoardPending = true;
            requestAnimationFrame(() => {
                resizeRenderBoardPending = false;
                if (state.players && state.players.length > 0) renderBoard();
            });
        }

        const rotateHintCoarsePointerMql = window.matchMedia('(pointer: coarse)');
        const rotateHintHoverNoneMql = window.matchMedia('(hover: none)');

        function isLikelyTouchPhoneForRotateHint() {
            return rotateHintCoarsePointerMql.matches && rotateHintHoverNoneMql.matches;
        }

        function isPortraitViewport() {
            const o = window.screen && window.screen.orientation;
            if (o && typeof o.type === 'string') {
                return o.type.startsWith('portrait');
            }
            return window.innerHeight > window.innerWidth;
        }

        function updateRotateHintOverlay() {
            const overlay = document.getElementById('rotate-hint-overlay');
            if (!overlay) return;
            const winnerEl = document.getElementById('winner-screen');
            const winnerBlocking = winnerEl && winnerEl.style.display === 'flex';
            const inGame = document.body.classList.contains('in-game');
            const show = inGame && !winnerBlocking && isLikelyTouchPhoneForRotateHint() && isPortraitViewport();
            overlay.style.display = show ? 'flex' : 'none';
        }

        function bindRotateHintListeners() {
            window.addEventListener('resize', updateRotateHintOverlay);
            window.addEventListener('orientationchange', () => {
                window.setTimeout(updateRotateHintOverlay, 150);
            });
            const addMqlListener = (mql) => {
                if (!mql) return;
                if (typeof mql.addEventListener === 'function') {
                    mql.addEventListener('change', updateRotateHintOverlay);
                } else if (typeof mql.addListener === 'function') {
                    mql.addListener(updateRotateHintOverlay);
                }
            };
            addMqlListener(rotateHintCoarsePointerMql);
            addMqlListener(rotateHintHoverNoneMql);
        }

        window.addEventListener('click', (e) => {
            const board = document.getElementById('board-container');
            if (board && (e.target === board || board.contains(e.target))) {
                if (state.pendingMove) advanceMoveStep();
            }
        });

        function openHowTo() {
            playSe('How2play');
            const overlay = document.getElementById('howto-overlay');
            if (overlay) overlay.style.display = 'flex';
        }

        function closeHowTo() {
            const overlay = document.getElementById('howto-overlay');
            if (overlay) overlay.style.display = 'none';
        }

        function openAudioSettings() {
            const overlay = document.getElementById('audio-settings-overlay');
            if (overlay) overlay.style.display = 'flex';
        }

        function closeAudioSettings() {
            const overlay = document.getElementById('audio-settings-overlay');
            if (overlay) overlay.style.display = 'none';
        }

        let cardReadAloudUiInitialized = false;
        const CARD_READ_ALOUD_SCRIPT_HINT_NEED_CSV =
            'CSVを読み込むと、ここにカードのセリフが表示されます。';
        const CARD_READ_ALOUD_SCRIPT_MISSING_IN_CSV = '（CSVに該当するカードがありません）';

        function getDeckTypeForCardReadAloudPrefix(prefix) {
            return CARD_READ_ALOUD_PREFIX_TO_TYPE[prefix] || 'WAKUWAKU';
        }

        function ensureCardReadAloudUiInitialized() {
            if (cardReadAloudUiInitialized) return;
            cardReadAloudUiInitialized = true;
            const prefixEl = document.getElementById('card-read-aloud-prefix');
            const numberEl = document.getElementById('card-read-aloud-number');
            const previewBtn = document.getElementById('card-read-aloud-preview');
            if (!prefixEl || !numberEl || !previewBtn) return;
            const prefixes = Object.keys(CARD_READ_ALOUD_BY_PREFIX).sort();
            prefixEl.innerHTML = prefixes.map((p) => `<option value="${p}">${p}</option>`).join('');
            prefixEl.addEventListener('change', () => {
                syncCardReadAloudNumberOptions();
                refreshCardReadAloudPreview();
            });
            numberEl.addEventListener('change', () => refreshCardReadAloudPreview());
            previewBtn.addEventListener('click', () => {
                const no = getCardReadAloudSelectedNo();
                if (no) playCardVoice({ no }, { bypassMute: true });
            });
        }

        function syncCardReadAloudNumberOptions() {
            const prefixEl = document.getElementById('card-read-aloud-prefix');
            const numberEl = document.getElementById('card-read-aloud-number');
            if (!prefixEl || !numberEl) return;
            const nums = CARD_READ_ALOUD_BY_PREFIX[prefixEl.value] || [];
            numberEl.innerHTML = nums.map((n) => `<option value="${n}">${n}</option>`).join('');
        }

        function getCardReadAloudSelectedNo() {
            const prefixEl = document.getElementById('card-read-aloud-prefix');
            const numberEl = document.getElementById('card-read-aloud-number');
            if (!prefixEl || !numberEl) return '';
            const prefix = prefixEl.value;
            const num = numberEl.value;
            if (!prefix || num === '') return '';
            return `${prefix}${num}`;
        }

        function refreshCardReadAloudPreview() {
            const img = document.getElementById('card-read-aloud-preview-img');
            const prefixEl = document.getElementById('card-read-aloud-prefix');
            if (!img || !prefixEl) {
                refreshCardReadAloudScriptDisplay();
                return;
            }
            const no = getCardReadAloudSelectedNo();
            if (!no) {
                refreshCardReadAloudScriptDisplay();
                return;
            }
            const deckType = getDeckTypeForCardReadAloudPrefix(prefixEl.value);
            const frontPath = getCardFrontPath({ no });
            const fallbackBack = ASSET_PATHS.cardBack[deckType] || '';
            img.onerror = () => {
                if (fallbackBack) img.src = fallbackBack;
            };
            img.src = frontPath;
            refreshCardReadAloudScriptDisplay();
        }

        function refreshCardReadAloudScriptDisplay() {
            const scriptEl = document.getElementById('card-read-aloud-script');
            if (!scriptEl) return;
            const no = getCardReadAloudSelectedNo();
            if (!no) {
                scriptEl.textContent = '';
                return;
            }
            if (!tempCardData.length) {
                scriptEl.textContent = CARD_READ_ALOUD_SCRIPT_HINT_NEED_CSV;
                return;
            }
            const card = tempCardData.find((c) => String(c.no).trim() === no);
            if (!card) {
                scriptEl.textContent = CARD_READ_ALOUD_SCRIPT_MISSING_IN_CSV;
                return;
            }
            scriptEl.textContent = card.text != null ? String(card.text) : '';
        }

        function openCardReadAloudOverlay() {
            ensureCardReadAloudUiInitialized();
            syncCardReadAloudNumberOptions();
            refreshCardReadAloudPreview();
            const overlay = document.getElementById('card-read-aloud-overlay');
            if (overlay) overlay.style.display = 'flex';
        }

        function closeCardReadAloudOverlay() {
            const overlay = document.getElementById('card-read-aloud-overlay');
            if (overlay) overlay.style.display = 'none';
        }

        // ==========================================
        // ゲーム初期化
        // ==========================================
        function shuffle(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function startGame() {
            let count = parseInt(document.getElementById('player-count').value);
            if (count < 1) count = 1; if (count > 6) count = 6;

            if (pendingGameStartTurnSeTimeoutId !== null) {
                clearTimeout(pendingGameStartTurnSeTimeoutId);
                pendingGameStartTurnSeTimeoutId = null;
            }

            playSe('gamestart');

            // 1. ボード初期化
            state.board = tempBoardData;

            // 2. プレイヤー初期化
            state.players = [];
            state.debugHistory = [];
            state.isGameEnded = false;
            state.winner = null;
            state.pendingMove = null;
            state.pendingDraw = null;
            state.lastDrawnCard = null;

            const selectedIcons = getPlayerIconSelections();
            
            for (let i = 0; i < count; i++) {
                state.players.push({
                    id: i,
                    name: `Player ${i+1}`,
                    happiness: CONFIG.START_HAPPINESS,
                    health: CONFIG.START_HEALTH,
                    position: 0,
                    finished: false,
                    color: PLAYER_COLORS[i],
                    iconPath: selectedIcons[i] || PLAYER_ICON_PATHS[i] || PLAYER_ICON_PATHS[0],
                    hand: [] // 手札（引いたカード）
                });
            }

            // 3. 山札（デッキ）の構築とシャッフル
            state.decks = {
                'WAKUWAKU': [],
                'DOKIDOKI': [],
                'CharactorCard': []
            };

            tempCardData.forEach(card => {
                // 元データのコピーを作成して格納（参照渡し回避）
                if (state.decks[card.type]) {
                    state.decks[card.type].push({...card});
                }
            });

            // シャッフル
            for (let key in state.decks) {
                shuffle(state.decks[key]);
            }

            // 4. UI初期化
            const tabContainer = document.getElementById('diary-tabs');
            tabContainer.innerHTML = `<button class="tab-btn active" onclick="switchTab(-1)">全員</button>`;
            state.players.forEach(p => {
                tabContainer.innerHTML += `<button class="tab-btn" onclick="switchTab(${p.id})">${p.name}</button>`;
            });

            document.getElementById('setup-screen').classList.add('hidden');
            document.body.classList.add('in-game');
            const gameScreen = document.getElementById('game-screen');
            gameScreen.classList.remove('hidden');
            gameScreen.style.display = 'grid';
            updateRotateHintOverlay();

            renderBoard();
            updateDeckUi();
            state.lastDrawnCard = null;
            updateLastDrawnCardUi();
            setActionHint('サイコロを振って開始します。');
            
            // デバッグログ: デッキ初期状態
            recordDebug("GAME_START", -1, { 
                playerCount: count,
                deckSizes: {
                    W: state.decks['WAKUWAKU'].length,
                    D: state.decks['DOKIDOKI'].length,
                    C: state.decks['CharactorCard'].length
                }
            });

            state.currentPlayerIndex = 0;
            updateTurnUI();
            pendingGameStartTurnSeTimeoutId = setTimeout(() => {
                pendingGameStartTurnSeTimeoutId = null;
                playTurnStartForCurrentPlayer();
            }, GAMESTART_TO_FIRST_TURN_SE_DELAY_MS);
        }

        // ==========================================
        // ゲームロジック
        // ==========================================

        function getNextPlayerIndex() {
            const activePlayers = state.players.filter(p => !p.finished);
            if (activePlayers.length === 0) return -1;

            let minPos = Infinity;
            activePlayers.forEach(p => {
                if (p.position < minPos) minPos = p.position;
            });

            const candidates = activePlayers.filter(p => p.position === minPos);
            if (candidates.length === 1) return candidates[0].id;

            let searchIndex = (state.currentPlayerIndex + 1) % state.players.length;
            for (let i = 0; i < state.players.length; i++) {
                const p = state.players[searchIndex];
                if (!p.finished && p.position === minPos) return p.id;
                searchIndex = (searchIndex + 1) % state.players.length;
            }
            return candidates[0].id;
        }

        function areAllPlayersFinished() {
            return state.players.length > 0 && state.players.every(p => p.finished);
        }

        function finishGameAll() {
            const sorted = [...state.players].sort((a, b) => {
                const aSum = a.happiness + a.health;
                const bSum = b.happiness + b.health;
                if (bSum !== aSum) return bSum - aSum;
                if (b.happiness !== a.happiness) return b.happiness - a.happiness;
                if (b.health !== a.health) return b.health - a.health;
                return a.id - b.id;
            });
            const winner = sorted[0] || null;
            if (!winner) return;
            finishGame(winner);
        }

        function rollDice() {
            if (state.isProcessing || state.isGameEnded) return;
            const current = state.players[state.currentPlayerIndex];
            if (current && current.finished) return;
            if (pendingGameStartTurnSeTimeoutId !== null) {
                clearTimeout(pendingGameStartTurnSeTimeoutId);
                pendingGameStartTurnSeTimeoutId = null;
            }
            stopAllSeSounds();
            playSe('dice');
            state.isProcessing = true;
            document.getElementById('roll-btn').disabled = true;

            const diceDiv = document.getElementById('dice-display');
            const steps = Math.floor(Math.random() * 6) + 1;

            let count = 0;
            const anim = setInterval(() => {
                diceDiv.innerText = ['⚀','⚁','⚂','⚃','⚄','⚅'][Math.floor(Math.random()*6)];
                count++;
                if (count > 10) {
                    clearInterval(anim);
                    diceDiv.innerText = ['⚀','⚁','⚂','⚃','⚄','⚅'][steps - 1] + ` ${steps}`;
                    
                    const p = state.players[state.currentPlayerIndex];
                    recordDebug("DICE_ROLL", p.id, { diceValue: steps });

                    setTimeout(() => {
                        beginMoveByClick(state.currentPlayerIndex, steps, 'dice');
                    }, 250);
                }
            }, 60);
        }

        function movePlayer(pIndex, steps, source = 'dice') {
            beginMoveByClick(pIndex, steps, source);
        }

        function checkTile(player, source) {
            const tile = state.board[player.position];
            const type = tile.type;

            if (source === 'card' && type !== 'C') {
                addLog(`${player.name} は ${type}マスに止まってターン終了`, player.id);
                recordDebug("TURN_END_BY_RULE", player.id, { tileType: type });
                endTurn();
                return;
            }

            if (type === 'W') beginDrawByClick('WAKUWAKU', player);
            else if (type === 'D') beginDrawByClick('DOKIDOKI', player);
            else if (type === 'C') beginDrawByClick('CharactorCard', player);
            else endTurn();
        }

        function drawCard(type, player) {
            // デッキから取得 (Pop)
            const deck = state.decks[type];
            
            if (!deck || deck.length === 0) {
                addLog(`もう ${type} のカードがないのだ！`, player.id);
                recordDebug("DECK_EMPTY", player.id, { deckType: type });
                endTurn();
                return;
            }
            
            // カードを1枚引く
            const card = deck.pop();
            
            // 手札に追加
            player.hand.push(card);
            state.lastDrawnCardPending = card;

            recordDebug("DRAW_CARD", player.id, { 
                cardNo: card.no, 
                cardType: card.type,
                remainingDeck: deck.length
            });

            player.happiness += card.happiness;
            player.health += card.health;

            if (player.happiness > CONFIG.MAX_HAPPINESS) player.happiness = CONFIG.MAX_HAPPINESS;
            if (player.happiness < CONFIG.MIN_VALUE) player.happiness = CONFIG.MIN_VALUE;

            if (player.health > CONFIG.MAX_HEALTH) player.health = CONFIG.MAX_HEALTH;
            if (player.health < CONFIG.MIN_VALUE) player.health = CONFIG.MIN_VALUE;

            renderBoard();
            updateTurnUI();
            addLog(`カード獲得: ${card.text}`, player.id, card);

            updateDeckUi();
            playDrawAnimation(type, card, () => {
                state.lastDrawnCard = state.lastDrawnCardPending;
                state.lastDrawnCardPending = null;
                updateLastDrawnCardUi();
                showModal(card, () => {
                    if (card.move !== 0) {
                        addLog(`効果で ${card.move} マス移動`, player.id);
                        movePlayer(state.currentPlayerIndex, card.move, 'card');
                    } else {
                        endTurn();
                    }
                }, { skipCardVoice: true });
                queuePlayCardVoiceAfterCardDrawSe(card);
            });
        }

        function endTurn() {
            if (state.isGameEnded) return;
            state.isProcessing = false;
            clearDeckClickables();
            state.pendingDraw = null;
            state.pendingMove = null;
            setStepButtonVisible(false);
            state.lastDrawnCard = null;
            state.lastDrawnCardPending = null;
            updateLastDrawnCardUi();
            if (areAllPlayersFinished()) {
                setActionHint('全員ゴール！結果発表なのだ。');
                finishGameAll();
                return;
            }
            state.currentPlayerIndex = getNextPlayerIndex();
            updateTurnUI();
            setActionHint('サイコロを振ってください。');
            document.getElementById('roll-btn').disabled = false;
            playTurnStartForCurrentPlayer();
        }

        function finishGame(winner) {
            state.winner = winner;
            state.isGameEnded = true;
            
            recordDebug("GAME_END", winner.id, { winnerName: winner.name });

            const diceBtn = document.getElementById('roll-btn');
            diceBtn.innerText = "ゲーム終了";
            diceBtn.disabled = true;
            document.getElementById('show-result-btn').style.display = 'block';

            showWinnerScreen();
        }

        // ==========================================
        // UI 更新・描画
        // ==========================================

        function renderBoard() {
            const boardLayer = document.getElementById('board-track-layer');
            const statusLayer = document.getElementById('status-track-layer');
            if (!boardLayer || !statusLayer) return;
            const layout = getBoardImageLayout();
            if (!layout) return;
            boardLayer.innerHTML = '';
            statusLayer.innerHTML = '';

            const groupedBoardTokens = new Map();
            state.players.forEach(player => {
                const key = Math.max(0, Math.min(boardTrackAnchors.length - 1, player.position));
                if (!groupedBoardTokens.has(key)) groupedBoardTokens.set(key, []);
                groupedBoardTokens.get(key).push(player);
            });

            groupedBoardTokens.forEach((playersAtPos, positionKey) => {
                const anchor = boardTrackAnchors[positionKey];
                playersAtPos.forEach((player, index) => {
                    const token = createPlayerTokenElement(player, 'board');
                    placeTokenNormalized(token, anchor, index, TOKEN_SIZE_PX, layout);
                    boardLayer.appendChild(token);
                });
            });

            const groupedHappinessTokens = new Map();
            state.players.forEach(player => {
                const happinessValue = clampValue(player.happiness, 0, CONFIG.MAX_HAPPINESS);
                if (!groupedHappinessTokens.has(happinessValue)) groupedHappinessTokens.set(happinessValue, []);
                groupedHappinessTokens.get(happinessValue).push(player);
            });

            groupedHappinessTokens.forEach((playersAtValue, valueKey) => {
                const anchor = happinessTrackAnchors[valueKey];
                playersAtValue.forEach((player, index) => {
                    const token = createPlayerTokenElement(player, 'track-happiness');
                    placeTokenNormalized(token, anchor, index, STATUS_TOKEN_SIZE_PX, layout);
                    statusLayer.appendChild(token);
                });
            });

            const groupedHealthTokens = new Map();
            state.players.forEach(player => {
                const healthValue = clampValue(player.health, 0, CONFIG.MAX_HEALTH);
                if (!groupedHealthTokens.has(healthValue)) groupedHealthTokens.set(healthValue, []);
                groupedHealthTokens.get(healthValue).push(player);
            });

            groupedHealthTokens.forEach((playersAtValue, valueKey) => {
                const anchor = healthTrackAnchors[valueKey];
                playersAtValue.forEach((player, index) => {
                    const token = createPlayerTokenElement(player, 'track-health');
                    placeTokenNormalized(token, anchor, index, STATUS_TOKEN_SIZE_PX, layout);
                    statusLayer.appendChild(token);
                });
            });
        }

        function clampValue(value, minValue, maxValue) {
            if (value < minValue) return minValue;
            if (value > maxValue) return maxValue;
            return value;
        }

        function createPlayerTokenElement(player, tokenKind) {
            const token = document.createElement('div');
            token.className = `player-token ${tokenKind}`;
            token.dataset.playerId = String(player.id);
            token.title = `${player.name}`;
            const img = document.createElement('img');
            img.src = player.iconPath || '';
            img.alt = player.name;
            img.onerror = () => {
                token.style.backgroundColor = player.color;
            };
            token.appendChild(img);
            return token;
        }

        function computeTokenScreenPos(anchorNorm, overlapIndex, tokenSizeBasePx, layout) {
            const layoutScale = layout.layoutScale;
            const step = TOKEN_OFFSET_STEP_PX * layoutScale;
            const stackOffsetX = (overlapIndex % TOKEN_OVERLAP_COLUMNS) * step;
            const stackOffsetY = Math.floor(overlapIndex / TOKEN_OVERLAP_COLUMNS) * step;
            const tokenPx = tokenSizeBasePx * layoutScale;
            const basisW = boardAnchorBasisWidthPx;
            const basisH = boardAnchorBasisHeightPx;
            const natW = Math.max(1e-9, layout.natW);
            const natH = Math.max(1e-9, layout.natH);
            const nxBmp = anchorNorm.nx * (basisW / natW);
            const nyBmp = anchorNorm.ny * (basisH / natH);
            const centerX = layout.offsetX + nxBmp * layout.drawW + stackOffsetX;
            const centerY = layout.offsetY + nyBmp * layout.drawH + stackOffsetY;
            return {
                left: centerX,
                top: centerY,
                tokenPx
            };
        }

        function placeTokenNormalized(token, anchorNorm, overlapIndex, tokenSizeBasePx, layout) {
            const p = computeTokenScreenPos(anchorNorm, overlapIndex, tokenSizeBasePx, layout);
            token.style.width = `${p.tokenPx}px`;
            token.style.height = `${p.tokenPx}px`;
            token.style.left = `${p.left}px`;
            token.style.top = `${p.top}px`;
        }

        function updateTurnUI() {
            if (state.isGameEnded) {
                document.getElementById('current-player-name').innerText = "終了";
                return;
            }
            const p = state.players[state.currentPlayerIndex];
            const nameEl = document.getElementById('current-player-name');
            nameEl.innerText = p.name;
            nameEl.style.color = p.color;

            const iconEl = document.getElementById('current-player-icon');
            if (iconEl) {
                iconEl.src = p.iconPath || '';
                iconEl.style.outline = `3px solid ${p.color}`;
                iconEl.style.outlineOffset = '2px';
            }

            const happinessEl = document.getElementById('turn-happiness');
            const healthEl = document.getElementById('turn-health');
                if (happinessEl) happinessEl.innerText = `♪:${p.happiness}/${CONFIG.MAX_HAPPINESS}`;
                if (healthEl) healthEl.innerText = `💪:${p.health}/${CONFIG.MAX_HEALTH}`;
        }

        // ==========================================
        // 日記（ログ） & タブ管理
        // ==========================================
        function addLog(text, playerIndex, cardData = null) {
            if (cardData) {
                state.logs.push({ text, playerIndex, cardData, timestamp: Date.now() });
                renderDiary();
            }
        }

        function switchTab(playerIndex) {
            state.currentTab = playerIndex;
            const tabs = document.querySelectorAll('.tab-btn');
            tabs.forEach((btn, idx) => {
                if (playerIndex === -1 && idx === 0) btn.classList.add('active');
                else if (idx === playerIndex + 1) btn.classList.add('active');
                else btn.classList.remove('active');
            });
            renderDiary();
        }

        function renderDiary() {
            const container = document.getElementById('diary-list');
            if (!container) return;
            container.innerHTML = '';
            
            const filteredLogs = state.logs.filter(l => {
                if (!l.cardData) return false;
                if (state.currentTab === -1) return true;
                return l.playerIndex === state.currentTab;
            });

            [...filteredLogs].reverse().forEach(log => {
                const el = document.createElement('div');
                el.className = 'log-entry';
                if (log.cardData) {
                    el.classList.add('has-card');
                    el.onclick = () => showModal(log.cardData, null); 
                    el.title = "クリックでカード詳細を確認";
                }

                let prefix = '';
                if (log.playerIndex >= 0) {
                    const p = state.players[log.playerIndex];
                    prefix = `<span style="color:${p.color}; margin-right:5px;">●</span>`;
                }

                const img = document.createElement('img');
                img.className = 'card-thumb';
                img.alt = 'card';
                img.src = getCardFrontPath(log.cardData);
                img.onerror = () => {
                    img.src = getDeckBackPath(log.cardData.type);
                };
                el.appendChild(img);
                container.appendChild(el);
            });
        }

        // ==========================================
        // モーダル & JSON出力
        // ==========================================
        let modalCallback = null;
        function showModal(card, callback, options = {}) {
            modalCallback = callback;
            if (!options.skipCardVoice) {
                playCardVoice(card);
            }
            const badge = document.getElementById('modal-type');
            badge.innerText = card.type;
            
            badge.className = 'card-badge'; 
            if(card.type === 'WAKUWAKU') {
                badge.style.backgroundColor = '#8BC34A'; badge.style.color = 'white';
            } else if(card.type === 'DOKIDOKI') {
                badge.style.backgroundColor = '#33691E'; badge.style.color = 'white';
            } else if(card.type === 'CharactorCard') { 
                badge.style.backgroundColor = '#CDDC39'; badge.style.color = '#333'; 
            } else {
                badge.style.backgroundColor = '#5D9B0E'; badge.style.color = 'white';
            }

            document.getElementById('modal-text').innerText = card.text;
            
            let statsHtml = '';
            if (card.happiness !== 0) {
                const cls = card.happiness > 0 ? 'plus' : '';
                const sign = card.happiness > 0 ? '+' : '';
                statsHtml += `<span class="${cls}">幸福 ${sign}${card.happiness}</span>`;
            }
            if (card.health !== 0) {
                const cls = card.health > 0 ? 'plus' : '';
                const sign = card.health > 0 ? '+' : '';
                statsHtml += `<span class="${cls}">体調 ${sign}${card.health}</span>`;
            }
            if (card.move !== 0) statsHtml += `<span style="color:#333;">移動 ${card.move}</span>`;
            if (statsHtml === '') statsHtml = '<span>変化なし</span>';
            
            document.getElementById('modal-stats').innerHTML = statsHtml;

            const modal = document.querySelector('.card-modal');
            let cardImg = document.getElementById('modal-card-image');
            if (!cardImg) {
                cardImg = document.createElement('img');
                cardImg.id = 'modal-card-image';
                cardImg.alt = 'カード画像';
                cardImg.style.width = '100%';
                cardImg.style.maxHeight = '260px';
                cardImg.style.objectFit = 'contain';
                cardImg.style.borderRadius = '12px';
                cardImg.style.margin = '10px 0 12px';
                const textEl = document.getElementById('modal-text');
                textEl.parentNode.insertBefore(cardImg, textEl);
            }

            const frontPath = `${ASSET_PATHS.cardFrontDir}${card.no}front.PNG`;
            const fallbackBack = ASSET_PATHS.cardBack[card.type] || '';
            cardImg.src = frontPath;
            cardImg.onerror = () => {
                if (fallbackBack) cardImg.src = fallbackBack;
            };

            document.getElementById('card-overlay').style.display = 'flex';
        }

        function closeCard() {
            document.getElementById('card-overlay').style.display = 'none';
            if (modalCallback) {
                modalCallback();
                modalCallback = null;
            }
        }

        function showWinnerScreen() {
            const screen = document.getElementById('winner-screen');
            document.getElementById('winner-announce').innerText = `${state.winner.name} の勝ち！`;
            
            const tbody = document.getElementById('result-table');
            let html = '';
            state.players.forEach(p => {
                const isWinner = (p.id === state.winner.id);
                html += `
                    <tr style="${isWinner ? 'background:#e6ffe6; font-weight:bold;' : ''}">
                        <td>${p.name}</td>
                        <td>${p.happiness}</td>
                        <td>${p.health}</td>
                        <td>${isWinner ? '1位' : '-'}</td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            screen.style.display = 'flex';
            updateRotateHintOverlay();
        }

        function closeWinnerScreen() {
            document.getElementById('winner-screen').style.display = 'none';
            updateRotateHintOverlay();
        }

        function downloadDebugLog() {
            const debugData = {
                gameInfo: {
                    date: new Date().toLocaleString(),
                    winner: state.winner ? state.winner.name : 'Unknown'
                },
                // プレイヤーごとの手札（獲得カード）も出力
                finalStats: state.players.map(p => ({
                    name: p.name,
                    happiness: p.happiness,
                    health: p.health,
                    position: p.position,
                    hand: p.hand.map(c => ({ no: c.no, type: c.type, text: c.text }))
                })),
                history: state.debugHistory
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(debugData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "zundamon_debug_log.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
        }
