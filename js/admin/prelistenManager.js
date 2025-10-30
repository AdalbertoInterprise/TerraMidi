(function () {
    'use strict';

    const MIDI_JS_URL = 'https://www.midijs.net/lib/midi.js';
    const DIFFICULTY_LABELS = {
        easy: 'Fácil',
        medium: 'Médio',
        hard: 'Difícil'
    };

    class AdminPrelistenManager {
        constructor(options = {}) {
            this.options = options;
            this.elements = {};
            this.state = {
                originalMidiFile: null,
                originalMidiUrl: null,
                midiJsReady: false,
                midiJsLoading: false,
                midiJsFailed: false,
                lastVisualizerState: 'stop'
            };

            this.init();
        }

        init() {
            this.cacheDom();
            if (!this.elements.root) {
                return;
            }

            this.bindEvents();
            this.populateDifficulties();
            this.renderTransposeValue(0);
            this.log('AdminPrelistenManager inicializado.');
        }

        cacheDom() {
            const scope = document.getElementById('admin-prelisten');
            this.elements.root = scope || null;
            if (!scope) {
                return;
            }

            this.elements.original = {
                fileInput: scope.querySelector('#admin-midi-input'),
                player: scope.querySelector('#admin-midi-player'),
                visualizer: scope.querySelector('#admin-midi-visualizer'),
                status: scope.querySelector('#admin-midi-status'),
                originalAudioToggle: scope.querySelector('#admin-midi-original-audio'),
                cacheButton: scope.querySelector('#admin-midi-cache-audio')
            };

            this.elements.converted = {
                difficultySelect: scope.querySelector('#admin-json-difficulty'),
                songSelect: scope.querySelector('#admin-json-song'),
                instrumentSelect: scope.querySelector('#admin-json-instrument'),
                refreshInstrumentsButton: scope.querySelector('#admin-json-refresh-instruments'),
                metadataList: scope.querySelector('#admin-json-meta'),
                transposeSlider: scope.querySelector('#admin-json-transpose'),
                transposeValue: scope.querySelector('#admin-json-transpose-value'),
                simplifyCheckbox: scope.querySelector('#admin-json-simplify'),
                playButton: scope.querySelector('#admin-json-play'),
                stopButton: scope.querySelector('#admin-json-stop'),
                generateMidiButton: scope.querySelector('#admin-json-generate-midi'),
                downloadLink: scope.querySelector('#admin-json-download'),
                playerWrapper: scope.querySelector('#admin-json-player-wrapper'),
                midiPlayer: scope.querySelector('#admin-json-midi-player'),
                midiVisualizer: scope.querySelector('#admin-json-visualizer'),
                status: scope.querySelector('#admin-json-status')
            };
        }

        bindEvents() {
            const { original, converted } = this.elements;
            if (original?.fileInput) {
                original.fileInput.addEventListener('change', (event) => this.handleOriginalMidiFile(event));
            }

            if (original?.originalAudioToggle) {
                original.originalAudioToggle.addEventListener('change', (event) => this.handleOriginalAudioToggle(event));
            }

            if (original?.cacheButton) {
                original.cacheButton.addEventListener('click', () => this.cacheOriginalAudioDependencies());
            }

            if (original?.player) {
                original.player.addEventListener('play', () => this.syncOriginalAudioPlayback('play'));
                original.player.addEventListener('pause', () => this.syncOriginalAudioPlayback('pause'));
                original.player.addEventListener('stop', () => this.syncOriginalAudioPlayback('stop'));
                original.player.addEventListener('positionchange', () => this.syncOriginalAudioPlayback('seek'));
            }

            if (converted?.difficultySelect) {
                converted.difficultySelect.addEventListener('change', (event) => this.handleDifficultyChange(event));
            }

            if (converted?.songSelect) {
                converted.songSelect.addEventListener('change', (event) => this.handleSongChange(event));
            }

            if (converted?.refreshInstrumentsButton) {
                converted.refreshInstrumentsButton.addEventListener('click', () => this.refreshInstruments());
            }

            if (converted?.transposeSlider) {
                converted.transposeSlider.addEventListener('input', (event) => this.handleTransposeChange(event));
            }

            if (converted?.simplifyCheckbox) {
                converted.simplifyCheckbox.addEventListener('change', () => this.handleSimplifyToggle());
            }

            if (converted?.playButton) {
                converted.playButton.addEventListener('click', () => this.playConvertedPreview());
            }

            if (converted?.stopButton) {
                converted.stopButton.addEventListener('click', () => this.stopConvertedPreview());
            }

            if (converted?.generateMidiButton) {
                converted.generateMidiButton.addEventListener('click', () => this.generateConvertedMidi());
            }
        }

        populateDifficulties() {
            const select = this.elements.converted?.difficultySelect;
            if (!select) {
                return;
            }

            const keys = Object.keys(DIFFICULTY_LABELS);
            select.innerHTML = '';

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Selecione uma dificuldade';
            placeholder.disabled = true;
            placeholder.selected = true;
            select.appendChild(placeholder);

            keys.forEach((key) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = DIFFICULTY_LABELS[key];
                select.appendChild(option);
            });
        }

        async handleOriginalMidiFile(event) {
            const input = event.target;
            const file = input?.files?.[0] || null;

            if (!file) {
                this.updateOriginalStatus('Nenhum arquivo selecionado.', 'neutral');
                this.clearOriginalMidi();
                return;
            }

            if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
                this.updateOriginalStatus('Selecione um arquivo .mid ou .midi válido.', 'error');
                this.clearOriginalMidi();
                return;
            }

            this.clearOriginalMidi({ keepStatus: true });

            const objectUrl = URL.createObjectURL(file);
            this.state.originalMidiFile = file;
            this.state.originalMidiUrl = objectUrl;

            if (this.elements.original?.player) {
                this.elements.original.player.setAttribute('src', objectUrl);
                this.elements.original.player.setAttribute('filename', file.name);
            }

            this.updateOriginalStatus(`Arquivo carregado: ${file.name}`, 'success');
            this.toggleOriginalAudioControls(Boolean(file));
        }

        clearOriginalMidi({ keepStatus = false } = {}) {
            if (this.state.originalMidiUrl) {
                URL.revokeObjectURL(this.state.originalMidiUrl);
            }

            if (this.elements.original?.player) {
                this.elements.original.player.removeAttribute('src');
                this.elements.original.player.removeAttribute('filename');
            }

            if (!keepStatus) {
                this.updateOriginalStatus('Aguardando arquivo MIDI original...', 'neutral');
            }

            this.state.originalMidiFile = null;
            this.state.originalMidiUrl = null;
            this.stopOriginalAudio();
            this.toggleOriginalAudioControls(false);
        }

        updateOriginalStatus(message, tone = 'neutral') {
            const statusEl = this.elements.original?.status;
            if (!statusEl) {
                return;
            }

            statusEl.textContent = message;
            statusEl.dataset.tone = tone;
        }

        toggleOriginalAudioControls(enabled) {
            const toggle = this.elements.original?.originalAudioToggle;
            const cacheButton = this.elements.original?.cacheButton;

            if (toggle) {
                toggle.disabled = !enabled;
                if (!enabled) {
                    toggle.checked = false;
                }
            }

            if (cacheButton) {
                cacheButton.disabled = !enabled;
            }
        }

        async handleOriginalAudioToggle(event) {
            const enabled = Boolean(event?.target?.checked);

            if (!enabled) {
                this.stopOriginalAudio();
                return;
            }

            if (!this.state.originalMidiUrl) {
                this.updateOriginalStatus('Carregue um arquivo MIDI antes de habilitar o som original.', 'warning');
                event.target.checked = false;
                return;
            }

            try {
                await this.ensureMidiJs();
                this.updateOriginalStatus('Som original pronto. Use os controles de reprodução para ouvir.', 'success');

                if (this.elements.original?.player?.state === 'play') {
                    this.syncOriginalAudioPlayback('play');
                }
            } catch (error) {
                this.updateOriginalStatus(`Falha ao carregar sintetizador MIDI: ${error.message}`, 'error');
                event.target.checked = false;
            }
        }

        async cacheOriginalAudioDependencies() {
            if (!this.state.originalMidiUrl) {
                this.updateOriginalStatus('Necessário carregar um arquivo MIDI antes de preparar cache.', 'warning');
                return;
            }

            try {
                await this.ensureMidiJs({ prefetchOnly: true });
                this.updateOriginalStatus('Biblioteca MIDI.js preparada para uso offline.', 'success');
            } catch (error) {
                this.updateOriginalStatus(`Não foi possível pré-carregar MIDI.js: ${error.message}`, 'error');
            }
        }

        async ensureMidiJs({ prefetchOnly = false } = {}) {
            if (this.state.midiJsReady && window.MIDIjs) {
                return window.MIDIjs;
            }

            if (this.state.midiJsFailed) {
                throw new Error('MIDI.js falhou em carregar anteriormente. Recarregue a página ou tente novamente mais tarde.');
            }

            if (this.state.midiJsLoading) {
                return this.waitForMidiJs();
            }

            this.state.midiJsLoading = true;

            try {
                await this.prefetchMidiJs();

                if (prefetchOnly) {
                    this.state.midiJsLoading = false;
                    this.state.midiJsReady = Boolean(window.MIDIjs);
                    return window.MIDIjs || null;
                }

                if (window.MIDIjs) {
                    this.state.midiJsReady = true;
                    this.state.midiJsLoading = false;
                    return window.MIDIjs;
                }

                await this.injectMidiJsScript();
                await this.waitForMidiJs();
                this.state.midiJsReady = true;
                this.state.midiJsLoading = false;
                return window.MIDIjs;
            } catch (error) {
                this.state.midiJsLoading = false;
                this.state.midiJsFailed = true;
                throw error;
            }
        }

        async prefetchMidiJs() {
            try {
                await fetch(MIDI_JS_URL, { cache: 'force-cache', mode: 'cors' });
                this.notifyServiceWorkerToCache(MIDI_JS_URL);
            } catch (error) {
                console.warn('⚠️ Falha ao pré-carregar MIDI.js via fetch:', error);
            }
        }

        notifyServiceWorkerToCache(url) {
            if (navigator.serviceWorker?.controller) {
                try {
                    navigator.serviceWorker.controller.postMessage({
                        type: 'CACHE_EXTERNAL_ASSET',
                        data: { url }
                    });
                } catch (error) {
                    console.warn('⚠️ Não foi possível solicitar cache ao Service Worker:', error);
                }
            }
        }

        injectMidiJsScript() {
            return new Promise((resolve, reject) => {
                if (document.querySelector(`script[src="${MIDI_JS_URL}"]`)) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = MIDI_JS_URL;
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.onload = () => resolve();
                script.onerror = (error) => reject(new Error('Não foi possível carregar MIDI.js.')); 
                document.head.appendChild(script);
            });
        }

        waitForMidiJs() {
            return new Promise((resolve, reject) => {
                const maxAttempts = 20;
                let attempts = 0;

                const check = () => {
                    if (window.MIDIjs) {
                        resolve(window.MIDIjs);
                        return;
                    }

                    if (attempts >= maxAttempts) {
                        reject(new Error('Timeout aguardando MIDI.js inicializar.'));
                        return;
                    }

                    attempts += 1;
                    setTimeout(check, 150);
                };

                check();
            });
        }

        syncOriginalAudioPlayback(action = 'play') {
            if (!this.elements.original?.originalAudioToggle?.checked) {
                this.stopOriginalAudio();
                return;
            }

            if (!this.state.originalMidiUrl) {
                return;
            }

            if (!window.MIDIjs) {
                if (!this.state.midiJsLoading) {
                    this.ensureMidiJs().catch((error) => {
                        this.updateOriginalStatus(`Som original indisponível: ${error.message}`, 'error');
                    });
                }
                return;
            }

            switch (action) {
                case 'play':
                    window.MIDIjs.stop();
                    window.MIDIjs.play(this.state.originalMidiUrl);
                    this.state.lastVisualizerState = 'play';
                    break;
                case 'pause':
                    window.MIDIjs.pause();
                    this.state.lastVisualizerState = 'pause';
                    break;
                case 'seek':
                    if (this.state.lastVisualizerState === 'play') {
                        window.MIDIjs.stop();
                        window.MIDIjs.play(this.state.originalMidiUrl);
                    }
                    break;
                default:
                    this.stopOriginalAudio();
                    break;
            }
        }

        stopOriginalAudio() {
            if (window.MIDIjs) {
                try {
                    window.MIDIjs.stop();
                } catch (error) {
                    console.warn('⚠️ Erro ao parar MIDI.js:', error);
                }
            }
        }

        async handleDifficultyChange(event) {
            const value = event.target.value;
            this.clearConvertedSelection();

            if (!value) {
                this.updateConvertedStatus('Selecione uma dificuldade para carregar o catálogo.', 'neutral');
                return;
            }

            this.updateConvertedStatus('Carregando catálogo...', 'loading');

            try {
                const indexUrl = `src/assets/musics/${value}/index.json`;
                const response = await fetch(indexUrl, { cache: 'force-cache' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const payload = await response.json();
                this.populateSongSelect(payload.files || []);
                this.updateConvertedStatus(`Catálogo carregado: ${payload.files?.length || 0} músicas.`, 'success');
            } catch (error) {
                this.updateConvertedStatus(`Falha ao carregar catálogo: ${error.message}`, 'error');
            }
        }

        clearConvertedSelection() {
            const { songSelect, metadataList, status, downloadLink, playerWrapper, midiPlayer } = this.elements.converted;

            if (songSelect) {
                songSelect.innerHTML = '';
                songSelect.disabled = true;
                const placeholder = document.createElement('option');
                placeholder.value = '';
                placeholder.textContent = 'Selecione uma dificuldade primeiro';
                placeholder.disabled = true;
                placeholder.selected = true;
                songSelect.appendChild(placeholder);
            }

            if (metadataList) {
                metadataList.innerHTML = '';
            }

            if (status) {
                status.textContent = 'Selecione uma dificuldade para começar.';
                status.dataset.tone = 'neutral';
            }

            if (downloadLink) {
                downloadLink.hidden = true;
                downloadLink.href = '#';
            }

            if (playerWrapper) {
                playerWrapper.hidden = true;
            }

            if (midiPlayer) {
                midiPlayer.removeAttribute('src');
            }
        }

        populateSongSelect(files) {
            const select = this.elements.converted?.songSelect;
            if (!select) {
                return;
            }

            select.innerHTML = '';
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = files.length ? 'Selecione uma música convertida' : 'Nenhuma música disponível';
            placeholder.disabled = true;
            placeholder.selected = true;
            select.appendChild(placeholder);

            files.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

            files.forEach((entry) => {
                const option = document.createElement('option');
                option.value = entry.file;
                option.textContent = `${entry.name} (${entry.bpm || '--'} BPM)`;
                option.dataset.entry = JSON.stringify(entry);
                select.appendChild(option);
            });

            select.disabled = files.length === 0;
        }

        async handleSongChange(event) {
            const value = event.target.value;
            if (!value) {
                return;
            }

            const difficulty = this.elements.converted?.difficultySelect?.value;
            if (!difficulty) {
                this.updateConvertedStatus('Selecione uma dificuldade primeiro.', 'warning');
                return;
            }

            this.updateConvertedStatus('Carregando música convertida...', 'loading');

            try {
                const fileUrl = `src/assets/musics/${difficulty}/${value}`;
                const response = await fetch(fileUrl, { cache: 'force-cache' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                this.renderConvertedMetadata(data);
                this.enableConvertedControls();
                this.updateConvertedStatus('Música carregada. Ajuste os parâmetros e pré-escute quando quiser.', 'success');
            } catch (error) {
                this.updateConvertedStatus(`Falha ao carregar música: ${error.message}`, 'error');
            }
        }

        renderConvertedMetadata(data) {
            const list = this.elements.converted?.metadataList;
            if (!list) {
                return;
            }

            const entries = [
                ['Nome', data?.name],
                ['Dificuldade', DIFFICULTY_LABELS[data?.difficulty] || data?.difficulty],
                ['BPM', data?.bpm],
                ['Compassos', data?.measures],
                ['Duração (ms)', data?.duration],
                ['Notas', data?.noteCount],
                ['Tags', Array.isArray(data?.tags) ? data.tags.join(', ') : '--'],
                ['Resumo', data?.difficultyHint?.summary || '--']
            ];

            list.innerHTML = entries
                .filter(([label, value]) => value !== undefined && value !== null)
                .map(([label, value]) => `
                    <div class="admin-prelisten__meta-row">
                        <dt>${label}</dt>
                        <dd>${typeof value === 'string' ? value : String(value)}</dd>
                    </div>
                `)
                .join('');
        }

        enableConvertedControls() {
            const { playButton, stopButton, generateMidiButton, downloadLink, playerWrapper } = this.elements.converted;

            if (playButton) playButton.disabled = false;
            if (stopButton) stopButton.disabled = false;
            if (generateMidiButton) generateMidiButton.disabled = false;
            if (downloadLink) downloadLink.hidden = true;
            if (playerWrapper) playerWrapper.hidden = true;
        }

        refreshInstruments() {
            const select = this.elements.converted?.instrumentSelect;
            if (!select) {
                return;
            }

            const manager = window.soundfontManager;
            if (!manager || !manager.availableInstruments) {
                select.innerHTML = '<option value="">Soundfont manager não inicializado</option>';
                select.disabled = true;
                return;
            }

            const entries = Object.entries(manager.availableInstruments)
                .map(([key, info]) => ({ key, name: info.name || key }))
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

            select.innerHTML = '';
            entries.forEach(({ key, name }) => {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = name;
                select.appendChild(option);
            });

            select.disabled = entries.length === 0;
        }

        handleTransposeChange(event) {
            const value = Number(event.target.value) || 0;
            this.renderTransposeValue(value);
        }

        renderTransposeValue(value) {
            if (this.elements.converted?.transposeValue) {
                const label = value === 0 ? '0' : `${value > 0 ? '+' : ''}${value}`;
                this.elements.converted.transposeValue.textContent = label;
            }
        }

        handleSimplifyToggle() {
            // Placeholder para lógica de simplificação rítmica
            if (this.elements.converted?.simplifyCheckbox?.checked) {
                this.updateConvertedStatus('Simplificação rítmica ativada (pré-visualização disponível após gerar MIDI).', 'info');
            } else {
                this.updateConvertedStatus('Simplificação rítmica desativada.', 'neutral');
            }
        }

        playConvertedPreview() {
            this.updateConvertedStatus('Pré-escuta do JSON indisponível nesta versão preliminar. Gerar MIDI para ouvir ajustes.', 'info');
        }

        stopConvertedPreview() {
            this.updateConvertedStatus('Pré-escuta parada.', 'neutral');
        }

        generateConvertedMidi() {
            this.updateConvertedStatus('Ferramenta de geração MIDI em desenvolvimento. Aguarde próxima versão.', 'info');
        }

        updateConvertedStatus(message, tone = 'neutral') {
            const statusEl = this.elements.converted?.status;
            if (!statusEl) {
                return;
            }

            statusEl.textContent = message;
            statusEl.dataset.tone = tone;
        }

        log(...args) {
            if (this.options.debug) {
                console.log('[AdminPrelistenManager]', ...args);
            }
        }
    }

    window.AdminPrelistenManager = AdminPrelistenManager;

    document.addEventListener('DOMContentLoaded', () => {
        const manager = new AdminPrelistenManager({ debug: true });
        window.adminPrelistenManager = manager;
    });
}());
