// API Base URL
const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3000' : '';

// State
let currentPage = 1;
let totalPages = 1;
let filters = {
    search: '',
    brand: '',
    minPrice: '',
    maxPrice: '',
    minIndex: '',
    maxIndex: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTabs();
    initializeUpload();
    initializeForms();
    initializeSearch();
    loadProducts();
});

// Tab Management
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            document.getElementById(`${tab}-panel`).classList.add('active');
        });
    });
}

// Upload Management
function initializeUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const filePreview = document.getElementById('file-preview');
    const fileName = document.getElementById('file-name');
    const submitBtn = document.getElementById('ocr-submit');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';

        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
    });

    function handleFileSelect(file) {
        if (!file) return;

        fileName.textContent = file.name;
        uploadArea.style.display = 'none';
        filePreview.style.display = 'flex';
        submitBtn.disabled = false;
    }
}

window.removeFile = function () {
    document.getElementById('file-input').value = '';
    document.getElementById('upload-area').style.display = 'flex';
    document.getElementById('file-preview').style.display = 'none';
    document.getElementById('ocr-submit').disabled = true;
};

// Form Handlers
function initializeForms() {
    // Manual Entry Form
    document.getElementById('manual-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('product-name').value;
        const price = document.getElementById('product-price').value;

        showLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/products/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price: parseFloat(price) })
            });

            const data = await response.json();

            if (data.success) {
                // Reset form
                document.getElementById('manual-form').reset();

                // Reload products
                await loadProducts();

                showNotification('Proizvod uspješno dodan!', 'success');
            } else {
                throw new Error(data.error || 'Failed to add product');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Greška pri dodavanju proizvoda', 'error');
        } finally {
            showLoading(false);
        }
    });

    // OCR Form
    document.getElementById('ocr-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];

        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        showLoading(true, 'OCR analiza u toku...');

        try {
            const response = await fetch(`${API_URL}/api/products/ocr`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                // Reset form
                removeFile();

                // Reload products
                await loadProducts();

                showNotification(`${data.productsAdded || 0} proizvoda dodano iz računa!`, 'success');
            } else {
                throw new Error(data.error || 'OCR failed');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Greška pri OCR analizi', 'error');
        } finally {
            showLoading(false);
        }
    });

    // Google Sheets Form
    document.getElementById('sheets-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const sheetUrl = document.getElementById('sheets-url').value;

        showLoading(true, 'Uvoz podataka iz Google Sheets...');

        try {
            const response = await fetch(`${API_URL}/import-sheets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheetUrl })
            });

            const data = await response.json();

            if (data.success) {
                // Reset form
                document.getElementById('sheets-form').reset();

                // Reload products
                await loadProducts();

                showNotification(`${data.productsAdded || 0} proizvoda uvezeno iz Sheets!`, 'success');
            } else {
                throw new Error(data.error || 'Import failed');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Greška pri uvozu iz Google Sheets', 'error');
        } finally {
            showLoading(false);
        }
    });
}

// Search and Filters
function initializeSearch() {
    const searchInput = document.getElementById('fast-search');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filters.search = e.target.value;
            currentPage = 1;
            loadProducts();
        }, 300);
    });
}

window.toggleFilters = function () {
    const panel = document.getElementById('filter-panel');
    panel.style.display = panel.style.display === 'none' ? 'grid' : 'none';
};

window.applyFilters = function () {
    filters.brand = document.getElementById('filter-brand').value;
    filters.minPrice = document.getElementById('filter-min-price').value;
    filters.maxPrice = document.getElementById('filter-max-price').value;
    filters.minIndex = document.getElementById('filter-min-index').value;
    filters.maxIndex = document.getElementById('filter-max-index').value;

    currentPage = 1;
    loadProducts();
};

window.clearFilters = function () {
    document.getElementById('filter-brand').value = '';
    document.getElementById('filter-min-price').value = '';
    document.getElementById('filter-max-price').value = '';
    document.getElementById('filter-min-index').value = '';
    document.getElementById('filter-max-index').value = '';

    filters = { search: filters.search };
    currentPage = 1;
    loadProducts();
};

// Load Products
async function loadProducts() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 6,
            ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
        });

        const response = await fetch(`${API_URL}/api/products?${params}`);
        const data = await response.json();

        totalPages = data.totalPages;
        renderProducts(data.products);
        renderPagination(data.page, data.totalPages);

    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Greška pri učitavanju proizvoda', 'error');
    }
}

// Render Products
function renderProducts(products) {
    const tbody = document.getElementById('products-tbody');

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="9">
                    <div class="empty-message">
                        <svg width="64" height="64" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                        </svg>
                        <h3>Nema proizvoda</h3>
                        <p>Dodajte proizvode ručno ili uploadujte račun</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(product => {
        const competitors = product.competitors || {};
        const analysis = product.analysis || {};
        const aiAdvisor = product.aiAdvisor || {};

        const index = analysis.competitiveIndex || 50;
        const indexClass = index >= 70 ? 'index-high' : index >= 40 ? 'index-medium' : 'index-low';

        return `
            <tr>
                <td>
                    <div class="product-name">${product.product}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        ${new Date(product.timestamp).toLocaleDateString('bs-BA')}
                    </div>
                </td>
                <td>
                    <span class="price">${formatPrice(product.myPrice)}</span>
                </td>
                ${renderCompetitorCell(competitors.Domod)}
                ${renderCompetitorCell(competitors.Ekupi)}
                ${renderCompetitorCell(competitors.Technoshop)}
                ${renderCompetitorCell(competitors.Tehnomag)}
                <td>
                    ${aiAdvisor.recommendedPrice ? `
                        <div class="ai-advice">
                            <span class="recommended-price">${formatPrice(aiAdvisor.recommendedPrice)}</span>
                            <span class="confidence">${Math.round(aiAdvisor.confidence)}% sigurnosti</span>
                        </div>
                    ` : '<span class="not-found">N/A</span>'}
                </td>
                <td>
                    <div class="index-badge ${indexClass}">
                        ${index}%
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-refresh" onclick="refreshProduct(${product.id})" title="Refresh">
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
                            </svg>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteProduct(${product.id})" title="Delete">
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderCompetitorCell(competitor) {
    if (!competitor || !competitor.found || competitor.price === 0) {
        return '<td><span class="not-found">Nije pronađeno</span></td>';
    }

    return `
        <td>
            <div class="competitor-cell">
                <span class="competitor-price">${formatPrice(competitor.price)}</span>
                <a href="${competitor.url}" target="_blank" class="competitor-link">
                    🔗 Link
                </a>
            </div>
        </td>
    `;
}

// Pagination
function renderPagination(currentPage, totalPages) {
    const pagination = document.getElementById('pagination');
    const pageNumbers = document.getElementById('page-numbers');

    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';

    // Generate page numbers
    let pages = [];
    if (totalPages <= 7) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
        pages = [1];

        if (currentPage > 3) pages.push('...');

        for (let i = Math.max(2, currentPage - 1); i <= Math.min(currentPage + 1, totalPages - 1); i++) {
            pages.push(i);
        }

        if (currentPage < totalPages - 2) pages.push('...');

        pages.push(totalPages);
    }

    pageNumbers.innerHTML = pages.map(page => {
        if (page === '...') {
            return '<span style="padding: 0 0.5rem; color: var(--text-muted);">...</span>';
        }
        return `
            <button class="page-number ${page === currentPage ? 'active' : ''}" 
                    onclick="goToPage(${page})">
                ${page}
            </button>
        `;
    }).join('');

    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;
}

window.changePage = function (delta) {
    const newPage = currentPage + delta;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        loadProducts();
    }
};

window.goToPage = function (page) {
    currentPage = page;
    loadProducts();
};

// Product Actions
window.refreshProduct = async function (productId) {
    showLoading(true, 'Osvježavanje proizvoda...');

    try {
        const response = await fetch(`${API_URL}/api/products/${productId}/refresh`, {
            method: 'POST'
        });

        const data = await response.json();

        if (data.success) {
            await loadProducts();
            showNotification('Proizvod osvježen!', 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Greška pri osvježavanju', 'error');
    } finally {
        showLoading(false);
    }
};

window.deleteProduct = async function (productId) {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj proizvod?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/products/${productId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            await loadProducts();
            showNotification('Proizvod obrisan!', 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Greška pri brisanju', 'error');
    }
};

// Utilities
function formatPrice(price) {
    if (!price || price === 0) return 'N/A';
    return `${price.toFixed(2)} KM`;
}

function showLoading(show, message = 'Analiziranje konkurencije...') {
    const loading = document.getElementById('loading');
    if (show) {
        loading.querySelector('p').textContent = message;
        loading.style.display = 'block';
    } else {
        loading.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    // Simple notification (can be enhanced with a notification library)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 2rem;
        right: 2rem;
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow-lg);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

window.showStats = function () {
    alert('Statistika feature dolazi uskoro!');
};

// AI Analysis
window.runAnalysis = async function () {
    const btn = document.getElementById('analyze-btn');
    const originalText = btn.innerHTML;

    // Disable button and show loading
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin" width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" /></svg> Analiza u toku...';

    try {
        const response = await fetch(`${API_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const results = await response.json();
        displayAnalysis(results);

        showNotification('AI analiza završena!', 'success');
    } catch (error) {
        console.error('Analysis error:', error);
        showNotification('Greška pri AI analizi: ' + error.message, 'error');
    } finally {
        // Re-enable button
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

function displayAnalysis(results) {
    const tbody = document.getElementById('analysis-tbody');
    const container = document.getElementById('analysis-results');

    tbody.innerHTML = '';

    if (results.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nema podataka za analizu</td></tr>';
        container.style.display = 'block';
        return;
    }

    results.forEach(result => {
        const row = document.createElement('tr');

        const suggestionClass = result.suggestion === '🔴' ? 'red' :
                               result.suggestion === '🟡' ? 'yellow' : 'green';

        row.innerHTML = `
            <td>${result.name}</td>
            <td>${result.my_price.toFixed(2)} KM</td>
            <td>${result.competitor_average.toFixed(2)} KM</td>
            <td><span class="suggestion-badge ${suggestionClass}">${result.suggestion}</span></td>
            <td>${result.suggested_price.toFixed(2)} KM</td>
        `;

        tbody.appendChild(row);
    });

    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Add slide animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(style);
