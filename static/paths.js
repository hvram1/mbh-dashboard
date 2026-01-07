/**
 * Mahabharata Dashboard - Data Paths Configuration
 * 
 * Central configuration for all data file paths.
 * Update these if directory structure changes.
 */

const DATA_PATHS = {
    // Base path (relative to dashboard HTML files)
    base: '..',
    
    // Pipeline output (mappings) - exported from pipeline
    mappings: {
        book: (bookNum) => `data/book_${String(bookNum).padStart(2, '0')}_mappings.json`,
        stats: 'data/pipeline_stats.json',
        allBooks: 'data/all_books_summary.json',
    },
    
    // Source corpora
    sources: {
        sriranga: '../../sriranga',
        mnDutt: '../../visualization-2/mn_dutt_sanskrit_split_shlokas_upaparva.json',
        criticalEdition: '../../critical-edition',
        sarit: '../../mahabharata-devanagari.xml',
    },
    
    // Metadata files
    metadata: {
        xmlMetadata: '../../visualization-2/xml_metadata_sanskrit.json',
        parvaMapping: '../config/parva_mapping.json',
    }
};

/**
 * Get path to book mapping file
 * @param {number} bookNumber - Book number (1-19)
 * @returns {string} Path to mapping JSON
 */
function getBookMappingPath(bookNumber) {
    return DATA_PATHS.mappings.book(bookNumber);
}

/**
 * Get path to pipeline statistics
 * @returns {string} Path to stats JSON
 */
function getStatsPath() {
    return DATA_PATHS.mappings.stats;
}

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Calculate percentage
 * @param {number} part - Part value
 * @param {number} total - Total value
 * @returns {string} Formatted percentage
 */
function formatPercent(part, total) {
    if (total === 0) return '0%';
    return ((part / total) * 100).toFixed(1) + '%';
}

/**
 * Get similarity badge class
 * @param {number} similarity - Similarity score (0-1)
 * @returns {string} CSS class
 */
function getSimilarityClass(similarity) {
    if (similarity >= 0.9) return 'high';
    if (similarity >= 0.7) return 'medium';
    return 'low';
}

/**
 * Get match status class
 * @param {object} shloka - Shloka object
 * @returns {string} CSS class
 */
function getMatchStatusClass(shloka) {
    if (!shloka.has_match) return 'unmatched';
    if (shloka.similarity >= 0.9) return 'matched';
    return 'partial';
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 80) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Parse Sriranga shloka data to get hierarchy info
 * Uses parva_id, upaparva_id, adhyaya_id from the exported data
 * Falls back to chapter-based grouping if hierarchy IDs not available
 * @param {object} shloka - Shloka object with hierarchy info
 * @returns {object} Parsed components
 */
function parseSrirangaHierarchy(shloka) {
    // Use hierarchy IDs if available
    if (shloka.parva_id && shloka.upaparva_id && shloka.adhyaya_id) {
        return {
            book: shloka.book || 1,
            parva: shloka.parva_id,
            parvaName: shloka.parva_name || shloka.parva_id,
            upaparva: shloka.upaparva_id,
            upaparvaName: shloka.upaparva_name || shloka.upaparva_id,
            adhyaya: shloka.adhyaya_id,
            adhyayaName: shloka.adhyaya_name || shloka.adhyaya_id,
            verseNumeric: shloka.verse || 0
        };
    }
    
    // Fallback: group by chapter number
    const chapter = shloka.chapter || 0;
    return {
        book: shloka.book || 1,
        parva: `P01`,  // Default parva for Book 1
        parvaName: 'Adi Parva',
        upaparva: `U${String(Math.floor((chapter - 1) / 10) + 1).padStart(2, '0')}`,
        upaparvaName: `Upaparva ${Math.floor((chapter - 1) / 10) + 1}`,
        adhyaya: `A${String(chapter).padStart(3, '0')}`,
        adhyayaName: `Adhyaya ${chapter}`,
        verseNumeric: shloka.verse || 0
    };
}

/**
 * Parse Sriranga XML ID to get chapter/verse info (legacy format)
 * Format: 001_P01_U01_A08_१९_19 or sriranga_01_001_001
 * @param {string} id - Sriranga ID
 * @returns {object} Parsed components
 */
function parseSrirangaId(id) {
    // Try new format: sriranga_01_001_001
    const newMatch = id.match(/sriranga_(\d+)_(\d+)_(\d+)/);
    if (newMatch) {
        return {
            book: parseInt(newMatch[1], 10),
            parva: `P${newMatch[1].padStart(2, '0')}`,
            upaparva: 'U01',
            adhyaya: `A${newMatch[2].padStart(3, '0')}`,
            verseDevanagari: '',
            verseNumeric: parseInt(newMatch[3], 10)
        };
    }
    
    // Try old format: 001_P01_U01_A08_१९_19
    const parts = id.split('_');
    if (parts.length >= 6) {
        return {
            book: parseInt(parts[0], 10),
            parva: parts[1],
            upaparva: parts[2],
            adhyaya: parts[3],
            verseDevanagari: parts[4],
            verseNumeric: parseInt(parts[5], 10)
        };
    }
    return { book: 0, parva: '', upaparva: '', adhyaya: '', verseDevanagari: '', verseNumeric: 0 };
}

/**
 * Group shlokas by hierarchy (Parva → Upaparva → Adhyaya)
 * @param {Array} shlokas - Array of shloka objects
 * @returns {object} Hierarchical structure
 */
function groupByHierarchy(shlokas) {
    const hierarchy = {};
    
    shlokas.forEach(shloka => {
        // Use the new hierarchy parser that looks at parva_id, upaparva_id, adhyaya_id
        const parsed = parseSrirangaHierarchy(shloka);
        const parva = parsed.parva || 'Unknown';
        const parvaName = parsed.parvaName || parva;
        const upaparva = parsed.upaparva || 'Unknown';
        const upaparvaName = parsed.upaparvaName || upaparva;
        const adhyaya = parsed.adhyaya || 'Unknown';
        const adhyayaName = parsed.adhyayaName || adhyaya;
        
        if (!hierarchy[parva]) {
            hierarchy[parva] = { 
                upaparvas: {}, 
                stats: { matched: 0, unmatched: 0, total: 0 },
                name: parvaName
            };
        }
        if (!hierarchy[parva].upaparvas[upaparva]) {
            hierarchy[parva].upaparvas[upaparva] = { 
                adhyayas: {}, 
                stats: { matched: 0, unmatched: 0, total: 0 },
                name: upaparvaName
            };
        }
        if (!hierarchy[parva].upaparvas[upaparva].adhyayas[adhyaya]) {
            hierarchy[parva].upaparvas[upaparva].adhyayas[adhyaya] = { 
                shlokas: [], 
                stats: { matched: 0, unmatched: 0, total: 0 },
                name: adhyayaName
            };
        }
        
        hierarchy[parva].upaparvas[upaparva].adhyayas[adhyaya].shlokas.push(shloka);
        
        // Update stats
        const isMatched = shloka.has_match;
        hierarchy[parva].stats.total++;
        hierarchy[parva].upaparvas[upaparva].stats.total++;
        hierarchy[parva].upaparvas[upaparva].adhyayas[adhyaya].stats.total++;
        
        if (isMatched) {
            hierarchy[parva].stats.matched++;
            hierarchy[parva].upaparvas[upaparva].stats.matched++;
            hierarchy[parva].upaparvas[upaparva].adhyayas[adhyaya].stats.matched++;
        } else {
            hierarchy[parva].stats.unmatched++;
            hierarchy[parva].upaparvas[upaparva].stats.unmatched++;
            hierarchy[parva].upaparvas[upaparva].adhyayas[adhyaya].stats.unmatched++;
        }
    });
    
    return hierarchy;
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DATA_PATHS,
        getBookMappingPath,
        getStatsPath,
        formatNumber,
        formatPercent,
        getSimilarityClass,
        getMatchStatusClass,
        truncateText,
        parseSrirangaId,
        groupByHierarchy
    };
}
