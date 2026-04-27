// IPA Chart Rendering Application

// Place and Manner orderings for consistent chart layout
const PLACE_ORDER = [
    'bilabial', 'labiodental', 'dental', 'alveolar', 'postalveolar',
    'alveolo-palatal', 'palatal', 'retroflex', 'velar', 'uvular', 'pharyngeal', 'glottal'
];

const MANNER_ORDER = [
    'plosive', 'nasal', 'trill', 'tap/flap', 'fricative', 'lateral fricative',
    'approximant', 'lateral approximant', 'affricate', 'lateral affricate', 'implosive'
];

const HEIGHT_ORDER = [
    'high', 'near-high', 'high-mid', 'mid', 'low-mid', 'near-low', 'low'
];

const BACKNESS_ORDER = [
    'front', 'near-front', 'central', 'near-back', 'back'
];

// Inventory data will be loaded
let inventoryData = null;

// Load the inventory data
async function loadInventory() {
    try {
        const response = await fetch('data/inventory.json');
        inventoryData = await response.json();
        populateLanguageSelect();
    } catch (error) {
        console.error('Error loading inventory data:', error);
    }
}

// Populate the language dropdown
function populateLanguageSelect() {
    const select = document.getElementById('language-select');
    const languages = Object.keys(inventoryData).sort();
    
    languages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        select.appendChild(option);
    });
}

// Event listener for language selection
document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
    
    document.getElementById('language-select').addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        if (selectedLang) {
            renderCharts(selectedLang);
        }
    });
});

// Render charts for selected language
function renderCharts(language) {
    const data = inventoryData[language];
    
    // Update language info
    document.getElementById('language-name').textContent = language;
    const dialects = data.dialects && data.dialects.length > 0 
        ? `Dialects: ${data.dialects.join(', ')}` 
        : '';
    document.getElementById('dialect-info').textContent = dialects;
    
    // Render consonant chart
    renderConsonantChart(data.consonants);
    
    // Render vowel chart
    renderVowelChart(data.vowels);
    
    // Show charts, hide welcome
    document.getElementById('charts-container').classList.remove('hidden');
    document.getElementById('welcome-message').classList.add('hidden');
}

// Render consonant inventory as a table
function renderConsonantChart(consonants) {
    const container = document.getElementById('consonant-chart');
    container.innerHTML = '';
    
    // Build table
    const table = document.createElement('table');
    table.className = 'ipa-chart consonant-table';
    
    // Header row with manners
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Place \\ Manner</th>';
    
    MANNER_ORDER.forEach(manner => {
        const th = document.createElement('th');
        th.textContent = manner;
        th.className = 'manner-header';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Body rows with places
    const tbody = document.createElement('tbody');
    
    PLACE_ORDER.forEach(place => {
        const row = document.createElement('tr');
        
        // Place header
        const placeHeader = document.createElement('th');
        placeHeader.textContent = place;
        placeHeader.className = 'place-header';
        row.appendChild(placeHeader);
        
        // Cells for each manner
        MANNER_ORDER.forEach(manner => {
            const cell = document.createElement('td');
            
            const placeData = consonants[place] || {};
            const mannerData = placeData[manner] || {};
            
            // Combine voiceless and voiced segments
            let segments = [];
            
            // Voiceless unaspirated
            if (mannerData.voiceless_unaspirated) {
                segments = segments.concat(mannerData.voiceless_unaspirated);
            }
            // Voiceless aspirated
            if (mannerData.voiceless_aspirated) {
                segments = segments.concat(mannerData.voiceless_aspirated.map(s => s + 'ʰ'));
            }
            // Voiced unaspirated
            if (mannerData.voiced_unaspirated) {
                segments = segments.concat(mannerData.voiced_unaspirated);
            }
            // Voiced aspirated (rare)
            if (mannerData.voiced_aspirated) {
                segments = segments.concat(mannerData.voiced_aspirated);
            }
            
            if (segments.length > 0) {
                const segSpan = document.createElement('span');
                segSpan.className = 'segment';
                segSpan.textContent = segments.join(' ');
                cell.appendChild(segSpan);
            } else {
                cell.innerHTML = '<span class="empty">—</span>';
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    container.appendChild(table);
}

// Render vowel inventory as a grid
function renderVowelChart(vowels) {
    const container = document.getElementById('vowel-chart');
    container.innerHTML = '';
    
    const grid = document.createElement('div');
    grid.className = 'vowel-grid';
    
    // Corner cell
    const corner = document.createElement('div');
    corner.className = 'vowel-cell header';
    corner.textContent = 'Height \\ Backness';
    grid.appendChild(corner);
    
    // Backness header row
    BACKNESS_ORDER.forEach(backness => {
        const header = document.createElement('div');
        header.className = 'vowel-cell header';
        header.textContent = backness;
        grid.appendChild(header);
    });
    
    // Height rows (reversed for high at top)
    [...HEIGHT_ORDER].reverse().forEach(height => {
        // Height header
        const heightHeader = document.createElement('div');
        heightHeader.className = 'vowel-cell height-header';
        heightHeader.textContent = height;
        grid.appendChild(heightHeader);
        
        // Cells for each backness
        BACKNESS_ORDER.forEach(backness => {
            const cell = document.createElement('div');
            cell.className = 'vowel-cell';
            
            const heightData = vowels[height] || {};
            const backnessData = heightData[backness] || {};
            
            // Combine rounded and unrounded
            let segments = [];
            
            if (backnessData.rounded) {
                segments = segments.concat(backnessData.rounded);
            }
            if (backnessData.unrounded) {
                segments = segments.concat(backnessData.unrounded);
            }
            
            if (segments.length > 0) {
                const segDiv = document.createElement('div');
                segDiv.className = 'segments';
                segDiv.textContent = segments.join(' ');
                cell.appendChild(segDiv);
            } else {
                cell.innerHTML = '<span class="empty">—</span>';
            }
            
            grid.appendChild(cell);
        });
    });
    
    container.appendChild(grid);
}