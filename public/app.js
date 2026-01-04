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
    initializeFormsY();
    initializeSearch();
    loadProducts();
});

function initializeTabs() {}
function initializeUpload() {}
function initializeFormsY() {}
function initializeSearch() {}
function loadPrices() {}
