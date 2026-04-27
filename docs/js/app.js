// IPA Chart Rendering Application
const ASSET_VERSION = '20260427-manner-order-nasal';

// Place and Manner orderings for consistent chart layout
const PLACE_ORDER = [
    'labial', 'bilabial', 'labiodental', 'dental', 'interdental', 'alveolar', 'postalveolar',
    'alveolo-palatal', 'palatal', 'retroflex', 'velar', 'uvular', 'pharyngeal', 'glottal'
];

const MANNER_ORDER = [
    'plosive', 'implosive', 'fricative', 'lateral fricative', 'affricate',
    'lateral affricate', 'nasal', 'tap/flap', 'trill', 'approximant',
    'lateral approximant'
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
const BRANCH_ORDER = ['Northern', 'Northwestern', 'Central', 'Southern', 'Maraic', 'Other'];

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
let sourcesData = {};
let currentLanguage = null;
let currentDialect = null;

// Load the inventory data
async function loadInventory() {
    try {
        const [inventoryResponse, sourcesResponse] = await Promise.all([
            fetch(`data/inventory.json?v=${ASSET_VERSION}`, { cache: 'no-store' }),
            fetch(`data/sources.json?v=${ASSET_VERSION}`, { cache: 'no-store' })
        ]);

        if (!inventoryResponse.ok) {
            throw new Error(`Inventory request failed with status ${inventoryResponse.status}`);
        }
        if (!sourcesResponse.ok) {
            console.warn(`Sources request failed with status ${sourcesResponse.status}`);
        }

        inventoryData = await inventoryResponse.json();
        sourcesData = sourcesResponse.ok ? await sourcesResponse.json() : {};
        populateLanguageSelect();
    } catch (error) {
        console.error('Error loading inventory data:', error);
    }
}

// Populate the language dropdown
function populateLanguageSelect() {
    const select = document.getElementById('language-select');
    const languagesByBranch = groupLanguagesByBranch();
    const branches = orderedKeys(Object.keys(languagesByBranch), BRANCH_ORDER);

    branches.forEach(branch => {
        const group = document.createElement('optgroup');
        group.label = branch;

        languagesByBranch[branch].sort().forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = lang;
            group.appendChild(option);
        });

        select.appendChild(group);
    });
}

function groupLanguagesByBranch() {
    const languagesByBranch = {};

    Object.keys(inventoryData).forEach(lang => {
        const branch = inventoryData[lang].branch || 'Other';
        if (!languagesByBranch[branch]) {
            languagesByBranch[branch] = [];
        }
        languagesByBranch[branch].push(lang);
    });

    return languagesByBranch;
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

function isLongVowel(segment) {
    return segment.includes('ː') || segment.includes(':');
}

function isNasalVowel(segment) {
    return segment.includes('̃');
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

function mergeSources(target, source) {
    (source || []).forEach(sourceLabel => addUnique(target, sourceLabel));
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
            vowels: normalizeVowels(dialectData.vowels),
            sources: dialectData.sources || []
        };
    }

    const merged = { consonants: {}, vowels: emptyVowels(), sources: [] };

    for (const dialect of dialects) {
        const dialectData = data.dialects[dialect];
        if (!dialectData) continue;

        mergeConsonants(merged.consonants, dialectData.consonants || {});

        const vowelData = normalizeVowels(dialectData.vowels);
        mergeVowelGrid(merged.vowels.monophthongs, vowelData.monophthongs);
        mergeVowelLists(merged.vowels.diphthongs, vowelData.diphthongs);
        vowelData.triphthongs.forEach(segment => addUnique(merged.vowels.triphthongs, segment));
        mergeSources(merged.sources, dialectData.sources);
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

    // Render sources
    renderSources(dialectData.sources);

    // Show charts, hide welcome
    document.getElementById('charts-container').classList.remove('hidden');
    document.getElementById('welcome-message').classList.add('hidden');
}

// Render sources list
function renderSources(sources) {
    const container = document.getElementById('sources-list');
    container.innerHTML = '';

    if (!sources || sources.length === 0) {
        container.innerHTML = '<p class="no-sources">No source information available.</p>';
        return;
    }

    sources.forEach(source => {
        const item = document.createElement('div');
        item.className = 'source-item';
        const sourceEntry = sourcesData[source];
        appendSourceReference(item, source, sourceEntry);
        container.appendChild(item);
    });
}

function appendSourceReference(container, source, entry) {
    if (!entry || entry._missing) {
        container.textContent = source;
        return;
    }

    appendText(container, formatAuthors(entry.author) || source);
    appendText(container, ` (${entry.year || 'n.d.'}). `);

    const type = (entry.type || '').toLowerCase();

    if (type === 'article') {
        appendText(container, `${punctuate(entry.title)} `);
        appendItalic(container, entry.journal);
        appendJournalDetails(container, entry);
    } else if (type === 'incollection') {
        appendText(container, `${punctuate(entry.title)} `);
        appendBookChapterDetails(container, entry);
    } else if (type === 'book') {
        appendItalic(container, entry.title);
        appendText(container, '. ');
        appendText(container, punctuate(entry.publisher));
    } else if (type.includes('thesis')) {
        appendItalic(container, entry.title);
        appendText(container, ` [${formatThesisType(type)}]. `);
        appendText(container, punctuate(entry.publisher || entry.address));
    } else if (type.includes('poster')) {
        appendText(container, `${entry.title || source} [Poster presentation]. `);
        appendText(container, punctuate(entry.address));
    } else {
        appendText(container, `${punctuate(entry.title)} `);
        appendText(container, punctuate(entry.journal || entry.booktitle || entry.publisher || entry.address));
    }

    appendSourceUrl(container, entry);
}

function formatAuthors(authorField) {
    const authors = (authorField || '').split(/\s+and\s+/).map(formatAuthorName).filter(Boolean);
    if (authors.length === 0) return '';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) {
        return `${authors[0]}, & ${authors[1]}`;
    }

    return `${authors.slice(0, -1).join(', ')}, & ${authors[authors.length - 1]}`;
}

function formatAuthorName(name) {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (!trimmed.includes(',')) return trimmed;

    const [surname, given] = trimmed.split(',', 2).map(part => part.trim());
    return [surname, formatInitials(given)].filter(Boolean).join(', ');
}

function appendJournalDetails(container, entry) {
    if (!entry.journal) return;

    if (entry.volume) {
        appendText(container, ', ');
        appendItalic(container, entry.volume);
    }
    if (entry.number) appendText(container, `(${entry.number})`);
    if (entry.pages) appendText(container, `, ${formatPages(entry.pages)}`);
    appendText(container, '.');
}

function appendBookChapterDetails(container, entry) {
    const editorText = formatEditors(entry.editor);
    if (entry.booktitle || editorText) {
        appendText(container, 'In ');
        if (editorText) appendText(container, `${editorText}, `);
        appendItalic(container, entry.booktitle);
        if (entry.pages) appendText(container, ` (pp. ${formatPages(entry.pages)})`);
        appendText(container, '. ');
    }
    appendText(container, punctuate(entry.publisher));
}

function formatEditors(editorField) {
    if (!editorField) return '';
    const editors = editorField.split(/\s+and\s+/).map(formatEditorName).filter(Boolean);
    if (editors.length === 0) return '';
    let editorList = editors[0];
    if (editors.length === 2) {
        editorList = `${editors[0]} & ${editors[1]}`;
    } else if (editors.length > 2) {
        editorList = `${editors.slice(0, -1).join(', ')}, & ${editors[editors.length - 1]}`;
    }
    return `${editorList} (${editors.length === 1 ? 'Ed.' : 'Eds.'})`;
}

function formatEditorName(name) {
    const trimmed = name.trim();
    if (!trimmed) return '';
    if (!trimmed.includes(',')) return trimmed;

    const [surname, given] = trimmed.split(',', 2).map(part => part.trim());
    return [formatInitials(given), surname].filter(Boolean).join(' ');
}

function formatInitials(givenNames) {
    return givenNames
        .split(/\s+/)
        .filter(Boolean)
        .map(part => `${part.charAt(0)}.`)
        .join(' ');
}

function formatThesisType(type) {
    if (type.includes('phd')) return 'Doctoral dissertation';
    if (type.includes('master')) return "Master's thesis";
    return 'Thesis';
}

function formatPages(pages) {
    return pages.replace(/--/g, '-');
}

function punctuate(text) {
    if (!text) return '';
    return /[.!?]$/.test(text) ? text : `${text}.`;
}

function appendSourceUrl(container, entry) {
    if (!entry || entry._missing) return;

    const href = entry.doi
        ? (entry.doi.startsWith('http') ? entry.doi : `https://doi.org/${entry.doi}`)
        : entry.url;
    if (!href) return;

    appendText(container, ' ');
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.textContent = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    container.appendChild(anchor);
}

function appendText(container, text) {
    if (text) container.appendChild(document.createTextNode(text));
}

function appendItalic(container, text) {
    if (!text) return;
    const em = document.createElement('em');
    em.textContent = text;
    container.appendChild(em);
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

    const colgroup = document.createElement('colgroup');
    const mannerCol = document.createElement('col');
    mannerCol.className = 'row-label-column';
    colgroup.appendChild(mannerCol);

    placeGroups.forEach(group => {
        group.voicings.forEach(() => {
            colgroup.appendChild(document.createElement('col'));
        });
    });
    table.appendChild(colgroup);

    const thead = document.createElement('thead');
    const placeHeaderRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'chart-corner';
    corner.rowSpan = 2;
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

        const colgroup = document.createElement('colgroup');
        const heightCol = document.createElement('col');
        heightCol.className = 'row-label-column';
        colgroup.appendChild(heightCol);

        visibleBacknesses.forEach(() => {
            colgroup.appendChild(document.createElement('col'));
        });
        table.appendChild(colgroup);

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const corner = document.createElement('th');
        corner.className = 'chart-corner';
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
                    segSpan.textContent = formatMonophthongCell(segments);
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

function formatMonophthongCell(segments) {
    const uniqueSegments = [...new Set(segments)];
    const regular = [];
    const long = [];
    const nasal = [];

    uniqueSegments.forEach(segment => {
        if (isNasalVowel(segment)) {
            nasal.push(segment);
        } else if (isLongVowel(segment)) {
            long.push(segment);
        } else {
            regular.push(segment);
        }
    });

    return [regular, long, nasal]
        .filter(group => group.length > 0)
        .map(group => group.join('  '))
        .join('\n');
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
