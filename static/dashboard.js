/**
 * Mahabharata Dashboard - Main Application
 * 
 * Handles:
 * - Tree navigation (Parva → Upaparva → Adhyaya → Shloka)
 * - Shloka detail display
 * - Filtering by match status
 * - Future: Translation and commentary display
 */

class MahabharataDashboard {
    constructor(containerId, bookNumber) {
        this.container = document.getElementById(containerId);
        this.bookNumber = bookNumber;
        this.data = null;
        this.hierarchy = null;
        this.selectedShloka = null;
        this.currentFilter = 'all';
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        
        try {
            await this.loadData();
            this.buildHierarchy();
            this.render();
            this.attachEventListeners();
        } catch (error) {
            this.showError(error.message);
            console.error('Dashboard initialization error:', error);
        }
    }
    
    showLoading() {
        this.container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading Book ${this.bookNumber} data...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="loading">
                <p style="color: #dc3545;">Error: ${message}</p>
                <p style="margin-top: 10px; font-size: 0.9rem;">
                    Make sure the pipeline has been run for Book ${this.bookNumber}.
                </p>
            </div>
        `;
    }
    
    async loadData() {
        const mappingPath = getBookMappingPath(this.bookNumber);
        
        const response = await fetch(mappingPath);
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
        }
        
        this.data = await response.json();
        console.log(`Loaded ${this.data.length} shlokas for Book ${this.bookNumber}`);
    }
    
    buildHierarchy() {
        this.hierarchy = groupByHierarchy(this.data);
        
        // Calculate overall stats
        // Note: "matched" = high confidence (≥90%), "partial" = lower confidence (<90%)
        this.stats = {
            total: this.data.length,
            allMatched: this.data.filter(s => s.has_match).length,  // Total with any match
            unmatched: this.data.filter(s => !s.has_match).length,
            highConfidence: this.data.filter(s => s.has_match && s.similarity >= 0.9).length,
            partial: this.data.filter(s => s.has_match && s.similarity < 0.9).length,
            // Corpus-specific counts
            mndutt: this.data.filter(s => s.match_corpus === 'mndutt').length,
            ce: this.data.filter(s => s.match_corpus === 'ce').length,
            sarit: this.data.filter(s => s.match_corpus === 'sarit').length,
            // Relationship counts
            manyToOne: this.data.filter(s => s.many_to_one).length,
            oneToMany: this.data.filter(s => s.one_to_many).length,
        };
        
        // For display, "matched" shows high confidence only
        this.stats.matched = this.stats.highConfidence;
        
        this.stats.matchRate = this.stats.total > 0 
            ? ((this.stats.allMatched / this.stats.total) * 100).toFixed(1) 
            : 0;
    }
    
    render() {
        this.container.innerHTML = `
            <div class="book-container">
                <div class="tree-panel">
                    <div class="panel-header">
                        <h2>📚 Book ${this.bookNumber} - Navigation</h2>
                    </div>
                    <div id="stats-bar" class="stats-bar"></div>
                    <div id="filters" class="filters"></div>
                    <div id="tree-content" class="tree-content"></div>
                </div>
                <div class="details-panel" id="details-panel">
                    <div class="detail-placeholder">
                        <div class="detail-placeholder-icon">📖</div>
                        <p>Select a shloka from the left panel to view details</p>
                    </div>
                </div>
            </div>
        `;
        
        this.renderStatsBar();
        this.renderFilters();
        this.renderTree();
    }
    
    renderStatsBar() {
        const statsBar = document.getElementById('stats-bar');
        statsBar.innerHTML = `
            <div style="padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-around; text-align: center;">
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #2d3436;">${formatNumber(this.stats.total)}</div>
                        <div style="font-size: 0.8rem; color: #636e72;">Total</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${formatNumber(this.stats.highConfidence)}</div>
                        <div style="font-size: 0.8rem; color: #636e72;">High (≥90%)</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ffc107;">${formatNumber(this.stats.partial)}</div>
                        <div style="font-size: 0.8rem; color: #636e72;">Partial (&lt;90%)</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #dc3545;">${formatNumber(this.stats.unmatched)}</div>
                        <div style="font-size: 0.8rem; color: #636e72;">Unmatched</div>
                    </div>
                    <div>
                        <div style="font-size: 1.5rem; font-weight: bold; color: #17a2b8;">${this.stats.matchRate}%</div>
                        <div style="font-size: 0.8rem; color: #636e72;">Match Rate</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderFilters() {
        const filters = document.getElementById('filters');
        filters.innerHTML = `
            <div class="filter-group">
                <span class="filter-label">Status:</span>
                <button class="filter-btn active" data-filter="all">All (${formatNumber(this.stats.total)})</button>
                <button class="filter-btn matched" data-filter="matched">✓ High ≥90% (${formatNumber(this.stats.highConfidence)})</button>
                <button class="filter-btn partial" data-filter="partial">~ Partial (${formatNumber(this.stats.partial)})</button>
                <button class="filter-btn unmatched" data-filter="unmatched">✗ Unmatched (${formatNumber(this.stats.unmatched)})</button>
            </div>
            <div class="filter-group">
                <span class="filter-label">Corpus:</span>
                <button class="filter-btn corpus-mndutt" data-filter="mndutt">MN Dutt (${formatNumber(this.stats.mndutt)})</button>
                <button class="filter-btn corpus-ce" data-filter="ce">CE (${formatNumber(this.stats.ce)})</button>
                <button class="filter-btn corpus-sarit" data-filter="sarit">SARIT (${formatNumber(this.stats.sarit)})</button>
            </div>
            <div class="filter-group">
                <span class="filter-label">Relationships:</span>
                <button class="filter-btn relation" data-filter="many-to-one">Many→One (${formatNumber(this.stats.manyToOne)})</button>
                <button class="filter-btn relation" data-filter="one-to-many">One→Many (${formatNumber(this.stats.oneToMany)})</button>
            </div>
        `;
    }
    
    renderTree() {
        const treeContent = document.getElementById('tree-content');
        let html = '<ul class="tree-list">';
        
        // Sort parvas by key
        const parvaKeys = Object.keys(this.hierarchy).sort();
        
        for (const parvaKey of parvaKeys) {
            const parva = this.hierarchy[parvaKey];
            const parvaId = `parva-${parvaKey}`;
            const parvaName = parva.name || this.formatParvaName(parvaKey);
            
            html += `
                <li class="tree-item">
                    <div class="tree-node" data-id="${parvaId}" data-type="parva">
                        <span class="tree-arrow">▶</span>
                        <span class="tree-label">${parvaName}</span>
                        <span class="tree-badge matched">${parva.stats.matched}</span>
                        <span class="tree-badge unmatched">${parva.stats.unmatched}</span>
                    </div>
                    <div class="tree-children" id="${parvaId}-children">
                        ${this.renderUpaparvas(parvaKey, parva.upaparvas)}
                    </div>
                </li>
            `;
        }
        
        html += '</ul>';
        treeContent.innerHTML = html;
    }
    
    renderUpaparvas(parvaKey, upaparvas) {
        let html = '<ul class="tree-list">';
        
        const upaparvaKeys = Object.keys(upaparvas).sort();
        
        for (const upaparvaKey of upaparvaKeys) {
            const upaparva = upaparvas[upaparvaKey];
            const upaparvaId = `upaparva-${parvaKey}-${upaparvaKey}`;
            const upaparvaName = upaparva.name || this.formatUpaparvaName(upaparvaKey);
            
            html += `
                <li class="tree-item">
                    <div class="tree-node" data-id="${upaparvaId}" data-type="upaparva">
                        <span class="tree-arrow">▶</span>
                        <span class="tree-label">${upaparvaName}</span>
                        <span class="tree-badge matched">${upaparva.stats.matched}</span>
                        <span class="tree-badge unmatched">${upaparva.stats.unmatched}</span>
                    </div>
                    <div class="tree-children" id="${upaparvaId}-children">
                        ${this.renderAdhyayas(parvaKey, upaparvaKey, upaparva.adhyayas)}
                    </div>
                </li>
            `;
        }
        
        html += '</ul>';
        return html;
    }
    
    renderAdhyayas(parvaKey, upaparvaKey, adhyayas) {
        let html = '<ul class="tree-list">';
        
        const adhyayaKeys = Object.keys(adhyayas).sort();
        
        for (const adhyayaKey of adhyayaKeys) {
            const adhyaya = adhyayas[adhyayaKey];
            const adhyayaId = `adhyaya-${parvaKey}-${upaparvaKey}-${adhyayaKey}`;
            const adhyayaName = adhyaya.name || this.formatAdhyayaName(adhyayaKey);
            
            html += `
                <li class="tree-item">
                    <div class="tree-node" data-id="${adhyayaId}" data-type="adhyaya">
                        <span class="tree-arrow">▶</span>
                        <span class="tree-label">${adhyayaName}</span>
                        <span class="tree-badge matched">${adhyaya.stats.matched}</span>
                        <span class="tree-badge unmatched">${adhyaya.stats.unmatched}</span>
                    </div>
                    <div class="tree-children" id="${adhyayaId}-children">
                        ${this.renderShlokas(adhyaya.shlokas)}
                    </div>
                </li>
            `;
        }
        
        html += '</ul>';
        return html;
    }
    
    renderShlokas(shlokas) {
        let html = '';
        
        // Sort by verse number
        shlokas.sort((a, b) => {
            const parsedA = parseSrirangaId(a.source_id || a.id);
            const parsedB = parseSrirangaId(b.source_id || b.id);
            return parsedA.verseNumeric - parsedB.verseNumeric;
        });
        
        for (const shloka of shlokas) {
            const statusClass = getMatchStatusClass(shloka);
            const matchLabel = shloka.has_match 
                ? (shloka.similarity >= 0.9 ? '✓' : '~') 
                : '✗';
            
            // Build data attributes for filtering
            const corpus = shloka.match_corpus || 'none';
            const manyToOne = shloka.many_to_one ? 'true' : 'false';
            const oneToMany = shloka.one_to_many ? 'true' : 'false';
            
            // Extra indicators for relationships
            let relationIndicator = '';
            if (shloka.many_to_one) relationIndicator += '⇆';
            if (shloka.one_to_many) relationIndicator += '⇉';
            
            html += `
                <div class="shloka-item ${statusClass}" 
                     data-id="${shloka.id || shloka.source_id}" 
                     data-filter="${statusClass}"
                     data-corpus="${corpus}"
                     data-many-to-one="${manyToOne}"
                     data-one-to-many="${oneToMany}">
                    <div class="shloka-id">${shloka.source_id || shloka.id} ${relationIndicator}</div>
                    <div class="shloka-preview">${truncateText(shloka.source_text, 60)}</div>
                    <span class="match-badge ${statusClass}">${matchLabel}</span>
                </div>
            `;
        }
        
        return html;
    }
    
    formatParvaName(key) {
        // P01 -> Parva 01
        if (key.startsWith('P')) {
            return `Parva ${key.substring(1)}`;
        }
        return key;
    }
    
    formatUpaparvaName(key) {
        // U01 -> Upaparva 01
        if (key.startsWith('U')) {
            return `Upaparva ${key.substring(1)}`;
        }
        return key;
    }
    
    formatAdhyayaName(key) {
        // A01 -> Adhyaya 01
        if (key.startsWith('A')) {
            return `Adhyaya ${key.substring(1)}`;
        }
        return key;
    }
    
    attachEventListeners() {
        // Tree node click handlers
        this.container.addEventListener('click', (e) => {
            const node = e.target.closest('.tree-node');
            if (node) {
                this.toggleTreeNode(node);
                return;
            }
            
            const shlokaItem = e.target.closest('.shloka-item');
            if (shlokaItem) {
                this.selectShloka(shlokaItem.dataset.id);
                
                // Update selection visual
                document.querySelectorAll('.shloka-item.selected').forEach(el => {
                    el.classList.remove('selected');
                });
                shlokaItem.classList.add('selected');
                return;
            }
            
            const filterBtn = e.target.closest('.filter-btn');
            if (filterBtn) {
                this.applyFilter(filterBtn.dataset.filter);
                return;
            }
        });
    }
    
    toggleTreeNode(node) {
        const childrenId = node.dataset.id + '-children';
        const children = document.getElementById(childrenId);
        
        if (children) {
            node.classList.toggle('expanded');
            children.classList.toggle('expanded');
        }
    }
    
    selectShloka(shlokaId) {
        const shloka = this.data.find(s => (s.id || s.source_id) === shlokaId);
        
        if (!shloka) {
            console.warn('Shloka not found:', shlokaId);
            return;
        }
        
        this.selectedShloka = shloka;
        this.renderShlokaDetails(shloka);
    }
    
    renderShlokaDetails(shloka) {
        const detailsPanel = document.getElementById('details-panel');
        
        const statusClass = getMatchStatusClass(shloka);
        const statusLabel = shloka.has_match 
            ? (shloka.similarity >= 0.9 ? 'Matched' : 'Partial Match') 
            : 'Unmatched';
        
        // Check if we should show diff highlighting
        const showDiff = shloka.has_match && shloka.similarity < 1.0;
        const diffResult = showDiff ? this.computeDiff(shloka) : null;
        
        let html = `
            <!-- Source Shloka Section -->
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="detail-section-title">📜 Source (Sriranga XML)</span>
                    <span class="detail-section-badge ${statusClass}">${statusLabel}</span>
                </div>
                <div class="shloka-id" style="margin-bottom: 10px;">${shloka.source_id || shloka.id}</div>
                <div class="source-text">${diffResult ? diffResult.sourceHtml : shloka.source_text}</div>
            </div>
        `;
        
        // Match Information
        if (shloka.has_match) {
            const similarityClass = getSimilarityClass(shloka.similarity);
            
            html += `
                <!-- Match Information -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <span class="detail-section-title">🔗 Match Information</span>
                        <span class="similarity-badge ${similarityClass}">${(shloka.similarity * 100).toFixed(1)}% similar</span>
                    </div>
                    <div class="match-info-grid">
                        <div class="match-info-item">
                            <div class="match-info-label">Target ID</div>
                            <div class="match-info-value">${shloka.matched_target_id || 'N/A'}</div>
                        </div>
                        <div class="match-info-item">
                            <div class="match-info-label">Match Method</div>
                            <div class="match-info-value">${this.formatMatchMethod(shloka.match_method || shloka.match_stage)}</div>
                        </div>
                        <div class="match-info-item">
                            <div class="match-info-label">Match Stage</div>
                            <div class="match-info-value">${shloka.match_stage || 'N/A'}</div>
                        </div>
                        <div class="match-info-item">
                            <div class="match-info-label">Location</div>
                            <div class="match-info-value">
                                Book ${shloka.target_book || '?'}, 
                                Ch. ${shloka.target_chapter || '?'}, 
                                V. ${shloka.target_verse || '?'}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Matched Target Section -->
                <div class="detail-section">
                    <div class="detail-section-header">
                        <span class="detail-section-title">${this.getCorpusIcon(shloka.match_corpus)} Matched (${this.getCorpusName(shloka.match_corpus)})</span>
                        ${showDiff ? '<span class="diff-legend">🟢 matching | 🟡 different</span>' : ''}
                    </div>
                    <div class="target-text">${diffResult ? diffResult.targetHtml : (shloka.matched_target_text || 'Text not available')}</div>
                </div>
                
                ${shloka.many_to_one && shloka.sources_sharing_target && shloka.sources_sharing_target.length > 0 ? `
                <!-- Many-to-One Relationship -->
                <div class="detail-section relationship-section">
                    <div class="detail-section-header">
                        <span class="detail-section-title">🔗 Many → One Mapping</span>
                    </div>
                    <div class="relationship-info">
                        <p><strong>${shloka.sources_sharing_target.length + 1}</strong> Sriranga shlokas map to this same target:</p>
                        <ul class="sharing-sources">
                            <li class="current-source">
                                <span class="source-id">${shloka.source_id}</span>
                                <span class="current-badge">current</span>
                            </li>
                            ${shloka.sources_sharing_target.map(id => {
                                const otherShloka = this.data.find(s => s.source_id === id);
                                const preview = otherShloka ? this.truncateText(otherShloka.source_text, 60) : '';
                                return `
                                    <li class="linked-source" data-source-id="${id}">
                                        <span class="source-id clickable-link">${id}</span>
                                        ${preview ? `<div class="source-preview">${preview}</div>` : ''}
                                    </li>
                                `;
                            }).join('')}
                        </ul>
                    </div>
                </div>
                ` : ''}
            `;
        } else {
            html += `
                <div class="detail-section">
                    <div class="detail-section-header">
                        <span class="detail-section-title">❌ No Match Found</span>
                    </div>
                    <p style="color: #636e72; padding: 20px;">
                        This shloka could not be matched to any entry in the MN Dutt corpus.
                        It may be unique to the Sriranga edition or have significant textual variations.
                    </p>
                </div>
            `;
        }
        
        // Translation Section
        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="detail-section-title">🌐 English Translation</span>
                    ${shloka.english_translation ? '<span class="source-badge">MN Dutt</span>' : ''}
                </div>
                ${shloka.english_translation 
                    ? `<div class="translation-text">${shloka.english_translation}</div>`
                    : `<div class="translation-text translation-placeholder">
                        ${shloka.match_corpus === 'ce' 
                            ? 'No English translation available. This shloka is matched to the Critical Edition which contains Sanskrit text only.'
                            : shloka.match_corpus === 'sarit'
                                ? 'No English translation available. This shloka is matched to SARIT which contains Sanskrit text only.'
                                : shloka.has_match 
                                    ? 'Translation not available for this match.'
                                    : 'No translation available. This shloka could not be matched to any corpus with translations.'}
                       </div>`
                }
            </div>
        `;
        
        // Commentary Section
        html += `
            <div class="detail-section">
                <div class="detail-section-header">
                    <span class="detail-section-title">📝 Nilakantha Commentary</span>
                    ${shloka.nilakanta_commentary ? '<span class="source-badge">Bhavadeepa</span>' : ''}
                </div>
                ${shloka.nilakanta_commentary 
                    ? `<div class="commentary-text">${shloka.nilakanta_commentary}</div>`
                    : `<div class="commentary-text translation-placeholder">
                        No Nilakantha commentary available for this shloka.
                       </div>`
                }
            </div>
        `;
        
        // CE/SARIT References (if available)
        if (shloka.metadata) {
            // Show badge if shloka is in both CE and SARIT
            const inBothCorpora = shloka.metadata.in_both_corpora;
            
            if (shloka.metadata.ce_reference) {
                const bothBadge = inBothCorpora ? '<span class="both-corpora-badge">Also in SARIT ↓</span>' : '';
                html += `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <span class="detail-section-title">📚 Critical Edition Reference</span>
                            ${bothBadge}
                        </div>
                        <div class="reference-section">
                            <div class="reference-text">${shloka.metadata.ce_reference.text || 'N/A'}</div>
                            <div class="reference-meta">
                                ID: ${shloka.metadata.ce_reference.id || 'N/A'} |
                                Similarity: ${((shloka.metadata.ce_reference.similarity || 0) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (shloka.metadata.sarit_reference) {
                const bothBadge = inBothCorpora ? '<span class="both-corpora-badge">Also in CE ↑</span>' : '';
                html += `
                    <div class="detail-section">
                        <div class="detail-section-header">
                            <span class="detail-section-title">📜 SARIT Reference</span>
                            ${bothBadge}
                        </div>
                        <div class="reference-section">
                            <div class="reference-text">${shloka.metadata.sarit_reference.text || 'N/A'}</div>
                            <div class="reference-meta">
                                ID: ${shloka.metadata.sarit_reference.id || 'N/A'} |
                                Similarity: ${((shloka.metadata.sarit_reference.similarity || 0) * 100).toFixed(1)}%
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        detailsPanel.innerHTML = html;
        
        // Add click handlers for linked sources (many-to-one navigation)
        detailsPanel.querySelectorAll('.linked-source').forEach(el => {
            el.addEventListener('click', () => {
                const sourceId = el.dataset.sourceId;
                this.navigateToShloka(sourceId);
            });
        });
    }
    
    truncateText(text, maxLength = 60) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    navigateToShloka(sourceId) {
        // Find the shloka in data
        const shloka = this.data.find(s => s.source_id === sourceId);
        if (!shloka) return;
        
        // Parse the source ID to get chapter info (e.g., sriranga_01_004_001 -> chapter 4)
        const parts = sourceId.split('_');
        const chapter = parseInt(parts[2], 10);
        
        // Find and expand the chapter in the tree
        const chapterNodes = document.querySelectorAll('.chapter-item');
        chapterNodes.forEach(node => {
            const chapterNum = parseInt(node.dataset.chapter, 10);
            if (chapterNum === chapter) {
                // Expand this chapter if collapsed
                const shlokaList = node.querySelector('.shloka-list');
                if (shlokaList && !shlokaList.classList.contains('expanded')) {
                    node.querySelector('.chapter-header')?.click();
                }
            }
        });
        
        // Find and click the shloka item
        setTimeout(() => {
            const shlokaItem = document.querySelector(`.shloka-item[data-id="${sourceId}"]`);
            if (shlokaItem) {
                shlokaItem.click();
                shlokaItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
    
    getCorpusName(corpus) {
        const names = {
            'mndutt': 'MN Dutt',
            'ce': 'Critical Edition',
            'sarit': 'SARIT',
            'none': 'Unmatched',
        };
        return names[corpus] || corpus || 'Unknown';
    }
    
    getCorpusIcon(corpus) {
        const icons = {
            'mndutt': '📗',
            'ce': '📚',
            'sarit': '📜',
            'none': '❌',
        };
        return icons[corpus] || '📄';
    }
    
    formatMatchMethod(method) {
        if (!method) return 'Unknown';
        
        const methodNames = {
            'bloom_similarity': 'Bloom Filter',
            'bloom_filter': 'Bloom Filter',
            'pada_vector': 'Pada-Level Vector',
            'segment_recovery': 'Segment Recovery',
            'edit_distance': 'Edit Distance',
            'advanced_similarity': 'Advanced Similarity',
            'cross_book': 'Cross-Book Match',
            'bidirectional': 'Bidirectional Match',
            'bidirectional_pada_vector': 'Bidirectional Pada',
            'tfidf_vector': 'TF-IDF Vector',
            'critical_edition_reference': 'Critical Edition',
            'sarit_reference': 'SARIT Reference',
        };
        
        return methodNames[method] || method.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    /**
     * Compute word-level diff between source and target texts.
     * Uses alignment info from metadata if available, otherwise falls back to simple word diff.
     */
    computeDiff(shloka) {
        const sourceText = shloka.source_text || '';
        const targetText = shloka.matched_target_text || '';
        
        // Tokenize texts (split by spaces and dandas)
        const tokenize = (text) => {
            // Split by spaces, keeping dandas as separate tokens
            return text
                .replace(/।/g, ' । ')
                .replace(/॥/g, ' ॥ ')
                .replace(/\s+/g, ' ')
                .trim()
                .split(' ')
                .filter(t => t.length > 0);
        };
        
        const sourceWords = tokenize(sourceText);
        const targetWords = tokenize(targetText);
        
        // Check if we have alignment info from pipeline
        const alignment = shloka.metadata?.alignment;
        
        if (alignment && alignment.target_words && alignment.matched_positions) {
            // Use pipeline alignment info for target
            return this.diffWithAlignment(sourceWords, targetWords, alignment);
        }
        
        // Fall back to simple LCS-based word diff
        return this.diffWithLCS(sourceWords, targetWords);
    }
    
    /**
     * Diff using alignment info from pipeline (Bloom filter matches)
     */
    diffWithAlignment(sourceWords, targetWords, alignment) {
        // Pipeline provides source_matched_positions which refer to source word indices
        const sourceMatchedPositions = new Set(alignment.source_matched_positions || alignment.matched_positions || []);
        
        // For source: use the matched positions directly
        const sourceHtml = sourceWords.map((word, idx) => {
            // Skip dandas/numbers - don't highlight them
            if (['।', '॥'].includes(word) || /^[०-९0-9]+$/.test(word)) {
                return word;
            }
            if (sourceMatchedPositions.has(idx)) {
                return `<span class="diff-match">${word}</span>`;
            } else {
                return `<span class="diff-different">${word}</span>`;
            }
        }).join(' ');
        
        // For target: we need to find which target words match source words
        // Use word-level comparison with normalization
        const sourceWordSet = new Set(
            (alignment.source_words || sourceWords)
                .map(w => this.normalizeWord(w))
                .filter(w => w.length > 0)
        );
        
        const targetHtml = targetWords.map((word, idx) => {
            // Skip dandas/numbers
            if (['।', '॥'].includes(word) || /^[०-९0-9]+$/.test(word)) {
                return word;
            }
            if (sourceWordSet.has(this.normalizeWord(word))) {
                return `<span class="diff-match">${word}</span>`;
            } else {
                return `<span class="diff-different">${word}</span>`;
            }
        }).join(' ');
        
        return { sourceHtml, targetHtml };
    }
    
    /**
     * Simple LCS-based word diff (fallback when no alignment info)
     */
    diffWithLCS(sourceWords, targetWords) {
        // Build word frequency sets for simple matching
        const sourceWordSet = new Set(sourceWords.map(w => this.normalizeWord(w)).filter(w => w.length > 0));
        const targetWordSet = new Set(targetWords.map(w => this.normalizeWord(w)).filter(w => w.length > 0));
        
        const sourceHtml = sourceWords.map(word => {
            // Skip dandas/numbers
            if (['।', '॥'].includes(word) || /^[०-९0-9]+$/.test(word)) {
                return word;
            }
            if (targetWordSet.has(this.normalizeWord(word))) {
                return `<span class="diff-match">${word}</span>`;
            } else {
                return `<span class="diff-different">${word}</span>`;
            }
        }).join(' ');
        
        const targetHtml = targetWords.map(word => {
            // Skip dandas/numbers
            if (['।', '॥'].includes(word) || /^[०-९0-9]+$/.test(word)) {
                return word;
            }
            if (sourceWordSet.has(this.normalizeWord(word))) {
                return `<span class="diff-match">${word}</span>`;
            } else {
                return `<span class="diff-different">${word}</span>`;
            }
        }).join(' ');
        
        return { sourceHtml, targetHtml };
    }
    
    /**
     * Basic Sanskrit word normalization for comparison
     */
    normalizeWord(word) {
        if (!word) return '';
        return word
            .replace(/[।॥\d०१२३४५६७८९]/g, '')  // Remove dandas and numbers
            .replace(/ं/g, 'म्')  // Anusvara to ma
            .replace(/ः/g, '')   // Remove visarga
            .trim()
            .toLowerCase();
    }
    
    applyFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.filter === filter) {
                btn.classList.add('active');
            }
        });
        
        // Apply filter to shloka items
        document.querySelectorAll('.shloka-item').forEach(item => {
            let show = false;
            
            if (filter === 'all') {
                show = true;
            } else if (filter === 'matched' || filter === 'partial' || filter === 'unmatched') {
                // Status filters - match against data-filter attribute
                show = item.dataset.filter === filter;
            } else if (filter === 'mndutt' || filter === 'ce' || filter === 'sarit') {
                // Corpus filters
                show = item.dataset.corpus === filter;
            } else if (filter === 'many-to-one') {
                // Many sources → one target
                show = item.dataset.manyToOne === 'true';
            } else if (filter === 'one-to-many') {
                // One source → many targets
                show = item.dataset.oneToMany === 'true';
            }
            
            if (show) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    }
}

// Initialize dashboard when DOM is ready
function initDashboard(bookNumber) {
    document.addEventListener('DOMContentLoaded', () => {
        new MahabharataDashboard('app', bookNumber);
    });
}
