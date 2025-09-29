let currentTrackIndex = -1;
let isPlaying = false;
let audio = new Audio();
let tracks = [];
let loopSection = null; // Store the section being looped
let loopStartTime = 0;
let loopEndTime = 0;

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function createTrackElement(track, index) {
    const li = document.createElement('li');
    li.className = 'track';
    li.dataset.trackIndex = index;
    
    const trackNumber = String(index + 1).padStart(2, '0');
    
    // Generate chord PDF filename from track title
    const chordFileName = track.title + '.pdf';
    const chordFilePath = `chords/${chordFileName}`;
    
    const stemsButton = track.stems ? `
        <a href="${track.stems}" download="${track.title}_stems.zip" class="stems-button" title="Download stems (ZIP)" onclick="event.stopPropagation()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2v12M7 2v12M11 2v12"/>
                <path d="M8 10v4m0 0l2-2m-2 2l-2-2"/>
                <path d="M2 14h12v1H2z"/>
            </svg>
        </a>
    ` : '';

    const structureButton = track.structure && track.tempo ? `
        <button class="structure-button" data-track-index="${index}" title="View song structure">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="3" height="12"/>
                <rect x="5" y="4" width="3" height="10"/>
                <rect x="9" y="3" width="3" height="11"/>
                <rect x="13" y="5" width="2" height="9"/>
            </svg>
        </button>
    ` : '<span class="structure-spacer"></span>';

    li.innerHTML = `
        <span class="track-number">${trackNumber}</span>
        <button class="play-button">▶</button>
        <div class="track-info">
            <div class="track-title">${track.title}</div>
        </div>
        ${track.lyrics ? `<button class="lyrics-button" data-track-index="${index}" title="View lyrics">📄</button>` : '<span class="lyrics-spacer"></span>'}
        ${structureButton}
        <a href="${chordFilePath}" download="${chordFileName}" class="chord-button" title="Download chords (PDF)" onclick="event.stopPropagation()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2v12M13 2v12M3 8h10"/>
                <circle cx="3" cy="10" r="1.5"/>
                <circle cx="13" cy="6" r="1.5"/>
            </svg>
        </a>
        <a href="${track.file}" download="${track.title}.mp3" class="download-button" title="Download track" onclick="event.stopPropagation()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 2v8m0 0l3-3m-3 3L5 7"/>
                <path d="M3 12h10v2H3z"/>
            </svg>
        </a>
        ${stemsButton}
        <span class="track-duration">${track.duration}</span>
        <div class="wave-indicator">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
        </div>
    `;
    
    li.addEventListener('click', (e) => {
        if (!e.target.classList.contains('lyrics-button') && !e.target.classList.contains('structure-button')) {
            selectTrack(index);
        }
    });

    const lyricsButton = li.querySelector('.lyrics-button');
    if (lyricsButton) {
        lyricsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            showLyrics(index);
        });
    }

    const structureBtn = li.querySelector('.structure-button');
    if (structureBtn) {
        structureBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showStructure(index);
        });
    }

    return li;
}

function initializePlaylist() {
    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';
    
    tracks = window.songConfig.tracks;
    
    tracks.forEach((track, index) => {
        playlist.appendChild(createTrackElement(track, index));
    });
}

function selectTrack(index) {
    if (index < 0 || index >= tracks.length) return;

    currentTrackIndex = index;
    const track = tracks[index];

    // Clear any existing loop
    clearLoop();

    document.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
    document.querySelector(`[data-track-index="${index}"]`).classList.add('playing');

    document.querySelector('.now-playing-text').textContent = track.title;

    audio.src = track.file;
    audio.load();

    playTrack();
}

function playTrack() {
    if (currentTrackIndex === -1) {
        selectTrack(0);
        return;
    }
    
    audio.play();
    isPlaying = true;
    updatePlayPauseButtons();
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    updatePlayPauseButtons();
}

function updatePlayPauseButtons() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    
    document.querySelectorAll('.track .play-button').forEach(btn => {
        btn.textContent = '▶';
    });
    
    if (currentTrackIndex !== -1) {
        const currentTrackBtn = document.querySelector(`[data-track-index="${currentTrackIndex}"] .play-button`);
        if (currentTrackBtn) {
            currentTrackBtn.textContent = isPlaying ? '⏸' : '▶';
        }
    }
}

function nextTrack() {
    if (loopSection) {
        // If looping, try to go to next section
        const currentTrack = tracks[currentTrackIndex];
        if (currentTrack.structure) {
            const currentSectionIndex = parseInt(loopSection.index);
            const nextSectionIndex = currentSectionIndex + 1;

            if (nextSectionIndex < currentTrack.structure.length) {
                // Go to next section
                playSection(currentTrackIndex, nextSectionIndex);
            }
            // If it's the last section, do nothing (stay in current section)
        }
    } else if (currentTrackIndex < tracks.length - 1) {
        selectTrack(currentTrackIndex + 1);
    }
}

function previousTrack() {
    if (loopSection) {
        // If looping a section, go to start of current section
        audio.currentTime = loopStartTime;
    } else if (currentTrackIndex > 0) {
        selectTrack(currentTrackIndex - 1);
    }
}

function playSection(trackIndex, sectionIndex) {
    const track = tracks[trackIndex];
    if (!track.structure || sectionIndex >= track.structure.length) return;

    // Calculate section timing
    let currentTime = 0;
    for (let i = 0; i < sectionIndex; i++) {
        const section = track.structure[i];
        let sectionBeats = 0;

        if (Array.isArray(section.bars)) {
            // Mixed meter format
            section.bars.forEach(subsection => {
                const [beatsPerBar] = subsection.timeSignature.split('/').map(Number);
                sectionBeats += subsection.count * beatsPerBar;
            });
        } else {
            // Simple format
            const [beatsPerBar] = section.timeSignature.split('/').map(Number);
            sectionBeats = section.bars * beatsPerBar;
        }

        const sectionDuration = (sectionBeats / track.tempo) * 60;
        currentTime += sectionDuration;
    }

    const targetSection = track.structure[sectionIndex];
    let targetSectionBeats = 0;

    if (Array.isArray(targetSection.bars)) {
        // Mixed meter format
        targetSection.bars.forEach(subsection => {
            const [beatsPerBar] = subsection.timeSignature.split('/').map(Number);
            targetSectionBeats += subsection.count * beatsPerBar;
        });
    } else {
        // Simple format
        const [beatsPerBar] = targetSection.timeSignature.split('/').map(Number);
        targetSectionBeats = targetSection.bars * beatsPerBar;
    }

    const sectionDuration = (targetSectionBeats / track.tempo) * 60;

    const startTime = currentTime;
    const endTime = currentTime + sectionDuration;

    // Set loop parameters with buffer for timing accuracy
    const bufferTime = 3; // 3 seconds buffer
    const bufferedStartTime = Math.max(0, startTime - bufferTime);
    const bufferedEndTime = endTime + bufferTime;

    loopSection = {
        name: targetSection.name,
        startTime: bufferedStartTime,
        endTime: bufferedEndTime,
        index: sectionIndex
    };
    loopStartTime = bufferedStartTime;
    loopEndTime = bufferedEndTime;

    // Jump to section start and play
    audio.currentTime = startTime;
    if (!isPlaying) {
        playTrack();
    }

    // Update visual indicators
    updateSectionHighlight(sectionIndex);
    updateLoopIndicator(true, targetSection.name);
}

function showLyrics(trackIndex) {
    const track = tracks[trackIndex];
    const lyricsPanel = document.getElementById('lyrics-panel');
    const lyricsContent = document.getElementById('lyrics-content');
    const lyricsTitle = document.querySelector('.lyrics-title');
    const mainContainer = document.querySelector('.main-container');
    
    if (track.lyrics) {
        lyricsTitle.textContent = `${track.title} - Lyrics`;
        
        // Keywords to highlight
        const structureKeywords = /^(Verse|Chorus|Bridge|Pre-Chorus|Outro|Intro|Hook|Refrain)(\s+\d+)?$/i;
        
        const formattedLyrics = track.lyrics.split('\n').map(line => {
            if (line.trim()) {
                // Check if the line matches song structure keywords
                if (structureKeywords.test(line.trim())) {
                    return `<p class="lyrics-line lyrics-structure">${line}</p>`;
                } else {
                    return `<p class="lyrics-line">${line}</p>`;
                }
            } else {
                return '<p class="lyrics-line">&nbsp;</p>';
            }
        }).join('');
        
        lyricsContent.innerHTML = formattedLyrics;
        lyricsPanel.classList.add('active');
        mainContainer.classList.add('lyrics-open');
    } else {
        lyricsTitle.textContent = 'Lyrics';
        lyricsContent.innerHTML = '<p class="lyrics-placeholder">No lyrics available for this song</p>';
        lyricsPanel.classList.add('active');
        mainContainer.classList.add('lyrics-open');
    }
}

function hideLyrics() {
    const lyricsPanel = document.getElementById('lyrics-panel');
    const mainContainer = document.querySelector('.main-container');
    lyricsPanel.classList.remove('active');
    mainContainer.classList.remove('lyrics-open');
}

function showStructure(trackIndex) {
    const track = tracks[trackIndex];
    const structurePanel = document.getElementById('structure-panel');
    const structureContent = document.getElementById('structure-content');
    const structureTitle = document.querySelector('.structure-title');
    const mainContainer = document.querySelector('.main-container');

    if (track.structure && track.tempo) {
        structureTitle.textContent = `${track.title} - Song Structure`;

        let totalBars = 0;
        let totalBeats = 0;
        let currentTime = 0; // Track cumulative time in seconds
        const sectionTimes = []; // Store start and end times for each section

        // Function to get section type for color coding
        function getSectionType(name) {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('solo')) return 'solo'; // Check solo first before other patterns
            if (lowerName.includes('ins break') || lowerName.includes('instrumental break')) return 'insbreak';
            if (lowerName.includes('verse')) return 'verse';
            if (lowerName.includes('chorus')) return 'chorus';
            if (lowerName.includes('intro')) return 'intro';
            if (lowerName.includes('outro')) return 'outro';
            if (lowerName.includes('bridge')) return 'bridge';
            if (lowerName.includes('pre-chorus') || lowerName.includes('prechorus')) return 'prechorus';
            return 'default';
        }

        const structureRows = track.structure.map((section, index) => {
            const startTime = currentTime;
            let sectionBeats = 0;
            let sectionBarCount = 0;
            let timeSignatureDisplay = "";

            // Handle both simple and mixed meter formats
            if (Array.isArray(section.bars)) {
                // Mixed meter format: bars is an array of { count, timeSignature }
                section.bars.forEach(subsection => {
                    const [beatsPerBar] = subsection.timeSignature.split('/').map(Number);
                    sectionBeats += subsection.count * beatsPerBar;
                    sectionBarCount += subsection.count;
                });

                // Create display string for mixed meters
                timeSignatureDisplay = section.bars.map(subsection =>
                    `${subsection.count}×${subsection.timeSignature}`
                ).join(', ');
            } else {
                // Simple format: bars is a number, timeSignature is a string
                const [beatsPerBar] = section.timeSignature.split('/').map(Number);
                sectionBeats = section.bars * beatsPerBar;
                sectionBarCount = section.bars;
                timeSignatureDisplay = section.timeSignature;
            }

            const sectionDuration = (sectionBeats / track.tempo) * 60; // Convert to seconds

            currentTime += sectionDuration;
            const endTime = currentTime;

            // Store section timing info
            sectionTimes.push({
                name: section.name,
                startTime: startTime,
                endTime: endTime,
                index: index
            });

            totalBars += sectionBarCount;
            totalBeats += sectionBeats;

            const sectionType = getSectionType(section.name);

            return `
                <div class="structure-section section-${sectionType}" data-section-index="${index}" data-start-time="${startTime}" data-end-time="${endTime}" data-section-name="${section.name}">
                    <span class="section-name">${section.name}</span>
                    <div class="section-bars-info">
                        <div class="section-bars">${sectionBarCount} bars</div>
                        <div class="section-time">${timeSignatureDisplay}</div>
                    </div>
                    <button class="section-play-btn" title="Play and loop this section">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M11 1a1 1 0 0 1 1 1v12l-8-6z"/>
                        </svg>
                    </button>
                </div>
            `;
        }).join('');

        // Calculate duration: total beats / tempo = minutes
        const totalMinutes = totalBeats / track.tempo;
        const minutes = Math.floor(totalMinutes);
        const seconds = Math.round((totalMinutes - minutes) * 60);

        structureContent.innerHTML = `
            <div class="structure-overview">
                <div class="tempo-info">
                    <span class="tempo-label">Tempo:</span>
                    <span class="tempo-value">${track.tempo} BPM</span>
                </div>
            </div>
            <div class="structure-sections">
                ${structureRows}
            </div>
        `;

        structurePanel.classList.add('active');
        mainContainer.classList.add('structure-open');

        // Add click handlers to sections after they're rendered
        setTimeout(() => {
            const sectionElements = structurePanel.querySelectorAll('.structure-section');
            sectionElements.forEach(section => {
                section.addEventListener('click', function(e) {
                    // Don't trigger if clicking the play button itself
                    if (e.target.closest('.section-play-btn')) {
                        e.preventDefault();
                    }

                    const startTime = parseFloat(this.dataset.startTime);
                    const endTime = parseFloat(this.dataset.endTime);
                    const sectionName = this.dataset.sectionName;
                    const sectionIndex = this.dataset.sectionIndex;

                    // Play the track if not already playing this track
                    if (currentTrackIndex !== trackIndex) {
                        selectTrack(trackIndex);
                    }

                    // Set loop parameters with buffer for timing accuracy
                    const bufferTime = 3; // 3 seconds buffer
                    const bufferedStartTime = Math.max(0, startTime - bufferTime);
                    const bufferedEndTime = endTime + bufferTime;

                    loopSection = {
                        name: sectionName,
                        startTime: bufferedStartTime,
                        endTime: bufferedEndTime,
                        index: sectionIndex
                    };
                    loopStartTime = bufferedStartTime;
                    loopEndTime = bufferedEndTime;

                    // Jump to section start and play
                    audio.currentTime = startTime;
                    if (!isPlaying) {
                        playTrack();
                    }

                    // Update visual indicators
                    updateSectionHighlight(sectionIndex);
                    updateLoopIndicator(true, sectionName);
                });
            });
        }, 0);
    } else {
        structureTitle.textContent = 'Song Structure';
        structureContent.innerHTML = '<p class="structure-placeholder">No structure information available for this song</p>';
        structurePanel.classList.add('active');
        mainContainer.classList.add('structure-open');
    }
}

function hideStructure() {
    const structurePanel = document.getElementById('structure-panel');
    const mainContainer = document.querySelector('.main-container');
    structurePanel.classList.remove('active');
    mainContainer.classList.remove('structure-open');
}

function updateSectionHighlight(sectionIndex) {
    // Remove existing highlights
    document.querySelectorAll('.structure-section').forEach(section => {
        section.classList.remove('section-active');
    });

    // Add highlight to active section
    if (sectionIndex !== null) {
        const activeSection = document.querySelector(`.structure-section[data-section-index="${sectionIndex}"]`);
        if (activeSection) {
            activeSection.classList.add('section-active');
        }
    }
}

function updateLoopIndicator(isLooping, sectionName = '') {
    const nowPlayingText = document.querySelector('.now-playing-text');
    const clearLoopBtn = document.getElementById('clear-loop-btn');
    const loopSectionText = document.getElementById('loop-section-text');
    const currentTrack = tracks[currentTrackIndex];

    if (isLooping && sectionName) {
        nowPlayingText.textContent = currentTrack.title;
        loopSectionText.innerHTML = `🔁 ${sectionName}`;
        loopSectionText.style.display = 'inline';
        clearLoopBtn.style.display = 'flex';
    } else {
        nowPlayingText.textContent = currentTrack.title;
        loopSectionText.style.display = 'none';
        clearLoopBtn.style.display = 'none';
    }
}

function clearLoop() {
    loopSection = null;
    loopStartTime = 0;
    loopEndTime = 0;
    updateSectionHighlight(null);
    updateLoopIndicator(false);
}

function initializeControls() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const clearLoopBtn = document.getElementById('clear-loop-btn');
    const progressBar = document.getElementById('progress-bar');
    const lyricsCloseBtn = document.getElementById('lyrics-close');
    const structureCloseBtn = document.getElementById('structure-close');

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    });

    prevBtn.addEventListener('click', previousTrack);
    nextBtn.addEventListener('click', nextTrack);
    clearLoopBtn.addEventListener('click', clearLoop);
    lyricsCloseBtn.addEventListener('click', hideLyrics);
    structureCloseBtn.addEventListener('click', hideStructure);
    
    progressBar.addEventListener('click', (e) => {
        if (audio.duration) {
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audio.currentTime = percent * audio.duration;
        }
    });
    
    audio.addEventListener('timeupdate', () => {
        const currentTime = document.getElementById('current-time');
        const duration = document.getElementById('duration');
        const progress = document.getElementById('progress');

        currentTime.textContent = formatTime(audio.currentTime);
        duration.textContent = formatTime(audio.duration || 0);

        if (audio.duration) {
            const percent = (audio.currentTime / audio.duration) * 100;
            progress.style.width = percent + '%';
        }

        // Handle section looping
        if (loopSection && audio.currentTime >= loopEndTime) {
            audio.currentTime = loopStartTime;
        }
    });
    
    audio.addEventListener('ended', () => {
        nextTrack();
    });
    
    audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        document.querySelector('.now-playing-text').textContent = 'Error loading track';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.songConfig && window.songConfig.tracks) {
        initializePlaylist();
        initializeControls();
        
        // Add spacebar play/pause functionality
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (isPlaying) {
                    pauseTrack();
                } else {
                    playTrack();
                }
            }
        });
    } else {
        console.error('Song configuration not found. Please ensure config.js is loaded.');
    }
});