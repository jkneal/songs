let currentTrackIndex = -1;
let isPlaying = false;
let audio = new Audio();
let tracks = [];

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
    
    li.innerHTML = `
        <span class="track-number">${trackNumber}</span>
        <button class="play-button">▶</button>
        <div class="track-info">
            <div class="track-title">${track.title}</div>
        </div>
        ${track.lyrics ? `<button class="lyrics-button" data-track-index="${index}" title="View lyrics">📄</button>` : '<span class="lyrics-spacer"></span>'}
        <span class="track-duration">${track.duration}</span>
        <div class="wave-indicator">
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
            <div class="wave-bar"></div>
        </div>
    `;
    
    li.addEventListener('click', (e) => {
        if (!e.target.classList.contains('lyrics-button')) {
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
    if (currentTrackIndex < tracks.length - 1) {
        selectTrack(currentTrackIndex + 1);
    }
}

function previousTrack() {
    if (currentTrackIndex > 0) {
        selectTrack(currentTrackIndex - 1);
    }
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

function initializeControls() {
    const playPauseBtn = document.getElementById('play-pause-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const progressBar = document.getElementById('progress-bar');
    const lyricsCloseBtn = document.getElementById('lyrics-close');
    
    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    });
    
    prevBtn.addEventListener('click', previousTrack);
    nextBtn.addEventListener('click', nextTrack);
    lyricsCloseBtn.addEventListener('click', hideLyrics);
    
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