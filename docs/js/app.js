// IPA Chart Rendering Application
const ASSET_VERSION = '20260427-w-bilabial';

// Place and Manner orderings for consistent chart layout
const PLACE_ORDER = [
    'labial', 'bilabial', 'labiodental', 'dental', 'interdental', 'alveolar', 'postalveolar',
    'alveolo-palatal', 'palatal', 'retroflex', 'velar', 'uvular', 'pharyngeal', 'glottal'
];

const MANNER_ORDER = [
    'plosive', 'implosive', 'nasal', 'trill', 'tap/flap', 'fricative', 'lateral fricative',
    'approximant', 'lateral approximant', 'affricate', 'lateral affricate'
];

const HEIGHT_ORDER = [
    'high', 'near-high', 'high-mid', 'mid', 'low-mid', 'near-low', 'low'
];

const BACKNESS_ORDER = [
    'front', 'near-front', 'central', 'near-back', 'back'
];

const VOICING_ORDER = ['voiceless', 'voiced'];
const ASPIRATION_ORDER = ['unaspirated', 'aspirated', 'unknown'];
const ROUNDING_ORDER = ['unrounded', 'rounded', 'unknown'];
const VOWEL_LENGTH_ORDER = ['short', 'long', 'unknown'];

const DISPLAY_LABELS = {
    'tap/flap': 'tap/flap',
    'lateral fricative': 'lateral fricative',
    'lateral approximant': 'lateral approximant',
    'lateral affricate': 'lateral affricate',
    'alveolo-palatal': 'alveolo-palatal',
    'near-front': 'near-front',
    'near-back': 'near-back',
    'near-high': 'near-high',
    'high-mid': 'high-mid',
    'low-mid': 'low-mid',
    'near-low': 'near-low'
};

// Inventory data will be loaded
let inventoryData = null;
let currentLanguage = null;
let currentDialect = null;

// Load the inventory data
async function loadInventory() {
    try {
        const response = await fetch(`data/inventory.json?v=${ASSET_VERSION}`, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Inventory request failed with status ${response.status}`);
        }
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

function getDialects(language) {
    const languageData = inventoryData[language] || {};
    return languageData.all_dialects || Object.keys(languageData.dialects || {}).sort();
}

function formatDialectName(dialect) {
    return dialect === 'unspecified' ? 'Unspecified' : dialect;
}

function formatFeatureLabel(value) {
    if (!value) return '';
    const label = DISPLAY_LABELS[value] || value;
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function orderedKeys(keys, preferredOrder) {
    const keySet = new Set(keys);
    const ordered = preferredOrder.filter(key => keySet.has(key));
    const extras = [...keySet].filter(key => !preferredOrder.includes(key)).sort();
    return ordered.concat(extras);
}

function hasSegments(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (!value || typeof value !== 'object') return false;
    return Object.values(value).some(hasSegments);
}

// Populate dialect dropdown
function populateDialectSelect(language) {
    const select = document.getElementById('dialect-select');
    const dialectSection = document.getElementById('dialect-selector-section');
    const dialects = getDialects(language);
    
    // Clear existing options
    select.innerHTML = '';
    
    if (dialects.length > 1) {
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '-- Choose a dialect --';
        placeholder.disabled = true;
        placeholder.selected = true;
        select.appendChild(placeholder);

        dialects.forEach(dialect => {
            const option = document.createElement('option');
            option.value = dialect;
            option.textContent = formatDialectName(dialect);
            select.appendChild(option);
        });
        dialectSection.classList.remove('hidden');
    } else {
        dialectSection.classList.add('hidden');
    }
}

function hideInventories(showWelcome = false) {
    document.getElementById('charts-container').classList.add('hidden');
    document.getElementById('welcome-message').classList.toggle('hidden', !showWelcome);
}

function emptyVowels() {
    return { monophthongs: {}, diphthongs: {}, triphthongs: [] };
}

function normalizeVowels(vowels) {
    if (!vowels) return emptyVowels();

    if (vowels.monophthongs || vowels.diphthongs || vowels.triphthongs) {
        return {
            monophthongs: vowels.monophthongs || {},
            diphthongs: vowels.diphthongs || {},
            triphthongs: vowels.triphthongs || []
        };
    }

    return { monophthongs: vowels, diphthongs: {}, triphthongs: [] };
}

function addUnique(target, segment) {
    if (!target.includes(segment)) {
        target.push(segment);
    }
}

function mergeConsonants(target, source) {
    for (const place in source) {
        if (!target[place]) target[place] = {};
        for (const manner in source[place]) {
            if (!target[place][manner]) target[place][manner] = {};
            for (const voicing in source[place][manner]) {
                if (!target[place][manner][voicing]) {
                    target[place][manner][voicing] = [];
                }
                source[place][manner][voicing].forEach(segment => {
                    addUnique(target[place][manner][voicing], segment);
                });
            }
        }
    }
}

function mergeVowelGrid(target, source) {
    for (const height in source) {
        if (!target[height]) target[height] = {};
        for (const backness in source[height]) {
            if (!target[height][backness]) target[height][backness] = {};
            for (const rounding in source[height][backness]) {
                if (!target[height][backness][rounding]) {
                    target[height][backness][rounding] = [];
                }
                source[height][backness][rounding].forEach(segment => {
                    addUnique(target[height][backness][rounding], segment);
                });
            }
        }
    }
}

function mergeVowelLists(target, source) {
    for (const length in source) {
        if (!target[length]) target[length] = [];
        source[length].forEach(segment => addUnique(target[length], segment));
    }
}

function sortSegmentsInPlace(value) {
    if (Array.isArray(value)) {
        value.sort();
        return;
    }
    if (!value || typeof value !== 'object') return;
    Object.values(value).forEach(sortSegmentsInPlace);
}

// Merge segments from multiple dialects
function mergeDialects(data, dialects, selectedDialect) {
    if (selectedDialect) {
        const dialectData = data.dialects[selectedDialect] || { consonants: {}, vowels: emptyVowels() };
        return {
            consonants: dialectData.consonants || {},
            vowels: normalizeVowels(dialectData.vowels)
        };
    }

    const merged = { consonants: {}, vowels: emptyVowels() };

    for (const dialect of dialects) {
        const dialectData = data.dialects[dialect];
        if (!dialectData) continue;

        mergeConsonants(merged.consonants, dialectData.consonants || {});

        const vowelData = normalizeVowels(dialectData.vowels);
        mergeVowelGrid(merged.vowels.monophthongs, vowelData.monophthongs);
        mergeVowelLists(merged.vowels.diphthongs, vowelData.diphthongs);
        vowelData.triphthongs.forEach(segment => addUnique(merged.vowels.triphthongs, segment));
    }

    sortSegmentsInPlace(merged);
    return merged;
}

function getDialectInfoText(data, selectedDialect) {
    const dialects = data.all_dialects || Object.keys(data.dialects || {}).sort();

    if (selectedDialect) {
        return `Dialect: ${formatDialectName(selectedDialect)}`;
    }
    if (dialects.length > 1) {
        return `Showing all dialects: ${dialects.map(formatDialectName).join(', ')}`;
    }
    if (dialects.length === 1 && dialects[0] !== 'unspecified') {
        return `Dialect: ${formatDialectName(dialects[0])}`;
    }
    return '';
}

// Event listener for language selection
document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
    
    document.getElementById('language-select').addEventListener('change', (e) => {
        const selectedLang = e.target.value;
        currentLanguage = selectedLang;
        currentDialect = '';
        
        if (selectedLang) {
            populateDialectSelect(selectedLang);
            if (getDialects(selectedLang).length > 1) {
                hideInventories();
            } else {
                renderCharts(selectedLang, '');
            }
        } else {
            document.getElementById('dialect-selector-section').classList.add('hidden');
            hideInventories(true);
        }
    });
    
    document.getElementById('dialect-select').addEventListener('change', (e) => {
        if (currentLanguage) {
            currentDialect = e.target.value;
            if (currentDialect) {
                renderCharts(currentLanguage, currentDialect);
            } else {
                hideInventories();
            }
        }
    });
});

// Render charts for selected language
function renderCharts(language, dialect) {
    const data = inventoryData[language];
    const dialectData = mergeDialects(data, getDialects(language), dialect);
    
    // Update language info
    document.getElementById('language-name').textContent = language;
    document.getElementById('dialect-info').textContent = getDialectInfoText(data, dialect);
    
    // Render consonant chart
    renderConsonantChart(dialectData.consonants);
    
    // Render vowel chart
    renderVowelChart(dialectData.vowels);
    
    // Show charts, hide welcome
    document.getElementById('charts-container').classList.remove('hidden');
    document.getElementById('welcome-message').classList.add('hidden');
}

// Render consonant inventory as a table
function renderConsonantChart(consonants) {
    const container = document.getElementById('consonant-chart');
    container.innerHTML = '';

    const placeKeys = orderedKeys(Object.keys(consonants || {}), PLACE_ORDER)
        .filter(place => hasSegments(consonants[place]));

    const placeGroups = placeKeys.map(place => {
        return {
            place,
            voicings: VOICING_ORDER
        };
    });

    const mannerKeys = new Set();
    placeGroups.forEach(group => {
        const placeData = consonants[group.place] || {};
        Object.keys(placeData).forEach(manner => {
            if (hasSegments(placeData[manner])) mannerKeys.add(manner);
        });
    });

    const visibleManners = orderedKeys([...mannerKeys], MANNER_ORDER);

    if (placeGroups.length === 0 || visibleManners.length === 0) {
        container.textContent = '';
        return;
    }

    const table = document.createElement('table');
    table.className = 'ipa-chart consonant-table';

    const thead = document.createElement('thead');
    const placeHeaderRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'manner-axis-header';
    corner.rowSpan = 2;
    corner.textContent = 'Manner';
    placeHeaderRow.appendChild(corner);

    placeGroups.forEach(group => {
        const th = document.createElement('th');
        th.textContent = formatFeatureLabel(group.place);
        th.className = 'place-header';
        th.colSpan = group.voicings.length;
        placeHeaderRow.appendChild(th);
    });

    const voicingHeaderRow = document.createElement('tr');
    placeGroups.forEach(group => {
        group.voicings.forEach(voicing => {
            const th = document.createElement('th');
            th.textContent = formatFeatureLabel(voicing);
            th.className = `voicing-header ${voicing}-column`;
            voicingHeaderRow.appendChild(th);
        });
    });

    thead.appendChild(placeHeaderRow);
    thead.appendChild(voicingHeaderRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    visibleManners.forEach(manner => {
        const row = document.createElement('tr');
        const mannerHeader = document.createElement('th');
        mannerHeader.textContent = formatFeatureLabel(manner);
        mannerHeader.className = 'manner-header';
        row.appendChild(mannerHeader);

        placeGroups.forEach(group => {
            const placeData = consonants[group.place] || {};
            const mannerData = placeData[manner] || {};

            group.voicings.forEach(voicing => {
                const cell = document.createElement('td');
                cell.className = `${voicing}-column`;

                const segmentsByAspiration = ASPIRATION_ORDER.map(aspiration => {
                    const segments = mannerData[`${voicing}_${aspiration}`] || [];
                    return segments.length > 0 ? segments.join(' ') : '';
                }).filter(Boolean);

                Object.keys(mannerData).sort().forEach(key => {
                    const [keyVoicing, keyAspiration] = key.split('_');
                    if (keyVoicing === voicing && !ASPIRATION_ORDER.includes(keyAspiration)) {
                        segmentsByAspiration.push(mannerData[key].join(' '));
                    }
                });

                if (segmentsByAspiration.length > 0) {
                    const segSpan = document.createElement('span');
                    segSpan.className = 'segment';
                    segSpan.textContent = segmentsByAspiration.join('\n');
                    cell.appendChild(segSpan);
                }

                row.appendChild(cell);
            });
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

    const vowelData = normalizeVowels(vowels);
    const monophthongs = vowelData.monophthongs;
    const visibleHeights = orderedKeys(Object.keys(monophthongs), HEIGHT_ORDER)
        .filter(height => hasSegments(monophthongs[height]));

    const backnessKeys = new Set();
    visibleHeights.forEach(height => {
        Object.keys(monophthongs[height] || {}).forEach(backness => {
            if (hasSegments(monophthongs[height][backness])) {
                backnessKeys.add(backness);
            }
        });
    });
    const visibleBacknesses = orderedKeys([...backnessKeys], BACKNESS_ORDER);

    if (visibleHeights.length > 0 && visibleBacknesses.length > 0) {
        const table = document.createElement('table');
        table.className = 'ipa-chart vowel-table';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const corner = document.createElement('th');
        corner.textContent = 'Height \\ Backness';
        headerRow.appendChild(corner);

        visibleBacknesses.forEach(backness => {
            const th = document.createElement('th');
            th.textContent = formatFeatureLabel(backness);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        visibleHeights.forEach(height => {
            const row = document.createElement('tr');
            const heightHeader = document.createElement('th');
            heightHeader.textContent = formatFeatureLabel(height);
            heightHeader.className = 'height-header';
            row.appendChild(heightHeader);

            visibleBacknesses.forEach(backness => {
                const cell = document.createElement('td');
                const backnessData = (monophthongs[height] || {})[backness] || {};
                const segments = [];

                ROUNDING_ORDER.forEach(rounding => {
                    if (backnessData[rounding]) {
                        segments.push(...backnessData[rounding]);
                    }
                });

                Object.keys(backnessData).sort().forEach(rounding => {
                    if (!ROUNDING_ORDER.includes(rounding)) {
                        segments.push(...backnessData[rounding]);
                    }
                });

                if (segments.length > 0) {
                    const segSpan = document.createElement('span');
                    segSpan.className = 'segments';
                    segSpan.textContent = [...new Set(segments)].join(', ');
                    cell.appendChild(segSpan);
                }

                row.appendChild(cell);
            });

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        container.appendChild(table);
    }

    renderComplexVowelList(container, 'Diphthongs', flattenLengthGroupedVowels(vowelData.diphthongs));
    renderComplexVowelList(container, 'Triphthongs', vowelData.triphthongs);
}

function flattenLengthGroupedVowels(groupedVowels) {
    const vowels = [];

    VOWEL_LENGTH_ORDER.forEach(length => {
        if (groupedVowels[length]) vowels.push(...groupedVowels[length]);
    });

    Object.keys(groupedVowels).sort().forEach(length => {
        if (!VOWEL_LENGTH_ORDER.includes(length)) {
            vowels.push(...groupedVowels[length]);
        }
    });

    return [...new Set(vowels)];
}

function renderComplexVowelList(container, label, vowels) {
    if (!vowels || vowels.length === 0) return;

    const list = document.createElement('p');
    list.className = 'complex-vowels';

    const labelSpan = document.createElement('strong');
    labelSpan.textContent = `${label}: `;
    list.appendChild(labelSpan);
    list.appendChild(document.createTextNode(vowels.join(', ')));
    container.appendChild(list);
}
